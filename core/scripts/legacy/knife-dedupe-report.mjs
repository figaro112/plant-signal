// scripts/knife-dedupe-report.mjs
import { promises as fs } from 'node:fs';
import path from 'node:path';

const KNIFE_DIRS = ['docs/sk/knifes','docs/en/knifes'];
const FRONT_KEYS = new Set(['id','title','sidebar_label','sidebar_position','slug','guid','dao','created']);

function parseFrontmatter(md) {
  const res = { };
  const m = md.match(/^---\n([\s\S]*?)\n---/);
  if (!m) return res;
  const block = m[1];
  for (const line of block.split(/\r?\n/)) {
    const mm = line.match(/^([A-Za-z0-9_]+)\s*:\s*(.*)$/);
    if (!mm) continue;
    const k = mm[1].trim();
    if (!FRONT_KEYS.has(k)) continue;
    let v = mm[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1,-1);
    res[k] = v;
  }
  return res;
}

async function readJsonSafe(p){
  try { return JSON.parse(await fs.readFile(p,'utf8')); }
  catch { return null; }
}

async function collect(baseDir) {
  const out = [];
  let entries;
  try { entries = await fs.readdir(baseDir, { withFileTypes: true }); }
  catch { return out; }
  for (const e of entries) {
    if (!e.isDirectory()) continue;
    const folder = path.join(baseDir, e.name);
    const files = await fs.readdir(folder).catch(()=>[]);
    const indexPath = files.includes('index.md') ? path.join(folder,'index.md')
                   : files.includes('index.mdx') ? path.join(folder,'index.mdx')
                   : null;
    const catPath = path.join(folder, '_category_.json');
    const cat = await readJsonSafe(catPath);
    let fm = {};
    if (indexPath) {
      const md = await fs.readFile(indexPath,'utf8').catch(()=>'');
      fm = parseFrontmatter(md);
    }
    out.push({
      folderName: e.name,
      folderPath: folder,
      hasIndex: !!indexPath,
      indexPath,
      categoryPath: cat ? catPath : null,
      categoryLinkType: cat?.link?.type ?? null,
      categoryTitle: cat?.link?.title ?? null,
      front_id: fm.id || null,
      front_title: fm.title || null,
      front_slug: fm.slug || null
    });
  }
  return out;
}

function push(map, key, val){ if (!key) return; (map.get(key)?.push(val)) || map.set(key,[val]); }

function report(all) {
  const dupFolders = new Map(), dupIDs = new Map(), dupTitles = new Map(), dupSlugs = new Map();
  for (const x of all) {
    push(dupFolders, x.folderName, x);
    push(dupIDs, x.front_id, x);
    push(dupTitles, x.front_title, x);
    push(dupSlugs, x.front_slug, x);
  }
  const lines = [];
  lines.push('# KNIFE De-dupe Report','');

  const both = all.filter(x => x.hasIndex && x.categoryLinkType === 'generated-index');
  if (both.length) {
    lines.push('## A) index.md + generated-index v tom istom priečinku');
    for (const x of both) lines.push(`- ⚠️ ${x.folderPath}`);
    lines.push('');
  }

  const genNoTitle = all.filter(x => x.categoryLinkType === 'generated-index' && !x.categoryTitle);
  if (genNoTitle.length) {
    lines.push('## B) generated-index bez "title"');
    for (const x of genNoTitle) lines.push(`- ✖ ${x.folderPath}`);
    lines.push('');
  }

  const noTitle = all.filter(x => x.hasIndex && !x.front_title);
  if (noTitle.length) {
    lines.push('## C) index.md bez frontmatter "title"');
    for (const x of noTitle) lines.push(`- ✖ ${x.indexPath}`);
    lines.push('');
  }

  const dup = (m) => Array.from(m.entries()).filter(([k,v])=>k && v.length>1);
  for (const [label,map] of [['D) Duplicitné "id"',dupIDs],['E) Duplicitné "title"',dupTitles],['F) Duplicitné "slug"',dupSlugs],['G) Duplicitné názvy priečinkov',dupFolders]]){
    const arr = dup(map);
    if (arr.length){
      lines.push('## ' + label);
      for (const [k,list] of arr) {
        lines.push(`- ✖ ${JSON.stringify(k)} →`);
        for (const x of list) lines.push(`    - ${x.indexPath || x.folderPath}`);
      }
      lines.push('');
    }
  }
  if (lines.length===2) lines.push('✅ Bez nájdených problémov.');
  return lines.join('\n');
}

async function main(){
  const a = await collect('docs/sk/knifes');
  const b = await collect('docs/en/knifes');
  const all = [...a, ...b];
  await fs.writeFile('knife_dedupe_report.md', report(all), 'utf8');
  console.log('Wrote knife_dedupe_report.md');
}
main().catch(e => { console.error(e); process.exit(1); });
