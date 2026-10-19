#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { parse } from 'csv-parse/sync';
import crypto from 'node:crypto';

// ------------------------------------------------------------
// KNIFE generator (MVP++)
// - Single CSV for all envs (DEV/UAT/PROD)
// - KEY→value tolerant lookup (order-agnostic, case/diacritics insensitive)
// - Seed-only (never overwrites existing KNIFE folders)
// - Fill-only FM (only writes values present in CSV; leaves template defaults)
// - Author resolution: Author > USER_ID > AUTHOR_ID > ENV(AUTHOR/USER) > 'unknown'
// ------------------------------------------------------------

// Args
const args = process.argv;
const getArg = (name, def=null) => {
  const i = args.indexOf(name);
  return i>=0 ? args[i+1] : def;
};

const csvPath = getArg('--csv');
const outDir  = getArg('--out');
const dry     = args.includes('--dry-run');
const updateExisting = args.includes('--update-existing');
const overviewOnly = args.includes('--overview-only');

if (!csvPath || !outDir) {
  console.error('Usage: knifes-gen-new --csv <file.csv> --out <dir> [--dry-run] [--update-existing]');
  process.exit(2);
}

// Templates (keep paths as in current repo layout)
const templateFM  = 'docs/sk/templates/system/fm.knife.yml';
const templateMD  = 'docs/sk/templates/content/knife/index.template.md';

// -------- KEY→value tolerant lookup like in knifes_build.mjs --------
const KEY_NORMALIZE = s => String(s||'')
  .normalize('NFKD').replace(/[\u0300-\u036f]/g,'') // remove diacritics
  .replace(/[^a-z0-9]+/gi,'')                          // keep [a-z0-9]
  .toLowerCase();

// semantic synonyms (extendable)
const KEY_SYNONYMS = {
  id: ['id','kid','knifeid','header'],
  slug: ['slug','linkslug','folder','foldername','pathslug'],
  guid: ['guid','uuid'],
  title: ['title','name','shorttitle','short'],
  author: ['author','authors','user','userid','user_id','author_id','authorid'],
  category: ['category','kategoria','cat'],
  type: ['type','typ'],
  priority: ['priority','prio'],
  created: ['created','createdat','date','datum','createdyyyymmdd'],
  tags: ['tags','tag','stitky'],
  locale: ['locale','jazyk'],
  sidebar_label: ['sidebarlabel','sidebar_label','label'],
  rightsholdercontent: ['rightsholdercontent','rights_holder_content','content_rights_holder'],
  rightsholdersystem: ['rightsholdersystem','rights_holder_system','system_rights_holder'],
  license: ['license','licencia'],
  disclaimer: ['disclaimer','disclaimer_text'],
  copyright: ['copyright'],
  authors_list: ['authors','autori','authors_list'],
  author_id: ['author_id','authorid'],
  author_did: ['author_did','authordid'],
  dao: ['dao']
};

// --- Value policies ---
// Strict status policy for GEN (validate-only, no mutation on write)
const ALLOWED_STATUS = new Set(['backlog','inprogress','done']);
function normalizeStatus(s){
  if (!s) return '';
  return String(s).trim().toLowerCase();
}
function isValidStatus(s){
  return ALLOWED_STATUS.has(normalizeStatus(s));
}

// Valid KNIFE ID format: K + 6 digits (e.g., K000034)
const ID6 = /^K\d{6}$/i;

function getField(row, semanticKey) {
  const candidates = KEY_SYNONYMS[semanticKey] || [semanticKey];
  const keys = Object.keys(row);
  for (const k of keys) {
    const kn = KEY_NORMALIZE(k);
    if (candidates.some(c=>KEY_NORMALIZE(c)===kn)) {
      const v = row[k];
      if (v !== undefined && v !== null && String(v).trim()!=='') return String(v).trim();
    }
  }
  return '';
}

function splitList(v){
  if (!v) return [];
  // split by comma or semicolon
  return String(v).split(/[;,]/).map(x=>x.trim()).filter(Boolean);
}

function replaceIf(src, key, value) {
  if (!value) return src;
  const re = new RegExp(`(^|\n)${key}:\\s*\".*?\"`);
  return src.replace(re, `$1${key}: \"${value}\"`);
}

