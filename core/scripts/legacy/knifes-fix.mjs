// scripts/knifes_fix.mjs
// FIX utility for KNIFES CSV + local docs layout
// Ciele:
// 1) Ak existuje KNIFE a vo FM (index.md) je guid -> zapíš ho do CSV (ak v CSV chýba/je nevalidný).
// 2) Ak má KNIFE ID a chýba display_id -> display_id = ID.
// 3) Ak chýba priečinok pre KNIFE -> vytvor ho + index.md + img/ + multimedia/.
// 4) Názov priečinka: `${ID}-${kebab(short_title)}`, pričom ID má veľké 'K' + čísla a zvyšok je kebab (lowercase).
//
// Spustenie:
//   node scripts/knifes_fix.mjs --config docs/config/knifes_config.json
//   (rovnaké flagy ako verify: --csv, --root, --locale, --docs-dir, --section)

import fs from 'node:fs/promises';
import path from 'node:path';

const ANSI = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
  red: '\x1b[31m',
};
function logc(color, ...args) {
  console.log((ANSI[color] || ''), ...args, ANSI.reset);
}

// ---------- defaults ----------
const DEFAULTS = {
  csv: 'docs/config/data/KNIFES-OVERVIEW-INPUTs.csv',
  root: '.',
  locale: 'sk',
  docsDir: 'docs',
  section: 'knifes',
};

// ---------- args/env/config ----------
function parseArgs() {
  const out = { ...DEFAULTS, config: '' };
  const a = process.argv.slice(2);
  for (let i = 0; i < a.length; i++) {
    const k = a[i];
    const v = a[i + 1];
    if (k === '--csv') out.csv = v;
    else if (k === '--root') out.root = v;
    else if (k === '--locale') out.locale = v;
    else if (k === '--docs-dir') out.docsDir = v;
    else if (k === '--section') out.section = v;
    else if (k === '--config') out.config = v;
    else if (k === '--dry') out.dry = true;
    else if (k === '--fm-only' || k === '--knife_fix_fm_only') out.fmOnly = true;
    else if (k === '--check-header') out.checkHeader = true;
    else if (k === '--report-id') { out.reportId = v; i++; }
    else if (k === '--report-tree') { out.reportTree = v; i++; }
  }
  out.csv = process.env.KNIFE_CSV || out.csv;
  out.root = process.env.KNIFE_ROOT || out.root;
  out.locale = process.env.KNIFE_LOCALE || out.locale;
  out.docsDir = process.env.KNIFE_DOCS_DIR || out.docsDir;
  out.section = process.env.KNIFE_SECTION || out.section;
  out.dry = !!out.dry;
  out.fmOnly = !!out.fmOnly;
  out.checkHeader = !!out.checkHeader;
  out.reportId = (out.reportId || '').trim();
  out.reportTree = (out.reportTree || '').trim();
  return out;
}

async function loadJsonIfExists(p) {
  try { return JSON.parse(await fs.readFile(p, 'utf8')); }
  catch { return null; }
}

async function resolveOptions() {
  const cli = parseArgs();
  const repo = path.resolve(cli.root || '.');
  let cfg = null;

  if (cli.config) {
    const abs = path.isAbsolute(cli.config) ? cli.config : path.join(repo, cli.config);
    cfg = await loadJsonIfExists(abs);
  }
  if (!cfg) cfg = await loadJsonIfExists(path.join(repo, 'docs', 'config', 'knifes_config.json'));

  const final = {
    csv: (cfg?.csv ?? cli.csv),
    root: repo,
    locale: (cfg?.locale ?? cli.locale),
    docsDir: (cfg?.docsDir ?? cli.docsDir),
    section: (cfg?.section ?? cli.section),
  };

  final.section = String(final.section || '').trim() || DEFAULTS.section;
  final.docsDir = String(final.docsDir || '').trim() || DEFAULTS.docsDir;

  final.csvPath = path.isAbsolute(final.csv) ? final.csv : path.join(repo, final.csv);
  final.docsRoot = path.join(repo, final.docsDir, final.locale, final.section);

  final.dry = cli.dry || false;
  final.fmOnly = cli.fmOnly || false;
  final.checkHeader = cli.checkHeader || false;
  final.reportId = (cli.reportId || '');
  final.reportTree = (cli.reportTree || '');

  return final;
}

