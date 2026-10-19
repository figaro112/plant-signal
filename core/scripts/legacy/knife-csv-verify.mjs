// scripts/knife-csv-verify.mjs (header-ready)
import fs from 'node:fs/promises';

const file = process.argv[2];
if (!file) {
  console.error('Usage: node scripts/knife-csv-verify.mjs <CSV file>');
  process.exit(2);
}

function normalizeNL(s){ return s.replace(/\r\n?/g, '\n'); }
function detectDelimiter(sample){
  const cand = [',',';','\t'];
  let best = ',', bestCount = -1;
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

// Trim to first data header: line starting with id and containing title
function trimToHeader(text){
  const lines = normalizeNL(text).split('\n');
  let idx = -1;
  for (let i=0;i<lines.length;i++){
    const line = lines[i];
    if (!line.trim()) continue;
    if (/^id\s*[,;].*title/i.test(line)) { idx = i; break; }
  }
  if (idx === -1) throw new Error('Could not find CSV data header (needs a line starting with "id" and containing "title").');
  return lines.slice(idx).join('\n');
}

function parseCSV(text, delimiter){
  const rows=[], len=text.length;
  let i=0, field='', row=[], inQ=false;
  function pushField(){ row.push(field); field=''; }
  function pushRow(){ rows.push(row); row=[]; }
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
  pushField();
  if (row.length>1 || rows.length===0 || (rows.length && rows[rows.length-1]!==row)) pushRow();
  return rows;
}

const raw = await fs.readFile(file, 'utf8');
const trimmed = trimToHeader(raw);
const delimiter = detectDelimiter(trimmed.slice(0, 10000));
console.log('→ Detected delimiter:', JSON.stringify(delimiter));

const rows = parseCSV(trimmed, delimiter);
if (!rows.length) {
  console.error('✖ No rows parsed.');
  process.exit(1);
}

const header = rows[0];
const data = rows.slice(1);
console.log('→ Columns:', header.join(' | '));

function col(name){
  const idx = header.findIndex(h => String(h).trim().toLowerCase() === name);
  return idx>=0 ? idx : -1;
}

const idIdx = col('id');
const titleIdx = col('title');
const slugIdx = (()=>{
  const l1 = col('slug'); 
  if (l1>=0) return l1;
  const l2 = header.findIndex(h => String(h).trim().toLowerCase() === 'linkslug'); 
  return l2;
})();

let exitCode = 0;

// Row length check
let expected = header.length;
data.forEach((r, i)=>{
  if (r.length !== expected){
    console.error(`✖ Row ${i+2}: has ${r.length} columns, expected ${expected}`);
    exitCode = 1;
  }
});

// Duplicates & empties
const seenIDs = new Map();
const seenSlugs = new Map();
for (let i=0;i<data.length;i++){
  const r = data[i];
  const rowNo = i+2;
  const id = idIdx>=0 ? (r[idIdx]||'').trim() : '';
  const title = titleIdx>=0 ? (r[titleIdx]||'').trim() : '';
  const slug = slugIdx>=0 ? (r[slugIdx]||'').trim() : '';

  if (!title) {
    console.error(`✖ Row ${rowNo}: empty TITLE`);
    exitCode = 1;
  }
  if (id) {
    const arr = seenIDs.get(id) || [];
    arr.push(rowNo);
    seenIDs.set(id, arr);
  }
  if (slug) {
    const arr = seenSlugs.get(slug) || [];
    arr.push(rowNo);
    seenSlugs.set(slug, arr);
  }
}

for (const [id, rowsN] of seenIDs.entries()){
  if (rowsN.length>1){
    console.error(`✖ Duplicate ID "${id}" at rows: ${rowsN.join(', ')}`);
    exitCode = 1;
  }
}
for (const [sl, rowsN] of seenSlugs.entries()){
  if (rowsN.length>1){
    console.error(`✖ Duplicate SLUG "${sl}" at rows: ${rowsN.join(', ')}`);
    exitCode = 1;
  }
}

if (exitCode){
  console.error('\nVerification finished with issues.');
  process.exit(exitCode);
} else {
  console.log('\nAll CSV checks passed.');
}
