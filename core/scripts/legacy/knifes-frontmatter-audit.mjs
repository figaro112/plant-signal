#!/usr/bin/env node
// KNIFES Frontmatter Audit (read-only)
// Usage:
//   node scripts/knifes-frontmatter-audit.mjs [rootDir]
// Default rootDir: docs/sk/knifes
//
// Rules summary:
// - id:           required, format K000001 (6 digits)
// - guid:         required, UUID v4
// - dao:          must be "knife"
// - title:        required
// - created:      ISO YYYY-MM-DD (required)
// - modified:     ISO YYYY-MM-DD (required)
// - date:         deprecated (warn) + ISO check if present
// - status:       backlog|inprogress|done (map common aliases)
// - authors:      if authors exists, authors[0] must equal author
// - tags:         YAML list; flag stringified JSON array
// - sidebar:      sidebar_label required; suggest sidebar_position from id
// - slug:         active slug key is unexpected; commented slug is ignored by audit
// - locale:       "sk" | "en" (no trailing dot)
// - folder vs id: folder must start K\d{6}- and match id
//
import fs from 'node:fs/promises';
import fssync from 'node:fs';
import path from 'node:path';

const root = process.argv[2] || path.join('docs','sk','knifes');

const reISO = /^\d{4}-\d{2}-\d{2}$/;
const reUUIDv4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const reId6 = /^K\d{6}$/;

function isISODate(s){ return reISO.test(String(s||'')); }
function readText(p){ return fs.readFile(p,'utf8'); }

async function* walk(dir){
  const ents = await fs.readdir(dir,{ withFileTypes:true });
  for (const e of ents){
    const p = path.join(dir, e.name);
    if (e.isDirectory()) yield* walk(p);
    else if (e.isFile() && e.name === 'index.md') yield p;
  }
}

function extractFM(txt){
  const m = txt.match(/^---\n([\s\S]*?)\n---/m);
  if (!m) return { fm: {}, body: txt, fmText: '' };
  const yaml = m[1];
  const fm = {};
  const lines = yaml.split(/\n/);
  let key=null, buf=[];
  function flush(){ if (!key) return; fm[key] = buf.join('\n').trim(); key=null; buf=[]; }
  for (const line of lines){
    const m2 = line.match(/^([A-Za-z0-9_\-]+)\s*:\s*(.*)$/);
    if (m2){ flush(); key = m2[1]; buf.push(m2[2] || ''); }
    else { buf.push(line); }
  }
  flush();
  return { fm, body: txt.slice(m[0].length), fmText: m[1] };
}

function getVal(fm, k){
  if (!(k in fm)) return '';
  let v = String(fm[k] ?? '').trim();
  // strip surrounding quotes once
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1,-1);
  return v;
}

