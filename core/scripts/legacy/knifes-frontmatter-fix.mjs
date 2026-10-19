#!/usr/bin/env node
/**
 * KNIFES Frontmatter FIX (FM-only, safe; no folder renames)
 * Usage:
 *   node scripts/knife-frontmatter-fix.mjs --dry   [--docs docs --section sk/knifes --id K000000123]
 *   node scripts/knife-frontmatter-fix.mjs --apply [--docs docs --section sk/knifes --id K000000123]
 */
import fs from 'fs/promises';
import path from 'path';

function args(argv = process.argv.slice(2)) {
  const o = { docs: 'docs', section: 'sk/knifes', id: '', dry: true, apply: false };
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i], v = argv[i + 1];
    if (k === '--docs') { o.docs = v; i++; }
    else if (k === '--section') { o.section = v; i++; }
    else if (k === '--id') { o.id = String(v || '').toUpperCase(); i++; }
    else if (k === '--dry') { o.dry = true; o.apply = false; }
    else if (k === '--apply') { o.apply = true; o.dry = false; }
  }
  if (!o.apply) o.dry = true;
  return o;
}

const reId = /^K(\d{1,6})$/i;
function pad6(id) {
  const m = reId.exec(id || '');
  if (!m) return null;
  const n = (m[1] || '').replace(/^0+/, '') || '0';
  return 'K' + n.padStart(6, '0');
}

// status mapping to EN
const STATUS_ALLOWED = new Set(['backlog','inprogress','done','']);
const STATUS_MAP = new Map([
  // SK
  ['hotové','done'], ['hotove','done'], ['hotovo','done'], ['dokončené','done'], ['dokoncene','done'],
  ['v procese','inprogress'], ['v_processe','inprogress'], ['prebieha','inprogress'], ['pracujeme','inprogress'],
  ['plánované','backlog'], ['planovane','backlog'], ['zaradené','backlog'], ['zaradene','backlog'],
  ['v backlogu','backlog'], ['začiatok','backlog'], ['zaciatok','backlog'], ['koncept','backlog'],
  ['pripomenúť','backlog'], ['pripomenut','backlog'], ['aktívne','inprogress'], ['aktivne','inprogress'],
  // EN aliases
  ['todo','backlog'], ['draft','backlog'], ['wip','inprogress'], ['in_progress','inprogress'], ['ongoing','inprogress'], ['completed','done']
]);

