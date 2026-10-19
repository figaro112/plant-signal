#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';

const args = process.argv;
const src = args[args.indexOf('--src')+1];
const out = args[args.indexOf('--out')+1];
if (!src || !out) { console.error('Usage: knifes_report.mjs --src <dir> --out <md>'); process.exit(2); }

const rows = [];
async function walk(dir){
  const ents = await fs.readdir(dir, { withFileTypes:true });
  for (const e of ents){
    const p = path.join(dir, e.name);
    if (e.isDirectory()) await walk(p);
    if (e.isFile() && e.name==='index.md'){
      const md = await fs.readFile(p,'utf8');
      const m = md.match(/^---\n([\s\S]*?)\n---/);
      if (!m) continue;
      const kv = Object.fromEntries(m[1].split('\n').filter(Boolean).map(l=>{
        const i = l.indexOf(':');
        return [l.slice(0,i).trim(), l.slice(i+1).trim().replace(/^"|"$|^\[|\]$/g,'')];
      }));
      rows.push(kv);
    }
  }
}
await walk(src);

const by = (k)=>Object.entries(rows.reduce((a,r)=>((a[r[k]||'N/A']=(a[r[k]||'N/A']||0)+1),a),{}))
  .sort((a,b)=>b[1]-a[1]);

const md = [
  '# KNIFE Report',
  `Total: **${rows.length}**`,
  '',
  '## By Category', ...by('category').map(([k,v])=>`- ${k}: ${v}`),
  '',
  '## By Type', ...by('type').map(([k,v])=>`- ${k}: ${v}`),
  '',
  '## By Priority', ...by('priority').map(([k,v])=>`- ${k}: ${v}`),
].join('\n');

await fs.mkdir(path.dirname(out), { recursive: true });
await fs.writeFile(out, md, 'utf8');
console.log(`✔ Report: ${out}`);
