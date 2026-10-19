#!/usr/bin/env node
// KNIFES ID6 MIGRATION TOOL
// Modes: --dry (default), --apply, --audit
// Args:  --config path   (default: config/knifes_config.json)
//        --root .        (default: .)
//        --locale sk     (default: sk; fallback z configu)
//        --section knifes(default: knifes; fallback z configu)
//        --id K000123    (len konkrétne ID)

import fs from 'fs';
import path from 'path';

function parseArgs(argv){
  const args = { dry:true, apply:false, audit:false, root:'.', config:'config/knifes_config.json', locale:'sk', section:'knifes', id:null };
  for (let i=2;i<argv.length;i++){
    const a=argv[i];
    if (a==='--apply'){ args.apply=true; args.dry=false; }
    else if (a==='--dry' || a==='--dry-run'){ args.dry=true; args.apply=false; }
    else if (a==='--audit'){ args.audit=true; }
    else if (a==='--root'){ args.root=argv[++i]||args.root; }
    else if (a==='--config'){ args.config=argv[++i]||args.config; }
    else if (a==='--locale'){ args.locale=argv[++i]||args.locale; }
    else if (a==='--section'){ args.section=argv[++i]||args.section; }
    else if (a==='--id'){ args.id=(argv[++i]||'').toUpperCase(); }
  }
  return args;
}
function loadConfig(p){ try{ return JSON.parse(fs.readFileSync(p,'utf8'))||{}; }catch{ return {}; } }
function resolveBase(args,cfg){
  const docsDir = cfg.docsDir || 'docs';
  const locale  = cfg.locale  || args.locale || 'sk';
  const section = cfg.section || args.section || 'knifes';
  return path.join(args.root||'.', docsDir, locale, section);
}
function listKnifeDirs(base, onlyId=null){
  if (!fs.existsSync(base)) return [];
  const rx = /^k\d{6}-/i;
  return fs.readdirSync(base, { withFileTypes:true })
    .filter(d=>d.isDirectory())
    .filter(d=>rx.test(d.name))
    .filter(d=>!onlyId || d.name.toUpperCase().startsWith(onlyId+'-'))
    .map(d=>path.join(base, d.name));
}
const readFile = p => { try{ return fs.readFileSync(p,'utf8'); }catch{ return null; } };
const writeFile = (p, s) => fs.writeFileSync(p, s, 'utf8');

function extractFM(src){
  if (!src) return { fm:null, body:src, start:-1, end:-1 };
  const m = src.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!m) return { fm:null, body:src, start:-1, end:-1 };
  const fm = m[1], start=m.index, end=start+m[0].length, body=src.slice(end);
  return { fm, body, start, end };
}
function fmGetId(fm){
  if (!fm) return null;
  const m = fm.match(/^\s*id\s*:\s*["']?([^"' \n]+)["']?/mi);
  return m ? m[1].trim().toUpperCase() : null;
}
function fmSetId(fm, wanted){
  const lines = fm.split(/\r?\n/);
  const idx = lines.findIndex(l=>/^\s*id\s*:/i.test(l));
  const newline = `id: "${wanted}"`;
  if (idx>=0) lines[idx]=newline; else lines.splice(0,0,newline);
  return lines.join('\n');
}
function processFolder(dir){
  const desired = path.basename(dir).split('-')[0].toUpperCase(); // K######
  const indexPath = path.join(dir, 'index.md');
  const src = readFile(indexPath);
  if (!src) return { ok:false, reason:'missing-index', dir, desired };
  const { fm, body } = extractFM(src);
  if (fm==null) return { ok:false, reason:'missing-fm', indexPath, desired };
  const current = fmGetId(fm);
  const same = current === desired;
  const newFm = same ? fm : fmSetId(fm, desired);
  const newSrc = same ? src : `---\n${newFm}\n---\n${body}`;
  return { ok:true, indexPath, desired, current, same, newSrc };
}

function main(){
  const args = parseArgs(process.argv);
  const cfg = loadConfig(args.config);
  const base = resolveBase(args, cfg);
  const dirs = listKnifeDirs(base, args.id);

  const mode = args.apply ? 'APPLY' : (args.audit ? 'AUDIT' : 'DRY');
  console.log(`KNIFES ID6 (${mode}) – base=${base} dirs=${dirs.length}${args.id?` filter=${args.id}`:''}`);

  let scanned=0, would=0, updated=0, skipped=0, missing=0;
  for (const d of dirs){
    scanned++;
    const res = processFolder(d);
    const rel = path.relative(process.cwd(), res.indexPath || d);
    if (!res.ok){
      missing++;
      if (res.reason==='missing-index') console.log(`  ⚠️  Missing index.md → ${d}`);
      else if (res.reason==='missing-fm') console.log(`  ⚠️  Missing frontmatter → ${rel}`);
      continue;
    }
    if (res.same){ skipped++; continue; }

    if (args.apply){
      writeFile(res.indexPath, res.newSrc);
      updated++;
      console.log(`  ✍️  id: ${res.current||'∅'} → ${res.desired}   (${rel})`);
    } else {
      would++;
      console.log(`  • would set id: ${res.current||'∅'} → ${res.desired}   (${rel})`);
    }
  }
  console.log(`Summary: scanned=${scanned}, ${args.apply?'updated='+updated:'would-update='+would}, skipped=${skipped}, missing=${missing}`);
}
main();