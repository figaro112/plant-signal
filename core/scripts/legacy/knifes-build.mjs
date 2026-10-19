// scripts/knifes_build.mjs (v8)
// CSV -> KNIFE prehľady + chýbajúce Kxxx skeletony (.md) bez prepisovania existujúcich
// + NORMALIZE: YAML metadá, img/ + multimedia/, TEDex skelet, provenance.org/project
// + LOCALE: --locale sk|en (default sk) – promietne sa do slug/locale
// + OVERVIEWS: stĺpce Org/Project a relatívne odkazy na .md (VS Code/GitHub aj web) + Author(s)
// + JSON index: docs/<locale>/knifes/knifes_index.json (machine-readable) vrátane author/authors
// + NAV: do každého článku sa vloží navigácia na 3 prehľady (relatívne .md)
// + SANITIZE: CSV hodnoty (dlhé reťazce, behy spätných lomítok a whitespace)
//
// Usage:
//   node scripts/knifes_build.mjs --csv data/KNIFE-OVERVIEW-ONLY.csv --root . [--dry-run] [--dry-verify] [--org ORG] [--project PROJ] [--locale sk] [--debug]
//   node scripts/knifes_build.mjs --root . --org ORG --project PROJ --locale sk

import fs from 'node:fs/promises';
import fssync from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

// --- header aliases (from dev/csv/schema/header.aliases.json) ---
const HEADER_ALIASES = {
  id: ['ID', 'Id', 'id', '\uFEFFID'],
  short_title: ['ShortTitle', 'Short Title', 'title'],
  folder_name: ['FolderName', 'Folder Name'],
  #sidebar_label: ['SidebarLabel', 'Sidebar Label'],
  date: ['Date', 'Date of Record', 'created'],
};

function getField(row, key) {
  const aliases = HEADER_ALIASES[key] || [key];
  for (const k of aliases) {
    if (row[k] !== undefined && row[k] !== null && row[k] !== '') return row[k];
  }
  return '';
}

// --- args ---
function parseArgs() {
  const args = process.argv.slice(2);
  const out = {
    csv: 'data/KNIFE-OVERVIEW-ONLY.csv',
    root: '.',
    dryRun: false,
    dryVerify: false,
    org: process.env.KNIFE_ORG || '',
    project: process.env.KNIFE_PROJECT || '',
    locale: process.env.KNIFE_LOCALE || 'sk',
    debug: false,
  };
  for (let i = 0; i < args.length; i++) {
    const k = args[i];
    const v = args[i + 1];
    if (k === '--csv')         { out.csv = v; i++; continue; }
    if (k === '--root')        { out.root = v; i++; continue; }
    if (k === '--dry-run')     { out.dryRun = true; continue; }
    if (k === '--dry-verify')  { out.dryVerify = true; continue; }
    if (k === '--org')         { out.org = v; i++; continue; }
    if (k === '--project')     { out.project = v; i++; continue; }
    if (k === '--locale')      { out.locale = v; i++; continue; }
    if (k === '--debug')       { out.debug = true; continue; }
  }
  return out;
}

// Parse authors from CSV row (supports "Author" or "Authors" with , ; | separators)
function parseAuthors(row) {
  const raw = row.Authors ?? row.Author ?? row.author ?? '';
  return String(raw)
    .split(/[,;|]/)
    .map(s => s.trim())
    .filter(Boolean)
    .slice(0, 10);
}

// --- sanitizer (chráni pred OOM / "Invalid string length") ---
function sanitizeScalar(v, max = 4000) {
  let s = String(v ?? '');
  // zlúč priveľké behy spätných lomítok a whitespace (spaces/tabs)
  s = s.replace(/\\{5,}/g, '\\').replace(/[ \t]{3,}/g, ' ');
  if (s.length > max) s = s.slice(0, max) + '…';
  return s;
}
function sanitizeRow(row) {
  const out = {};
  for (const [k, v] of Object.entries(row)) out[k] = sanitizeScalar(v);
  return out;
}

