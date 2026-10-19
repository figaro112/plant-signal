// scripts/knifes_verify.mjs
// Robust verification for KNIFES CSV + local docs layout (CSV↔FM cross-check)
// One point of input: configurable via --config JSON, ENV, or CLI flags.
// Usage:
//   node scripts/knifes_verify.mjs --csv docs/config/data/KNIFE-OVERVIEW-ONLY.csv --root . --locale sk --section knifes --docs-dir docs
//   node scripts/knifes_verify.mjs --config docs/config/knifes_config.json
// Exit codes: 0 ok, 2 problems found

import fs from 'node:fs/promises';
import path from 'node:path';

// ---------- defaults ----------
const DEFAULTS = {
  csv: 'docs/config/data/KNIFES-OVERVIEW-INPUTs.csv',
  root: '.',
  locale: 'sk',
  docsDir: 'docs',
  section: 'knifes', // URL/FS segment, lowercase by convention
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
  }
  // ENV overrides (optional)
  out.csv = process.env.KNIFE_CSV || out.csv;
  out.root = process.env.KNIFE_ROOT || out.root;
  out.locale = process.env.KNIFE_LOCALE || out.locale;
  out.docsDir = process.env.KNIFE_DOCS_DIR || out.docsDir;
  out.section = process.env.KNIFE_SECTION || out.section;
  return out;
}

async function loadJsonIfExists(p) {
  try {
    const text = await fs.readFile(p, 'utf8');
    return JSON.parse(text);
  } catch { return null; }
}

async function resolveOptions() {
  const cli = parseArgs();
  const repo = path.resolve(cli.root || '.');

  // optional config JSON (CLI path or default docs/config/knifes_config.json)
  let cfg = null;
  if (cli.config) {
    const abs = path.isAbsolute(cli.config) ? cli.config : path.join(repo, cli.config);
    cfg = await loadJsonIfExists(abs);
  }
  if (!cfg) {
    cfg = await loadJsonIfExists(path.join(repo, 'docs', 'config', 'knifes_config.json'));
  }

  const final = {
    csv: (cfg?.csv ?? cli.csv),
    root: repo,
    locale: (cfg?.locale ?? cli.locale),
    docsDir: (cfg?.docsDir ?? cli.docsDir),
    section: (cfg?.section ?? cli.section),
  };

  // normalize
  final.section = String(final.section || '').trim() || DEFAULTS.section;
  final.docsDir = String(final.docsDir || '').trim() || DEFAULTS.docsDir;

  // absolute CSV path
  final.csvPath = path.isAbsolute(final.csv)
    ? final.csv
    : path.join(repo, final.csv);

  // docs root
  final.docsRoot = path.join(repo, final.docsDir, final.locale, final.section);

  return final;
}

// ---------- CSV ----------
function cleanse(s) {
  return String(s ?? '')
    .replace(/\u00A0/g, ' ')   // NBSP -> space
    .replace(/\s+/g, ' ')
    .trim();
}

function parseCSV(text) {
  text = String(text ?? '').replace(/^\uFEFF/, '').replace(/\r\n/g, '\n');
  const allLines = text.split('\n');
  // find first non-empty line that looks like a header (contains ID + Short Title variants)
  let headerIdx = -1;
  for (let i = 0; i < allLines.length; i++) {
    const raw = allLines[i];
    const line = cleanse(raw);
    if (!line) continue;
    const hasId = /(^|;|,|\t|\|)\s*ID\s*(;|,|\t|\||$)/i.test(line);
    const hasShort = /(Short\s*Title|ShortTitle|short_title)/i.test(line);
    const hasExplicit = line.startsWith('"ID","display_id"');
    if ((hasId && hasShort) || hasExplicit) { headerIdx = i; break; }
  }
  if (headerIdx === -1) {
    // fallback to first non-empty line to avoid crash, but result will be empty IDs
    headerIdx = allLines.findIndex(l => cleanse(l).length > 0);
    if (headerIdx === -1) return { headers: [], rows: [] };
  }

  // slice to the table region only
  const lines = allLines.slice(headerIdx).filter(l => l.length > 0);
  const headerLine = lines[0];
  const delim = headerLine.includes(';') ? ';' : (headerLine.includes('\t') ? '\t' : ',');

  // split a single CSV line by delimiter while respecting quotes
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
    if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
      return s.slice(1, -1);
    }
    return s;
  }

  // split header
  const headers = splitCsvLine(headerLine, delim).map(h => unquote(h));
  const rows = [];

  for (const line of lines.slice(1)) {
    // accept only rows that start with a KNIFE ID; skip narrative/footer text
    const parts = splitCsvLine(line, delim).map(unquote);
    const idCandidate = cleanse(parts[0] ?? '');
    if (!/^K\d+$/i.test(idCandidate)) {
      continue;
    }

    // stop when we hit a new preamble-like section (heuristic: single-column line)
    const cleaned = cleanse(line);
    if (!cleaned) continue;

    // ignore footer/notes lines that clearly don't align to header width (less than 2 cols and not quoted)
    if (parts.length < Math.min(2, headers.length)) continue;

    const obj = {};
    headers.forEach((h, idx) => { obj[h] = cleanse(parts[idx] ?? ''); });
    rows.push(obj);
  }

  // helpful debug in verify mode
  console.log(`[verify] CSV header detected at line ${headerIdx + 1} using delimiter '${delim === '\t' ? 'TAB' : delim}' with columns: ${headers.map(h => `"${h}"`).join(', ')}`);
  return { headers, rows };
}

