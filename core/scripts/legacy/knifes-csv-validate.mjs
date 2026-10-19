// knifes-csv-validate.mjs.mjs — rýchly CSV header & sanity checker pre KNIFE
import fs from 'node:fs/promises';
import path from 'node:path';

function parseArgs(){
  const out = { csv: 'data/KNIFE-OVERVIEW-ONLY.csv', strict: false };
  const a = process.argv.slice(2);
  for (let i=0; i<a.length; i++){
    const k=a[i], v=a[i+1];
    if (k==='--csv'){ out.csv=v; i++; continue; }
    if (k==='--strict'){ out.strict=true; continue; }
  }
  return out;
}

function splitCSVLine(line){
  // split by commas, respecting quotes
  const out=[]; let f='', q=false;
  for (let i=0; i<line.length; i++){
    const c=line[i], n=line[i+1];
    if (q){
      if (c==='"' && n==='"'){ f+='"'; i++; continue; }
      if (c==='"'){ q=false; continue; }
      f+=c; continue;
    } else {
      if (c==='"'){ q=true; continue; }
      if (c===','){ out.push(f); f=''; continue; }
      if (c==='\r'){ continue; }
      out.push(c);
      f=out.pop()+''; // keep string
    }
  }
  out.push(f);
  return out.map(s=>String(s||'').trim().replace(/^\uFEFF/,''));
}

function findHeaderLine(lines){
  for (const raw of lines){
    const ln = raw.trim();
    if (!ln || ln.startsWith('#') || ln.startsWith('//') || ln.startsWith(';')) continue;
    const cells = splitCSVLine(ln);
    if (cells.length && /^id$/i.test(cells[0])) return cells;
  }
  return null;
}

function norm(s){ return String(s||'').trim(); }

async function main(){
  const { csv, strict } = parseArgs();
  const csvPath = path.resolve(csv);
  const text = await fs.readFile(csvPath, 'utf8');
  const lines = text.split(/\r?\n/);

  const header = findHeaderLine(lines);
  if (!header){
    console.error('✖ CSV: nenašiel som riadok s hlavičkou (prvý stĺpec musí byť "ID").');
    process.exit(1);
  }

  // Kanonická schéma (poradie pre ľudí; validator ide podľa názvov)
  const REQUIRED = ['ID','ShortTitle','Author','Date','Status','DAO'];
  const OPTIONAL = [
    'display_id','GUID','DID',
    'Category','Type','Priority','Tags','Description',
    'Context','Origin','WhyItWasInitiated','Technology',
    'SFIA_Level','SFIA_Domain','SFIA_Maturity',
    'Related_KNIFE','PotentialOutputs',
    'Owner','Org','Project','Locale',
    'FolderName','SidebarLabel','LinkSlug',
    'Copyright','RightsHolderContent','RightsHolderSystem','License','Disclaimer'
  ];

  const have = new Set(header.map(h=>norm(h)));
  const missingReq = REQUIRED.filter(c=>!have.has(c));
  const missingOpt = OPTIONAL.filter(c=>!have.has(c));

  let warns = 0, errors = 0;

  if (missingReq.length){
    console.error('✖ Chýbajú POVINNÉ stĺpce:', missingReq.join(', '));
    errors++;
  } else {
    console.log('✔ Povinné stĺpce sú prítomné.');
  }

  if (missingOpt.length){
    console.warn('! Chýbajú odporúčané stĺpce (môžu ostať prázdne, ale je fajn ich mať):', missingOpt.join(', '));
    warns++;
  }

  // Rýchle sanity na Date formát v dátových riadkoch (iba varovanie)
  const headerLineIdx = lines.findIndex(l => splitCSVLine(l)[0]?.toLowerCase?.() === 'id');
  if (headerLineIdx >= 0){
    const colIdx = Object.fromEntries(header.map((h,i)=>[h,i]));
    const dateIdx = colIdx['Date'];
    const idIdx = colIdx['ID'];
    if (dateIdx != null){
      for (let r = headerLineIdx+1; r < lines.length; r++){
        const ln = lines[r];
        if (!ln || ln.trim().startsWith('#')) continue;
        const cells = splitCSVLine(ln);
        if (!cells.length || cells.every(v=>!norm(v))) continue;
        const ID = norm(cells[idIdx]);
        const dt = norm(cells[dateIdx]);
        if (dt && !/^\d{4}-\d{2}-\d{2}$/.test(dt)){
          console.warn(`! ${ID||'∅'}: Date "${dt}" nie je vo formáte YYYY-MM-DD.`);
          warns++;
        }
      }
    }
  }

  if (errors){
    console.error(`\n✖ Validácia zlyhala: ${errors} error, ${warns} warning.`);
    process.exit(1);
  }
  if (strict && warns){
    console.warn(`\n! Strict mód: ${warns} warning → návratový kód 2.`);
    process.exit(2);
  }
  console.log(`\n✔ CSV OK${warns?` (s ${warns} warning)`:''}.`);
}

main().catch(e=>{ console.error(e); process.exit(1); });