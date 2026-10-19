#!/usr/bin/env node
/**
 * KNIFES CSV Normalize (aliases + dates + status)
 * Semantika:
 *   - Default: --dry (nič nezapisuje)
 *   - Write:   --apply (prepíše vstupné CSV; pred zápisom spraví .bak)
 *   - Konfigurácia: --config config/knifes_config.json (ak obsahuje {"csvPath": "..."} alebo staršie {"csv": "..."}), alebo --csv path/to.csv
 *
 * Čo robí:
 *   1) Hlavičky: aliasy -> kanonické (id,title,description,authors,tags,status,created,modified,category,type,priority,sidebar_label,sidebar_position,locale)
 *   2) Dátumy: DD.MM.YYYY -> YYYY-MM-DD (len validné)
 *   3) Status: normalizácia do EN (backlog|inprogress|done|draft|ongoing)
 *   4) Automaticky zistí oddeľovač (',' alebo ';'), zvláda úvodzovky a viacriadkové bunky
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
const APPLY       = ARGS.has('--apply');
const DRY         = !APPLY; // default DRY

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
  title: ['Title','Short Title','ShortTitle','Názov','Nazov'],
  description: ['Description','Popis'],
  authors: ['Authors','Author'],
  tags: ['Tags'],
  status: ['Status','Stav'],
  created: ['Created','Date','Dátum','Datum','Created Date'],
  modified: ['Modified','Last Modified','Updated','Updated At'],
  category: ['Category','Kategória','Kategoria'],
  type: ['Type','Typ'],
  priority: ['Priority','Priorita'],
  sidebar_label: ['Sidebar Label','SidebarLabel','Short Nav'],
  sidebar_position: ['Sidebar Position','SidebarPosition','Nav Pos'],
  locale: ['Locale','Jazyk']
}));

function normalizeHeader(header){
  // remove bracketed hints like [YYYY-MM-DD]
  const noHints = header.replace(/\[[^\]]*\]/g, '');
  // collapse multiple spaces
  const collapsed = noHints.replace(/\s+/g,' ').trim();
  // lower + underscores for spaces
  const basic = collapsed.toLowerCase().replace(/\s+/g,'_');
  // also make a simplified variant without non-alphanumerics/underscores for robust matching
  return basic;
}
function canonName(h){
  const n = normalizeHeader(h);
  const stripNon = (s) => s.replace(/[^a-z0-9_]/g,'');
  const ns = stripNon(n);

  // direct alias table lookup
  for (const [canon, list] of ALIASES.entries()){
    if (n===canon) return canon;
    const listN = list.map(x=>normalizeHeader(x));
    if (listN.includes(n)) return canon;
  }

  // heuristic: treat headers starting with created/modified as those fields
  if (/^created(_|$)/.test(ns)) return 'created';
  if (/^modified(_|$)/.test(ns)) return 'modified';
  if (/^sidebarlabel$/.test(ns) || /^sidebar_label$/.test(ns)) return 'sidebar_label';
  if (/^sidebarposition$/.test(ns) || /^sidebar_position$/.test(ns)) return 'sidebar_position';

  return n; // fallback to normalized name
}

function stripDiacritics(s){ return s.normalize('NFD').replace(/[\u0300-\u036f]/g,''); }
function normStatus(s){
  if (!s) return s;
  const k = stripDiacritics(String(s).toLowerCase().trim());
  if (['backlog','todo','planned','planovane','v_backlogu'].includes(k)) return 'backlog';
  if (['inprogress','in_progress','wip','v_procese','v_rieseni','ongoing','aktivne','rozpracovane'].includes(k)) return 'inprogress';
  if (['done','hotove','ukoncene'].includes(k)) return 'done';
  if (['draft','koncept','zaciatok'].includes(k)) return 'draft';
  return s; // nechaj custom
}
function normDate(s){
  if (!s) return s;
  const t = String(s).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t; // OK
  const m = t.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (m){
    const d = m[1].padStart(2,'0'), M = m[2].padStart(2,'0'), y = m[3];
    const dt = new Date(`${y}-${M}-${d}T00:00:00Z`);
    if (!isNaN(dt.getTime())) return `${y}-${M}-${d}`;
  }
  return s;
}

function normPriority(s){
  if (!s) return s;
  const emojiMap = new Map([
    ["⚡", "Top"],
    ["🚀", "Top"],
    ["🧱", "Top"],
    ["✏️", "Hi"],
    ["📝", "Hi"],
    ["📚", "Hi"],
    ["🔄", "Hi"],
    ["🔒", "Low"],
    ["📁", "Low"],
  ]);
  const trimmed = String(s).trim();
  if (emojiMap.has(trimmed)) return emojiMap.get(trimmed);

  const t = stripDiacritics(trimmed).toLowerCase().replace(/\s+/g,'');
  if (/(^|\b)(top|p1|high|urgent|max|highest|critical)(\b|$)/.test(t)) return 'Top';
  if (/(^|\b)(hi|high|med|medium|normal|p2|std|standard)(\b|$)/.test(t)) return 'Hi';
  if (/(^|\b)(low|lo|minor|p3|lowest)(\b|$)/.test(t)) return 'Low';
  if (/^(h|m)/.test(t)) return 'Hi';
  if (/^l/.test(t)) return 'Low';

  return s;
}

const buildIndexMap = headers => {
  const m = new Map();
  headers.forEach((h,i)=> m.set(h,i));
  return m;
};

async function main(){
  // resolve CSV path z --csv alebo z configu
  let csvPath = CSV_CLI;
  if (!csvPath){
    try {
      const cfg = JSON.parse(await fs.readFile(CONFIG_PATH,'utf8'));
      if (cfg) {
        if (cfg.csvPath) csvPath = cfg.csvPath;       // preferred key
        else if (cfg.csv) csvPath = cfg.csv;          // backward-compat key
      }
    } catch { /* ignore */ }
  }
  if (!csvPath){
    console.error('❌ Zadaj cestu k CSV: --csv path.csv alebo doplň "csvPath" (alebo staršie "csv") do config/knifes_config.json');
    process.exit(2);
  }

  const raw = stripBOM(await fs.readFile(csvPath,'utf8'));
  const firstLine = raw.split(/\r?\n/).find(l=>l.trim().length>0) || '';
  const delim = detectDelimiter(firstLine);
  const rows = parseCSV(raw, delim);
  if (!rows.length){ console.error('❌ CSV je prázdne'); process.exit(2); }

  // Find the first row that looks like a header (after alias normalization contains id + title)
  let headerIdx = -1;
  let origHeader = null;
  let canonHeader = null;
  for (let r = 0; r < rows.length; r++) {
    const candidate = rows[r].map(x => String(x||'').trim());
    const nonEmpty = candidate.some(x => x.length > 0);
    if (!nonEmpty) continue; // skip fully empty rows
    const canon = candidate.map(canonName);
    const hasId = canon.some(h => h === 'id');
    const hasTitle = canon.some(h => h === 'title');
    if (hasId && hasTitle) {
      headerIdx = r;
      origHeader = candidate;
      canonHeader = canon;
      break;
    }
  }
  if (headerIdx === -1) {
    console.error('❌ CSV musí mať hlavičky aspoň id a title (po normalizácii aliasov).');
    process.exit(2);
  }

  // Slice rows to start at the detected header
  const dataRows = rows.slice(headerIdx + 1);

  const idx = buildIndexMap(canonHeader);
  const diffs = [];

  let changedRows = 0;
  const out = [canonHeader];
  for (let r=0; r<dataRows.length; r++){
    const row = dataRows[r].slice();
    while (row.length < canonHeader.length) row.push('');

    const before = row.slice();
    const rowId = idx.has('id') ? (before[idx.get('id')] || '').trim() : '';
    const rowChanges = [];

    if (idx.has('created')) {
      const i = idx.get('created');
      const oldVal = row[i];
      const newVal = normDate(oldVal);
      if (newVal !== oldVal) { row[i] = newVal; rowChanges.push({ field: 'created', from: oldVal, to: newVal }); }
    }
    if (idx.has('modified')) {
      const i = idx.get('modified');
      const oldVal = row[i];
      const newVal = normDate(oldVal);
      if (newVal !== oldVal) { row[i] = newVal; rowChanges.push({ field: 'modified', from: oldVal, to: newVal }); }
    }
    if (idx.has('status')) {
      const i = idx.get('status');
      const oldVal = row[i];
      const newVal = normStatus(oldVal);
      if (newVal !== oldVal) { row[i] = newVal; rowChanges.push({ field: 'status', from: oldVal, to: newVal }); }
    }
    if (idx.has('priority')) {
      const i = idx.get('priority');
      const oldVal = row[i];
      const newVal = normPriority(oldVal);
      if (newVal !== oldVal) { row[i] = newVal; rowChanges.push({ field: 'priority', from: oldVal, to: newVal }); }
    }

    if (row.some((v,i)=>v!==before[i])) {
      changedRows++;
      diffs.push({ id: rowId || `#${r+1}`, changes: rowChanges });
    }
    out.push(row);
  }

  if (DRY){
    if (canonHeader.join('|') !== origHeader.join('|')){
      console.log('~ DRY: would normalize header aliases:');
      console.log('  - from:', origHeader.join(', '));
      console.log('  + to:  ', canonHeader.join(', '));
    } else {
      console.log('= Header OK (aliases)');
    }
    if (diffs.length) {
      console.log(`\nDetails (first ${Math.min(diffs.length,20)} of ${diffs.length} normalized rows):`);
      const max = Math.min(diffs.length, 20);
      for (let i=0; i<max; i++) {
        const d = diffs[i];
        const parts = d.changes.map(c => `${c.field}: "${c.from}" → "${c.to}"`);
        console.log(`  - ${d.id}: ${parts.join('; ')}`);
      }
      if (diffs.length > 20) {
        console.log(`  …and ${diffs.length-20} more.`);
      }
    }
    console.log(`= Rows checked: ${dataRows.length}, normalized rows: ${changedRows}`);
    console.log('Tip: make csv-normalize-apply (backup .bak before write)');
    return;
  }

  // APPLY
  const backup = `${csvPath}.bak`;
  try { await fs.copyFile(csvPath, backup); } catch {}
  const text = stringifyCSV(out, delim);
  await fs.writeFile(csvPath, text, 'utf8');
  console.log(`✅ CSV normalized. Backup: ${path.basename(backup)} | delimiter='${delim}' | rows=${dataRows.length} | changed=${changedRows}`);
}
main().catch(err=>{ console.error(err); process.exit(1); });