// ---------- helpers ----------
function cleanse(s) {
  return String(s ?? '')
    .replace(/\u00A0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function splitCsvLine(line, delimChar) {
  const out = [];
  let curr = '', inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQ && line[i + 1] === '"') { curr += '"'; i++; }
      else inQ = !inQ;
    } else if (ch === delimChar && !inQ) {
      out.push(curr);
      curr = '';
    } else {
      curr += ch;
    }
  }
  out.push(curr);
  return out;
}
function unquote(s) {
  s = cleanse(s);
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) return s.slice(1, -1);
  return s;
}

function parseCSV(text) {
  text = String(text ?? '').replace(/^\uFEFF/, '').replace(/\r\n/g, '\n');
  const allLines = text.split('\n').filter(l => l.length > 0);
  if (!allLines.length) return { headers: [], rows: [], delim: ',' };

  const headerLine = allLines[0];
  const delim = headerLine.includes(';') ? ';' : (headerLine.includes('\t') ? '\t' : ',');

  const headers = splitCsvLine(headerLine, delim).map(unquote);
  const rows = [];

  for (const line of allLines.slice(1)) {
    const parts = splitCsvLine(line, delim).map(unquote);
    if (!parts.length) continue;
    const obj = {};
    headers.forEach((h, idx) => { obj[h] = cleanse(parts[idx] ?? ''); });
    rows.push(obj);
  }

  return { headers, rows, delim };
}

function normKey(k) {
  return String(k || '')
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[()]/g, '')
    .replace(/_+/g, '_');
}

function normalizeRowKeys(r) {
  const out = {};
  for (const [k, v] of Object.entries(r)) out[normKey(k)] = v;
  return out;
}

// UUID v4 regex for validation (used by CSV fix)
const reUuidV4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function kebab(s) {
  return (s || 'untitled')
    .normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
}

function ensureSlash(s) { return s?.endsWith('/') ? s : (s || '') + '/'; }

async function pathExists(p) { try { await fs.access(p); return true; } catch { return false; } }

function parseFM(text) {
  const m = /^---\n([\s\S]+?)\n---/m.exec(text || '');
  if (!m) return {};
  const out = {};
  for (const line of m[1].split('\n')) {
    const mm = /^([a-zA-Z0-9_\-]+):\s*(.*)$/.exec(line);
    if (mm) {
      const k = mm[1]; let v = mm[2].trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
      out[k] = v;
    }
  }
  return out;
}

