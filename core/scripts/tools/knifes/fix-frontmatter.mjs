// tools/knifes/fix-frontmatter.mjs
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const KNIFES_DIR = path.join(ROOT, 'docs', 'sk', 'knifes');

function listDirs(p) {
  if (!fs.existsSync(p)) return [];
  return fs.readdirSync(p, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => path.join(p, d.name));
}

function ensureCategoryJson(dir, label) {
  const target = path.join(dir, '_category_.json');
  const data = { label, collapsed: true };
  fs.writeFileSync(target, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

function ensureFrontmatterIndex(dir, folder) {
  const idx = path.join(dir, 'index.md');
  if (!fs.existsSync(idx)) return;
  const src = fs.readFileSync(idx, 'utf8');
  const bak = idx + '.bak';
  if (!fs.existsSync(bak)) fs.writeFileSync(bak, src, 'utf8');

  let body = src;
  let fm = {};
  if (src.startsWith('---')) {
    const end = src.indexOf('\n---', 3);
    if (end !== -1) {
      const raw = src.slice(3, end).trim();
      body = src.slice(end + 4);
      for (const line of raw.split('\n')) {
        const m = line.match(/^(\w[\w_-]*):\s*(.*)$/);
        if (m) fm[m[1]] = m[2];
      }
    }
  }
  const key = folder.slice(0,4); // K000078
  fm.id = fm.id || folder;
  fm.title = fm.title || `${key} — ${folder.replace(/^K\d{3}-/, '').replace(/-/g, ' ')}`;
  fm.sidebar_label = fm.sidebar_label || key;
  fm.slug = fm.slug || `/knifes/${folder}`;

  const fmStr = Object.entries(fm).map(([k,v]) => `${k}: ${v}`).join('\n');
  const out = `---\n${fmStr}\n---\n${body.replace(/^\s*\n/, '')}`;
  fs.writeFileSync(idx, out, 'utf8');
}

const dirs = listDirs(KNIFES_DIR).filter(p => /\/K\d{3}-[^/]+$/.test(p));
for (const d of dirs) {
  const folder = path.basename(d);
  ensureCategoryJson(d, folder.slice(0,4)); // 'K000078'
  ensureFrontmatterIndex(d, folder);
}

console.log('Frontmatter and category labels updated. ✅');
