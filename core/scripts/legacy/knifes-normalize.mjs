// KNIFE Normalize (main MD per KNIFE folder)
// - Default DRY (no writes) unless --apply is passed
// - Remove active `slug:` from FM and reinsert as commented `# slug: "..."` line (deduped)
// - Does NOT mutate any other FM keys/values
// - Safe, dependency-free (no external packages)
import fs from 'node:fs/promises';
import path from 'node:path';

function parseArgs() {
  const out = { root: '.', locale: 'sk', dry: true, apply: false, debug: false, id: '' };
  const a = process.argv.slice(2);
  for (let i = 0; i < a.length; i++) {
    const k = a[i];
    if (k === '--root')   { out.root   = a[++i] || out.root; continue; }
    if (k === '--locale') { out.locale = a[++i] || out.locale; continue; }
    if (k === '--dry')    { out.dry    = true; out.apply = false; continue; }
    if (k === '--apply')  { out.apply  = true; out.dry = false; continue; }
    if (k === '--debug')  { out.debug  = true; continue; }
    if (k === '--id')     { out.id     = String(a[++i] || '').toUpperCase(); continue; }
  }
  return out;
}

function kebab(s = '') {
  const de = s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return de.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').replace(/--+/g, '-');
}

async function exists(p) { try { await fs.access(p); return true; } catch { return false; } }

// Parse FM block by finding a line that is exactly '---' (start) and the next line that is exactly '---' (end)
function extractFrontMatter(raw) {
  const lines = raw.split('\n');
  if (lines[0].trim() !== '---') return { fm: '', body: raw, hasFM: false };
  let endIdx = -1;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === '---') { endIdx = i; break; }
  }
  if (endIdx === -1) return { fm: '', body: raw, hasFM: false };
  const fm = lines.slice(0, endIdx + 1).join('\n');
  const body = '\n' + lines.slice(endIdx + 1).join('\n');
  return { fm, body, hasFM: true };
}

function getFMField(fmText, key) {
  // Single-line YAML extractor
  const re = new RegExp(`^${key}\\s*:\\s*(.*)$`, 'mi');
  const m = fmText.match(re);
  if (!m) return '';
  let v = m[1].trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
  return v;
}

