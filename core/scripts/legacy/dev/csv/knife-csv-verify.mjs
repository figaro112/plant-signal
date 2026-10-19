// dev/csv/knife-csv-verify.mjs
// CSV validator: robust header detection, alias mapping, quoted newline-aware parser
import fs from 'node:fs/promises';
import fssync from 'node:fs';

const args = process.argv.slice(2);
if (!args.length) {
  console.error('Usage: node dev/csv/knife-csv-verify.mjs <CSV file> [--schema dev/csv/schema/header.aliases.json]');
  process.exit(2);
}
const file = args[0];
const schemaPath = (args.includes('--schema') ? args[args.indexOf('--schema')+1] : null);

function loadAliases(p){
  if (!p) return null;
  try { return JSON.parse(fssync.readFileSync(p,'utf8')); } catch { return null; }
}

// --- helpers ---
function normalizeNL(s){ return s.replace(/\r\n?/g, '\n'); }
function findHeaderIndex(lines){
  const re = /^[\s"]*id[\s"]*[,;\t|].*?["\s]*title["\s]*([,;\t|]|$)/i;
  for (let i=0;i<lines.length;i++){ const L=lines[i]; if (!L.trim()) continue; if (re.test(L)) return i; }
  return -1;
}
function detectDelimiter(sample){
  const cand=[',',';','\t','|']; let best=',',score=-1;
  for (const d of cand){
    let inQ=false,c=0; for (let i=0;i<sample.length;i++){ const ch=sample[i];
      if (ch==='"') inQ=!inQ; else if (!inQ && ch===d) c++;
    }
    if (c>score){ score=c; best=d; }
  }
  return best;
}
function parseCSV(text, delimiter){
  const rows=[]; let field='', row=[], inQ=false;
  for (let i=0;i<text.length;i++){
    const c=text[i];
    if (inQ){
      if (c==='"'){ if (i+1<text.length && text[i+1]==='"'){ field+='"'; i++; } else { inQ=false; } }
      else { field+=c; }
    } else {
      if (c==='"') inQ=true;
      else if (c===delimiter){ row.push(field); field=''; }
      else if (c==='\n'){ row.push(field); rows.push(row); row=[]; field=''; }
      else { field+=c; }
    }
  }
  row.push(field); rows.push(row);
  return rows;
}

const raw = await fs.readFile(file,'utf8');
const text = normalizeNL(raw);
const lines = text.split('\n');
let idx = findHeaderIndex(lines);
if (idx === -1){
  // fallback: first non-empty line
  idx = lines.findIndex(l => l.trim());
  if (idx === -1) { console.error('✖ No content'); process.exit(1); }
}
const trimmed = lines.slice(idx).join('\n');
const delim = detectDelimiter(trimmed.slice(0, 8000));
const rows = parseCSV(trimmed, delim);
if (!rows.length){ console.error('✖ Parsed 0 rows'); process.exit(1); }

const header = rows[0].map(h => String(h).trim());
const dataAll = rows.slice(1);

// Alias map -> canonical
const aliases = loadAliases(schemaPath) || {};
function canonFor(h){
  const hl = String(h).trim().toLowerCase();
  for (const [canon, alts] of Object.entries(aliases)){
    for (const a of alts){ if (hl === String(a).toLowerCase()) return canon; }
  }
  return null;
}
const headerCanon = header.map(h => canonFor(h) || h.trim().toLowerCase());
const idxOf = (canon) => headerCanon.indexOf(canon);

const required = ['id','short_title'];
let ok = true;
for (const r of required){
  if (idxOf(r) === -1){
    console.error(`✖ Missing required column (any alias of): ${r}`);
    ok = false;
  }
}
console.log('→ Detected delimiter:', JSON.stringify(delim));
console.log('→ Columns (raw):', header.join(' | '));
console.log('→ Columns (canonical):', headerCanon.join(' | '));

// Filter only KNNN rows
const idIndex = idxOf('id');
const titleIndex = idxOf('short_title') !== -1 ? idxOf('short_title') : headerCanon.findIndex(h => h==='title');
const data = dataAll.filter(r => {
  const id = String(r[idIndex] || '').trim();
  if (!/^K\d{3}\b/i.test(id)) {
    // non-data row inside the table — warn but ignore
    return false;
  }
  return true;
});

// Row width check (on filtered rows)
const expected = rows[0].length;
let issues = 0;
data.forEach((r,i)=>{
  if (r.length !== expected){ console.error(`✖ Row ${i+2} (data-only): has ${r.length} cols, expected ${expected}`); issues++; }
  const t = titleIndex>=0 ? String(r[titleIndex]||'').trim() : '';
  if (!t){ console.error(`✖ Row ${i+2} (data-only): empty TITLE`); issues++; }
});

if (!ok || issues){
  console.error('\nVerification finished with issues.');
  process.exit(1);
} else {
  console.log('\nAll CSV checks passed.');
}
