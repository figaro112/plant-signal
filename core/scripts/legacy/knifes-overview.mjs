#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';

const args = process.argv;
const getArg = (name, def=null) => {
  const i = args.indexOf(name);
  return i>=0 ? args[i+1] : def;
};
const src = getArg('--src');
const out = getArg('--out', 'docs/sk');

if (!src) { console.error('Usage: knifes_overview.mjs --src <dir> [--out docs/sk]'); process.exit(2); }

const items = [];
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
      items.push({
        id: (kv.id||'').replace(/"/g,''),
        title: (kv.title||'').replace(/"/g,''),
        category: kv.category||'',
        type: kv.type||'',
        priority: kv.priority||'',
        created: kv.created||'',
        path: p.replace(/^docs\/sk\//,'sk/'),
      });
    }
  }
}
await walk(src);

const by = (k)=>Object.entries(items.reduce((a,x)=>((a[x[k]||'N/A']=(a[x[k]||'N/A']||0)+1),a),{}))
  .sort((a,b)=>b[1]-a[1]);

// O1
const o1 = [
  '# KNIFEs Overview 1 – Zoznam',
  '',
  ...items.sort((a,b)=>a.id.localeCompare(b.id)).map(i=>`- [${i.id}](${i.path}) — ${i.title}`),
].join('\n');

// O2
const o2 = [
  '# KNIFEs Overview 2 – Tabuľka',
  '',
  '| ID | Title | Category | Type |',
  '|---|---|---|---|',
  ...items.map(i=>`| ${i.id} | ${i.title} | ${i.category} | ${i.type} |`),
].join('\n');

// O3
const o3 = [
  '# KNIFEs Overview 3 – Štatistika',
  '',
  '## By Category',
  ...by('category').map(([k,v])=>`- ${k}: ${v}`),
  '',
  '## By Type',
  ...by('type').map(([k,v])=>`- ${k}: ${v}`),
  '',
  '## By Priority',
  ...by('priority').map(([k,v])=>`- ${k}: ${v}`),
].join('\n');

await fs.writeFile(path.join(out,'KNIFEsOverview-1.md'), o1, 'utf8');
await fs.writeFile(path.join(out,'KNIFEsOverview-2.md'), o2, 'utf8');
await fs.writeFile(path.join(out,'KNIFEsOverview-3.md'), o3, 'utf8');
console.log('✔ Overview 1/2/3 vygenerované');