function rebuildFMWithCommentedSlug(fmText, commentedSlug) {
  const desired = `# slug: "${commentedSlug}"`;
  const lines = fmText.split('\n');

  // Find FM end (closing ---) to allow insertion before it
  const closeIdx = (() => {
    for (let i = lines.length - 1; i >= 1; i--) {
      if (lines[i].trim() === '---') return i;
    }
    return -1;
  })();

  // Scan for existing commented slug(s), active slug(s), and sidebar anchor
  let firstActiveSlugIdx = -1;
  let hasAnyCommentedSlug = false;
  let firstSidebarIdx = -1;

  for (let i = 0; i < lines.length; i++) {
    const L = lines[i];
    if (/^\s*#\s*slug\s*:/i.test(L)) hasAnyCommentedSlug = true;
    if (firstActiveSlugIdx === -1 && /^\s*slug\s*:/.test(L)) firstActiveSlugIdx = i;
    if (firstSidebarIdx === -1 && /^\s*sidebar_(label|position)\s*:/.test(L)) firstSidebarIdx = i;
  }

  // Build new FM: drop active slug lines, keep commented slugs as-is
  const out = [];
  for (let i = 0; i < lines.length; i++) {
    const L = lines[i];
    if (/^\s*slug\s*:/.test(L)) {
      // drop active slug
      continue;
    }
    out.push(L);
  }

  // If no commented slug, decide insertion point
  if (!hasAnyCommentedSlug) {
    let insertAt = -1;
    if (firstActiveSlugIdx !== -1) {
      // Insert where the active slug used to be
      insertAt = firstActiveSlugIdx;
    } else if (firstSidebarIdx !== -1) {
      // Insert immediately above the first sidebar key
      // Note: after removing active slug lines, indices may shift, so recompute a mapping
      // We will approximate by finding the current index of the first matching sidebar line in `out`
      insertAt = out.findIndex(l => /^\s*sidebar_(label|position)\s*:/.test(l));
      if (insertAt === -1) insertAt = closeIdx > 0 ? Math.max(1, closeIdx) - 1 : out.length - 1;
    } else if (closeIdx > 0) {
      // Insert before the closing ---
      insertAt = Math.max(1, out.length - 1);
    } else {
      // Fallback: append at the end
      insertAt = out.length;
    }
    out.splice(insertAt, 0, desired);
  }

  return out.join('\n');
}

async function findMainMd(knifeDir) {
  const idx = path.join(knifeDir, 'index.md');
  if (await exists(idx)) return idx;
  const items = await fs.readdir(knifeDir);
  const mdCandidates = items.filter(n => /\.md$/i.test(n)).sort();
  const kPrefer = mdCandidates.find(n => /^k\d{3}.*\.md$/i.test(n));
  return path.join(knifeDir, kPrefer || (mdCandidates[0] || 'index.md'));
}

async function processKnifeDir(knifeDir, locale, dry, apply, debug, root) {
  const mainMd = await findMainMd(knifeDir);
  if (!(await exists(mainMd))) return { changed: false, file: mainMd, reason: 'no-md' };
  const raw = await fs.readFile(mainMd, 'utf8');
  const { fm, body, hasFM } = extractFrontMatter(raw);
  if (!hasFM) return { changed: false, file: mainMd, reason: 'no-fm' };

  const id = getFMField(fm, 'id') || path.basename(knifeDir).split('-')[0].toUpperCase();
  const title = getFMField(fm, 'title') || path.basename(knifeDir).replace(/^K\d{3}-/, '');
  const computedSlug = `/${locale}/knifes/${kebab(`${id} ${title}`)}`;

  const fmNew = rebuildFMWithCommentedSlug(fm, computedSlug);
  const nextRaw = fmNew + body;

  if (nextRaw !== raw) {
    const rel = path.relative(path.resolve(root), mainMd);
    if (dry && !apply) {
      console.log(`~ DRY: would normalize ${rel}`);
      const oldLines = fm.split('\n');
      const removedActive = oldLines.filter(l => /^\s*slug\s*:/.test(l));
      const hadCommented = oldLines.some(l => /^\s*#\s*slug\s*:/i.test(l));
      if (removedActive.length) {
        for (const l of removedActive) console.log(`- ${l}`);
      }
      if (!hadCommented) {
        console.log(`+ # slug: "${computedSlug}"  (insert keep-position)`);
      } else {
        console.log('  (=) commented slug present; position preserved');
      }
      return { changed: true, file: mainMd, reason: 'normalize' };
    } else {
      await fs.writeFile(mainMd, nextRaw, 'utf8');
      console.log(`✓ normalized ${rel}`);
      return { changed: true, file: mainMd, reason: 'normalize' };
    }
  }
  if (debug) console.log(`= no changes ${path.relative(path.resolve(root), mainMd)}`);
  return { changed: false, file: mainMd, reason: 'no-change' };
}

async function main() {
  const { root, locale, dry, apply, debug, id } = parseArgs();
  const base = path.resolve(root);
  const knivesRoot = path.join(base, 'docs', locale, 'knifes');

  try { await fs.access(knivesRoot); }
  catch {
    console.error(`❌ Not found: ${path.relative(base, knivesRoot)}`);
    process.exit(2);
  }

  console.log(dry && !apply ? `🧪 DRY-RUN: knifes-normalize (locale=${locale})` : `🛠 APPLY: knifes-normalize (locale=${locale})`);

  const entries = await fs.readdir(knivesRoot, { withFileTypes: true });
  const dirs = entries.filter(e => e.isDirectory());
  let total = 0, changed = 0;
  for (const d of dirs) {
    const name = d.name;
    if (id && !name.toUpperCase().startsWith(id + '-')) continue; // optional filter
    const knifeDir = path.join(knivesRoot, name);
    const res = await processKnifeDir(knifeDir, locale, dry, apply, debug, base);
    total++;
    if (res.changed) changed++;
  }
  console.log(`Summary: scanned=${total}, changed=${changed}`);
}

main().catch(err => { console.error(err); process.exit(1); });