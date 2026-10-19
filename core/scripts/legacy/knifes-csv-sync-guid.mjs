#!/usr/bin/env node
/**
 * KNIFES – CSV Sync GUID from Frontmatter
 * Cieľ: prečítať GUID z MD (frontmatter) a doplniť/opraviť ho v CSV.
 *
 * Použitie:
 *   DRY:   node scripts/knifes-csv-sync-guid.mjs --config config/knifes_config.json --dry
 *   APPLY: node scripts/knifes-csv-sync-guid.mjs --config config/knifes_config.json --apply
 *   Alebo parametre napriamo:
 *   --csv path/to.csv --docs docs/sk/knifes --dry|--apply
 *   Voliteľne: --fields guid,dao,did (default: guid)
 *
 * Čo robí:
 *   1) Nájde CSV (prednosť má --csv; inak z configu: csvPath, fallback: csv)
 *   2) Nájde koreň MD dokumentácie (--docs alebo z configu: docsDir, fallback: "docs")
 *   3) Z každej MD hlavičky (--- … ---) vyberie id a guid
 *   4) V CSV (podľa stĺpca id) doplní/opraviť stĺpec guid
 *   5) DRY: len report záznamov (id, from → to). APPLY: zapíše, vytvorí .bak
 *
 * Poznámky:
 *   - Hlavičku CSV hľadá robustne (nájde prvý riadok, kde aliasy obsahujú id+title)
 *   - Ak CSV nemá stĺpec "guid", pridá ho na koniec
 *   - Pracuje len so základnými KNIFE ID (napr. K000059). Pod-ID (K000059_01) ignoruje v CSV.
 *   - Syncuje len zvolenú podmnožinu polí; default je guid.
 */
import fs from 'node:fs/promises';
import path from 'node:path';

const ARGS = new Set(process.argv.slice(2));
const getVal = (name, def=null) => {
  const i = process.argv.indexOf(name);
  return i>=0 && process.argv[i+1] ? process.argv[i+1] : def;
};

const CONFIG_PATH = getVal('--config', 'config/knifes_config.json');
const CSV_CLI     = getVal('--csv', null);
const DOCS_CLI    = getVal('--docs', null);
const APPLY       = ARGS.has('--apply');
const DRY         = !APPLY;

const FIELDS_CLI = getVal('--fields', 'guid');
const FIELDS = FIELDS_CLI.split(',').map(s=>s.trim().toLowerCase()).filter(Boolean);

const REPORT_MISSING = getVal('--report-missing', null); // expects one of: guid, dao, did
const REPORT_MISMATCH = getVal('--report-mismatch', null); // expects one of: guid, dao, did

const ID_FILTER_RAW = getVal('--id', null);
const ID_FILTER = ID_FILTER_RAW ? (ID_FILTER_RAW.trim()) : null;
const BASEID_FILTER = ID_FILTER ? (ID_FILTER.match(/^K/i) ? ID_FILTER : 'K'+ID_FILTER) : null;

const stripBOM = s => s.replace(/^\uFEFF/, '');