// Robust array-like string parser and flattener for FM/CSV
function parseArrayish(input) {
  if (Array.isArray(input)) return input.slice();
  if (input == null) return [];
  let s = String(input).trim();
  if (!s) return [];
  // Try JSON first (replace single quotes with double quotes)
  if (s.startsWith('[') && s.endsWith(']')) {
    try {
      const arr = JSON.parse(s.replace(/'/g, '"'));
      return flattenArray(arr);
    } catch {
      // fallback below
    }
    // Fallback: split on commas inside brackets
    s = s.slice(1, -1);
  }
  // Generic comma-separated fallback
  const parts = s.split(',').map(t => stripQuotes(String(t).trim())).filter(Boolean);
  return flattenArray(parts);
}
function stripQuotes(t) {
  if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) {
    return t.slice(1, -1);
  }
  return t;
}
function flattenArray(arr) {
  const out = [];
  for (const it of (arr || [])) {
    if (Array.isArray(it)) {
      out.push(...flattenArray(it));
    } else if (typeof it === 'string') {
      const v = it.trim();
      // Handle nested serialized array strings like '["KNIFE"]'
      if (v.startsWith('[') && v.endsWith(']')) {
        try {
          const inner = JSON.parse(v.replace(/'/g, '"'));
          out.push(...flattenArray(inner));
          continue;
        } catch {
          // treat as plain string without brackets
          out.push(v.replace(/^\[|\]$/g, ''));
          continue;
        }
      }
      out.push(stripQuotes(v));
    } else if (it != null) {
      out.push(String(it));
    }
  }
  // de-duplicate and remove empties
  return Array.from(new Set(out.map(t => t.trim()).filter(Boolean)));
}

// ---------- Front Matter normalization helpers ----------
function stringifyYamlValue(v) {
  if (Array.isArray(v)) {
    // Always emit array with quoted strings, simple inline form
    const items = v.map(x => `"${String(x ?? '').replace(/"/g, '\\"')}"`);
    return `[${items.join(', ')}]`;
  }
  // Always quote scalars
  return `"${String(v ?? '').replace(/"/g, '\\"')}"`;
}

function serializeFrontMatter(obj, orderedKeys) {
  const keys = orderedKeys && orderedKeys.length ? orderedKeys : Object.keys(obj);
  const lines = ['---'];
  for (const k of keys) {
    if (k in obj) {
      lines.push(`${k}: ${serializeValueForKey(k, obj[k])}`);
    }
  }
  lines.push('---');
  return lines.join('\n');
}

// default ordering of FM keys for KNIFE
const FM_KEY_ORDER = [
  'id','guid','dao','title','description',
  'author','authors','category','type','priority','tags',
  // slug stays commented out by policy; we never emit it here
  'created','modified','status','locale',
  'sidebar_label','sidebar_position',
  // IP & License block
  'rights_holder_content','rights_holder_system','license','disclaimer','copyright',
  // optional author identifiers
  'author_id','author_did'
];

function serializeValueForKey(k, v) {
  // arrays are serialized inline with quoted strings
  if (Array.isArray(v)) return stringifyYamlValue(v);
  // numbers null etc → cast to string and quote
  return stringifyYamlValue(v);
}

function normalizeStatus(s) {
  const x = String(s || '').toLowerCase();
  if (!x) return '';
  if (['inprogress','ongoing','in_progress','wip'].includes(x)) return 'inprogress';
  if (['done','completed','finished'].includes(x)) return 'done';
  if (['backlog','todo','planned'].includes(x)) return 'backlog';
  return x;
}

function normalizeLocale(s) {
  const x = String(s || '').trim().toLowerCase().replace(/\.$/, '');
  if (x === 'sk' || x === 'en') return x;
  return x || '';
}

function ensureAuthors(author, authors) {
  const main = String(author || '').trim();
  let arr = Array.isArray(authors) ? authors.slice() : [];
  // If array is given as string "[...]" we leave as-is; parseFM currently can't parse arrays,
  // so we accept string and will rebuild array using main author.
  if (!Array.isArray(authors)) {
    arr = main ? [main, '', ''] : ['', '', ''];
  } else if (arr.length === 0 && main) {
    arr = [main, '', ''];
  }
  return arr;
}

function buildNormalizedFM(raw) {
  // raw is an object parsed by parseFM (scalars only)
  const fm = { ...raw };

  // Mandatory lowercase id format stays as-is but wrapped in quotes during serialization
  if (fm.id) fm.id = String(fm.id).trim();
  if (fm.guid) fm.guid = String(fm.guid).trim();

  // dao default
  fm.dao = String(fm.dao || 'knife');

  // Title/description defaults
  fm.title = String(fm.title || (fm.id ? `KNIFE – ${fm.id}` : 'KNIFE – Prehľad'));
  fm.description = String(fm.description || '');

  // author/authors
  fm.author = String(fm.author || 'Roman Kazička');
  const authorsParsed = parseArrayish(raw.authors);
  fm.authors = authorsParsed.length ? authorsParsed : ensureAuthors(fm.author, fm.authors);

  // taxonomy-like fields
  fm.category = String(fm.category || '');
  fm.type = String(fm.type || '');
  fm.priority = String(fm.priority || '');
  const tagsParsed = parseArrayish(raw.tags);
  // Policy: if parsing yields no meaningful tags, standardize to a single empty slot [""].
  fm.tags = tagsParsed.length ? tagsParsed : [""];
  // dates
  fm.created = String(fm.created || '').trim();
  fm.modified = String(fm.modified || '').trim();

  // remove deprecated duplicated date key if present
  delete fm.date;

  // status + locale
  fm.status = normalizeStatus(fm.status);
  fm.locale = normalizeLocale(fm.locale || 'sk');

  // sidebar
  fm.sidebar_label = String(fm.sidebar_label || 'Home');
  if (fm.sidebar_position !== undefined) fm.sidebar_position = String(fm.sidebar_position || '');

  // IP & License
  fm.rights_holder_content = String(fm.rights_holder_content || 'Roman Kazička');
  fm.rights_holder_system = String(fm.rights_holder_system || 'Roman Kazička (CAA/KNIFE/LetItGrow)');
  fm.license = String(fm.license || 'CC-BY-NC-SA-4.0');
  fm.disclaimer = String(fm.disclaimer || 'Use at your own risk. Methods provided as-is; participation is voluntary and context-aware.');
  fm.copyright = String(fm.copyright || '© 2025 Roman Kazička / SystemThinking');

  // optional IDs default empty
  fm.author_id = String(fm.author_id || '');
  fm.author_did = String(fm.author_did || '');

  return fm;
}

function replaceFrontMatterBlock(mdText, newFMText) {
  const has = /^---\n[\s\S]+?\n---/m.test(mdText);
  if (has) return mdText.replace(/^---\n[\s\S]+?\n---/m, newFMText);
  // if missing FM, prepend it
  return `${newFMText}\n\n${mdText}`;
}

// --- FM diff helpers ---
function valueToComparable(v) {
  if (Array.isArray(v)) return JSON.stringify(v);
  return String(v ?? '');
}
function diffFrontMatter(beforeObj, afterObj) {
  const keys = Array.from(new Set([...Object.keys(beforeObj), ...Object.keys(afterObj)]));
  const diffs = [];
  for (const k of keys) {
    const b = valueToComparable(beforeObj[k]);
    const a = valueToComparable(afterObj[k]);
    if (b !== a) diffs.push({ key: k, from: b, to: a });
  }
  return diffs;
}

// ---------- MD header (content) checks ----------
function checkMdHeader(mdText) {
  // Strip FM
  const noFm = mdText.replace(/^---\n[\s\S]+?\n---\n?/m, '');
  const lines = noFm.split('\n').map(l => l.trim());
  const firstNonEmpty = lines.find(l => l.length > 0) || '';
  const hasH1 = /^#\s+/.test(firstNonEmpty);
  // Basic heuristic: check presence of H1 within first 20 lines
  const hasEarlyH1 = lines.slice(0, 20).some(l => /^#\s+/.test(l));
  return { hasH1: hasH1 || hasEarlyH1 };
}

async function runFmOnlyFix(opt) {
  const root = opt.docsRoot;
  const filesToProcess = [];
  async function walk(dir) {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const e of entries) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) await walk(p);
      else if (e.isFile() && e.name.toLowerCase().endsWith('.md')) filesToProcess.push(p);
    }
  }
  if (!(await pathExists(root))) {
    console.error(`❌ Docs root not found: ${root}`);
    process.exit(2);
  }
  await walk(root);

  let changed = 0, created = 0, checked = 0;
  for (const file of filesToProcess) {
    const md = await fs.readFile(file, 'utf8');
    const rawFM = parseFM(md);
    const norm = buildNormalizedFM(rawFM);
    const fmText = serializeFrontMatter(norm, FM_KEY_ORDER);
    const newMd = replaceFrontMatterBlock(md, fmText);

    checked++;
    if (newMd !== md) {
      if (opt.dry) {
        logc('yellow', `~ DRY: would update FM → ${path.relative(opt.root, file)}`);
      } else {
        await fs.writeFile(file, newMd, 'utf8');
        logc('green', `✓ FM updated → ${path.relative(opt.root, file)}`);
      }
      changed++;
    }
    // Count if file had no FM originally
    if (!/^---\n[\s\S]+?\n---/m.test(md)) created++;
  }

  console.log(`== knife_fix_fm_only summary ==`);
  console.log(`Docs root:  ${path.relative(opt.root, root)}`);
  console.log(`Checked MD: ${checked}`);
  console.log(`FM created (missing→added): ${created}`);
  console.log(`FM changed: ${changed} ${opt.dry ? '(dry-run)' : ''}`);
}

async function runHeaderChecks(opt) {
  const root = opt.docsRoot;
  const filesToProcess = [];
  async function walk(dir) {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const e of entries) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) await walk(p);
      else if (e.isFile() && e.name.toLowerCase().endsWith('.md')) filesToProcess.push(p);
    }
  }
  if (!(await pathExists(root))) {
    console.error(`❌ Docs root not found: ${root}`);
    process.exit(2);
  }
  await walk(root);

  let missingH1 = 0, total = 0;
  for (const file of filesToProcess) {
    const md = await fs.readFile(file, 'utf8');
    const res = checkMdHeader(md);
    total++;
    if (!res.hasH1) {
      missingH1++;
      logc('red', `✗ Missing H1 within first lines → ${path.relative(opt.root, file)}`);
    } else {
      logc('gray', `· H1 ok → ${path.relative(opt.root, file)}`);
    }
  }
  console.log(`== header check summary ==`);
  console.log(`Total MD: ${total}`);
  console.log(`Missing H1: ${missingH1}`);
}