function fmSlice(raw) {
  const m = raw.match(/^---\n([\s\S]*?)\n---/m);
  if (!m) return null;
  return { fmText: m[1], body: raw.slice(m[0].length) };
}
const getQ = s => String(s ?? '').replace(/^["']|["']$/g,'').trim();

function getField(lines, key) {
  const re = new RegExp(`^\\s*${key}\\s*:\\s*(.*)$`, 'mi');
  for (const L of lines) {
    const m = L.match(re);
    if (m) return (m[1] || '').trim();
  }
  return '';
}
function setOrReplaceField(lines, key, valueStr) {
  const re = new RegExp(`^\\s*${key}\\s*:\\s*.*$`, 'mi');
  let replaced = false;
  const out = lines.map(L => {
    if (!replaced && re.test(L)) { replaced = true; return `${key}: ${valueStr}`; }
    return L;
  });
  if (!replaced) out.push(`${key}: ${valueStr}`);
  return out;
}
function removeLines(lines, predicate) {
  return lines.filter(L => !predicate(L));
}
function normalizeLocale(val) {
  const v = String(val || '').trim().replace(/\.$/, '');
  if (v === 'sk' || v === 'en' || v === '') return v;
  return v; // ostatné necháme – audit prípadne upozorní
}
function normalizeTagsValue(rawVal) {
  const v = String(rawVal || '').trim();
  // YAML list bez escape
  if (v.startsWith('[') && v.endsWith(']') && !/\\["\\]/.test(v)) return v;
  // Stringified JSON array like ["KNIFE"]
  if (/^\[.*\]$/.test(v) && /\\["\\]/.test(v)) {
    try {
      const parsed = JSON.parse(v.replace(/\\\"/g, '"'));
      if (Array.isArray(parsed)) {
        const inner = parsed.map(s => `"${String(s)}"`).join(', ');
        return `[${inner}]`;
      }
    } catch {}
  }
  // prázdne → placeholder
  if (!v) return '[""]';
  return v;
}

async function main() {
  const opt = args();
  const base = path.join(opt.docs, opt.section);
  let entries;
  try { entries = await fs.readdir(base, { withFileTypes: true }); }
  catch { console.error(`❌ Not found: ${base}`); process.exit(2); }
  let dirs = entries.filter(e => e.isDirectory() && /^K\d+-/.test(e.name)).map(e => e.name);
  if (opt.id) {
    const needle = opt.id.toUpperCase();
    dirs = dirs.filter(n => n.toUpperCase().startsWith(needle + '-'));
  }
  if (!dirs.length) { console.log('ℹ️  No KNIFE directories matched.'); return; }

  console.log(`KNIFES FM FIX (mode=${opt.dry ? 'DRY' : 'APPLY'}) – scope=${opt.section}, dirs=${dirs.length}`);
  let scanned = 0, changed = 0;

  for (const name of dirs) {
    const indexPath = path.join(base, name, 'index.md');
    let raw;
    try { raw = await fs.readFile(indexPath, 'utf8'); } catch { continue; }
    const fm = fmSlice(raw);
    if (!fm) continue;

    let lines = fm.fmText.split('\n');
    const before = lines.join('\n');

    // 1) remove slug lines (active + commented)
    lines = removeLines(lines, L => /^\s*slug\s*:/.test(L) || /^\s*#\s*slug\s*:/i.test(L));

    // 2) normalize id → K###### (FM only)
    const idValRaw = getQ(getField(lines, 'id')).toUpperCase();
    if (idValRaw) {
      const id6 = pad6(idValRaw);
      if (id6 && id6 !== idValRaw) {
        lines = setOrReplaceField(lines, 'id', `"${id6}"`);
        console.log(`~ ${opt.section}/${name}/index.md`);
        console.log(`  - id: "${idValRaw}"`);
        console.log(`  + id: "${id6}"`);
      }
    }

    // 3) status mapping → EN
    const statusRaw = getQ(getField(lines,'status')).toLowerCase();
    let statusNext = statusRaw;
    if (!STATUS_ALLOWED.has(statusRaw)) statusNext = STATUS_MAP.get(statusRaw) || statusRaw;
    if (!STATUS_ALLOWED.has(statusNext)) { if (statusRaw) statusNext = 'backlog'; }
    if (statusRaw !== statusNext) {
      lines = setOrReplaceField(lines, 'status', `"${statusNext}"`);
      console.log(`~ ${opt.section}/${name}/index.md`);
      console.log(`  - status: "${statusRaw || '<empty>'}"`);
      console.log(`  + status: "${statusNext}"`);
    }

    // 4) locale normalize (strip trailing dot)
    const locRaw = getQ(getField(lines,'locale'));
    const locNext = normalizeLocale(locRaw);
    if (locRaw !== locNext) {
      lines = setOrReplaceField(lines, 'locale', `"${locNext}"`);
      console.log(`~ ${opt.section}/${name}/index.md`);
      console.log(`  - locale: "${locRaw}"`);
      console.log(`  + locale: "${locNext}"`);
    }

    // 5) tags normalization if stringified
    if (/^\s*tags\s*:/.test(before)) {
      const tagsRaw = getField(lines, 'tags');
      const tagsNext = normalizeTagsValue(tagsRaw);
      if (tagsRaw !== tagsNext) {
        lines = setOrReplaceField(lines, 'tags', `${tagsNext}`);
        console.log(`~ ${opt.section}/${name}/index.md`);
        console.log(`  - tags: ${tagsRaw}`);
        console.log(`  + tags: ${tagsNext}`);
      }
    }

    // 6) author/authors consistency
    const author = getQ(getField(lines,'author'));
    const authors = getField(lines,'authors').trim();
    if (authors) {
      const first = authors.replace(/^\[|\]$/g,'').split(',')[0]?.replace(/['"]/g,'').trim();
      if (first && first !== author) {
        lines = setOrReplaceField(lines, 'author', `"${first}"`);
        console.log(`~ ${opt.section}/${name}/index.md`);
        console.log(`  - author: "${author}"`);
        console.log(`  + author: "${first}"`);
      }
    }

    const after = lines.join('\n');
    if (after !== before) {
      changed++;
      if (!opt.dry) {
        const next = `---\n${after}\n---` + fm.body;
        await fs.writeFile(indexPath, next, 'utf8');
      }
    }
    scanned++;
  }

  console.log(`Summary: scanned=${scanned}, changed=${changed} (mode=${opt.dry ? 'DRY' : 'APPLY'})`);
}

main().catch(e => { console.error(e); process.exit(1); });