function detectDelimiter(firstNonEmptyLine){
  const c = (firstNonEmptyLine.match(/,/g)||[]).length;
  const sc = (firstNonEmptyLine.match(/;/g)||[]).length;
  return sc>c ? ';' : ',';
}
function parseCSV(text, delimiter){
  const rows = [];
  let cur = [], field = '', inQuotes = false;
  for (let i=0; i<text.length; i++){
    const ch = text[i], next = text[i+1];
    if (inQuotes){
      if (ch === '"' && next === '"') { field += '"'; i++; continue; }
      if (ch === '"'){ inQuotes = false; continue; }
      field += ch; continue;
    } else {
      if (ch === '"'){ inQuotes = true; continue; }
      if (ch === delimiter){ cur.push(field); field=''; continue; }
      if (ch === '\n'){ cur.push(field); rows.push(cur); cur=[]; field=''; continue; }
      if (ch === '\r'){ continue; }
      field += ch;
    }
  }
  cur.push(field); rows.push(cur);
  if (rows.length && rows[rows.length-1].length===1 && rows[rows.length-1][0]==='') rows.pop();
  return rows;
}
function stringifyCSV(rows, delimiter){
  const esc = v => {
    if (v==null) v='';
    const s = String(v);
    if (s.includes('"') || s.includes('\n') || s.includes('\r') || s.includes(delimiter)){
      return '"' + s.replace(/"/g, '""') + '"';
    }
    return s;
  };
  return rows.map(r => r.map(esc).join(delimiter)).join('\n') + '\n';
}

// aliasy -> kanonické
const ALIASES = new Map(Object.entries({
  id: ['ID','Id','knife_id'],
  display_id: ['Display_ID','DisplayId','display id'],
  title: ['Title','Short Title','ShortTitle','Názov','Nazov'],
  guid: ['GUID','Guid'],
  did: ['DID','Did'],
  dao: ['DAO'],
  created: ['Created','Date','Dátum','Datum','Created [YYYY-MM-DD]','Created[YYYY-MM-DD]'],
  modified: ['Modified','Last Modified','Updated','Modified [YYYY-MM-DD]','Modified[YYYY-MM-DD]'],
}));

const normalizeHeader = h => h.trim().toLowerCase().replace(/\s+/g,'_');
function canonName(h){
  const n = normalizeHeader(h);
  for (const [canon, list] of ALIASES.entries()){
    if (n===canon) return canon;
    if (list.map(x=>normalizeHeader(x)).includes(n)) return canon;
  }
  return n;
}
const buildIndexMap = headers => {
  const m = new Map();
  headers.forEach((h,i)=> m.set(h,i));
  return m;
};

async function readConfig(){
  try {
    const cfg = JSON.parse(await fs.readFile(CONFIG_PATH,'utf8'));
    return cfg || {};
  } catch { return {}; }
}

async function walk(dir){
  const out = [];
  async function _walk(d){
    const ents = await fs.readdir(d, { withFileTypes: true });
    for (const e of ents){
      const p = path.join(d, e.name);
      if (e.isDirectory()) await _walk(p);
      else if (e.isFile() && e.name.toLowerCase().endsWith('.md')) out.push(p);
    }
  }
  await _walk(dir);
  return out;
}

function extractFM(text){
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return {};
  const fm = {};
  const lines = m[1].split(/\r?\n/);
  for (const line of lines){
    const mm = line.match(/^\s*([A-Za-z0-9_]+)\s*:\s*(.*)\s*$/);
    if (!mm) continue;
    const key = mm[1].trim();
    let val = mm[2].trim();
    // strip trailing comments (# …)
    val = val.replace(/\s+#.*$/, '').trim();
    // unwrap quotes if "..."
    const q = val.match(/^"(.*)"$/);
    if (q) val = q[1];
    fm[key.toLowerCase()] = val;
  }
  return fm;
}

// Added robust normalization helpers
function normVal(v){
  if (v === undefined || v === null) return '';
  let s = String(v);
  // normalize NBSP to space
  s = s.replace(/\u00A0/g, ' ');
  // strip outer quotes
  s = s.replace(/^"+|"+$/g, '');
  // collapse whitespace
  return s.trim();
}
function isEmptyVal(v){
  const t = normVal(v).toLowerCase();
  if (!t) return true;
  return t === 'null' || t === 'n/a' || t === '-';
}

function toBaseId(id){
  // normalize things like K59, K059, K000059 → return canonical as-is if already 6-digit
  if (!id) return '';
  const m = String(id).trim().match(/^K(\d+)(?:_.+)?$/i);
  if (!m) return String(id).trim();
  const n = m[1].padStart(6,'0');
  return `K${n}`;
}

async function buildFieldMapFromDocs(docsRoot){
  const files = await walk(docsRoot);
  const map = new Map(); // id -> { guid, dao, did }
  const paths = new Map(); // id -> file path
  for (const f of files){
    const base = path.basename(f).toLowerCase();
    if (base !== 'index.md') continue;
    try {
      const txt = await fs.readFile(f,'utf8');
      const fm = extractFM(txt);
      const id = toBaseId(fm['id']);
      if (!id) continue;
      const rec = map.get(id) || {};
      if (fm['guid']) rec.guid = String(fm['guid']).trim();
      if (fm['dao'])  rec.dao  = String(fm['dao']).trim();
      if (fm['did'])  rec.did  = String(fm['did']).trim();
      if (Object.keys(rec).length) {
        map.set(id, rec);
        if (!paths.has(id)) paths.set(id, f);
      }
    } catch { /* ignore */ }
  }
  return { map, paths };
}

async function main(){
  const cfg = await readConfig();

  // CSV path
  let csvPath = CSV_CLI || cfg.csvPath || cfg.csv || null;
  if (!csvPath){
    console.error('❌ Zadaj cestu k CSV: --csv path.csv alebo doplň "csvPath" (resp. staršie "csv") do config/knifes_config.json');
    process.exit(2);
  }

  // Docs root
  let docsRoot = DOCS_CLI || cfg.docsDir || 'docs';
  // Ak máš KNIFES pod 'docs/sk/knifes', nech je to v configu: { "docsDir": "docs/sk/knifes" }

  // 1) načítaj CSV
  const raw = stripBOM(await fs.readFile(csvPath,'utf8'));
  const firstLine = raw.split(/\r?\n/).find(l=>l.trim().length>0) || '';
  const delim = detectDelimiter(firstLine);
  const rows = parseCSV(raw, delim);
  if (!rows.length){ console.error('❌ CSV je prázdne'); process.exit(2); }

  // 2) nájdi hlavičku (riadok s id + title po aliasovaní)
  let headerIdx = -1;
  let origHeader = null;
  let canonHeader = null;
  for (let r=0; r<rows.length; r++){
    const candidate = rows[r].map(x => String(x||'').trim());
    const canon = candidate.map(canonName);
    const hasId = canon.includes('id');
    const hasTitle = canon.includes('title');
    if (hasId && hasTitle){ headerIdx=r; origHeader=candidate; canonHeader=canon; break; }
  }
  if (headerIdx === -1){ console.error('❌ CSV musí mať hlavičky aspoň id a title.'); process.exit(2); }

  // ensure all requested fields exist in header
  const needed = new Set(FIELDS);
  for (const f of needed){
    if (!canonHeader.includes(f)){
      canonHeader.push(f);
      origHeader.push(f);
      rows[headerIdx] = origHeader;
    }
  }

  // If multiple canonical "id" columns exist, prefer the leftmost
  const idCount = canonHeader.filter(h => h === 'id').length;
  if (idCount > 1) {
    console.warn('WARN: multiple "id" columns detected; using the leftmost');
  }

  const dataRows = rows.slice(headerIdx+1);

  // 3) priprav indexy stĺpcov
  const idx = buildIndexMap(canonHeader);
  const I_ID = canonHeader.indexOf('id'); // use leftmost canonical id
  const getIdx = (name) => idx.has(name) ? idx.get(name) : -1;

  // 4) postav mapu id->fieldObj z MD
  const { map: mdMap, paths: mdPaths } = await buildFieldMapFromDocs(docsRoot);

  // 5.5) REPORT modes (early return)
  if (REPORT_MISSING || REPORT_MISMATCH) {
    const field = (REPORT_MISSING || REPORT_MISMATCH).trim().toLowerCase();
    if (!['guid','dao','did'].includes(field)) {
      console.error(`❌ Unsupported field for report: ${field}. Use one of: guid, dao, did.`);
      process.exit(2);
    }
    const iCol = getIdx(field);
    if (iCol === -1) {
      console.error(`❌ CSV does not contain column "${field}". Try syncing once to add it.`);
      process.exit(2);
    }
    const missing = [];   // CSV empty, MD has value
    const mismatch = [];  // CSV value != MD value (both non-empty)

    for (let r=0; r<dataRows.length; r++){
      const row = dataRows[r];
      const baseId = toBaseId(row[I_ID] || '');
      const csvRaw = row[iCol];
      const mdRec = mdMap.get(baseId) || {};
      const mdRaw = (mdRec && mdRec[field]) || '';
      const csvVal = normVal(csvRaw);
      const mdVal  = normVal(mdRaw);

      if (REPORT_MISSING) {
        if (isEmptyVal(csvRaw) && !isEmptyVal(mdRaw)) missing.push({ id: baseId, md: mdVal });
      }
      if (REPORT_MISMATCH) {
        if (!isEmptyVal(csvRaw) && !isEmptyVal(mdRaw) && csvVal !== mdVal) mismatch.push({ id: baseId, csv: csvVal, md: mdVal });
      }
    }

    console.log(`🧾 REPORT (${REPORT_MISSING ? 'missing' : 'mismatch'}) for field: ${field}`);
    if (REPORT_MISSING) {
      console.log(`CSV empty but MD has value → count: ${missing.length}`);
      const show = Math.min(50, missing.length);
      for (let i=0;i<show;i++){
        const it = missing[i];
        console.log(`  - ${it.id}: ∅ → "${it.md}"`);
      }
      if (missing.length>show) console.log(`  …and ${missing.length-show} more.`);
    }
    if (REPORT_MISMATCH) {
      console.log(`CSV and MD differ (both non-empty) → count: ${mismatch.length}`);
      const show = Math.min(50, mismatch.length);
      for (let i=0;i<show;i++){
        const it = mismatch[i];
        console.log(`  - ${it.id}: CSV="${it.csv}" ≠ MD="${it.md}"`);
      }
      if (mismatch.length>show) console.log(`  …and ${mismatch.length-show} more.`);
    }
    return; // report-only
  }

  let matchedCsvRow = false;

  // 5) prechádzaj CSV a priprav diffs
  let changed = 0;
  const diffs = [];
  const out = [canonHeader];
  for (let r=0; r<dataRows.length; r++){
    const row = dataRows[r].slice();
    while (row.length < canonHeader.length) row.push('');
    const before = row.slice();

    const baseId = toBaseId(row[I_ID] || '');
    // If an ID filter is provided, skip non-matching rows
    if (BASEID_FILTER && baseId !== BASEID_FILTER) { out.push(row); continue; }
    matchedCsvRow = true;

    const mdRec = mdMap.get(baseId);

    if (ID_FILTER && !mdRec) {
      console.log(`TRACE ${baseId}: no MD record found`);
    }

    if (mdRec){
      if (ID_FILTER) {
        const fieldsView = FIELDS.map(f => `${f}="${(mdRec[f]||'').trim()}"`).join(', ');
        const srcPath = mdPaths.get(baseId) || '(unknown)';
        console.log(`TRACE ${baseId}: MD { ${fieldsView} } @ ${srcPath}`);
      }
      for (const f of FIELDS){
        const iCol = getIdx(f);
        if (iCol === -1) continue;
        const mdRaw  = (mdRec[f] || '');
        const csvRaw = (row[iCol] || '');
        const mdVal  = normVal(mdRaw);
        const oldVal = normVal(csvRaw);
        if (isEmptyVal(mdRaw)) continue; // sync only if MD has a meaningful value
        if (ID_FILTER) {
          console.log(`TRACE ${baseId}: CSV.${f}="${oldVal}" → MD.${f}="${mdVal}"`);
        }
        if (oldVal !== mdVal){
          row[iCol] = mdVal; // write normalized value
          changed++;
          diffs.push({ id: baseId || `#${r+1}`, field: f, from: oldVal || '∅', to: mdVal });
        }
      }
    }
    out.push(row);
  }

  if (ID_FILTER && !matchedCsvRow) {
    console.log(`TRACE ${BASEID_FILTER}: not found in CSV id column`);
  }

  // 6) report / zápis
  if (DRY){
    console.log(`🔎 Sync (MD → CSV) – DRY report [fields: ${FIELDS.join(', ')}]`);
    console.log(`Docs root: ${docsRoot}`);
    console.log(`CSV: ${csvPath}`);
    const mdStats = { guid:0, dao:0, did:0 };
    for (const rec of mdMap.values()){
      if (rec.guid) mdStats.guid++;
      if (rec.dao)  mdStats.dao++;
      if (rec.did)  mdStats.did++;
    }
    console.log(`Found in MD → guid:${mdStats.guid}, dao:${mdStats.dao}, did:${mdStats.did}`);
    console.log(`Fields selected: ${FIELDS.join(', ')}`);
    console.log(`Rows checked: ${dataRows.length}, would update: ${changed}\n`);
    if (diffs.length){
      const max = Math.min(diffs.length, 30);
      console.log(`Details (first ${max} of ${diffs.length}):`);
      for (let i=0;i<max;i++){
        const d = diffs[i];
        console.log(`  - ${d.id}: ${d.field}: ${d.from ? `"${d.from}"` : '∅'} → "${d.to}"`);
      }
      if (diffs.length>max) console.log(`  …and ${diffs.length-max} more.`);
    } else {
      console.log('No changes needed ✅');
    }
    return;
  }

  // APPLY
  const backup = `${csvPath}.bak`;
  try { await fs.copyFile(csvPath, backup); } catch {}
  const text = stringifyCSV([origHeader, ...out.slice(1)], delim);
  await fs.writeFile(csvPath, text, 'utf8');
  console.log(`✅ Sync applied (fields: ${FIELDS.join(', ')}). Backup: ${path.basename(backup)} | rows=${dataRows.length} | updated=${changed}`);
}

main().catch(err=>{ console.error(err); process.exit(1); });