// --- Per-ID FM diff reporter ---
async function runReportId(opt) {
  const target = String(opt.reportId || '').trim().toUpperCase();
  if (!target) { console.error('❌ --report-id requires an ID value, e.g., K000059'); process.exit(2); }
  if (!(await pathExists(opt.docsRoot))) { console.error(`❌ Docs root not found: ${opt.docsRoot}`); process.exit(2); }

  const files = [];
  async function walk(d) {
    const es = await fs.readdir(d, { withFileTypes: true });
    for (const e of es) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) await walk(p);
      else if (e.isFile() && e.name.toLowerCase().endsWith('.md')) files.push(p);
    }
  }
  await walk(opt.docsRoot);

  let matches = 0;
  for (const file of files) {
    const md = await fs.readFile(file, 'utf8');
    const rawFM = parseFM(md);
    const idRaw = String(rawFM.id || '').toUpperCase();
    if (idRaw !== target) continue;

    const norm = buildNormalizedFM(rawFM);
    const diffs = diffFrontMatter(rawFM, norm);
    matches++;
    console.log('────────────────────────────────────────────────────────');
    logc('cyan', `REPORT for ${path.relative(opt.root, file)}`);
    console.log(`ID: ${idRaw}`);
    if (!diffs.length) {
      logc('green', 'No FM changes needed ✅');
      continue;
    }
    console.log('Planned FM changes:');
    for (const d of diffs) {
      console.log(`  - ${d.key}:`);
      console.log(`      from: ${d.from === '' ? '""' : d.from}`);
      console.log(`      to:   ${d.to === '' ? '""' : d.to}`);
    }
  }
  if (!matches) {
    logc('yellow', `No MD files with id="${target}" were found under ${path.relative(opt.root, opt.docsRoot)}`);
  }
}