function toSlug(s){
  const x = String(s||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'');
  return x.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
}

// Normalize dates to ISO YYYY-MM-DD (supports DD.MM.YYYY and YYYY-MM-DD)
function toISO(d){
  if (!d) return '';
  const s = String(d).trim();
  const m1 = s.match(/^(\d{2})\.(\d{2})\.(\d{4})$/); // DD.MM.YYYY
  if (m1) return `${m1[3]}-${m1[2]}-${m1[1]}`;
  const m2 = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);   // YYYY-MM-DD
  if (m2) return s;
  return '';
}

// Load inputs (robust CSV handling: BOM strip + DATA START marker + header autodetect)
let csvText = await fs.readFile(csvPath, 'utf8');
csvText = csvText.replace(/^\uFEFF/, ''); // strip BOM if present

const lines = csvText.split(/\r?\n/);
let headerIdx = -1;
let chosenDelim = ',';

// helper to choose delimiter by max token count
function pickDelimiter(line) {
  const cands = [',',';','\t','|'];
  let best = cands[0], bestN = line.split(cands[0]).length;
  for (let j = 1; j < cands.length; j++) {
    const n = line.split(cands[j]).length;
    if (n > bestN) { best = cands[j]; bestN = n; }
  }
  return best;
}

// noise/preamble filter
const isNoise = (s) => {
  const line = (s||'').trim();
  if (!line) return true;                 // empty
  if (line.startsWith('#')) return true;  // comment
  if (/^[",;|\t]+$/.test(line)) return true; // delimiter-only rows (e.g., ",,,,,")
  if (/^"?header"?$/i.test(line)) return true; // optional A1 marker
  return false;
};

// honor explicit DATA START marker (case-insensitive, anywhere on the line)
let dataStartIdx = -1;
for (let i = 0; i < lines.length; i++) {
  const raw = (lines[i]||'');
  if (/data\s*start/i.test(raw)) { dataStartIdx = i; break; }
}

// helper to check if a line looks like a header (contains an ID-like token)
function looksLikeHeader(rawLine) {
  const delim = pickDelimiter(rawLine.trim());
  const cells = rawLine.split(delim).map(s=>s.trim().replace(/^"|"$/g,''));
  // if first cell is a marker 'Header', drop it for inspection
  const probe = (cells.length && /^header$/i.test(cells[0])) ? cells.slice(1) : cells;
  // Accept if any cell is ID-like
  return probe.some(c => /^id$/i.test(c) || /^knifeid$/i.test(c) || /^kid$/i.test(c));
}

// choose header after DATA START if present, else first sensible line that looks like header
if (dataStartIdx >= 0) {
  for (let i = dataStartIdx + 1; i < Math.min(lines.length, dataStartIdx + 50); i++) {
    if (isNoise(lines[i])) continue;
    if (looksLikeHeader(lines[i])) {
      headerIdx = i;
      chosenDelim = pickDelimiter(lines[i].trim());
      break;
    }
  }
}

// fallback: scan from top for first sensible header-looking line
if (headerIdx === -1) {
  for (let i = 0; i < Math.min(lines.length, 100); i++) {
    if (isNoise(lines[i])) continue;
    if (looksLikeHeader(lines[i])) {
      headerIdx = i;
      chosenDelim = pickDelimiter(lines[i].trim());
      break;
    }
  }
}

const rawRecords = parse(lines.slice(headerIdx).join('\n'), {
  columns: false,
  delimiter: chosenDelim,
  skip_empty_lines: true,
  relax_column_count: true,
  relax_quotes: true,
  trim: true,
});

// Build header and data rows manually to support a leading marker column named "Header"
let headerCells = rawRecords[0] || [];
let dropFirst = false;
if (headerCells.length && /^"?header"?$/i.test(String(headerCells[0]).trim())) {
  dropFirst = true; // ignore the first marker column
}
if (dropFirst) headerCells = headerCells.slice(1);

// if we still do not see an ID-like column, try the next non-noise line as header (rare CSVs)
let probeKeys = headerCells.map(h => String(h).replace(/^"|"$/g,'').trim());
if (!probeKeys.some(k => /^(id|kid|knifeid)$/i.test(k))) {
  for (let i = headerIdx + 1; i < Math.min(lines.length, headerIdx + 5); i++) {
    const cand = (lines[i]||'').trim();
    if (isNoise(cand)) continue;
    const delim = pickDelimiter(cand);
    const cells = cand.split(delim);
    if (cells && cells.length > 1) {
      headerIdx = i;
      headerCells = cells;
      // recompute dropFirst for the new header
      dropFirst = (headerCells.length && /^"?header"?$/i.test(String(headerCells[0]).trim()));
      if (dropFirst) headerCells = headerCells.slice(1);
    }
    break;
  }
}

// normalize header names and drop empty header columns
let headerKeys = headerCells.map(h => String(h).replace(/^"|"$/g,'').trim());
const keepIdx = [];
for (let i = 0; i < headerKeys.length; i++) {
  if (headerKeys[i] !== '') keepIdx.push(i);
}
headerKeys = keepIdx.map(i => headerKeys[i]);

// map remaining records to objects using only kept columns
const rows = [];
for (let r = 1; r < rawRecords.length; r++) {
  const cells = rawRecords[r];
  const vals = dropFirst ? cells.slice(1) : cells;
  const obj = {};
  for (let k = 0; k < keepIdx.length; k++) {
    const ci = keepIdx[k];
    obj[headerKeys[k]] = vals[ci] ?? '';
  }
  rows.push(obj);
}

let fmTpl  = await fs.readFile(templateFM, 'utf8');
const bodyTpl = await fs.readFile(templateMD, 'utf8');

// Pre-scan existing KNIFE folders by ID prefix (seed-only must respect existing IDs even if slug differs)
let existingById = new Map();
try {
  const entries = await fs.readdir(outDir, { withFileTypes: true });
  for (const e of entries) {
    if (!e.isDirectory()) continue;
    const m = /^([Kk]\d{6})-(.+)$/.exec(e.name);
    if (m) {
      const idKey = m[1].toUpperCase();
      const arr = existingById.get(idKey) || [];
      arr.push(e.name);
      existingById.set(idKey, arr);
    }
  }
} catch {}

const ENV_AUTHOR = process.env.AUTHOR || process.env.USER || '';

// ---------- Overview builders (LIST + BLOG + JSON) ----------
function mdEscape(s){ return String(s||'').replace(/\|/g,'\\|'); }
function shortGuid(g){ const x=String(g||'').trim(); return x ? x.slice(0,8) : ''; }
function truncate(s, n=120){ const t=String(s||''); return t.length>n ? t.slice(0,n-1)+'…' : t; }

async function buildOverviews(rows, existingById, outDir) {
  // Normalize, sort by ID
  const items = [];
  for (const r of rows) {
    const id = getField(r,'id').toUpperCase();
    if (!ID6.test(id)) continue;
    const guid = getField(r,'guid');
    const title = getField(r,'title');
    const author = getField(r,'author');
    const status = getField(r,'status');
    const category = getField(r,'category');
    const type = getField(r,'type');
    const created = toISO(getField(r,'created'));
    const description = getField(r,'description');

    // Determine folder name for link
    const existing = existingById.get(id);
    let folderName;
    if (existing && existing.length) {
      folderName = existing[0]; // prefer actual
    } else {
      folderName = `${id}-${toSlug(title) || id.toLowerCase()}`;
    }
    const relLink = `./${folderName}`;

    items.push({ guid, id, title, author, status, category, type, created, description, link: relLink });
  }
  items.sort((a,b)=> a.id.localeCompare(b.id));

  // LIST markdown (compact table)
  let listMd = [
    '| GUID | ID | Názov | Kategória | Typ | Autor | Dátum | Status | Popis |',
    '|------|----|--------|-----------|-----|--------|--------|--------|-------|',
  ].join('\n');

  for (const it of items) {
    listMd += '\n' + [
      '`'+shortGuid(it.guid)+'`',
      `[${it.id}](${it.link})`,
      mdEscape(it.title),
      mdEscape(it.category),
      mdEscape(it.type),
      mdEscape(it.author),
      it.created || '',
      mdEscape(it.status),
      mdEscape(truncate(it.description))
    ].join(' | ');
  }

  // BLOG markdown (readable cards)
  let blogMd = '';
  for (const it of items) {
    blogMd +=
`## [${it.id} – ${it.title}](${it.link})
**Autor:** ${it.author || '-'} · **Dátum:** ${it.created || '-'} · **Stav:** ${it.status || '-'} · **Kategória/Typ:** ${it.category || '-'} / ${it.type || '-'}
**GUID:** ${it.guid || '-'}

> ${it.description || '_bez popisu_'}
---
`;
    blogMd += '\n';
  }

  // JSON index
  const json = JSON.stringify(items, null, 2);

  // Write or preview
  const LIST = path.join(outDir, 'KNIFE_Overview_List.md');
  const BLOG = path.join(outDir, 'KNIFE_Overview_Blog.md');
  const JIDX = path.join(outDir, 'knifes_index.json');

  if (dry) {
    console.log(`[OVERVIEW][DRY] Would write: ${LIST}`);
    console.log(`[OVERVIEW][DRY] Would write: ${BLOG}`);
    console.log(`[OVERVIEW][DRY] Would write: ${JIDX}`);
  } else {
    await fs.writeFile(LIST, listMd, 'utf8');
    await fs.writeFile(BLOG, blogMd, 'utf8');
    await fs.writeFile(JIDX, json, 'utf8');
    console.log(`[OVERVIEW] Wrote: ${LIST}`);
    console.log(`[OVERVIEW] Wrote: ${BLOG}`);
    console.log(`[OVERVIEW] Wrote: ${JIDX}`);
  }
}

// Overview-only mode: build list/blog/json and exit
if (overviewOnly) {
  await buildOverviews(rows, existingById, outDir);
  process.exit(0);
}

let SUM = { newOk:0, skippedGuid:0, invalidId:0, errors:0, duplicates:0, exists:0 };

for (const [i, r] of rows.entries()) {
  const rowNo = headerIdx + i + 2; // header is (headerIdx+1), data start next line
  // mandatory
  const id = getField(r, 'id');
  if (!id) { console.warn(`! Skip (row ${rowNo}) missing ID`); SUM.invalidId++; continue; }
  const idUpper = String(id).toUpperCase().trim();
  if (!ID6.test(idUpper)) {
    console.warn(`! Skip (row ${rowNo}) invalid ID format (expect K######): "${idUpper}"`);
    SUM.invalidId++;
    continue;
  }

  // Enforce NEW rule: only generate when GUID is empty / placeholder
  const guidRaw = getField(r, 'guid');
  const guidStr = String(guidRaw || '').trim();
  const isEmptyGuid = !guidStr || guidStr === '-' || guidStr === '∅' || /^#(NAME\?|REF!|N\/A)$/i.test(guidStr);
  const guidFinal = isEmptyGuid ? crypto.randomUUID() : guidStr;
  if (!isEmptyGuid) {
    console.log(`↷ Skip (row ${rowNo}, ${idUpper}) GUID present → generation disabled by rule.`);
    SUM.skippedGuid++;
    continue;
  }

  // Folder name derived ONLY from title (slug is ignored by design)
  const expectedName = `${idUpper}-${toSlug(getField(r,'title')) || idUpper.toLowerCase()}`;
  const folder = expectedName.substring(idUpper.length + 1);
  const dir = path.join(outDir, expectedName);

  // Seed-only existence check: by ID prefix, not by slug
  const idKey = idUpper;
  const existing = existingById.get(idKey);
  if (existing && existing.length) {
    if (existing.length > 1) {
      console.warn(`⚠️  (row ${rowNo}) duplicate folders for ${idKey}: ${existing.join(', ')}`);
      SUM.duplicates++;
    }
    const actual = existing[0];
    if (actual !== expectedName) {
      console.log(`↷ Skip (row ${rowNo}) exists by ID: ${path.join(outDir, actual)} (name differs)`);
    } else {
      console.log(`↷ Skip (row ${rowNo}) exists: ${path.join(outDir, actual)}`);
    }
    // Seed-only: never update existing
    SUM.exists++;
    continue;
  }

  // optional / required-by-policy
  // optional / required-by-policy
  const title         = getField(r, 'title');
  const description   = getField(r, 'description');
  const authorIn      = getField(r, 'author');
  const authorsListIn = getField(r, 'authors_list');
  const category      = getField(r, 'category');
  const type          = getField(r, 'type');
  const priorityRaw   = getField(r, 'priority');
  const created       = getField(r, 'created');
  const tagsRaw       = getField(r, 'tags');
  const statusRaw     = getField(r, 'status');
  const locale        = getField(r, 'locale') || 'sk';
  const sidebarLabel  = getField(r, 'sidebar_label');
  const rhContent     = getField(r, 'rightsholdercontent');
  const rhSystem      = getField(r, 'rightsholdersystem');
  const licenseVal    = getField(r, 'license');
  const disclaimerVal = getField(r, 'disclaimer');
  const copyrightVal  = getField(r, 'copyright');
  const authorId      = getField(r, 'author_id');
  const authorDid     = getField(r, 'author_did');
  const daoVal        = getField(r, 'dao') || 'knife';
  const modifiedRaw   = getField(r, 'modified');

  const authorResolved = authorIn || ENV_AUTHOR || 'unknown';

  // ---- POLICY VALIDATIONS (seed-only path) ----
  const errors = [];

  if (!title) errors.push('missing title');
  if (!description) errors.push('missing description');
  if (!category) errors.push('missing category');
  if (!type) errors.push('missing type');

  // Map legacy/common statuses to allowed canonicals for writing
  function mapStatusForWrite(s){
    if (!s) return '';
    let v = String(s).trim().toLowerCase();
    v = v.replace(/\s+/g,'').replace(/[-_]+/g,''); // in progress -> inprogress
    if (v === 'active' || v === 'wip' || v === 'testing' || v === 'test' || v === '🔥' || v === '🧪') return 'inprogress';
    if (v === 'draft' || v === 'todo' || v === 'new' || v === 'backlog') return 'backlog';
    if (v === 'done!' || v === '✅' || v === 'finished' || v === 'complete' || v === 'completed') return 'done';
    return v;
  }

  // status validation after mapping
  const statusWrite = mapStatusForWrite(statusRaw);
  if (!statusWrite) {
    errors.push('missing status (allowed: backlog|inprogress|done)');
  } else if (!isValidStatus(statusWrite)) {
    errors.push(`invalid status "${statusRaw}" → "${statusWrite}" (allowed: backlog|inprogress|done)`);
  }

  const createdISO = toISO(created);
  if (!createdISO) {
    errors.push(`invalid created date "${created}" (expected DD.MM.YYYY or YYYY-MM-DD)`);
  }

  if (errors.length) {
    console.warn(`❌ ERR (row ${rowNo}, ${idUpper}) ${errors.join('; ')}`);
    SUM.errors++;
    continue; // do not generate invalid records
  }

  const todayISO = new Date().toISOString().slice(0,10);
  const modifiedISO = (modifiedRaw && modifiedRaw !== '-') ? (toISO(modifiedRaw) || todayISO) : '-';

  // compute authors array
  const priority = priorityRaw;
  const authorsArr = splitList(authorsListIn) ;
  if (!authorsArr.length) {
    const a = (authorIn || ENV_AUTHOR || 'unknown').trim();
    if (a) authorsArr.push(a);
  }

  // Fill FM (fill-only)
  let fmFilled = fmTpl;
  fmFilled = replaceIf(fmFilled, 'id', idUpper);
  fmFilled = replaceIf(fmFilled, 'guid', guidFinal);
  fmFilled = replaceIf(fmFilled, 'title', title);
  fmFilled = replaceIf(fmFilled, 'description', description);
  fmFilled = replaceIf(fmFilled, 'author', authorResolved);
  fmFilled = replaceIf(fmFilled, 'category', category);
  fmFilled = replaceIf(fmFilled, 'type', type);
  fmFilled = replaceIf(fmFilled, 'status', statusWrite);
  fmFilled = replaceIf(fmFilled, 'priority', priority);
  fmFilled = replaceIf(fmFilled, 'created', createdISO);
  fmFilled = replaceIf(fmFilled, 'modified', modifiedISO);
  fmFilled = replaceIf(fmFilled, 'dao', daoVal);
  fmFilled = replaceIf(fmFilled, 'locale', locale);
  // sidebar_label: prefer CSV value, else computed
  fmFilled = replaceIf(fmFilled, 'sidebar_label', sidebarLabel || `${idUpper} – ${title || ''}`.trim());
  fmFilled = replaceIf(fmFilled, 'rights_holder_content', rhContent);
  fmFilled = replaceIf(fmFilled, 'rights_holder_system', rhSystem);
  fmFilled = replaceIf(fmFilled, 'license', licenseVal);
  fmFilled = replaceIf(fmFilled, 'disclaimer', disclaimerVal);
  fmFilled = replaceIf(fmFilled, 'copyright', copyrightVal);
  fmFilled = replaceIf(fmFilled, 'author_id', authorId);
  fmFilled = replaceIf(fmFilled, 'author_did', authorDid);

  if (tagsRaw) {
    const list = splitList(tagsRaw);
    const tagLine = `tags: [${list.map(t=>`\"${t}\"`).join(', ')}]`;
    fmFilled = fmFilled.replace(/(^|\n)tags:\s*\[.*?\]/, `$1${tagLine}`);
  }

  // authors: always as array
  if (authorsArr.length) {
    const authorsLine = `authors: [${authorsArr.map(a=>`\"${a}\"`).join(', ')}]`;
    if (/\nauthors:\s*\[.*?\]/.test(fmFilled)) {
      fmFilled = fmFilled.replace(/(^|\n)authors:\s*\[.*?\]/, `$1${authorsLine}`);
    } else {
      fmFilled += `\n${authorsLine}\n`;
    }
  }

  // enforce slug only as comment
  if (!/\n#\s*slug:/.test(fmFilled)) {
    fmFilled += `\n# slug: ""`;
  }

  // Remove any active slug: lines (if present)
  fmFilled = fmFilled.replace(/(^|\n)slug:\s*\".*?\"/g, '');

  const content = `---\n${fmFilled.trim()}\n---\n\n${bodyTpl.trim()}\n`;

  if (dry) {
    console.log(`[DRY][row ${rowNo}] + ${dir}/index.md`);
    SUM.newOk++;
  } else {
    if (!updateExisting) {
      // Seed-only: create only if not exists
      try {
        await fs.access(dir);
        // If here, folder exists, skip creation
        SUM.exists++;
        continue;
      } catch {
        // Folder does not exist, create new
        await fs.mkdir(dir, { recursive: true });
        await fs.writeFile(path.join(dir, 'index.md'), content, 'utf8');
        console.log(`✔ NEW [row ${rowNo}]: ${dir}/index.md`);
        // update index to avoid duplicate creation for same ID in later rows
        const arr = existingById.get(idKey) || [];
        arr.push(expectedName);
        existingById.set(idKey, arr);
        SUM.newOk++;
      }
    } else {
      // Future update logic under --update-existing (not implemented yet)
      // For now, behave like seed-only
      try {
        await fs.access(dir);
        // Folder exists, could update here if implemented
        // Currently skip
        SUM.exists++;
        continue;
      } catch {
        await fs.mkdir(dir, { recursive: true });
        await fs.writeFile(path.join(dir, 'index.md'), content, 'utf8');
        console.log(`✔ NEW [row ${rowNo}]: ${dir}/index.md`);
        // update index to avoid duplicate creation for same ID in later rows
        const arr = existingById.get(idKey) || [];
        arr.push(expectedName);
        existingById.set(idKey, arr);
        SUM.newOk++;
      }
    }
  }
}

console.log(`\n— GEN SUMMARY — NEW ok: ${SUM.newOk}, skipped(GUID): ${SUM.skippedGuid}, invalidId: ${SUM.invalidId}, exists: ${SUM.exists}, dupFolders: ${SUM.duplicates}, errors: ${SUM.errors}`);
