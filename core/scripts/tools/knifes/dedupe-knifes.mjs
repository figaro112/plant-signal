// tools/knifes/dedupe-knifes.mjs
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const KNIFES_DIR = path.join(ROOT, 'docs', 'sk', 'knifes');
const DUP_DIR = path.join(KNIFES_DIR, '_duplicates');
const APPLY = process.argv.includes('--apply');

function listDirs(p) {
  if (!fs.existsSync(p)) return [];
  return fs.readdirSync(p, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name);
}

function loadIndexJSON() {
  const p = path.join(KNIFES_DIR, 'knifes_index.json');
  if (!fs.existsSync(p)) return null;
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); }
  catch { return null; }
}

const dirs = listDirs(KNIFES_DIR).filter(n => /^K\d{3}-/.test(n));
const groups = new Map();
for (const d of dirs) {
  const key = d.slice(0, 4); // 'K000078'
  if (!groups.has(key)) groups.set(key, []);
  groups.get(key).push(d);
}

const idx = loadIndexJSON();
function pickCanonical(key, candidates) {
  if (idx && Array.isArray(idx.items)) {
    for (const it of idx.items) {
      const slug = it.slug || it.path || '';
      for (const c of candidates) {
        if (slug.includes(c)) return c;
      }
    }
  }
  let best = candidates[0];
  let bestTime = 0;
  for (const c of candidates) {
    const stat = fs.statSync(path.join(KNIFES_DIR, c));
    const t = stat.mtimeMs;
    if (t > bestTime) { bestTime = t; best = c; }
  }
  return best;
}

const report = [];
fs.mkdirSync(DUP_DIR, { recursive: true });

for (const [key, candidates] of groups) {
  if (candidates.length <= 1) continue;
  const keep = pickCanonical(key, candidates);
  const move = candidates.filter(c => c !== keep);
  report.push({ key, keep, duplicates: move });

  if (APPLY) {
    for (const m of move) {
      const src = path.join(KNIFES_DIR, m);
      const dst = path.join(DUP_DIR, m);
      fs.renameSync(src, dst);
    }
  }
}

if (report.length === 0) {
  console.log('No duplicates found. ✅');
} else {
  console.log('Duplicate groups:');
  for (const r of report) {
    console.log(`- ${r.key}: keep=${r.keep}, move=[${r.duplicates.join(', ')}]`);
  }
  if (APPLY) console.log(`\nMoved duplicates into ${path.relative(ROOT, DUP_DIR)}`);
  else console.log('\nRun with --apply to move duplicates safely.');
}