// --- Per-ID TREE reporter (reports all MDs inside KNIFE folder for given ID) ---
async function runReportTree(opt) {
  const target = String(opt.reportTree || '').trim().toUpperCase();
  if (!target) { console.error('❌ --report-tree requires an ID value, e.g., K000083'); process.exit(2); }
  if (!(await pathExists(opt.docsRoot))) { console.error(`❌ Docs root not found: ${opt.docsRoot}`); process.exit(2); }

  // find folder(s) like docsRoot/K000083-*
  const entries = await fs.readdir(opt.docsRoot, { withFileTypes: true });
  const candDirs = entries
    .filter(e => e.isDirectory() && e.name.toUpperCase().startsWith(target + '-'))
    .map(e => path.join(opt.docsRoot, e.name));

  if (!candDirs.length) {
    console.log(`ℹ️  No directory starting with ${target}- found under ${path.relative(opt.root, opt.docsRoot)}`);
    return;
  }

  const files = [];
  async function walk(d) {
    const es = await fs.readdir(d, { withFileTypes: true });
    for (const e of es) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) await walk(p);
      else if (e.isFile() && e.name.toLowerCase().endsWith('.md')) files.push(p);
    }
  }
  for (const d of candDirs) await walk(d);

  if (!files.length) {
    console.log(`ℹ️  No .md files found in ${candDirs.map(x => path.relative(opt.root, x)).join(', ')}`);
    return;
  }

  let total = 0, changed = 0, created = 0;
  console.log('────────────────────────────────────────────────────────');
  logc('cyan', `TREE REPORT for ${target} – scanning ${files.length} MD files`);

  for (const file of files) {
    const md = await fs.readFile(file, 'utf8');
    const rawFM = parseFM(md);
    const norm = buildNormalizedFM(rawFM);
    const diffs = diffFrontMatter(rawFM, norm);
    total++;
    console.log('────────────────────────────────────────────────────────');
    console.log(`FILE: ${path.relative(opt.root, file)}`);
    if (!/^---\n[\s\S]+?\n---/m.test(md)) created++;
    if (!diffs.length) {
      logc('green', '  No FM changes needed ✅');
      continue;
    }
    changed++;
    console.log('  Planned FM changes:');
    for (const d of diffs) {
      console.log(`    - ${d.key}:`);
      console.log(`        from: ${d.from === '' ? '""' : d.from}`);
      console.log(`        to:   ${d.to === '' ? '""' : d.to}`);
    }
  }

  console.log('────────────────────────────────────────────────────────');
  console.log(`Summary for ${target}: files=${total}, FM-to-create=${created}, FM-to-change=${changed}`);
}

