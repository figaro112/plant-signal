// scripts/knife-frontmatter-merge.mjs (merge-only + header-ready CSV load)
import { promises as fs } from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const ARGS = new Set(process.argv.slice(2));
const getArgVal = (name, def=null) => {
  const idx = process.argv.indexOf(name);
  return idx>=0 && process.argv[idx+1] ? process.argv[idx+1] : def;
};

// New semantics: default DRY unless --apply
// Backward-compat: map legacy flags if used
if (ARGS.has('--write')) {
  console.warn('⚠️  --write is deprecated; use --apply');
  ARGS.add('--apply');
}
if (ARGS.has('--dry-run')) {
  console.warn('⚠️  --dry-run is deprecated; use --dry');
  ARGS.add('--dry');
}

const DRY = ARGS.has('--dry') || !ARGS.has('--apply');
const CSV_PATH = getArgVal('--csv', null);
const ONLY_ID = getArgVal('--only', null);

const DEFAULT_ORDER = [
  'id','guid','dao',
  'title','description',
  'authors','status','tags',
  'slug','sidebar_label','sidebar_position',
  'locale',
  'created','modified',
  'category','type','priority'
];

const ROOTS = ['docs/sk/knifes','docs/en/knifes'];

function parseFrontmatter(md){
  const m = md.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!m) return [{}, md];
  const block = m[1];
  const after = md.slice(m[0].length);
  const obj = {};
  for (const line of block.split(/\r?\n/)) {
    const mm = line.match(/^([A-Za-z0-9_]+)\s*:\s*(.*)$/);
    if (!mm) continue;
    const k = mm[1].trim();
    let v = mm[2].trim();
    if (v.startsWith('[') && v.endsWith(']')) {
      try { obj[k] = JSON.parse(v.replace(/'/g,'"')); continue; } catch {}
    }
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1,-1);
    obj[k] = v;
  }
  return [obj, after];
}

function stringifyFrontmatter(obj){
  const keys = [...new Set([...DEFAULT_ORDER, ...Object.keys(obj)])];
  const lines = ['---'];
  for (const k of keys){
    if (!(k in obj)) continue;
    let v = obj[k];
    if (Array.isArray(v)) {
      lines.push(`${k}: ${JSON.stringify(v)}`);
    } else if (typeof v === 'string') {
      const needsQuote = /[:#]|^\s|\s$/.test(v);
      lines.push(`${k}: ${needsQuote ? JSON.stringify(v) : `"${v}"`}`);
    } else {
      lines.push(`${k}: ${v}`);
    }
  }
  lines.push('---');
  return lines.join('\n') + '\n';
}

// Removed genGuid as per instructions

async function* walk(dir) {
  try {
    for (const d of await fs.readdir(dir, { withFileTypes: true })) {
      const p = path.join(dir, d.name);
      if (d.isDirectory()) yield* walk(p);
      else if (/index\.mdx?$/.test(d.name)) yield p;
    }
  } catch {}
}

function normalizeNL(s){ return s.replace(/\r\n?/g, '\n'); }
function detectDelimiter(sample){
  const cand = [',',';','\t']; let best=',', bestCount=-1;
  for (const d of cand){
    let inQ=false, count=0;
    for (let i=0;i<sample.length;i++){
      const c=sample[i];
      if (c==='\"') inQ = !inQ;
      else if (!inQ && c===d) count++;
    }
    if (count>bestCount){ best=d; bestCount=count; }
  }
  return best;
}
function trimToHeader(text){
  const lines = normalizeNL(text).split('\n');
  let idx = -1;
  for (let i=0;i<lines.length;i++){
    const line = lines[i];
    if (!line.trim()) continue;
    if (/^id\s*[,;].*title/i.test(line)) { idx = i; break; }
  }
  if (idx === -1) throw new Error('CSV: could not find data header (needs a line starting with "id" and containing "title").');
  return lines.slice(idx).join('\n');
}
function parseCSV(text, delimiter){
  const rows=[], len=text.length;
  let i=0, field='', row=[], inQ=false;
  const pushField=()=>{ row.push(field); field=''; };
  const pushRow=()=>{ rows.push(row); row=[]; };
  while (i<len){
    const c=text[i];
    if (inQ){
      if (c==='\"'){
        if (i+1<len && text[i+1]==='\"'){ field+='\"'; i+=2; continue; }
        inQ=false; i++; continue;
      } else { field+=c; i++; continue; }
    } else {
      if (c==='\"'){ inQ=true; i++; continue; }
      if (c===delimiter){ pushField(); i++; continue; }
      if (c==='\n'){ pushField(); pushRow(); i++; continue; }
      field+=c; i++; continue;
    }
  }
  pushField(); if (row.length) pushRow();
  return rows;
}

async function loadCsvMap(csvPath){
  if (!csvPath) return null;
  const raw = await fs.readFile(csvPath, 'utf8');
  const trimmed = trimToHeader(raw);
  const delim = detectDelimiter(trimmed.slice(0, 10000));
  const rows = parseCSV(trimmed, delim);
  if (!rows.length) return null;
  const header = rows[0].map(h => String(h).trim().toLowerCase());
  const data = rows.slice(1);
  const idx = Object.fromEntries(header.map((h,i)=>[h,i]));
  const map = new Map();
  for (const r of data){
    const id = (r[idx['id']] || '').trim();
    if (!id) continue;
    const rec = {};
    for (const k of ['title','slug','linkslug','sidebar_label','sidebar_position','description','status','tags','locale','category','type','priority','authors']) {
      if (idx[k] != null) rec[k] = (r[idx[k]] || '').trim();
    }
    if (!rec.slug && rec.linkslug) rec.slug = rec.linkslug;
    delete rec.linkslug;
    // Keep raw CSV strings; we will render as inline list only when FM field is empty.
    map.set(id, rec);
  }
  return map;
}

function isEmptyValue(v) {
  if (v == null) return true;
  if (Array.isArray(v)) return v.length === 0;
  const s = String(v).trim();
  return s === '' || s === '""' || s === "''";
}
function toInlineList(val) {
  if (Array.isArray(val)) return `[${val.map(s => JSON.stringify(String(s))).join(', ')}]`;
  // treat comma-separated string from CSV
  const arr = String(val).split(',').map(s => s.trim()).filter(Boolean);
  return `[${arr.map(s => JSON.stringify(s)).join(', ')}]`;
}

function mergeFrontmatter(existing, csvRec){
  const out = { ...existing };
  const warnings = [];
  if (!csvRec) return { out, warnings };
  const candidates = ['title','slug','sidebar_label','sidebar_position','description','status','tags','locale','category','type','priority','authors'];
  for (const k of candidates){
    const fmVal = out[k];
    const csvVal = csvRec[k];
    if (isEmptyValue(fmVal) && !isEmptyValue(csvVal)) {
      // fill empty from CSV
      if (k === 'authors' || k === 'tags') {
        out[k] = toInlineList(csvVal);
      } else {
        out[k] = csvVal;
      }
    } else if (!isEmptyValue(fmVal) && !isEmptyValue(csvVal)) {
      // conflict → warn only
      const fmShow = Array.isArray(fmVal) ? JSON.stringify(fmVal) : String(fmVal);
      const csvShow = Array.isArray(csvVal) ? JSON.stringify(csvVal) : String(csvVal);
      if (fmShow.trim() !== csvShow.trim()) {
        warnings.push({ key:k, fm: fmShow, csv: csvShow });
      }
    }
  }
  return { out, warnings };
}

async function processFile(p, csvMap){
  const md = await fs.readFile(p, 'utf8');
  const [fm, body] = (function(md){
    const m = md.match(/^---\n([\s\S]*?)\n---\n?/);
    if (!m) return [{}, md];
    const block = m[1];
    const after = md.slice(m[0].length);
    const obj = {};
    for (const line of block.split(/\r?\n/)) {
      const mm = line.match(/^([A-Za-z0-9_]+)\s*:\s*(.*)$/);
      if (!mm) continue;
      const k = mm[1].trim();
      let v = mm[2].trim();
      obj[k] = v;
    }
    return [obj, after];
  })(md);

  const id = fm.id && String(fm.id).replace(/^["']|["']$/g,'');
  if (ONLY_ID && id !== ONLY_ID) return null;

  const csvRec = id && csvMap ? csvMap.get(id) : null;
  const mergedRes = mergeFrontmatter(fm, csvRec);
  const merged = mergedRes.out;
  const warnings = mergedRes.warnings || [];

  // Determine additions (keys that were empty in FM and are now filled)
  const additions = [];
  for (const k of Object.keys(merged)) {
    const was = fm[k];
    const now = merged[k];
    if (was !== now) {
      // Only count as addition if previous FM value was empty and now is non-empty
      if (isEmptyValue(was) && !isEmptyValue(now)) additions.push({ key:k, value: now });
    }
  }

  if (additions.length === 0 && warnings.length === 0) {
    return { file:p, changed:false };
  }

  if (DRY) {
    if (additions.length) {
      console.log(`[DRY] would add: ${p}`);
      additions.forEach(a => {
        const valShow = Array.isArray(a.value) ? JSON.stringify(a.value) : String(a.value);
        console.log(`  + ${a.key} ← CSV ${valShow}`);
      });
    }
    warnings.forEach(w => {
      console.log(`! warn: CSV vs FM differ – ${w.key}: FM=${w.fm} vs CSV=${w.csv} (no change; handle in FIX)`);
    });
    return { file:p, changed: additions.length>0, dry:true };
  } else {
    // APPLY: add only additions; conflicts only warn
    if (additions.length) {
      const newText = (function(obj, body){
        const DEFAULT_ORDER = [
          'id','guid','dao',
          'title','description',
          'authors','status','tags',
          'slug','sidebar_label','sidebar_position',
          'locale',
          'created','modified',
          'category','type','priority'
        ];
        const keys = [...new Set([...DEFAULT_ORDER, ...Object.keys(obj)])];
        const lines = ['---'];
        for (const k of keys){
          if (!(k in obj)) continue;
          let v = obj[k];
          // Preserve strings as-is (they may already contain quotes)
          if (Array.isArray(v)) {
            lines.push(`${k}: ${JSON.stringify(v)}`);
          } else {
            lines.push(`${k}: ${v}`);
          }
        }
        lines.push('---');
        return lines.join('\n') + '\n' + body;
      })(merged, body);
      await fs.writeFile(p, newText, 'utf8');
      console.log(`updated: ${p}`);
    }
    warnings.forEach(w => {
      console.log(`! warn: CSV vs FM differ – ${w.key}: FM=${w.fm} vs CSV=${w.csv} (no change; handle in FIX)`);
    });
    return { file:p, changed: additions.length>0 };
  }
}

async function main(){
  const csvMap = await loadCsvMap(CSV_PATH);
  let total=0, changed=0;
  for (const root of ROOTS){
    try {
      for await (const file of (async function* walk(dir){ for (const d of await fs.readdir(dir, {withFileTypes:true})) { const p = path.join(dir, d.name); if (d.isDirectory()) yield* walk(p); else if (/index\.mdx?$/.test(d.name)) yield p; } })(root)){
        const res = await processFile(file, csvMap);
        if (!res) continue;
        total++;
        if (res.changed) changed++;
      }
    } catch {}
  }
  console.log(`\nDone. Scanned: ${total}, ${DRY ? 'would add' : 'added'} (from CSV) in: ${changed} file(s).`);
}
main().catch(e => { console.error(e); process.exit(1); });