function normKey(k) {
  return String(k || '')
    .toLowerCase()
    .replace(/\s+/g, '_')       // "Short Title" -> "short_title"
    .replace(/[()]/g, '')
    .replace(/_+/g, '_');
}

function normalizeRowKeys(r) {
  const out = {};
  for (const [k, v] of Object.entries(r)) out[normKey(k)] = v;
  return out;
}

function kebab(s) {
  return (s || 'untitled')
    .normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
}

function ensureSlash(s) { return s?.endsWith('/') ? s : (s || '') + '/'; }

function compute(row, opt) {
  const id = String(row.id || row.id_ || row.ID || '').toUpperCase();
  const short = row.short_title || row.shorttitle || row['short title'] || '';
  const folderName = row.foldername?.trim() || (id && short ? `${id}-${kebab(short)}` : '');
  const linkSlugRaw = row.linkslug?.trim() || (folderName ? `/${opt.locale}/${opt.section}/${folderName}/` : '');
  const linkSlug = ensureSlash(linkSlugRaw);
  const sidebarLabel = row.sidebarlabel?.trim() || (id && short ? `${id} – ${short}` : '');
  const external = /^https?:\/\//i.test(linkSlug);
  return { id, short, folderName, linkSlug, sidebarLabel, external };
}

async function pathExists(p) { try { await fs.access(p); return true; } catch { return false; } }

// ---------- FM (very light parser for first YAML block) ----------
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

