#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';

const args = process.argv;
const getArg = (n, d=null) => { const i=args.indexOf(n); return i>=0 ? args[i+1] : d; };

const KNIFES_DIR = getArg('--dir', 'docs/sk/knifes');
const OUT_DIR    = getArg('--outdir', 'config/out');
const CSV_REF    = getArg('--csv');               // voliteľný: pre audit
const WITH_README = args.includes('--include-readme');
const IGNORE_CSV_IDS = new Set((getArg('--ignore','') || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean)
  .map(s => s.toUpperCase()));

const CSV_HEADER = [
  'ID','display_id','GUID','DID','DAO','ShortTitle','Category','Type','Status','Priority','Created [YYYY-MM-DD]',
  'Author','Authors','Tags','Description','Context_Origin_WhyItWasInitiated','Technology','SFIA_Level','SFIA_Domain','SFIA_Maturity',
  'Related_KNIFE','PotentialOutputs','Owner','Org','Project','Locale','FolderName','SidebarLabel','LinkSlug','Copyright',
  'RightsHolderContent','RightsHolderSystem','License','Disclaimer'
];

const IGNORE_DIRS = [/\/\.git\//, /(^|\/)ref(s)?\b/i];
const KNIFE_DIR_RX = /(^|\/)[Kk]\d{6}-[^/]+(?:\/)?$/;

const ts = () => {
  const d = new Date();
  const p = (n)=> String(n).padStart(2,'0');
  return `${d.getFullYear()}${p(d.getMonth()+1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
};

function parseFrontmatter(md) {
  const m = md.match(/^---\n([\s\S]*?)\n---/);
  if (!m) return {};
  const y = m[1];
  const o = {};
  for (const ln of y.split(/\r?\n/)) {
    if (!ln.trim() || ln.trim().startsWith('#')) continue;
    const ix = ln.indexOf(':');
    if (ix < 0) continue;
    const k = ln.slice(0, ix).trim();
    let v = ln.slice(ix + 1).trim();
    if (/^\[.*\]$/.test(v)) {
      o[k] = v.replace(/^\[|\]$/g,'').split(',').map(s=>s.trim().replace(/^"|"$/g,'')).filter(Boolean).join('; ');
    } else {
      o[k] = v.replace(/^"|"$/g,'');
    }
  }
  return o;
}

function csvEsc(s){
  if (s==null) s='';
  s = String(s);
  if (s.includes('"') || s.includes(',') || s.includes('\n')) return `"${s.replace(/"/g,'""')}"`;
  return s;
}

function fmToRow(fm, folderName, derivedId){
  const r = {};
  r.ID   = fm.id || fm.ID || derivedId || '';
  r.GUID = fm.guid || fm.GUID || '';
  r['ShortTitle'] = fm.title || fm.ShortTitle || '';
  r.Author   = fm.author || fm.Author || '';
  r.Category = fm.category || '';
  r.Type     = fm.type || '';
  r.Priority = fm.priority || '';
  r['Created [YYYY-MM-DD]'] = fm.created || '';
  // tags can be array or string in FM; normalize to semicolon-separated string
  const tags = fm.tags || fm.Tags || '';
  r.Tags = Array.isArray(tags) ? tags.join('; ') : tags;
  r.FolderName = folderName || '';
  // ostatné nechávame prázdne (CSV si zachová hlavičku)
  return r;
}

// --- CSV helpers (robust splitter respecting quotes) ---
function splitCsvLine(line) {
  const out = [];
  let cur = '';
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      // handle escaped quotes ("")
      if (inQ && line[i + 1] === '"') { cur += '"'; i++; continue; }
      inQ = !inQ;
      continue;
    }
    if (ch === ',' && !inQ) { out.push(cur); cur = ''; continue; }
    cur += ch;
  }
  out.push(cur);
  return out;
}