// --- CSV utils ---
function parseCSV(text) {
  // robust CSV: supports preface, autodetect header, quoted newlines, and common delimiters
  text = text.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');

  const headerRe = /^[\s"]*id[\s"]*[,;\t|].*?["\s]*title["\s]*([,;\t|]|$)/i;
  const guessDelim = (sample) => {
    for (const d of [',',';','\t','|']) if (sample.includes(d)) return d;
    return ',';
  };

  const lines = text.split('\n');
  let headerIdx = -1, delim = ',';
  for (let i = 0; i < lines.length; i++) {
    const L = lines[i];
    if (!L.trim()) continue;
    if (headerRe.test(L)) { headerIdx = i; delim = guessDelim(L); break; }
  }
  if (headerIdx === -1) {
    const first = lines.findIndex(l => l.trim());
    if (first === -1) return [];
    headerIdx = first; delim = guessDelim(lines[first]);
  }

  // character-by-character CSV parser that respects quotes and newlines
  const parseBlock = (block, d) => {
    const rows = [];
    let field = '', row = [], inQ = false;
    for (let i = 0; i < block.length; i++) {
      const c = block[i];
      if (inQ) {
        if (c === '"') {
          if (i + 1 < block.length && block[i + 1] === '"') { field += '"'; i++; }
          else { inQ = false; }
        } else { field += c; }
      } else {
        if (c === '"') inQ = true;
        else if (c === d) { row.push(field); field = ''; }
        else if (c === '\n') { row.push(field); rows.push(row); field = ''; row = []; }
        else { field += c; }
      }
    }
    row.push(field); rows.push(row);
    return rows.filter(r => r.some(x => String(x).trim() !== ''));
  };

  const rest = lines.slice(headerIdx).join('\n');
  const all = parseBlock(rest, delim);
  if (!all.length) return [];

  const header = all[0].map(h => String(h).trim());
  const out = [];
  for (let i = 1; i < all.length; i++) {
    const cols = all[i];
    const obj = {}; header.forEach((h, idx) => obj[h] = (cols[idx] ?? '').trim());
    out.push(obj);
  }
  return out;
}