function auditOne(fm, ctx){
  const issues = [];
  const id = getVal(fm,'id');
  const guid = getVal(fm,'guid');
  const dao = getVal(fm,'dao');
  const title = getVal(fm,'title');
  const created = getVal(fm,'created');
  const date = getVal(fm,'date');
  const modified = getVal(fm,'modified');
  const sidebar_label = getVal(fm,'sidebar_label');
  const sidebar_position = getVal(fm,'sidebar_position');
  const localeRaw = getVal(fm,'locale');
  const locale = localeRaw.replace(/\.$/, '');
  const statusRaw = getVal(fm,'status').toLowerCase();
  const slugActive = ('slug' in fm) && String(fm.slug).trim() !== '';

  // Identity
  if (!id) issues.push('missing:id');
  else if (!reId6.test(id)) issues.push(`invalid:id-format=${id} (expected K000001)`);

  if (!guid) issues.push('missing:guid');
  else if (!reUUIDv4.test(guid)) issues.push(`invalid:guid=${guid}`);

  if (!dao) issues.push('missing:dao');
  else if (dao !== 'knife') issues.push(`invalid:dao=${dao}`);

  if (!title) issues.push('missing:title');

  // Dates
  if (!created) issues.push('missing:created');
  else if (!isISODate(created)) issues.push(`invalid:created=${created}`);

  if (!modified) issues.push('missing:modified');
  else if (!isISODate(modified)) issues.push(`invalid:modified=${modified}`);

  if (date) {
    issues.push('deprecated:date');
    if (!isISODate(date)) issues.push(`invalid:date=${date}`);
  }

  // Status
  const allowed = new Set(['backlog','inprogress','done','']);
  const map = { ongoing:'inprogress', wip:'inprogress', 'in_progress':'inprogress', completed:'done', done:'done', hotove:'done', hotové:'done', finished:'done', todo:'backlog', planned:'backlog', planovane:'backlog', plánované:'backlog', draft:'backlog', koncept:'backlog', "v\u00a0backlogu":'backlog', "v\u00a0procese":"inprogress", "v\u00a0rie\u0161en\u00ed":"inprogress" };
  if (!allowed.has(statusRaw)) {
    if (map[statusRaw]) issues.push(`map:status=${statusRaw}->${map[statusRaw]}`);
    else issues.push(`invalid:status=${statusRaw||'<empty>'}`);
  }

  // Authors & tags
  const author = getVal(fm,'author');
  const authors = getVal(fm,'authors'); // raw string of YAML line after colon
  if (authors && author) {
    // naive extraction of first element from authors list string
    const first = authors.replace(/^\[|\]$/g,'').split(',')[0]?.replace(/['"]/g,'').trim();
    if (first && first !== author) issues.push(`mismatch:author-vs-authors[0] (${author} != ${first})`);
  }
  if ('tags' in fm) {
    const tv = String(fm.tags || '').trim();
    // detect stringified JSON array like ["KNIFE"]
    if (/^\[.*\]$/.test(tv) && /\\["\\]/.test(tv)) issues.push('invalid:tags-stringified');
  }

  // Sidebar & slug
  if (!sidebar_label) issues.push('missing:sidebar_label');
  if (id) {
    const num = Number((id.match(/^K(\d{6})$/)||[])[1] || '0');
    if (!sidebar_position && num) issues.push(`suggest:sidebar_position=${num % 1000000}`);
  }
  if (slugActive) issues.push('unexpected:slug-active');

  // Locale
  if (!locale) issues.push('missing:locale');
  else if (!['sk','en'].includes(locale)) issues.push(`invalid:locale=${localeRaw||'<empty>'}`);

  // Folder consistency
  if (ctx && ctx.folder) {
    const mm = ctx.folder.match(/^K(\d{6})-/i);
    if (!mm) {
      issues.push(`invalid:folder-name=${ctx.folder} (expected K000001-*)`);
    } else if (id && reId6.test(id)) {
      const idDigits = id.slice(1);
      if (idDigits !== mm[1]) issues.push(`mismatch:id-vs-folder (${id} vs ${ctx.folder})`);
    }
  }

  return issues;
}

(async function main(){
  if (!fssync.existsSync(root)) {
    console.error(`✖ Root not found: ${root}`);
    process.exit(2);
  }
  let total = 0, bad = 0;
  const details = [];
  for await (const p of walk(root)){
    total++;
    const txt = await readText(p);
    const { fm } = extractFM(txt);
    const folderName = path.basename(path.dirname(p));
    const issues = auditOne(fm, { folder: folderName });
    if (issues.length){ bad++; details.push({ p, issues }); }
  }

  if (!total){
    console.log('ℹ️ No index.md files under', root);
    return;
  }

  if (!bad){
    console.log(`✅ Audit OK – ${total}/${total} without issues.`);
    return;
  }

  console.log(`⚠️ ${bad}/${total} files with frontmatter issues.`);
  for (const d of details){
    console.log(`— ${d.p}`);
    console.log('   • ' + d.issues.join('\n   • '));
  }
  process.exit(1);
})().catch(e=>{ console.error(e); process.exit(1); });