async function loadCsvMap(csvPath){
  let txt = await fs.readFile(csvPath, 'utf8');
  txt = txt.replace(/^\uFEFF/,'');
  const rawLines = txt.split(/\r?\n/);
  // drop purely empty lines (but keep lines with commas)
  const lines = rawLines.filter(l => l.trim() !== '');
  // find "DATA START" (optional)
  let startIdx = lines.findIndex(l => /^"?\s*data\s*start\s*"?$/i.test(l.trim()));
  if (startIdx < 0) startIdx = 0;
  // find header: first line at/after startIdx that, when split, contains an "ID" column
  let headerIdx = -1, header = null, idxID = -1;
  for (let i = Math.max(0, startIdx); i < lines.length; i++) {
    const cols = splitCsvLine(lines[i]).map(s => s.trim().replace(/^"|"$/g,''));
    const idPos = cols.findIndex(h => /^id$/i.test(h));
    if (idPos >= 0) { headerIdx = i; header = cols; idxID = idPos; break; }
  }
  if (headerIdx < 0 || idxID < 0) {
    throw new Error('CSV header with ID column not found');
  }
  const map = new Map();
  let badCount = 0;
  for (let i = headerIdx + 1; i < lines.length; i++) {
    const row = splitCsvLine(lines[i]);
    const idRaw = (row[idxID] ?? '').replace(/^"|"$/g,'').trim();
    if (!idRaw) continue;
    const id = idRaw.toUpperCase();
    // Accept only canonical KNIFE IDs (K000000), or REF-* helper rows. Everything else is ignored.
    const isKnifeId = /^K\d{6}$/.test(id);
    const isRefId   = /^REF-[A-Z0-9-]+-\d+$/.test(id);
    if (!(isKnifeId || isRefId)) { badCount++; continue; }
    if (!IGNORE_CSV_IDS.has(id)) {
      map.set(id, true);
    }
  }
  if (badCount) {
    console.log(`ℹ️  CSV audit: ignored ${badCount} non-ID rows in reference CSV (column 'ID').`);
  }
  return map;
}

// --- FS helpers ---
async function* walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      yield full;
      yield* walk(full);
    }
  }
}

async function main(){
  await fs.mkdir(OUT_DIR, { recursive:true });
  const outCsv = path.join(OUT_DIR, `KNIFES-OVERVIEW-${ts()}.csv`);

  const dirs = [];
  for await (const d of walk(KNIFES_DIR)) {
    const norm = d.replace(/\\/g,'/');
    if (IGNORE_DIRS.some(rx => rx.test(norm))) continue;
    if (KNIFE_DIR_RX.test(norm)) dirs.push(d);
  }

  const rows = [];
  const idsFS = new Set();

  for (const e of dirs){
    const dir = e;
    const fmFiles = [path.join(dir,'index.md'), path.join(dir,'Index.md'), path.join(dir,'README.md'), path.join(dir,'readme.md')];
    if (!WITH_README) {
      // keep only index variants
      fmFiles.splice(2);
    }

    let used = null, fmObj = null;
    for (const f of fmFiles){
      try {
        const md = await fs.readFile(f,'utf8');
        const fm = parseFrontmatter(md);
        if (Object.keys(fm).length) { used = f; fmObj = fm; break; }
      } catch {}
    }
    if (!fmObj) continue;

    const base = path.basename(dir);
    const idFromDir = (base.match(/^[Kk]\d{6}/) || [])[0] || '';
    const id = (fmObj.id || fmObj.ID || idFromDir).toString().toUpperCase();
    if (id) idsFS.add(id);

    const row = fmToRow(fmObj, base, idFromDir);
    rows.push(row);
  }

  // write new snapshot (preambula + hlavička)
  const preamble = 'HEADER\n"DATA START"\n';
  const lines = [];
  lines.push(CSV_HEADER.map(csvEsc).join(','));
  for (const r of rows){
    const arr = CSV_HEADER.map(h => csvEsc(r[h] ?? ''));
    lines.push(arr.join(','));
  }
  await fs.writeFile(outCsv, preamble + lines.join('\n') + '\n', 'utf8');
  console.log(`✔ CSV snapshot written: ${outCsv}`);

  // optional audit
  if (CSV_REF){
    try {
      const idsCSV = await loadCsvMap(CSV_REF);
      console.log('--- AUDIT ---');
      const rawOnlyFS  = [...idsFS].filter(id => !IGNORE_CSV_IDS.has(id));
      const rawOnlyCSV = [...idsCSV.keys()].filter(id => !idsFS.has(id));
      const onlyFS  = rawOnlyFS;
      const onlyCSV = rawOnlyCSV;
      console.log(`Only in FS (${onlyFS.length}): ${onlyFS.length ? onlyFS.join(', ') : '-'}`);
      console.log(`Only in CSV (${onlyCSV.length}): ${onlyCSV.length ? onlyCSV.join(', ') : '-'}`);
      console.log(`Scanned KNIFE dirs: ${dirs.length}, FM rows parsed: ${rows.length}, IDs FS: ${idsFS.size}, IDs CSV: ${idsCSV.size}`);
    } catch(e){
      console.warn('AUDIT skipped:', e.message);
    }
  }
}

main().catch(e => { console.error('SCAN failed:', e); process.exit(1); });