function kebab(s) {
  return (s || 'untitled')
    .normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-+|-+$/g, '').toLowerCase();
}
async function ensureDir(p) { await fs.mkdir(p, { recursive: true }); }
async function fileExists(p) { try { await fs.access(p); return true; } catch { return false; } }
function mdEscape(str){ return String(str||'').replace(/"/g,'\\"'); }

// --- date parser (safe across multiple common formats) ---
function parseDateSafe(s) {
  const raw = String(s || '').trim();
  if (!raw) return null;

  // ISO-like: YYYY-MM-DD / YYYY/MM/DD / YYYY.MM.DD
  let m = raw.match(/^(\d{4})[-\/.](\d{1,2})[-\/.](\d{1,2})$/);
  if (m) {
    const [_, y, mo, d] = m; // eslint-disable-line no-unused-vars
    const dt = new Date(Number(y), Number(mo) - 1, Number(d));
    return isNaN(dt) ? null : dt;
  }

  // Slovak style: DD.MM.YYYY
  m = raw.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (m) {
    const [_, d, mo, y] = m; // eslint-disable-line no-unused-vars
    const dt = new Date(Number(y), Number(mo) - 1, Number(d));
    return isNaN(dt) ? null : dt;
  }

  // US style: MM/DD/YYYY
  m = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) {
    const [_, mo, d, y] = m; // eslint-disable-line no-unused-vars
    const dt = new Date(Number(y), Number(mo) - 1, Number(d));
    return isNaN(dt) ? null : dt;
  }

  // Fallback to native Date (e.g., ISO datetime)
  const dt = new Date(raw);
  return isNaN(dt) ? null : dt;
}

// --- Normalize helpers ---
function normToArray(v) {
  if (Array.isArray(v)) return v.filter(Boolean).map(s => String(s).trim());
  if (typeof v === 'string') {
    let str = v.trim();
    if (!str) return [];
    // If it looks like a bracketed array, try to clean common escape artifacts and parse
    if (/^\[.*\]$/.test(str)) {
      try {
        // Clean typical artifacts: \" -> ", \\ -> \
        const cleaned = str.replace(/\\+\"/g, '"').replace(/\\\\/g, '\\');
        const arr = JSON.parse(cleaned);
        if (Array.isArray(arr)) return arr.map(x => String(x).trim());
      } catch {}
      // Fallback: manual split of bracketed content
      const inner = str.replace(/^\[/, '').replace(/\]$/, '');
      return inner
        .split(/\s*,\s*/)
        .map(s => s.replace(/^\s*["']|["']\s*$/g, ''))
        .map(s => s.replace(/\\+/g, ''))
        .map(s => s.trim())
        .filter(Boolean);
    }
    // Non-bracketed string -> split by common delimiters
    return str.split(/[,;|]/).map(s => s.trim()).filter(Boolean);
  }
  return [];
}

// --- FM I/O ---
function splitFrontMatter(text) {
  const m = text.match(/^---\s*\n([\s\S]*?)\n---\s*\n?/);
  if (!m) return [null, text];
  return [m[1], text.slice(m[0].length)];
}
function parseSimpleYAML(yaml) {
  if (!yaml) return {};
  const obj = {};
  const lines = yaml.split('\n');
  for (const line of lines) {
    const mm = line.match(/^([A-Za-z0-9_]+):\s*(.*)$/);
    if (mm) obj[mm[1]] = mm[2].replace(/^"|"$/g, '').trim();
  }
  return obj;
}
function writeFrontMatter(obj) {
  // Canonical key order for stable YAML
  const order = [
    'id','guid','dao','title','description','author',
    // no `authors` in canonical output
    'created','modified','date',
    'status','type','category','tags','slug','sidebar_label',
    'sidebar_position','locale','provenance','provenance_org','provenance_project'
  ];

  const quote = (s) => JSON.stringify(String(s == null ? '' : s));

  const print = (v) => {
    if (v === null || v === undefined) return '""';
    if (typeof v === 'number' || typeof v === 'boolean') return String(v);
    // everything else → quote for YAML safety
    return quote(v);
  };

  const b = [];
  b.push('---');
  for (const k of order) {
    if (!(k in obj)) continue;
    const val = obj[k];
    if (val === undefined) continue;

    if (k === 'tags' && Array.isArray(val)) {
      const arr = val.slice(0, 200).map((x) => quote(x));
      b.push(`${k}: [${arr.join(', ')}]`);
      continue;
    }

    if (k === 'provenance' && val && typeof val === 'object' && !Array.isArray(val)) {
      b.push(`${k}:`);
      for (const [kk, vv] of Object.entries(val)) {
        b.push(`  ${kk}: ${print(vv)}`);
      }
      continue;
    }

    if (k === 'slug') {
      const printed = (typeof val === 'string' && val) ? quote(val) : '""';
      b.push(`# slug: ${printed}`);
      continue;
    }

    b.push(`${k}: ${print(val)}`);
  }
  b.push('---');
  return b.join('\n') + '\n';
}

// --- NAV blok (relatívne odkazy na ľahký prehľad) ---
const NAV_MARKER = '<!-- nav:knifes -->';
function navBlock() {
  return `${NAV_MARKER}
> [⬅ KNIFES – Prehľad](../overview.md)
---
`;
}

function ensureBodyDelimiter(body) {
  const t = body.trimStart();
  return t.startsWith('<!-- body:start -->') ? body : `<!-- body:start -->\n\n${body}`;
}
function injectNav(body) {
  if (body.includes(NAV_MARKER)) return body;
  const idx = body.indexOf('<!-- body:start -->');
  if (idx >= 0) {
    const before = body.slice(0, idx + '<!-- body:start -->'.length);
    const after  = body.slice(idx + '<!-- body:start -->'.length);
    return `${before}\n\n${navBlock()}${after}`.replace(/\n{3,}/g, '\n\n');
  }
  return `${navBlock()}${body}`;
}

function tedexSkeleton(id, title) {
  return `<!-- body:start -->

${navBlock()}# KNIFE ${id} – ${title}

## 🎯 Čo rieši (účel, cieľ)

## 🧩 Ako to rieši (princíp)

## 🧪 Ako to použiť (aplikácia)

---

## ⚡ Rýchly návod (Top)

## 📜 Detailný článok

## 💡 Tipy a poznámky

## ✅ Hodnota / Zhrnutie
`;
}
function firstParagraph(mdBody) {
  // Remove HTML comments
  let cleaned = mdBody.replace(/<!--[\s\S]*?-->/g, '').trim();

  // Drop the injected NAV block (from <!-- nav:knifes --> up to the next HR or blank line)
  cleaned = cleaned.replace(/<!--\s*nav:knifes\s*-->[\s\S]*?(?:\n---\n|\n\s*\n)/i, '\n');

  // Split into paragraphs by blank lines
  const paras = cleaned.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);

  // Pick the first paragraph that isn't just links or quotes
  let para = paras.find(p => {
    const noQuote = p.replace(/^>\s*/gm, '').trim();
    const onlyLinks = /^(?:\[[^\]]+\]\([^)]*\)\s*(?:[•|\-]\s*)?)+$/.test(noQuote);
    return noQuote && !onlyLinks;
  }) || '';

  // Strip simple markdown tokens and collapse excessive backslashes
  return para
    .replace(/^>\s*/gm, '')
    .replace(/[#*`]/g, '')
    .replace(/\\{2,}/g, '\\')
    .trim()
    .slice(0, 220);
}

// --- Description helpers ---
function needsDescFix(s) {
  const str = String(s || '');
  if (!str) return true; // empty -> needs fix
  if (/KNIFES\s*–\s*Prehľad/i.test(str)) return true; // nav text
  if (/^\s*\[/.test(str) && /\]\([^)]*\)/.test(str)) return true; // looks like pure links line
  if (/\\{8,}/.test(str)) return true; // long runs of backslashes
  const backslashes = (str.match(/\\/g) || []).length;
  if (str.length > 400 && backslashes / str.length > 0.05) return true; // noisy
  return false;
}

function computeDescriptionFromBody(fmDescription, bodyRaw) {
  const desc = (fmDescription && fmDescription !== '""') ? fmDescription : '';
  return needsDescFix(desc) ? firstParagraph(bodyRaw) : desc;
}

// --- derivácie z CSV ---
function computeDerived(row, locale = 'sk') {
  const shortTitle = getField(row, 'short_title') || 'Untitled';
  const id = String(getField(row, 'id') || '').trim();
  const folderName = (getField(row, 'folder_name') || `${id}-${kebab(shortTitle)}`).trim();
  const sidebarLabel = (getField(row, 'sidebar_label') || `${id} – ${shortTitle}`).trim();
  const linkSlug = `/${locale}/knifes/${kebab(`${id} ${shortTitle}`)}`;
  return { shortTitle, folderName, sidebarLabel, linkSlug };
}

// --- FM pre nový .md
function buildFrontMatter(row, d, opts) {
  const id = String(getField(row, 'id') || 'K000000').trim().toUpperCase();
  const shortTitle = d.shortTitle;
  const loc = opts?.locale || 'sk';
  const slug = `/${loc}/knifes/${kebab(`${id} ${shortTitle}`)}`;
  const position = parseInt(id.slice(1), 10) || 999;
  const tags = (row.Tags || '').split(',').map(t => t.trim()).filter(Boolean);
  if (!tags.includes('KNIFE')) tags.unshift('KNIFE');

  const fm = {
    id: id,
    title: shortTitle || id,
    description: row.Description ? String(row.Description).replace(/\\{2,}/g,'\\') : '',
    status: row.Status ? String(row.Status).toLowerCase() : 'draft',
    slug,
    #sidebar_label: `${id} – ${shortTitle}`,
    sidebar_position: position,
    tags,
    locale: loc
  };

  // authors from CSV → keep single canonical `author`
  const authors = parseAuthors(row);
  if (authors.length) {
    fm.author = authors[0];
    // do not set fm.authors to avoid non-canonical duplication
  }

  const prov = {};
  if (opts?.org) prov.org = opts.org;
  if (opts?.project) prov.project = opts.project;
  if (Object.keys(prov).length) fm.provenance = { platform: 'github', ...prov };

  // Ensure GUID and DAO
  if (!fm.guid) {
    fm.guid = `knife-${id}-${crypto.randomUUID()}`;
  }
  fm.dao = fm.dao || 'knife';

  // dates from CSV (robust)
  const createdRaw = getField(row, 'date') || '';
  const todayDt = new Date();
  const createdDt = parseDateSafe(createdRaw) || todayDt;
  fm.created = createdDt.toISOString().slice(0,10);
  fm.date = fm.created; // mirror for themes/components expecting `date`
  fm.modified = fm.created;
  return writeFrontMatter(fm);
}

// --- Prehľady (relatívne linky na .md)
function tableLine(row) {
  const title = getField(row, 'short_title') || '';
  const href = row._linkSlug || row._docRelLink || '#';
  const titleLink = href ? `[${title}](${href})` : title;
  const dateVal = getField(row, 'date') || '';
  return `| ${row.ID} | ${row.Category||''} | ${titleLink} | ${row.Status||''} | ${row.Priority||''} | ${row.Type||''} | ${dateVal} |`;
}
function detailsBlock(row, org, project) {
  const shortTitle = getField(row, 'short_title') || '';
  const link = `[${row._folderName||shortTitle}](${row._docRelLink||'#'})`;
  const tags = (row.Tags||'').split(',').map(t=>t.trim()).filter(Boolean).join(', ');
  const tech = row.Technology || '';
  const sfiaL = row['SFIA – Level'] || row.SFIA_Level || '';
  const sfiaD = row['SFIA – Domain (?)'] || row.SFIA_Domain || '';
  const sfiaM = row['SFIA – Maturity'] || row.SFIA_Maturity || '';
  const ctx = row['Context, Origin, Why it was initiated?'] || row.Context || '';
  const slug = row._linkSlug || '';
  const position = parseInt(String(row.ID||'').replace(/^K/i,''),10) || '';
  const author = (row._authors && row._authors[0]) || row.Author || row.Authors || '';

  return `### ${row.ID} – ${shortTitle}

**Author**: ${author}  
**Category**: ${row.Category||''}  
**Status**: ${row.Status||''}  
**Type**: ${row.Type||''}  
**Priority**: ${row.Priority||''}  
**Date**: ${getField(row, 'date') || ''}

**Technology**: ${tech}  
**Description**: ${(row.Description||'').replace(/\\{2,}/g,'\\')}  
**Context**: ${ctx}  
**SFIA**: level=${sfiaL}, domain=${sfiaD}, maturity=${sfiaM}  
**Tags**: ${tags}  
**Link**: ${link}

**Metadáta (generated)**:  
- **slug**: \`${slug}\`  
- **sidebar_label**: \`${row.ID} – ${shortTitle}\`  
- **sidebar_position**: \`${position}\`  
- **locale**: \`${row._locale || 'sk'}\`  
- **provenance.org**: \`${org||''}\`  
- **provenance.project**: \`${project||''}\`

---
`;
}

// --- Overview generators (full, no pagination limits) ---
function buildOverviewListFM(locale) {
  return `---\n`+
    `id: KNIFE_Overview_List\n`+
    `dao: knife\n`+
    `title: "📑 KNIFE Overview – List"\n`+
    `description: ""\n`+
    `status: draft\n`+
    `locale: ${locale}\n`+
    `tags: ["KNIFE"]\n`+
    `sidebar_label: "📑 KNIFE Overview – List"\n`+
    `---\n`;
}
function buildOverviewDetailsFM(locale) {
  return `---\n`+
    `id: KNIFE_Overview_Details\n`+
    `dao: knife\n`+
    `title: "📰 KNIFE Overview – Details"\n`+
    `description: ""\n`+
    `status: draft\n`+
    `locale: ${locale}\n`+
    `tags: ["KNIFE"]\n`+
    `sidebar_label: "📰 KNIFE Overview – Details"\n`+
    `---\n`;
}

function buildOverviewListMarkdown(rows, locale, org, project) {
  const header = `# 📑 KNIFE Overview – List\n\n`+
`| ID | Category | Title | Status | Priority | Type | Date | Author | Org | Project |\n`+
`|:--:|:--------:|:------|:------:|--------:|:----:|:----:|:------:|:---:|:-------:|\n`;
  const lines = rows.map(r => {
    const title = getField(r, 'short_title') || '';
    const href = r._linkSlug || r._docRelLink || '#';
    const titleLink = href ? `[${title}](${href})` : title;
    const author = (r._authors && r._authors[0]) || r.Author || r.Authors || '';
    const dateVal = getField(r, 'date') || '';
    return `| ${r.ID} | ${r.Category||''} | ${titleLink} | ${r.Status||''} | ${r.Priority||''} | ${r.Type||''} | ${dateVal} | ${author} | ${org||''} | ${project||''} |`;
  }).join('\n');
  return buildOverviewListFM(locale) + header + lines + '\n';
}

function buildOverviewDetailsMarkdown(rows, locale, org, project) {
  const header = `# 📰 KNIFE Overview – Details\n\n`;
  const blocks = rows.map(r => detailsBlock(r, org, project)).join('\n');
  return buildOverviewDetailsFM(locale) + header + blocks;
}

// --- media helpers & tags infer ---
async function ensureMediaFolders(dirAbs) {
  await ensureDir(path.join(dirAbs, 'img'));
  await ensureDir(path.join(dirAbs, 'multimedia'));
}
function inferFsTags(dirAbs, initial = []) {
  const tags = new Set(initial.length ? initial : ['KNIFE']);
  if (fssync.existsSync(path.join(dirAbs, 'img')) && fssync.readdirSync(path.join(dirAbs,'img')).length) tags.add('images');
  if (fssync.existsSync(path.join(dirAbs, 'multimedia')) && fssync.readdirSync(path.join(dirAbs,'multimedia')).length) tags.add('multimedia');
  if (fssync.existsSync(path.join(dirAbs, 'multimedia', 'AP', 'HTML5'))) { tags.add('active-presenter'); tags.add('html5'); }
  if (fssync.existsSync(path.join(dirAbs, 'multimedia', 'AP', 'video'))) tags.add('video');
  return Array.from(tags);
}

// --- helper templates (non-doc artifacts, safe for Docusaurus) ---
async function scaffoldHelpers(dirAbs, kid) {
  // Place helpers into a folder that Docusaurus won't treat as docs
  const helpersDir = path.join(dirAbs, '_helpers');
  await ensureDir(helpersDir);

  // README to explain purpose
  const readmeTxt = `This folder contains auxiliary notes and templates for ${kid}.
These files use *.md.txt extension so Docusaurus does not treat them as docs.
Rename to .md only if you intentionally want to publish a helper file.
`;
  const readmePath = path.join(helpersDir, 'README.txt');
  if (!fssync.existsSync(readmePath)) await fs.writeFile(readmePath, readmeTxt, 'utf8');

  // Notes / Sources / TODO templates, all include the K-ID in filename
  const files = [
    [`${kid}.notes.md.txt`, `# ${kid} — Notes (private)
- Context:
- Decisions:
- Open questions:
`],
    [`${kid}.sources.md.txt`, `# ${kid} — Sources (private)
- Links:
- Citations:
`],
    [`${kid}.todo.md.txt`, `# ${kid} — TODO (private)
- [ ] Task A
- [ ] Task B
`],
  ];
  for (const [fname, content] of files) {
    const p = path.join(helpersDir, fname);
    if (!fssync.existsSync(p)) await fs.writeFile(p, content, 'utf8');
  }

  // Image folder guide (keeps K-ID prefix convention clear)
  const imgGuide = `# Images for ${kid}

Place images used by this KNIFE here. Recommended naming:
- ${kid}-diagram-01.png
- ${kid}-screenshot-setup.png

If you use thumbnails, prefer a small preview file (e.g., 200–400 px wide)
paired with a full-size image, and link like:

[![Preview](img/${kid.toLowerCase()}-preview.png)](img/${kid.toLowerCase()}-full.png)
`;
  const imgGuidePath = path.join(dirAbs, 'img', 'README.txt');
  if (!fssync.existsSync(imgGuidePath)) await fs.writeFile(imgGuidePath, imgGuide, 'utf8');
}

// --- NORMALIZE: doplní FM + body:start + NAV do docs/<locale>/knifes
async function normalizeKnifes(repoRoot, opts) {
  // Normalize all articles in docs/<locale>/knifes by updating frontmatter, navigation, and media folders.
  const loc = opts.locale || 'sk';
  const base = path.join(repoRoot, 'docs', loc, 'knifes');
  if (!await fileExists(base)) return;

  for (const folder of (await fs.readdir(base))) {
    const dirAbs = path.join(base, folder);
    if (!fssync.statSync(dirAbs).isDirectory()) continue;

    await ensureMediaFolders(dirAbs);

    const files = await fs.readdir(dirAbs);
    const mainMd = files.includes('index.md') ? 'index.md' : files.find(f => /^K\d{3}.*\.md$/i.test(f));
    if (!mainMd) continue;

    const mainAbs = path.join(dirAbs, mainMd);
    const raw = await fs.readFile(mainAbs, 'utf8');
    const [fmText, bodyRaw0] = splitFrontMatter(raw);
    const fm = parseSimpleYAML(fmText || '');

    const bodyRaw = injectNav(ensureBodyDelimiter(bodyRaw0));

    // Derivácie z názvu priečinka
    const idFromFolder = (folder.match(/^(K\d{3})/i) || [,''])[1] || '';
    const titleFromFolder = folder.replace(/^(K\d{3})[-–\s_]*/i, '').replace(/[_]+/g, ' ').trim();
    const titleFromH1 = (bodyRaw.match(/^#\s+(.+)$/m) || [,''])[1].trim();

    const id = (idFromFolder || (titleFromH1.match(/^(K\d{3})/i)||[,''])[1] || 'K000000').toUpperCase();
    const title = fm.title || titleFromFolder || titleFromH1 || 'Untitled KNIFE';

    // Preserve slug and sidebar_label if present, otherwise compute them
    const slug = fm.slug ? fm.slug : `/${loc}/knifes/${kebab(`${id} ${title}`)}`;
    const sidebar_label = fm.sidebar_label ? fm.sidebar_label : `${id} – ${title.length>40? (title.slice(0,37)+'…') : title}`;
    const sidebar_position = fm.sidebar_position || parseInt(id.slice(1), 10) || 999;

    const fmTags = (fm.tags !== undefined) ? normToArray(fm.tags) : [];
    const tags = Array.from(new Set(inferFsTags(dirAbs, fmTags)));

    // prevzatie description z tela ak vo FM chýba alebo je zlá
    const description = computeDescriptionFromBody(fm.description, bodyRaw);

    // Authors: normalize from FM and backfill from CSV index if missing
    let authorsFM = normToArray(fm.authors);
    let authorFM  = fm.author || (authorsFM[0] || '');

    const csvMap = (opts.csvById instanceof Map) ? opts.csvById : null;
    if (csvMap) {
      const rec = csvMap.get(id);
      if (rec && Array.isArray(rec.authors) && rec.authors.length) {
        if (!authorFM)         authorFM  = rec.authors[0];
        if (!authorsFM.length) authorsFM = rec.authors.slice(0, 10);
      }
    }

    // Ensure essential FM fields for existing files (auto-heal)
    const stat = fssync.statSync(mainAbs);
    const iso = (d) => new Date(d).toISOString().slice(0,10);
    const ensuredDao = fm.dao || 'knife';
    const ensuredGuid = fm.guid || `knife-${id}-${crypto.randomUUID()}`;

    const createdVal = (fm.created || fm.date || iso(stat.mtime));
    const modifiedVal = (fm.modified || iso(stat.mtime));

    let provenance;
    if (!fm.provenance && (opts.org || opts.project)) {
      provenance = { platform: 'github', ...(opts.org?{org: opts.org}:{ }), ...(opts.project?{project: opts.project}:{ }) };
    }

    const outObj = {
      id,
      guid: ensuredGuid,
      dao: ensuredDao,
      title,
      description,
      status: fm.status || 'draft',
      slug, // use variable, not recomputed
      sidebar_label, // use variable, not recomputed
      sidebar_position,
      tags,
      locale: fm.locale || loc,
      created: createdVal,
      date: createdVal,
      modified: modifiedVal,
      ...(authorFM ? { author: authorFM } : {}),
      ...(provenance ? { provenance } : {})
    };

    const newRaw = writeFrontMatter(outObj) + bodyRaw;
    if (newRaw !== raw) {
      if (opts.dryRun) {
        console.log('Would update:', path.relative(repoRoot, mainAbs));
      } else {
        await fs.writeFile(mainAbs, newRaw, 'utf-8');
        console.log('Updated:', path.relative(repoRoot, mainAbs));
      }
    }
  }
}

// --- JSON index writer ---
async function writeJsonIndex(repoRoot, locale, org, project, dryRun) {
  // Write a machine-readable JSON index for docs/<locale>/knifes
  const base = path.join(repoRoot, 'docs', locale, 'knifes');
  if (!fssync.existsSync(base)) return;
  const index = [];

  for (const folder of fssync.readdirSync(base)) {
    const dirAbs = path.join(base, folder);
    if (!fssync.statSync(dirAbs).isDirectory()) continue;
    const entries = fssync.readdirSync(dirAbs);
    const mainMd = entries.includes('index.md') ? 'index.md' : entries.find(f => /^K\d{3}.*\.md$/i.test(f));
    if (!mainMd) continue;

    const raw = fssync.readFileSync(path.join(dirAbs, mainMd), 'utf8');
    const [fmText] = splitFrontMatter(raw);
    const fm = parseSimpleYAML(fmText||'');

    const tags = Array.isArray(fm.tags) ? fm.tags :
      (typeof fm.tags === 'string' && fm.tags.startsWith('[') ? (() => { try { return JSON.parse(fm.tags); } catch { return []; } })() :
       typeof fm.tags === 'string' ? fm.tags.split(',').map(s=>s.trim()).filter(Boolean) : []);

    // robustné načítanie autorov do indexu
    const authors = Array.isArray(fm.authors) ? fm.authors :
      (typeof fm.authors === 'string' && fm.authors.startsWith('[') ? (() => { try { return JSON.parse(fm.authors); } catch { return []; } })() :
       typeof fm.authors === 'string' ? fm.authors.split(',').map(s=>s.trim()).filter(Boolean) :
       fm.author ? [String(fm.author)] : []);
    const author = authors[0] || (fm.author || '');

    index.push({
      id: fm.id || '',
      title: fm.title || '',
      author,
      authors,
      description: fm.description || '',
      status: fm.status || 'draft',
      type: fm.type || '',
      category: fm.category || '',
      slug: fm.slug || '',
      sidebar_label: fm.sidebar_label || '',
      sidebar_position: Number(fm.sidebar_position||0),
      locale: fm.locale || locale,
      tags,
      provenance: {
        platform: 'github',
        org: org || '',
        project: project || ''
      },
      path: `docs/${locale}/knifes/${folder}/${mainMd}`
    });
  }

  const jsonPath = path.join(base, 'knifes_index.json');
  if (dryRun) {
    console.log(`Would write JSON index at ${path.relative(repoRoot, jsonPath)}`);
  } else {
    await fs.writeFile(jsonPath, JSON.stringify(index, null, 2), 'utf8');
    console.log(`JSON index written: ${path.relative(repoRoot, jsonPath)}`);
  }
}

// --- main ---
async function main() {
  const { csv, root, dryRun, dryVerify, org, project, locale, debug } = parseArgs();
  const repoRoot = path.resolve(root);
  const csvPath = path.resolve(repoRoot, csv);
  const haveCSV = fssync.existsSync(csvPath);
  if (debug) console.log({ csvPath, repoRoot, haveCSV, org, project, locale });

  // bez CSV: len normalizácia + JSON index
  if (!haveCSV) {
    await normalizeKnifes(repoRoot, { org, project, dryRun, locale });
    await writeJsonIndex(repoRoot, locale, org, project, dryRun);
    return;
  }

  // CSV → rows
  const text = await fs.readFile(csvPath, 'utf8');
  const rowsRaw = parseCSV(text);

  // sanitizácia riadkov kvôli stabilite
  const rowsSanitized = rowsRaw.map(sanitizeRow);

  const rows = rowsSanitized.filter(r => {
    const id = String(getField(r, 'id') || '').trim();
    const idRaw = r.ID || id;
    if (id && !r.ID) r.ID = id;
    // predpočítaj autorov pre prehľady
    r._authors = parseAuthors(r);
    r._author = r._authors[0] || '';
    const hasID = /^K\d{3}$/i.test(id);
    const hasTitle = !!getField(r, 'short_title');
    if (!hasID) console.warn(`↷ skip row: missing/invalid ID (${id||'∅'})`);
    if (!hasTitle) console.warn(`↷ skip ${idRaw||'K???'}: missing Short Title/title`);
    return hasID && hasTitle;
  });

  if (rows.length === 0 && rowsRaw.length > 0) {
    const first = rowsRaw[0];
    console.log('ℹ️  Detected CSV header keys:', Object.keys(first));
    console.log('ℹ️  Tip: CSV musí mať stĺpec "ID" a data riadky s "KNNN" (napr. K000060).');
  }

  // DRY-VERIFY
  if (dryVerify) {
    let createCount = 0;
    const missing = [];
    for (const r of rows) {
      const { folderName, linkSlug } = computeDerived(r);
      const dir = path.join(repoRoot, 'docs', locale, 'knifes', folderName);
      const file = path.join(dir, `index.md`);
      const exists = await fileExists(file);
      if (!exists) {
        createCount++;
        missing.push({ id: r.ID, slug: linkSlug, rel: path.relative(repoRoot, file) });
      }
    }
    console.log('\n== DRY-VERIFY (CSV → plán) ==');
    console.log(`Záznamov: ${rows.length}`);
    console.log(`Chýbajúce lokálne články: ${createCount}`);
    for (const m of missing.slice(0, 20)) console.log(` • ${m.id} → ${m.slug} (${m.rel})`);
    if (missing.length > 20) console.log(` … +${missing.length - 20} ďalších`);
    process.exit(0);
  }

  // CSV -> Map pre normalize (ID -> authors[])
  const csvById = new Map(rows.map(r => [ String(r.ID).toUpperCase(), { authors: r._authors || [] } ]));

  // 1) Vytváraj skeletony
  for (const row of rows) {
    row.ID = String(getField(row, 'id') || row.ID || '').trim().toUpperCase();
    const d = computeDerived(row, locale);
    row._folderName = d.folderName;
    row._sidebarLabel = d.sidebarLabel;
    row._linkSlug = d.linkSlug;                               // web info
    row._docRelLink = `./${d.folderName}/index.md`; // file link
    row._locale = locale;

    const dir = path.join(repoRoot, 'docs', locale, 'knifes', d.folderName);
    const file = path.join(dir, `index.md`);
    await ensureDir(dir);
    await ensureDir(path.join(dir, 'img'));
    await ensureDir(path.join(dir, 'multimedia'));

    if (!(await fileExists(file))) {
      if (dryRun) {
        console.log('Would create:', path.relative(repoRoot, file));
      } else {
        const fm = buildFrontMatter(row, d, { org, project, locale });
        const body = tedexSkeleton(row.ID || 'K000000', d.shortTitle);
        await fs.writeFile(file, fm + body, 'utf8');
        // Scaffold auxiliary templates carrying the K-ID
        await scaffoldHelpers(dir, row.ID || 'K000000');
        console.log('Created:', path.relative(repoRoot, file));
      }
    } else if (debug) {
      console.log('Exists:', path.relative(repoRoot, file));
    }
  }

  // 1.5) NORMALIZE + NAV inject
  await normalizeKnifes(repoRoot, { org, project, dryRun, locale, csvById });

  // 2) JSON index
  await writeJsonIndex(repoRoot, locale, org, project, dryRun);

  // 3) Prehľady – FULL (List + Details) + Lightweight overview
  const overviewShort =
`# 📋 KNIFEs Overview\n\n`+
`| ID   | Category | Title | Status | Priority | Type | Date | Author | Org | Project |\n`+
`|------|----------|-------|--------|---------:|------|------|--------|-----|---------|\n` + rows.map(r => {
    const title = getField(r, 'short_title') || '';
    const href = r._linkSlug || r._docRelLink || '#';
    const titleLink = href ? `[${title}](${href})` : title;
    const author = (r._authors && r._authors[0]) || r.Author || r.Authors || '';
    const dateVal = getField(r, 'date') || '';
    return `| ${r.ID} | ${r.Category||''} | ${titleLink} | ${r.Status||''} | ${r.Priority||''} | ${r.Type||''} | ${dateVal} | ${author} | ${org||''} | ${project||''} |`;
  }).join('\n') + '\n';

  const overviewDir = path.join(repoRoot, 'docs', locale, 'knifes');
  await ensureDir(overviewDir);

  // Lightweight overview
  if (dryRun) {
    console.log(`Would write lightweight overview at ${path.relative(repoRoot, path.join(overviewDir, 'overview.md'))}`);
  } else {
    await fs.writeFile(path.join(overviewDir, 'overview.md'), overviewShort, 'utf8');
    console.log(`Overview file written: ${path.relative(repoRoot, path.join(overviewDir, 'overview.md'))}`);
  }

  // Full LIST (no pagination limit)
  const mdList = buildOverviewListMarkdown(rows, locale, org, project);
  if (dryRun) {
    console.log(`Would write LIST overview at ${path.relative(repoRoot, path.join(overviewDir, 'KNIFE_Overview_List.md'))}`);
  } else {
    await fs.writeFile(path.join(overviewDir, 'KNIFE_Overview_List.md'), mdList, 'utf8');
    console.log(`LIST overview written: ${path.relative(repoRoot, path.join(overviewDir, 'KNIFE_Overview_List.md'))}`);
  }

  // Full DETAILS (no pagination limit)
  const mdDetails = buildOverviewDetailsMarkdown(rows, locale, org, project);
  if (dryRun) {
    console.log(`Would write DETAILS overview at ${path.relative(repoRoot, path.join(overviewDir, 'KNIFE_Overview_Details.md'))}`);
  } else {
    await fs.writeFile(path.join(overviewDir, 'KNIFE_Overview_Details.md'), mdDetails, 'utf8');
    console.log(`DETAILS overview written: ${path.relative(repoRoot, path.join(overviewDir, 'KNIFE_Overview_Details.md'))}`);
  }
}

main().catch(err => { console.error(err); process.exit(1); });