// ---------- FIX logic ----------
async function runCsvFix(opt) {
  // read CSV
  let csvText = '';
  try { csvText = await fs.readFile(opt.csvPath, 'utf8'); }
  catch { console.error(`❌ CSV not found: ${opt.csvPath}`); process.exit(2); }

  const { headers, rows, delim } = parseCSV(csvText);
  const nrows = rows.map(normalizeRowKeys);

  // map header keys to normalized form to keep column order when writing
  const headerNorm = headers.map(h => normKey(h));
  const headerMap = new Map(headers.map((h, i) => [normKey(h), { orig: h, idx: i }]));

  // apply fixes row-by-row
  for (let i = 0; i < nrows.length; i++) {
    const r = nrows[i];
    // ID normalize to upper K+digits
    if (r.id) r.id = String(r.id).toUpperCase();

    // 2) display_id fallback = ID
    if ((r.id || '') && !(r.display_id || '').trim()) {
      r.display_id = r.id;
    }

    const meta = compute(r, opt);

    // try to read FM for existing knife
    if (!meta.external && meta.folderName) {
      const dir = path.join(opt.docsRoot, meta.folderName);
      if (await pathExists(dir)) {
        const indexPath = path.join(dir, 'index.md');
        if (await pathExists(indexPath)) {
          const md = await fs.readFile(indexPath, 'utf8');
          const fm = parseFM(md);
          const fmGuid = String(fm.guid || '').trim();
          // 1) GUID from FM -> CSV if CSV GUID is empty/invalid
          const csvGuid = String(r.guid || '').trim();
          if (fmGuid && reUuidV4.test(fmGuid) && (!csvGuid || !reUuidV4.test(csvGuid))) {
            r.guid = fmGuid;
          }
        }
      } else {
        // 3) create folder scaffold (from real data in CSV)
        const newDir = dir;
        const csvGuid = String(r.guid || '').trim();
        await ensureKnifeScaffold(newDir, {
          id: meta.id,
          short: meta.short,
          guid: reUuidV4.test(csvGuid) ? csvGuid : undefined,
        });
      }
    }
  }

  // write back CSV preserving header order as much as possible
  const outHeader = headers.length ? headers : [
    'ID','display_id','GUID','DID','DAO','ShortTitle','Category','Type','Status','Priority','Date','Author','Authors','Tags','Description','Context_Origin_WhyItWasInitiated','Technology','SFIA_Level','SFIA_Domain','SFIA_Maturity','Related_KNIFE','PotentialOutputs','Owner','Org','Project','Locale','FolderName','SidebarLabel','LinkSlug','Copyright','RightsHolderContent','RightsHolderSystem','License','Disclaimer'
  ];
  const lines = [];
  lines.push(toCSVLine(outHeader, delim));

  for (const r of nrows) {
    // rebuild row in original header order
    const lineVals = outHeader.map(h => {
      const k = normKey(h);
      return r[k] ?? '';
    });
    lines.push(toCSVLine(lineVals, delim));
  }

  await fs.writeFile(opt.csvPath, lines.join('\n') + '\n', 'utf8');

  console.log(`== KNIFES fix summary ==`);
  console.log(`CSV updated: ${path.relative(opt.root, opt.csvPath)} (rows: ${nrows.length})`);
  console.log(`Docs root:  ${path.relative(opt.root, opt.docsRoot)}`);
  console.log(`Hotovo ✅`);
}