const reUuidV4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// ---------- main ----------
async function main() {
  const opt = await resolveOptions();

  const out = { errors: [], warns: [], info: [] };

  // read CSV
  let text = '';
  try { text = await fs.readFile(opt.csvPath, 'utf8'); }
  catch { console.error(`❌ CSV not found: ${opt.csvPath}`); process.exit(2); }

  const { headers, rows: rawRows } = parseCSV(text);
  const rows = rawRows.map(normalizeRowKeys)
    .filter(r => String(r.id || '').toUpperCase() !== 'ID'); // drop accidental header in body

  // duplicity a formát
  const seenId = new Map();
  const seenGuid = new Map();

  for (const r of rows) {
    const c = compute(r, opt);

    // ID (allow K + any digits)
    if (!/^K\d+$/i.test(c.id)) out.errors.push(`ID '${c.id}' má zlý formát (očakávam K<číslo>, napr. K1, K000085).`);
    seenId.set(c.id, (seenId.get(c.id) || 0) + 1);

    // Short title
    if (!c.short) out.errors.push(`ID ${c.id}: prázdny "short_title".`);

    // display_id (optional but recommended)
    const displayId = r.display_id || '';
    if (!displayId) out.warns.push(`ID ${c.id}: chýba display_id (fallback=ID, zváž doplnenie v CSV).`);

    // GUID
    const guid = String(r.guid || '').trim();
    if (guid) {
      if (!reUuidV4.test(guid)) out.errors.push(`ID ${c.id}: GUID '${guid}' nemá formát UUID v4.`);
      seenGuid.set(guid, (seenGuid.get(guid) || 0) + 1);
    } else {
      out.warns.push(`ID ${c.id}: chýba GUID (očakáva sa spätným dopísaním pri generovaní).`);
    }

    // lokálne súbory / priečinky
    if (!c.external) {
      if (!c.folderName) {
        out.errors.push(`ID ${c.id}: neviem odvodiť folderName (skontroluj short_title/ID).`);
      } else {
        const dir = path.join(opt.docsRoot, c.folderName);
        if (!(await pathExists(dir))) {
          out.warns.push(`ID ${c.id}: chýba priečinok '${path.relative(opt.root, dir)}' pre interný slug ${c.linkSlug}.`);
        } else {
          // index.md
          const indexPath = path.join(dir, 'index.md');
          if (!(await pathExists(indexPath))) {
            out.warns.push(`ID ${c.id}: chýba index.md v '${path.relative(opt.root, dir)}'.`);
          } else {
            // CSV ↔ FM cross-check
            const md = await fs.readFile(indexPath, 'utf8');
            const fm = parseFM(md);
            if (fm.id && String(fm.id).toUpperCase() !== c.id) out.warns.push(`ID ${c.id}: FM.id='${fm.id}' sa líši od CSV.id='${c.id}'.`);
            if (guid && fm.guid && fm.guid !== guid) out.warns.push(`ID ${c.id}: FM.guid='${fm.guid}' ≠ CSV.guid='${guid}'.`);
            if (c.short && fm.title && fm.title !== c.short) out.warns.push(`ID ${c.id}: FM.title='${fm.title}' ≠ CSV.short_title='${c.short}'.`);
          }
          // img / multimedia
          for (const sub of ['img', 'multimedia']) {
            const p = path.join(dir, sub);
            if (!(await pathExists(p))) out.warns.push(`ID ${c.id}: priečinok '${sub}/' chýba v '${path.relative(opt.root, dir)}'.`);
          }
        }
        // názvoslovie priečinka – povoľ veľké 'K' v prefixe 'K<číslo>-', inak varuj na UpperCase/space
        const fnameRest = c.folderName.replace(/^K\d+-/, '');
        if (/[A-Z\s]/.test(fnameRest)) {
          out.warns.push(`ID ${c.id}: FolderName '${c.folderName}' obsahuje veľké písmená/medzery (preferuj lowercase-kebab, povolené je iba 'K<číslo>-' prefix).`);
        }
      }
    } else {
      // externý slug + lokálny priečinok?
      const dir = c.folderName ? path.join(opt.docsRoot, c.folderName) : '';
      if (dir && await pathExists(dir)) out.warns.push(`ID ${c.id}: externý slug (${c.linkSlug}), ale existuje lokálny priečinok '${path.relative(opt.root, dir)}' → zváž konzolidáciu.`);
    }
  }

  // duplicity
  for (const [k, n] of seenId) if (n > 1) out.errors.push(`Duplicitné ID v CSV: ${k} (počet ${n}).`);
  for (const [g, n] of seenGuid) if (n > 1) out.errors.push(`Duplicitný GUID v CSV: ${g} (počet ${n}).`);

  // všeobecný sanity-check názvov v sekcii
  if (await pathExists(opt.docsRoot)) {
    const entries = await fs.readdir(opt.docsRoot, { withFileTypes: true });
    for (const e of entries) {
      if (e.isDirectory()) {
        const rest = e.name.replace(/^K\d+-/, '');
        if (/[A-Z\s]/.test(rest)) {
          out.warns.push(`Priečinok v ${path.relative(opt.root, opt.docsRoot)} má netradičný názov: '${e.name}' (uppercase/space; povolený je len prefix 'K<číslo>-').`);
        }
      }
    }
  }

  // report
  const pad = s => String(s).padStart(3, ' ');
  console.log(`\n== KNIFES verify summary ==`);
  console.log(`CSV: ${path.relative(opt.root, opt.csvPath)} | Locale: ${opt.locale} | Section: ${opt.section} | DocsDir: ${opt.docsDir}`);
  console.log(`Errors: ${pad(out.errors.length)} | Warnings: ${pad(out.warns.length)}\n`);

  if (out.errors.length) {
    console.log(`-- Errors --`);
    out.errors.forEach(m => console.log('✗', m));
    console.log('');
  }
  if (out.warns.length) {
    console.log(`-- Warnings --`);
    out.warns.forEach(m => console.log('•', m));
    console.log('');
  }

  process.exit(out.errors.length ? 2 : 0);
}

main().catch(e => { console.error(e); process.exit(2); });
