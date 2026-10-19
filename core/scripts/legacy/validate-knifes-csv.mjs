// validate_knifes_csv.mjs — KNIFE CSV validator (schema + sanity checks)
// Using:
//# základná kontrola
//> node scripts/validate_knifes_csv.mjs --csv data/KNIFES-OVERVIEW-INPUTS.csv

//# prísny režim (ak sú warnings, skončí s exit code 2 → vhodné do CI)
//.> node scripts/validate_knifes_csv.mjs --csv data/KNIFES-OVERVIEW-INPUTS.csv --strict

import fs from 'node:fs/promises';
import path from 'node:path';

// --- tiny CSV parser tolerant to quotes/newlines in cells
function parseCSV(text) {
  const rows = [];
  let i = 0, field = '', row = [], inQ = false;
  while (i < text.length) {
    const ch = text[i], nx = text[i+1];
    if (inQ) {
      if (ch === '"' && nx === '"') { field += '"'; i += 2; continue; }
      if (ch === '"') { inQ = false; i++; continue; }
      field += ch; i++; continue;
    } else {
      if (ch === '"') { inQ = true; i++; continue; }
      if (ch === ',') { row.push(field); field = ''; i++; continue; }
      if (ch === '\n') { row.push(field); rows.push(row); field=''; row=[]; i++; continue; }
      if (ch === '\r') { i++; continue; }
      field += ch; i++; continue;
    }
  }
  // flush
  row.push(field); rows.push(row);
  // trim trailing empty line
  if (rows.length && rows[rows.length-1].length===1 && rows[rows.length-1][0]==='') rows.pop();
  return rows;
}

function indexHeaders(cells) {
  // normalize header keys to be case-insensitive and punctuation-insensitive
  const map = {};
  const norm = (s) => String(s || '')
    .replace(/^\uFEFF/, '')      // strip BOM
    .trim()
    .toLowerCase()
    .replace(/[\s\-–—]+/g, '_')  // spaces/dashes -> underscore
    .replace(/[^a-z0-9_]/g, '')  // drop other punctuation
    .replace(/_+/g, '_');        // collapse multiple underscores
  cells.forEach((h, idx) => {
    const key = norm(h);
    if (key) map[key] = idx;
  });
  return map;
}

