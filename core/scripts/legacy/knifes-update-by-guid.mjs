// knifes-update-by-guid.mjs — aplikuje CSV zmeny do existujúcich článkov podla GUID
import path from 'node:path';
import fs from 'node:fs/promises';
import fssync from 'node:fs';
import {
  parseCSV, sanitizeRow, getField, parseAuthors, normToArray,
  splitFrontMatter, parseSimpleYAML, writeFrontMatter,
  isUuidV4
} from './knifes-lib.mjs';

function parseArgs(){
  const args=process.argv.slice(2);
  const out={ csv:'data/KNIFE-OVERVIEW-ONLY.csv', root:'.', locale:'sk', updatePolicy:'add-only', dryRun:false, debug:false };
  for(let i=0;i<args.length;i++){
    const k=args[i], v=args[i+1];
    if(k==='--csv'){ out.csv=v; i++; continue; }
    if(k==='--root'){ out.root=v; i++; continue; }
    if(k==='--locale'){ out.locale=v; i++; continue; }
    if(k==='--update-policy'){ out.updatePolicy=(v||'').toLowerCase(); i++; continue; }
    if(k==='--dry-run'){ out.dryRun=true; continue; }
    if(k==='--debug'){ out.debug=true; continue; }
  }
  return out;
}

function mergeTags(existing, incoming, policy){
  const ex = Array.isArray(existing)?existing:normToArray(existing);
  const inc = Array.isArray(incoming)?incoming:normToArray(incoming);
  if(policy==='prefer-csv') return Array.from(new Set(inc));
  return Array.from(new Set([...(ex||[]), ...(inc||[])]));
}

function applyCsvUpdateToFm(fm, row, policy){
  const out={...fm}; let changed=false;
  const never=new Set(['guid','id','created','date','sidebar_position']);
  const set=(k,v)=>{
    if(never.has(k)) return;
    if(v===undefined||v===null) return;
    const s=String(v); if(!s.trim()) return;
    if(policy==='prefer-csv'){ if(out[k]!==s){ out[k]=s; changed=true; } }
    else { if(!out[k] || (Array.isArray(out[k]) && !out[k].length)){ out[k]=s; changed=true; } }
  };

  const csvTitle = getField(row,'short_title');
  if(csvTitle) set('title', csvTitle);

  set('description', row.Description);
  if(row.Status) set('status', String(row.Status).toLowerCase());
  set('category', row.Category);
  set('type', row.Type);
  set('license', row.License);
  set('disclaimer', row.Disclaimer);
  set('rights_holder_content', row.rights_holder_content || row.RightsHolderContent);
  set('rights_holder_system', row.rights_holder_system || row.RightsHolderSystem);
  set('copyright', row.Copyright);

  const authors = parseAuthors(row);
  if(authors.length){
    if(policy==='prefer-csv'){ if(out.author !== authors[0]){ out.author=authors[0]; changed=true; } }
    else if(!out.author){ out.author=authors[0]; changed=true; }
  }

  if(row.Tags){
    const merged = mergeTags(out.tags, row.Tags, policy);
    const a = Array.isArray(out.tags)?out.tags:normToArray(out.tags);
    const same = a.length===merged.length && a.every((x,i)=>x===merged[i]);
    if(!same){ out.tags=merged; changed=true; }
  }

  return {out, changed};
}

function buildGuidIndex(absRoot, locale){
  const base=path.join(absRoot,'docs',locale,'knifes');
  const map=new Map();
  if(!fssync.existsSync(base)) return map;
  for(const folder of fssync.readdirSync(base)){
    const dirAbs=path.join(base,folder);
    if(!fssync.statSync(dirAbs).isDirectory()) continue;
    const entries=fssync.readdirSync(dirAbs);
    const mainMd = entries.includes('index.md')?'index.md':entries.find(f=>/^K\d+.*\.md$/i.test(f));
    if(!mainMd) continue;
    const raw=fssync.readFileSync(path.join(dirAbs,mainMd),'utf8');
    const [fmText]=raw.match(/^---\s*\n([\s\S]*?)\n---/)||[];
    if(!fmText) continue;
    const g=(fmText.match(/^\s*guid\s*:\s*"?([^"\n]+)"?/m)||[])[1]||'';
    if(isUuidV4(g)) map.set(g.toLowerCase(), path.join(dirAbs, mainMd));
  }
  return map;
}

async function main(){
  const {csv, root, locale, updatePolicy, dryRun, debug}=parseArgs();
  const repoRoot=path.resolve(root);
  const csvText=fssync.readFileSync(path.resolve(repoRoot,csv),'utf8');
  const rowsRaw=parseCSV(csvText);
  const rows=rowsRaw.map(sanitizeRow);

  const guidMap = buildGuidIndex(repoRoot, locale);
  let count=0;

  for(const r of rows){
    const guidCsv = String(getField(r,'guid') || r.GUID || r.Guid || '').trim();
    if(!isUuidV4(guidCsv)) continue;
    const target = guidMap.get(guidCsv.toLowerCase());
    if(!target){ if(debug) console.warn(`↷ skip update: GUID not found (${guidCsv})`); continue; }

    const raw = fssync.readFileSync(target,'utf8');
    const m=raw.match(/^---\s*\n([\s\S]*?)\n---\s*\n?/);
    if(!m) continue;
    const fmObj = parseSimpleYAML(m[1]);
    const body = raw.slice(m[0].length);

    const {out, changed} = applyCsvUpdateToFm(fmObj, r, updatePolicy);
    if(!changed) continue;

    const newRaw = writeFrontMatter(out) + body;
    if(dryRun){ console.log('Would update by GUID:', path.relative(repoRoot, target)); count++; }
    else{ await fs.writeFile(target, newRaw, 'utf8'); console.log('Updated by GUID:', path.relative(repoRoot, target)); count++; }
  }

  if(dryRun) console.log(`DRY-RUN: ${count} files would be updated.`);
  else console.log(`Updated ${count} files.`);
}

main().catch(e=>{ console.error(e); process.exit(1); });