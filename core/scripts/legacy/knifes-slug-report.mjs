// scripts/knife-slug-report.mjs
import fs from 'node:fs/promises';
import path from 'node:path';

async function* walk(dir) {
  try {
    for (const d of await fs.readdir(dir, { withFileTypes: true })) {
      const p = path.join(dir, d.name);
      if (d.isDirectory()) yield* walk(p);
      else if (/index\.mdx?$/.test(d.name)) yield p;
    }
  } catch {}
}

function parseFrontmatter(md){
  const m = md.match(/^---\n([\s\S]*?)\n---/);
  if (!m) return {};
  const o = {};
  for (const line of m[1].split(/\r?\n/)){
    const mm = line.match(/^([A-Za-z0-9_]+)\s*:\s*(.*)$/);
    if (!mm) continue;
    const k = mm[1]; let v = mm[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v=v.slice(1,-1);
    o[k]=v;
  }
  return o;
}

const seen = new Map();
const bad = [];

for await (const p of walk('docs')){
  const md = await fs.readFile(p,'utf8');
  const fm = parseFrontmatter(md);
  const slug = fm.slug || '';
  if (!slug) bad.push(`✖ Missing slug: ${p}`);
  else {
    if (!/^\/(sk|en)\/knifes\/[A-Za-z0-9._\/-]+$/.test(slug)) {
      bad.push(`✖ Malformed slug "${slug}" in ${p}`);
    }
    const arr = seen.get(slug) || [];
    arr.push(p);
    seen.set(slug, arr);
  }
}

for (const [s, arr] of seen.entries()){
  if (arr.length>1){
    bad.push(`✖ Duplicate slug "${s}" in:\n  - ` + arr.join('\n  - '));
  }
}

if (bad.length){
  console.error(bad.join('\n'));
  process.exit(1);
} else {
  console.log('No slug issues found.');
}