// Detect NBSP and invisible chars
const RE_NBSP = /\u00A0/;
const RE_ZWSP = /\u200B|\u200C|\u200D/; // zero width
const RE_UUID = /[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/;

const MULTI_DELIMS = /[;|]/;      // allowed multi-value delimiters in a cell
const PLACEHOLDER = '--';          // explicit placeholder treated as "not provided"

function splitMultiCell(v){
  const s = String(v ?? '').trim();
  if (!s) return [];
  // tolerate commas by first normalizing to ';'
  return s.replace(/,/g, ';').split(MULTI_DELIMS).map(x => x.trim()).filter(Boolean);
}

function isKnifeId(x){ return /^K\d+$/i.test(String(x || '')); }

function kebab(s){
  s = (s||'').trim().replace(/['"]/g,'');
  s = s.normalize('NFKD').replace(/[\u0300-\u036f]/g,''); // strip accents
  s = s.replace(/[^A-Za-z0-9\s-]+/g,' ').replace(/\s+/g,' ').trim();
  return s.replace(/[^A-Za-z0-9]+/g,'-').replace(/^-+|-+$/g,'').toLowerCase() || 'untitled';
}

function parseArgs(){
  const args=process.argv.slice(2); const out={ csv:'data/KNIFES-OVERVIEW-INPUTS.csv', strict:false };
  for(let i=0;i<args.length;i++){
    const k=args[i], v=args[i+1];
    if(k==='--csv'){ out.csv=v; i++; continue; }
    if(k==='--strict'){ out.strict=true; continue; }
  }
  return out;
}

function norm(s){ return String(s ?? '').trim(); }

function toObj(cells, headerIdx){
  const obj = {};
  Object.entries(headerIdx).forEach(([h, idx])=>{
    obj[h] = cells[idx] ?? '';
  });
  return obj;
}

function pick(obj, keys){
  for(const k of keys){
    if (k in obj && String(obj[k]).trim()!=='') return String(obj[k]).trim();
  }
  return '';
}

function isoDateOrEmpty(s){
  // accept YYYY-MM-DD; warn on DD.MM.YYYY or MM/DD/YYYY
  const t = String(s||'').trim();
  if (!t) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t;
  return ''; // invalid for our purposes
}

async function main(){
  const {csv, strict} = parseArgs();
  const csvPath = path.resolve(csv);
  const raw = await fs.readFile(csvPath, 'utf8');

  const linesWithNBSP = raw.split('\n').map((ln,i)=> RE_NBSP.test(ln)||RE_ZWSP.test(ln) ? (i+1) : null).filter(Boolean);
  const table = parseCSV(raw);
  if (!table.length) { console.error('✖ CSV is empty'); process.exit(1); }

  // find the first row whose first cell is "ID" (case-insensitive)
  let headerRowIdx = -1;
  for (let i = 0; i < table.length; i++){
    const row = table[i];
    if (!row || !row.length) continue;
    const first = String(row[0] ?? '').trim().toLowerCase();
    if (first === 'id') { headerRowIdx = i; break; }
  }
  if (headerRowIdx === -1){
    console.error('✖ Could not find header row (first cell must be "ID").');
    process.exit(1);
  }

  const header = table[headerRowIdx];
  const h = indexHeaders(header);

  // use normalized keys (see indexHeaders)
  const REQUIRED = ['id','shorttitle','author','date','status','dao'];
  const OPTIONAL = [
    'description','category','type','priority','tags','display_id','displayid',
    'guid','did','org','project','locale',
    'context','origin','whyitwasinitiated','context_origin_whyitwasinitiated',
    'sfia_level','sfia_domain','sfia_maturity',
    'related_knife','potentialoutputs','owner',
    'foldername','sidebarlabel','linkslug',
    'copyright','rightsholdercontent','rightsholdersystem','license','disclaimer'
  ];

  let errors = 0, warns = 0;
  const seenIDs = new Map();
  const slugSet = new Set();

  for (let r = headerRowIdx + 1; r < table.length; r++){
    const cells = table[r];
    if (!cells || cells.every(c => String(c ?? '').trim() === '')) continue;

    const val = (key) => {
      const idx = h[key];
      return idx == null ? '' : String(cells[idx] ?? '').trim();
    };

    const ID        = val('id');
    const title     = val('shorttitle') || val('short_title'); // tolerate old name
    const author    = val('author');
    const date      = val('date');
    const status    = val('status');
    const dao       = val('dao');
    const displayId = val('display_id') || val('displayid');
    const guidRaw   = val('guid') || val('GUID');

    const ctx = `row ${r+1} (id=${ID || '∅'})`;

    // ID format
    if (!/^K\d+$/i.test(ID)){
      console.error(`✖ ${ctx}: invalid id format (expected K + digits)`);
      errors++;
      continue;
    }

    // mandatory not-empty & not placeholder
    const mandatory = { shorttitle: title, author, date, status, dao };
    for (const [k, v] of Object.entries(mandatory)){
      if (!v || v === PLACEHOLDER){
        console.error(`✖ ${ctx}: field "${k}" is required and must not be empty or "${PLACEHOLDER}".`);
        errors++;
      }
    }
    if (!isoDateOrEmpty(date)){
      console.error(`✖ ${ctx}: invalid date (use YYYY-MM-DD)`);
      errors++;
    }

    // duplicate ID detection
    if (seenIDs.has(ID)){
      console.error(`✖ ${ctx}: duplicate id (first seen at row ${seenIDs.get(ID)})`);
      errors++;
    } else {
      seenIDs.set(ID, r+1);
    }

    // GUID sanity (if present)
    if (guidRaw){
      const m = guidRaw.match(RE_UUID);
      if (!m){
        console.warn(`! ${ctx}: guid is not a bare UUID (will not be auto-cleaned by generator)`); warns++;
      }
    }

    // status whitelist (soft-check)
    if (status){
      const ok = ['draft','ongoing','inprogress','done','archived'];
      if (!ok.includes(status.toLowerCase())){
        console.warn(`! ${ctx}: uncommon status "${status}" (expected one of ${ok.join(', ')})`);
        warns++;
      }
    }

    // tags: warn if looks like encoded JSON array
    const tags = val('tags');
    if (tags && tags.startsWith('["') && tags.endsWith('"]')){
      console.warn(`! ${ctx}: tags looks like JSON string; prefer plain CSV "a; b; c"`);
      warns++;
    }

    // multi-value: Related_KNIFE
    if (h['related_knife'] != null){
      const rel = splitMultiCell(cells[h['related_knife']]);
      const bad = rel.filter(x => !isKnifeId(x));
      const dups = rel.filter((x,i) => rel.indexOf(x) !== i);
      if (bad.length){
        console.warn(`! ${ctx}: Related_KNIFE contains invalid IDs: ${bad.join(', ')}`);
        warns++;
      }
      if (dups.length){
        console.warn(`! ${ctx}: Related_KNIFE has duplicates: ${[...new Set(dups)].join(', ')}`);
        warns++;
      }
    }

    // NBSP/ZWSP + overlong fields
    for (const [key, idx] of Object.entries(h)){
      const v = cells[idx] ?? '';
      if (RE_NBSP.test(v) || RE_ZWSP.test(v)){
        console.warn(`! ${ctx}: invisible space in column "${key}"`); warns++;
      }
      if (String(v).length > 4000){
        console.warn(`! ${ctx}: very long value in column "${key}" (>4000 chars)`); warns++;
      }
    }

    // slug collision check (derived from ID + title)
    const slug = `/sk/knifes/${kebab(`${ID} ${title}`)}`;
    if (slugSet.has(slug)){
      console.error(`✖ ${ctx}: slug collision -> ${slug} (another row generates same slug)`);
      errors++;
    } else {
      slugSet.add(slug);
    }

    // display_id hint
    if (!displayId){
      console.warn(`! ${ctx}: missing display_id (will fallback to id)`); warns++;
    }
  }

  // File-level NBSP report
  if (linesWithNBSP.length){
    console.warn(`! CSV contains NBSP/zero-width spaces on lines: ${linesWithNBSP.slice(0,10).join(', ')}${linesWithNBSP.length>10?'…':''}`);
    warns++;
  }

  // Summary
  if (errors){
    console.error(`\n✖ Validation failed: ${errors} error(s), ${warns} warning(s).`);
    process.exit(1);
  } else {
    const mode = strict && warns ? 'with warnings' : 'OK';
    console.log(`\n✔ CSV validation ${mode}: 0 error(s), ${warns} warning(s).`);
    process.exit(strict && warns ? 2 : 0);
  }
}

main().catch(e=>{ console.error(e); process.exit(1); });