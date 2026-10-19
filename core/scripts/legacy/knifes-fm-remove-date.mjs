#!/usr/bin/env node
// Remove deprecated `date:` from FM.
// Usage: --dry (default) | --apply [--backfill]
//        Optional: --backfill  → if present, copy `date` into `created`/`modified` only when those keys are missing.
//        --root . --locale sk --section knifes
//        --config config/knifes_config.json (optional)

import fs from 'fs';
import path from 'path';

const ISO_RX = /^\d{4}-\d{2}-\d{2}$/;
const DMY_RX = /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/;

function parseArgs(argv){
  const a = { dry:true, apply:false, backfill:false, root:'.', locale:'sk', section:'knifes', config:'config/knifes_config.json' };
  for (let i=2;i<argv.length;i++){
    const x=argv[i];
    if (x==='--apply'){ a.apply=true; a.dry=false; }
    else if (x==='--backfill'){ a.backfill = true; }
    else if (x==='--dry' || x==='--dry-run'){ a.dry=true; a.apply=false; }
    else if (x==='--root'){ a.root = argv[++i]||a.root; }
    else if (x==='--locale'){ a.locale = argv[++i]||a.locale; }
    else if (x==='--section'){ a.section = argv[++i]||a.section; }
    else if (x==='--config'){ a.config = argv[++i]||a.config; }
  }
  return a;
}

function loadCfg(p){
  try { return JSON.parse(fs.readFileSync(p,'utf8')) || {}; } catch { return {}; }
}

function resolveBase(args,cfg){
  const docsDir = cfg.docsDir || 'docs';
  const locale = args.locale || cfg.locale || 'sk';
  const section = args.section || cfg.section || 'knifes';
  return path.join(args.root, docsDir, locale, section);
}

function listKnifeDirs(base){
  if (!fs.existsSync(base)) return [];
  return fs.readdirSync(base, {withFileTypes:true})
    .filter(d=>d.isDirectory())
    .map(d=>path.join(base, d.name))
    .filter(p=>fs.existsSync(path.join(p,'index.md')));
}

function read(p){ try{ return fs.readFileSync(p,'utf8'); }catch{ return null; } }
function write(p,s){ fs.writeFileSync(p,s,'utf8'); }

function splitFM(src){
  const m = src?.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!m) return { fm:null, body:src };
  return { fm:m[1], body: src.slice(m[0].length) };
}

function parseKV(fm){
  const o = {};
  fm.split(/\r?\n/).forEach(line=>{
    const mm = line.match(/^\s*([A-Za-z0-9_]+)\s*:\s*(.*)$/);
    if (!mm) return;
    const k = mm[1];
    let v = mm[2].trim();
    v = v.replace(/^"(.*)"$/,'$1').replace(/^'(.*)'$/,'$1');
    o[k]=v;
  });
  return o;
}
function toLines(obj){
  const order = [
    'id','guid','dao','title','description','author','authors','created','modified','status','tags',
    'sidebar_label','sidebar_position','locale','category','type','author_id','author_did',
    'copyright','rights_holder_content','rights_holder_system','license','disclaimer'
  ];
  const keys = [...new Set([...order, ...Object.keys(obj)])];
  return keys.filter(k=>k in obj).map(k=>{
    const v = obj[k];
    const needQuotes = typeof v==='string' && (v.includes(':') || v.includes('#') || v.includes('"') || v.includes(',') || v.includes(' '));
    const val = Array.isArray(v) ? `[${v.map(s=>JSON.stringify(String(s))).join(', ')}]`
            : needQuotes ? JSON.stringify(v) : String(v);
    return `${k}: ${val}`;
  });
}

function normDateStr(s){
  if (!s) return null;
  const t = s.trim().replace(/^"(.*)"$/,'$1').replace(/^'(.*)'$/,'$1');
  if (ISO_RX.test(t)) return t;
  const m = t.match(DMY_RX);
  if (m){
    const [_,d,mo,y] = m;
    const dd = String(d).padStart(2,'0');
    const mm = String(mo).padStart(2,'0');
    return `${y}-${mm}-${dd}`;
  }
  return t; // neznámy formát – necháme tak
}

function processIndex(indexPath, apply, backfill){
  const src = read(indexPath);
  if (!src) return { ok:false, reason:'missing' };

  const { fm, body } = splitFM(src);
  if (!fm) return { ok:false, reason:'no-fm' };

  const obj = parseKV(fm);
  const hadDate = Object.prototype.hasOwnProperty.call(obj,'date');
  const origDate = obj.date;

  if (!hadDate) return { ok:true, changed:false };

  // Drop deprecated and (optionally) backfill
  let createdSet = undefined, modifiedSet = undefined;
  if (backfill){
    const iso = normDateStr(origDate);
    if (!obj.created || String(obj.created).trim()===''){
      obj.created = iso; createdSet = obj.created;
    }
    if (!obj.modified || String(obj.modified).trim()===''){
      obj.modified = obj.created; modifiedSet = obj.modified;
    }
  }
  delete obj.date;

  const newFm = toLines(obj).join('\n');
  const newSrc = `---\n${newFm}\n---\n${body}`;
  if (apply) write(indexPath, newSrc);

  return {
    ok:true,
    changed:true,
    removedDate:true,
    indexPath,
    details: { dateWas: origDate, createdSet, modifiedSet, backfill }
  };
}

function main(){
  const args = parseArgs(process.argv);
  const cfg = loadCfg(args.config);
  const base = resolveBase(args,cfg);

  const dirs = listKnifeDirs(base);
  console.log(`${args.dry? '🧪 DRY-RUN':'🛠 APPLY'}: Remove deprecated 'date' in ${base}${args.backfill? ' (with backfill)':''}`);
  let scanned=0, changed=0, skipped=0, missing=0;
  for (const d of dirs){
    const p = path.join(d,'index.md');
    scanned++;
    const r = processIndex(p, !args.dry, !!args.backfill);
    if (!r.ok){ missing++; continue; }
    if (r.changed){
      changed++;
      const modeMsg = r.details.backfill
        ? `(date: ${JSON.stringify(r.details.dateWas)} → created=${r.details.createdSet??'keep'}, modified=${r.details.modifiedSet??'keep'})`
        : `(removed only)`;
      console.log(`${args.dry?'~ would:':'✓ fixed:'} ${path.relative(process.cwd(), p)}  ${modeMsg}`);
    } else {
      skipped++;
    }
  }
  console.log(`Summary: scanned=${scanned}, ${args.dry?'would-change':'changed'}=${changed}, skipped=${skipped}, missing=${missing}`);
}
main();