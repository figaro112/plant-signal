// scripts/build_knifes.mjs
// Usage:
//   node scripts/build_knifes.mjs --csv data/KNIFE-OVERVIEW-ONLY.csv --root .
// What it does:
//  1) Reads CSV (semicolon or comma separated).
/*  2) For each row with ID like K000061:
//       - Ensures docs/sk/KNIFES/<FolderName>/ exists
//       - Creates <FolderName>.md if missing (with front matter)
//     It never overwrites existing .md (idempotent).
//  3) Generates/updates three overview files at repo root:
//       KNIFEsOverview.md, KNIFE_Overview_List.md, KNIFE_Overview_Details.md
// Columns expected (header names in CSV):
//   ID, ShortTitle, Category, Status, Priority, Type, Date, FolderName, SidebarLabel, LinkSlug, Tags, Description, Context
// Optional columns are tolerated (leave empty).
// If LinkSlug missing, it will be generated from FolderName as `/KNIFES/<FolderName>/`
// If SidebarLabel missing, it will use `${ID} – ${ShortTitle}`
// If FolderName missing, it will generate `${ID}-${kebab(ShortTitle)}`
// Note: Slugs are published relative to default locale (sk) at routeBasePath '/'
//       => final URL is: <baseUrl> + <slug>
//
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function parseArgs() {
  const args = process.argv.slice(2);
  const out = { csv: 'data/KNIFE-OVERVIEW-ONLY.csv', root: '.' };
  for (let i = 0; i < args.length; i += 2) {
    const k = args[i];
    const v = args[i+1];
    if (k === '--csv') out.csv = v;
    if (k === '--root') out.root = v;
  }
  return out;
}

// CSV parser (semicolon or comma)
function parseCSV(text) {
  // Normalize line endings
  text = text.replace(/\r\n/g, '\n');
  // Detect delimiter
  const delimiter = text.split('\n')[0].includes(';') ? ';' : ',';
  const lines = text.split('\n').filter(l => l.trim().length > 0);
  if (lines.length === 0) return [];
  const headers = lines[0].split(delimiter).map(h => h.trim());
  return lines.slice(1).map(line => {
    const cols = [];
    let curr = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i+1] === '"') { curr += '"'; i++; }
        else inQuotes = !inQuotes;
      } else if (ch === delimiter && !inQuotes) {
        cols.push(curr); curr = '';
      } else {
        curr += ch;
      }
    }
    cols.push(curr);
    const obj = {};
    headers.forEach((h, idx) => obj[h] = (cols[idx] ?? '').trim());
    return obj;
  });
}

function kebab(s) {
  return (s || 'untitled')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '') // accents
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
}

function ensureTrailingSlash(s) {
  if (!s) return '/';
  return s.endsWith('/') ? s : s + '/';
}

function mdEscape(str) {
  return String(str||'').replace(/"/g, '\\"');
}

async function ensureDir(p) {
  await fs.mkdir(p, { recursive: true });
}

async function fileExists(p) {
  try { await fs.access(p); return true; } catch { return false; }
}

function buildFrontMatter(row) {
  const idLower = (row.ID || 'kxxx').toLowerCase();
  const shortTitle = row.ShortTitle || 'Untitled';
  const folderName = row.FolderName && row.FolderName.trim() ? row.FolderName.trim() : `${row.ID}-${kebab(shortTitle)}`;
  const sidebarLabel = row.SidebarLabel && row.SidebarLabel.trim() ? row.SidebarLabel.trim() : `${row.ID} – ${shortTitle}`;
  const linkSlug = ensureTrailingSlash(row.LinkSlug && row.LinkSlug.trim() ? row.LinkSlug.trim() : `/KNIFES/${folderName}/`);
  const tags = (row.Tags || '')
    .split(',')
    .map(t => t.trim())
    .filter(Boolean)
    .map(t => `"${t}"`)
    .join(', ');

  return {
    folderName,
    fileName: `${folderName}.md`,
    front: `---
id: ${idLower}-${kebab(shortTitle)}
title: "${mdEscape(row.ID)} – ${mdEscape(shortTitle)}"
slug: ${linkSlug}
sidebar_label: "${mdEscape(sidebarLabel)}"
tags: [${tags}]
---

${row.Description ? row.Description + '\n\n' : ''}${row.Context ? '## Kontext\n' + row.Context + '\n' : ''}`
  };
}

function tableLine(row) {
  const link = (row.LinkSlug && row.LinkSlug.trim())
    ? `[${row.ShortTitle}](${row.LinkSlug})`
    : `${row.ShortTitle}`;
  return `| ${row.ID} | ${row.Category||''} | ${row.ShortTitle||''} | ${row.Status||''} | ${row.Priority||''} | ${row.Type||''} | ${row.Date||''} | ${link} |`;
}

function detailsBlock(row) {
  const link = (row.LinkSlug && row.LinkSlug.trim())
    ? `[${row.FolderName||row.ShortTitle}](${row.LinkSlug})`
    : '';
  const tags = (row.Tags||'').split(',').map(t=>t.trim()).filter(Boolean).join(', ');
  return `### ${row.ID} – ${row.ShortTitle}

**Category**: ${row.Category||''}  
**Status**: ${row.Status||''}  
**Type**: ${row.Type||''}  
**Priority**: ${row.Priority||''}  
**Date**: ${row.Date||''}

**Description**: ${row.Description||''}  
**Context**: ${row.Context||''}  
**Tags**: ${tags}  
**Link**: ${link}

---
`;
}

async function main() {
  const {csv, root} = parseArgs();
  const repoRoot = path.resolve(root);
  const csvPath = path.resolve(repoRoot, csv);

  const text = await fs.readFile(csvPath, 'utf8');
  const rowsRaw = parseCSV(text);
  // Only keep Kxxx rows
  const rows = rowsRaw.filter(r => /^K\d{3}$/i.test(r.ID||''));

  // 1) Generate/ensure MD docs
  for (const row of rows) {
    const {folderName, fileName, front} = buildFrontMatter(row);
    const dir = path.join(repoRoot, 'docs', 'sk', 'KNIFES', folderName);
    const file = path.join(dir, fileName);
    await ensureDir(dir);
    if (!(await fileExists(file))) {
      await fs.writeFile(file, front, 'utf8');
      console.log('Created:', path.relative(repoRoot, file));
    } else {
      console.log('Skipped (exists):', path.relative(repoRoot, file));
    }
  }

  // 2) Overviews
  const overviewShort = `# 📋 KNIFEs Overview

| ID   | Category | Short Title | Status | Priority | Type | Date | Link |
|------|----------|-------------|--------|---------:|------|------|------|
` + rows.map(tableLine).join('\n') + `
`;

  const overviewList = `| ID | Category | Short Title | Status | Type | Priority | Description | Context, Origin, Why it was initiated? | SFIA – Level | SFIA – Domain (?) | SFIA – Maturity | Tags |
|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
` + rows.map(r => {
    const tags = (r.Tags||'').split(',').map(t=>t.strip).join(', ');
    return `| ${r.ID} | ${r.Category||''} | ${r.ShortTitle||''} | ${r.Status||''} | ${r.Type||''} | ${r.Priority||''} | ${r.Description||''} | ${r.Context||''} | ${r.SFIA_Level||''} | ${r.SFIA_Domain||''} | ${r.SFIA_Maturity||''} | ${r.Tags||''} |`;
  }).join('\n') + `
`;

  const overviewDetails = `# 📘 KNIFE Overview – Detailed View

` + rows.map(detailsBlock).join('\n');

  await fs.writeFile(path.join(repoRoot, 'KNIFEsOverview.md'), overviewShort, 'utf8');
  await fs.writeFile(path.join(repoRoot, 'KNIFE_Overview_List.md'), overviewList, 'utf8');
  await fs.writeFile(path.join(repoRoot, 'KNIFE_Overview_Details.md'), overviewDetails, 'utf8');

  console.log('Overview files written at repo root.');
}

main().catch(err => { console.error(err); process.exit(1); });
