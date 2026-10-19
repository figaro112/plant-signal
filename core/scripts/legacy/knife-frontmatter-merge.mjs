// scripts/knife-frontmatter-merge.mjs (merge-only + header-ready CSV load)
import { promises as fs } from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const ARGS = new Set(process.argv.slice(2));
const getArgVal = (name, def=null) => {
  const idx = process.argv.indexOf(name);
  return idx>=0 && process.argv[idx+1] ? process.argv[idx+1] : def;
};

const DRY = ARGS.has('--dry-run') || !ARGS.has('--write');
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
  for (const line of block split(/\r?\n/)) {
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

function genGuid(id){
  const uuid = crypto.randomUUID();
  const safeId = (id || 'KXXX').toUpperCase();
  return `knife-${safeId}-${uuid}`;
}

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
    if (rec.authors && !Array.isArray(rec.authors)) rec.authors = rec.authors.split(',').map(s => s.trim()).filter(Boolean);
    if (rec.tags && !Array.isArray(rec.tags)) rec.tags = rec.tags.split(',').map(s => s.trim()).filter(Boolean);
    map.set(id, rec);
  }
  return map;
}

function mergeFrontmatter(existing, csvRec){
  const out = { ...existing };
  if (!('authors' in out) && typeof out.author === 'string' && out.author.trim()) out.authors = [out.author.trim()];
  if (!out.dao) out.dao = 'knife';
  if (!out.guid) out.guid = genGuid(out.id);
  if (!out.locale) out.locale = 'sk';

  if (csvRec) {
    const candidates = ['title','slug','sidebar_label','sidebar_position','description','status','tags','locale','category','type','priority','authors'];
    for (const k of candidates){
      if ((out[k] === undefined || out[k] === null || String(out[k]).trim() === '') && csvRec[k] != null && String(csvRec[k]).trim() !== '') {
        out[k] = csvRec[k];
      }
    }
  }

  return out;
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
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1,-1);
      obj[k] = v;
    }
    return [obj, after];
  })(md);

  const id = fm.id;
  if (ONLY_ID && id !== ONLY_ID) return null;

  const csvRec = id && csvMap ? csvMap.get(id) : null;
  const merged = mergeFrontmatter(fm, csvRec);

  const before = JSON.stringify(fm);
  const after  = JSON.stringify(merged);
  if (before === after) return { file:p, changed:false };

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
      if (Array.isArray(v)) lines.push(`${k}: ${JSON.stringify(v)}`);
      else if (typeof v === 'string') {
        const needsQuote = /[:#]|^\s|\s$/.test(v);
        lines.push(`${k}: ${needsQuote ? JSON.stringify(v) : `"${v}"`}`);
      } else {
        lines.push(`${k}: ${v}`);
      }
    }
    lines.push('---');
    return lines.join('\n') + '\n' + body;
  })(merged, body);

  if (DRY) {
    console.log(`[DRY] would update: ${p}`);
    return { file:p, changed:true, dry:true };
  } else {
    await fs.writeFile(p, newText, 'utf8');
    console.log(`updated: ${p}`);
    return { file:p, changed:true };
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
  console.log(`\nDone. Scanned: ${total}, ${DRY ? 'would change' : 'changed'}: ${changed}`);
}
main().catch(e => { console.error(e); process.exit(1); });
