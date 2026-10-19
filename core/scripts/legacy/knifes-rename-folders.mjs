#!/usr/bin/env node
import fs from 'node:fs/promises';
import fssync from 'node:fs';
import path from 'node:path';

function pad6(n){ return String(n).padStart(6,'0'); }
function to6(id3){ const m=String(id3||'').match(/^K(\d{3})$/i); return m?`K${pad6(m[1])}`:''; }

function parseArgs() {
  const a = process.argv.slice(2);
  const o = { root: '.', locale: 'sk', dry: false, debug: false };
  for (let i=0;i<a.length;i++){
    const k=a[i], v=a[i+1];
    if (k==='--root'){ o.root=v; i++; continue; }
    if (k==='--locale'){ o.locale=v; i++; continue; }
    if (k==='--dry'){ o.dry=true; continue; }
    if (k==='--debug'){ o.debug=true; continue; }
  }
  return o;
}

async function exists(p){ try{ await fs.access(p); return true; } catch{ return false; } }

function rewriteFrontmatterIdAndLabel(text, fromId, toId) {
  // len bezpečné minimálne zásahy
  // 1) id: "K037" -> id: "K000037"
  let out = text.replace(
    new RegExp(`^(id:\\s*")${fromId}(")\\s*$`, 'm'),
    `$1${toId}$2`
  );
  // 2) sidebar_label: "K037 – " -> "K000037 – "
  out = out.replace(
    new RegExp(`^(sidebar_label:\\s*")${fromId}(\\s*–\\s*)`, 'm'),
    `$1${toId}$2`
  );
  return out;
}

async function main() {
  const { root, locale, dry, debug } = parseArgs();
  const base = path.join(path.resolve(root), 'docs', locale, 'knifes');
  if (!fssync.existsSync(base)) {
    console.error(`❌ Nenájdené: ${base}`);
    process.exit(2);
  }

  const entries = await fs.readdir(base, { withFileTypes: true });
  const targets = entries
    .filter(e => e.isDirectory())
    .map(e => e.name)
    // len Kxxx-* (s pomlčkou), nie Kxxx_yy a nie už K000xxx-*
    .filter(name => /^K\d{3}(?=-)/i.test(name) && !/^K\d{6}(?=-)/i.test(name));

  if (!targets.length) {
    console.log('✅ Nič na premenovanie (žiadne Kxxx priečinky).');
    return;
  }

  let renamed = 0, fmChanged = 0;

  for (const folder of targets) {
    const m = folder.match(/^K(\d{3,6})(.*)$/i);
    if (!m) continue;
    const digits = m[1];
    const rest = m[2] || '';
    if (digits.length === 6) {
      // už je v 6-cifernom formáte, preskoč
      if (debug) console.log(`↷ skip already 6-digit: ${folder}`);
      continue;
    }
    const id3 = `K${digits}`;
    const id6 = to6(id3);
    const newFolder = `${id6}${rest}`;

    if (id6 === id3) continue; // teoreticky nie, ale pre istotu

    const oldAbs = path.join(base, folder);
    const newAbs = path.join(base, newFolder);

    if (await exists(newAbs)) {
      console.warn(`⚠️ Skip (exists): ${folder} -> ${newFolder}`);
      continue;
    }

    // report rename
    if (dry) console.log(`~ DRY: rename dir -> ${folder}  →  ${newFolder}`);
    else {
      await fs.rename(oldAbs, newAbs);
      console.log(`Renamed dir: ${folder}  →  ${newFolder}`);
      renamed++;
    }

    // uprav index.md (FM id + sidebar_label)
    const idxBase = dry ? oldAbs : newAbs;
    const idxPath = path.join(idxBase, 'index.md');
    if (fssync.existsSync(idxPath)) {
      const raw = await fs.readFile(idxPath, 'utf8');
      const updated = rewriteFrontmatterIdAndLabel(raw, id3.toUpperCase(), id6.toUpperCase());
      if (updated !== raw) {
        if (dry) {
          console.log(`  ~ DRY: would fix FM in ${path.relative(root, idxPath)} (id ${id3} → ${id6})`);
        } else {
          // backup
          await fs.writeFile(idxPath + '.bak', raw, 'utf8');
          await fs.writeFile(idxPath, updated, 'utf8');
          console.log(`  FM updated: id ${id3} → ${id6}`);
          fmChanged++;
        }
      }
    } else {
      console.warn(`  ⚠️ Missing index.md in ${dry ? folder : newFolder} (FM skip)`);
    }
  }

  console.log(`\nSummary: ${dry ? '(DRY) ' : ''}folders processed=${targets.length}, renamed=${renamed}, fm-updated=${fmChanged}`);
}

main().catch(e => { console.error(e); process.exit(1); });