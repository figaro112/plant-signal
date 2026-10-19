#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';

const args = process.argv;
const getArg = (name, def=null) => { const i = args.indexOf(name); return i>=0 ? args[i+1] : def; };
const csvPath = getArg('--csv', 'config/data/KNIFES-OVERVIEW-INPUTs.csv');
const knifesDir = getArg('--dir', 'docs/sk/knifes');
const dry = args.includes('--dry-run');
const force = args.includes('--force'); // zatiaľ nepoužijeme, default je fill-only

// ---- CSV robust loader (DATA START, HEADER marker, autodetekcia deliaceho znaku) ----
async function loadCsv(p){
  let txt = await fs.readFile(p, 'utf8');
  txt = txt.replace(/^\uFEFF/, '');
  const lines = txt.split(/\r?\n/);

  const isNoise = s => {
    const t = (s||'').trim();
    if (!t) return true;
    if (t.startsWith('#')) return true;
    if (/^[",;|\t]+$/.test(t)) return true;
    if (/^"?header"?$/i.test(t)) return true;
    return false;
  };
  const pickDelimiter = line => {
    const cands=[',',';','\t','|'];
    let best=cands[0], n=line.split(cands[0]).length;
    for (let j=1;j<cands.length;j++){ const m=line.split(cands[j]).length; if(m>n){best=cands[j]; n=m;} }
    return best;
  };

  let dataStart = -1;
  for (let i=0;i<lines.length;i++) if (/data\s*start/i.test(lines[i]||'')) { dataStart=i; break; }

  const looksLikeHeader = raw => {
    const delim = pickDelimiter(raw.trim());
    const cells = raw.split(delim).map(s=>s.trim().replace(/^"|"$/g,''));
    const probe = (cells[0] && /^header$/i.test(cells[0])) ? cells.slice(1) : cells;
    return probe.some(c => /^id$/i.test(c) || /^kid$/i.test(c) || /^knifeid$/i.test(c));
  };

  let headerIdx = -1, delim = ',';
  if (dataStart>=0){
    for (let i=dataStart+1;i<Math.min(lines.length, dataStart+50);i++){
      if (isNoise(lines[i])) continue;
      if (looksLikeHeader(lines[i])) { headerIdx=i; delim=pickDelimiter(lines[i]); break; }
    }
  }
  if (headerIdx===-1){
    for (let i=0;i<Math.min(lines.length, 100);i++){
      if (isNoise(lines[i])) continue;
      if (looksLikeHeader(lines[i])) { headerIdx=i; delim=pickDelimiter(lines[i]); break; }
    }
  }
  if (headerIdx===-1) throw new Error('CSV: header not found');

  const headerRaw = lines[headerIdx].split(delim);
  let dropFirst = headerRaw.length && /^"?header"?$/i.test(String(headerRaw[0]).trim());
  let headerCells = dropFirst ? headerRaw.slice(1) : headerRaw;
  let headerKeys = headerCells.map(h => String(h).replace(/^"|"$/g,'').trim()).filter(h=>h!=='');

  // read rows
  const data = [];
  for (let i=headerIdx+1;i<lines.length;i++){
    const raw = lines[i];
    if (!raw || !raw.trim()) continue;
    if (/^\s*#/.test(raw)) continue;
    const cells0 = raw.split(delim);
    const cells = dropFirst ? cells0.slice(1) : cells0;
    const obj = {};
    for (let k=0;k<headerKeys.length;k++){
      obj[headerKeys[k]] = (cells[k] ?? '').toString().replace(/^"|"$/g,'').trim();
    }
    // skip totally empty rows
    if (Object.values(obj).every(v => v==='')) continue;
    data.push(obj);
  }
  return { headerIdx, delim, headerKeys, rows: data, lines };
}

const CSV_HEADER_CANON = [
  'ID','display_id','GUID','DID','DAO','ShortTitle','Category','Type','Status','Priority','Created [YYYY-MM-DD]',
  'Author','Authors','Tags','Description','Context_Origin_WhyItWasInitiated','Technology','SFIA_Level','SFIA_Domain','SFIA_Maturity',
  'Related_KNIFE','PotentialOutputs','Owner','Org','Project','Locale','FolderName','SidebarLabel','LinkSlug','Copyright',
  'RightsHolderContent','RightsHolderSystem','License','Disclaimer'
];

function toFrontmatterObj(md){
  const m = md.match(/^---\n([\s\S]*?)\n---/);
  if (!m) return {};
  const yml = m[1];
  const obj = {};
  // very small YAML parser for simple k: v and tags: [..]
  const lines = yml.split(/\r?\n/);
  for (const ln of lines){
    const mm = ln.match(/^\s*([A-Za-z0-9_\-\[\] ]+)\s*:\s*(.*)\s*$/);
    if (!mm) continue;
    const key = mm[1].trim();
    let val = mm[2].trim();
    if (/^\[.*\]$/.test(val)){
      // tags array
      obj[key] = val.replace(/^\[|\]$/g,'').split(',').map(s=>s.trim().replace(/^"|"$/g,'')).filter(Boolean).join('; ');
    } else {
      obj[key] = val.replace(/^"|"$/g,'');
    }
  }
  return obj;
}

function normKey(s){ return String(s||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/gi,'').toLowerCase(); }

const SYN = {
  id: ['id','kid','knifeid'],
  guid: ['guid','uuid'],
  title: ['title','shorttitle','name'],
  author: ['author','authors'],
  category: ['category'],
  type: ['type'],
  priority: ['priority'],
  created: ['created','createdat','date','createdyyyy-mm-dd','createdyyyymmdd'],
  tags: ['tags']
};

function pickField(obj, skey){
  const cands = SYN[skey] || [skey];
  for (const k of Object.keys(obj)){
    if (cands.some(c=>normKey(c)===normKey(k))){
      const v = obj[k];
      if (v !== undefined && v !== null && String(v).trim()!=='') return String(v).trim();
    }
  }
  return '';
}

function toCsvRowFromFM(fm){
  const row = {};
  // map FM → CSV columns we care about
  row.ID = pickField(fm,'id');
  row.GUID = pickField(fm,'guid');
  row['ShortTitle'] = pickField(fm,'title');
  row.Author = pickField(fm,'author');
  row.Category = pickField(fm,'category');
  row.Type = pickField(fm,'type');
  row.Priority = pickField(fm,'priority');
  row['Created [YYYY-MM-DD]'] = pickField(fm,'created');
  row.Tags = pickField(fm,'tags');
  return row;
}

function csvLineEsc(s){
  if (s==null) s='';
  s = String(s);
  if (s.includes('"') || s.includes(',') || s.includes('\n')) {
    return `"${s.replace(/"/g,'""')}"`;
  }
  return s;
}

async function main(){
  const {rows: csvRows, headerKeys} = await loadCsv(csvPath);

  // Build map by ID (from CSV)
  const map = new Map();
  for (const r of csvRows){
    const id = (r.ID||'').trim();
    if (id) map.set(id.toUpperCase(), r);
  }

  // Scan knifes
  const entries = await fs.readdir(knifesDir, { withFileTypes: true });
  const knifeDirs = entries.filter(e => e.isDirectory() && /^[Kk]\d{6}-/.test(e.name));

  const changes = [];
  for (const e of knifeDirs){
    const dir = path.join(knifesDir, e.name);
    const mdPath = path.join(dir, 'index.md');
    let md=''; try { md = await fs.readFile(mdPath,'utf8'); } catch { continue; }
    const fm = toFrontmatterObj(md);
    const add = toCsvRowFromFM(fm);
    const id = (add.ID||'').toUpperCase();
    if (!id) continue;

    if (map.has(id)){
      const row = map.get(id);
      const before = {...row};
      // fill-only
      for (const k of Object.keys(add)){
        if (!add[k]) continue;
        if (!row[k] || String(row[k]).trim()==='') row[k] = add[k];
      }
      // detect diff
      const diff = [];
      for (const k of Object.keys(add)){
        if ((before[k]||'') !== (row[k]||'')) diff.push(k);
      }
      if (diff.length) changes.push({id, kind:'update', fields: diff});
    } else {
      // create a new row aligned to CSV header
      const newRow = {};
      for (const hk of CSV_HEADER_CANON){
        newRow[hk] = add[hk] || '';
      }
      map.set(id, newRow);
      changes.push({id, kind:'insert', fields: Object.keys(add).filter(k=>add[k])});
    }
  }

  // rebuild rows in original order + append new ones (we keep canonical header)
  const outRows = [];
  const seen = new Set();
  for (const r of csvRows){
    const id = (r.ID||'').toUpperCase();
    if (id && map.has(id)){ outRows.push(map.get(id)); seen.add(id); }
    else outRows.push(r);
  }
  // append new ones (those in map but not seen)
  for (const [id, r] of map.entries()){
    if (!seen.has(id)){
      outRows.push(r);
    }
  }

  // log summary
  const inserts = changes.filter(c=>c.kind==='insert').length;
  const updates = changes.filter(c=>c.kind==='update').length;
  console.log(`Summary: INSERT=${inserts} UPDATE=${updates}`);

  if (dry){
    for (const c of changes){
      console.log(c.kind==='insert'
        ? `+ CSV add ${c.id} (fields: ${c.fields.join(', ')})`
        : `~ CSV fill ${c.id} (filled: ${c.fields.join(', ')})`
      );
    }
    return;
  }

  // write CSV (backup first)
  try { await fs.copyFile(csvPath, `${csvPath}.bak`); } catch {}
  const header = CSV_HEADER_CANON;
  const lines = [];
  lines.push(header.map(csvLineEsc).join(','));
  for (const r of outRows){
    const row = header.map(h => csvLineEsc(r[h] ?? ''));
    lines.push(row.join(','));
  }
  const preamble = 'HEADER\n"DATA START"\n';
  await fs.writeFile(csvPath, preamble + lines.join('\n') + '\n', 'utf8');
  console.log(`✔ CSV updated: ${csvPath} (backup at ${csvPath}.bak)`);
}

main().catch(e => { console.error('FIX CSV failed:', e.message); process.exit(1); });