function compute(row, opt) {
  const id = String(row.id || row.ID || '').toUpperCase();
  const short = row.short_title || row.shorttitle || row['short title'] || '';
  const folderName = row.foldername?.trim() || (id && short ? `${id}-${kebab(short)}` : '');
  const linkSlugRaw = row.linkslug?.trim() || (folderName ? `/${opt.locale}/${opt.section}/${folderName}/` : '');
  const linkSlug = ensureSlash(linkSlugRaw);
  const sidebarLabel = row.sidebarlabel?.trim() || (id && short ? `${id} – ${short}` : '');
  const external = /^https?:\/\//i.test(linkSlug);
  return { id, short, folderName, linkSlug, sidebarLabel, external };
}

async function ensureKnifeScaffold(dir, { id, short, guid }) {
  await fs.mkdir(dir, { recursive: true });
  // subfolders
  for (const sub of ['img', 'multimedia']) {
    await fs.mkdir(path.join(dir, sub), { recursive: true });
  }
  // index.md (create only if absent)
  const indexPath = path.join(dir, 'index.md');
  if (!(await pathExists(indexPath))) {
    const fm = [
      '---',
      `id: ${id}`,
      short ? `title: "${short}"` : '',
      guid ? `guid: ${guid}` : '',
      '---',
      '',
      short ? `# ${short}` : `# ${id}`,
      '',
    ].filter(Boolean).join('\n');
    await fs.writeFile(indexPath, fm, 'utf8');
  }
}

function toCSVLine(values, delim) {
  return values.map(v => {
    const s = String(v ?? '');
    if (s.includes('"') || s.includes(delim) || /\s/.test(s)) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  }).join(delim);
}

async function main() {
  const opt = await resolveOptions();

  if (opt.reportId) {
    await runReportId(opt);
    return;
  }
  if (opt.reportTree) {
    await runReportTree(opt);
    return;
  }
  if (opt.fmOnly) {
    await runFmOnlyFix(opt);
    return;
  }

  if (opt.checkHeader) {
    await runHeaderChecks(opt);
    return;
  }

  // default: original CSV-guid scaffold fix
  await runCsvFix(opt);
}

main().catch(e => { console.error(e); process.exit(2); });