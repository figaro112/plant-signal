// knifes-generate.mjs — generuje nové KNIFE + 3 prehľady
import path from 'node:path';
import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import {
  ensureDir, fileExists, writeText, readTextSync,
  parseCSV, sanitizeRow, getField, parseAuthors, parseDateSafe,
  kebab, splitFrontMatter, parseSimpleYAML, writeFrontMatter,
  navBlock, ensureBodyDelimiter, injectNav, buildVisibleHeader,
  computeDerived, buildOverviewListFM, buildOverviewDetailsFM
} from './knifes-lib.mjs';

function parseArgs(){
  const args=process.argv.slice(2); const out={
    csv:'data/KNIFE-OVERVIEW-ONLY.csv',
    root:'.', locale:'sk', dryRun:false, debug:false,
    org: process.env.KNIFE_ORG || '',
    project: process.env.KNIFE_PROJECT || '',
  };
  for(let i=0;i<args.length;i++){
    const k=args[i], v=args[i+1];
    if(k==='--csv'){ out.csv=v; i++; continue; }
    if(k==='--root'){ out.root=v; i++; continue; }
    if(k==='--locale'){ out.locale=v; i++; continue; }
    if(k==='--org'){ out.org=v; i++; continue; }
    if(k==='--project'){ out.project=v; i++; continue; }
    if(k==='--dry-run'){ out.dryRun=true; continue; }
    if(k==='--debug'){ out.debug=true; continue; }
  }
  return out;
}

function tedexSkeleton(id, title){
  return `<!-- body:start -->

${navBlock()}# KNIFE ${id} – ${title}

## 🎯 Čo rieši (účel, cieľ)

## 🧩 Ako to rieši (princíp)

## 🧪 Ako to použiť (aplikácia)

---

## ⚡ Rýchly návod (Top)

## 📜 Detailný článok

## 💡 Tipy a poznámky

## ✅ Hodnota / Zhrnutie
`;
}

async function main(){
  const {csv, root, locale, org, project, dryRun, debug}=parseArgs();
  const repoRoot=path.resolve(root);
  const csvPath=path.resolve(repoRoot, csv);

  const text=readTextSync(csvPath);
  const rowsRaw = parseCSV(text);
  const rowsSanitized = rowsRaw.map(sanitizeRow);

  const rows = rowsSanitized.filter(r=>{
    const id=String(getField(r,'id')||'').trim();
    if(id.toLowerCase()==='id') return false;
    if(!/^K\d+$/i.test(id)){ console.warn(`↷ skip row: invalid ID (${id||'∅'})`); return false; }
    if(!getField(r,'short_title')){ console.warn(`↷ skip ${id||'K???'}: missing ShortTitle`); return false; }
    // prehľady: autoparse authors
    r._authors = parseAuthors(r); r._author=r._authors[0]||'';
    return true;
  });

  // 1) Vytvor nové články (existujúce nemeníme)
  for(const row of rows){
    row.ID=String(getField(row,'id')||row.ID||'').trim().toUpperCase();
    const d=computeDerived(row, locale);
    row._folderName=d.folderName; row._linkSlug=d.linkSlug; row._docRelLink=`./${d.folderName}/index.md`;
    const dir=path.join(repoRoot,'docs',locale,'knifes',d.folderName);
    const file=path.join(dir,'index.md');

    if(!(await fileExists(file))){
      if(dryRun){ console.log('Would create:', path.relative(repoRoot, file)); continue; }

      await ensureDir(path.join(dir,'img'));
      await ensureDir(path.join(dir,'multimedia'));

      // frontmatter
      const id=row.ID;
      const shortTitle = getField(row,'short_title');
      const slug = `/${locale}/knifes/${kebab(`${id} ${shortTitle}`)}`;
      const position = parseInt(id.replace(/^K/i,''),10) || 999;
      const tags = (row.Tags||'').split(',').map(t=>t.trim()).filter(Boolean);
      if(!tags.includes('KNIFE')) tags.unshift('KNIFE');

      const authors = parseAuthors(row);
      const createdDt = parseDateSafe(getField(row,'date')) || new Date();

      const fmObj = {
        id, dao:'knife', title: shortTitle || id,
        description: row.Description || '',
        author: authors[0] || '',
        created: createdDt.toISOString().slice(0,10),
        modified: createdDt.toISOString().slice(0,10),
        date: createdDt.toISOString().slice(0,10),
        status: row.Status ? String(row.Status).toLowerCase() : 'draft',
        slug, sidebar_label: `${id} – ${shortTitle}`, sidebar_position: String(position),
        tags, locale,
        category: "", type: "", author_id:"", author_did:"",
        copyright: "© 2025 Roman Kazička / SystemThinking",
        rights_holder_content: "", rights_holder_system: "Roman Kazička (CAA/KNIFE/LetItGrow)",
        license: "CC-BY-NC-SA-4.0", disclaimer: "Educational content. Use at your own risk.",
        guid: crypto.randomUUID(),
        display_id: getField(row,'display_id') || id,
      };

      const fm = writeFrontMatter(fmObj);
      const header = buildVisibleHeader(fmObj.guid, fmObj);
      const body = tedexSkeleton(id, shortTitle);

      await writeText(file, fm + header + body);
      console.log('Created:', path.relative(repoRoot, file));
    } else if (debug){
      console.log('Exists:', path.relative(repoRoot, file));
    }
  }

  // 2) JSON index (ľahký – len ak treba)
  // (voliteľný – vieš doplniť neskôr do libu, ak chceš plný machine index)

  // 3) Prehľady – lightweight + full LIST + full DETAILS
  const overviewDir = path.join(repoRoot, 'docs', locale, 'knifes');
  await ensureDir(overviewDir);

  const overviewShort =
`# 📋 KNIFEs Overview

| ID | Display ID | GUID | Category | Title | Status | Priority | Type | Date | Author | Org | Project |
|------|------------|------|:--------:|:------|:------:|---------:|:----:|:----:|:------:|:---:|:-------:|
` + rows.map(r=>{
    const title = getField(r,'short_title')||'';
    const href = r._docRelLink || r._linkSlug || '#';
    const titleLink = href ? `[${title}](${href})` : title;
    const displayId = getField(r,'display_id')||'';
    const guidVal = getField(r,'guid') || '';
    const author = r._author || r.Author || r.Authors || '';
    const dateVal = getField(r,'date')||'';
    return `| ${r.ID} | ${displayId} | ${guidVal} | ${r.Category||''} | ${titleLink} | ${r.Status||''} | ${r.Priority||''} | ${r.Type||''} | ${dateVal} | ${author} | ${org||''} | ${project||''} |`;
  }).join('\n')+'\n';

  const mdListHeader = `# 📑 KNIFE Overview – List\n\n| ID | Display ID | GUID | Category | Title | Status | Priority | Type | Date | Author | Org | Project |\n|:--:|:----------:|:----:|:--------:|:------|:------:|--------:|:----:|:----:|:------:|:---:|:-------:|\n`;
  const mdListBody = rows.map(r=>{
    const title = getField(r,'short_title')||'';
    const href = r._docRelLink || r._linkSlug || '#';
    const titleLink = href ? `[${title}](${href})` : title;
    const displayId = getField(r,'display_id')||'';
    const guidVal = getField(r,'guid') || '';
    const author = r._author || r.Author || r.Authors || '';
    const dateVal = getField(r,'date')||'';
    return `| ${r.ID} | ${displayId} | ${guidVal} | ${r.Category||''} | ${titleLink} | ${r.Status||''} | ${r.Priority||''} | ${r.Type||''} | ${dateVal} | ${author} | ${org||''} | ${project||''} |`;
  }).join('\n');

  function detailsBlock(r){
    const shortTitle = getField(r,'short_title')||'';
    const link = `[${r._folderName||shortTitle}](${r._docRelLink||'#'})`;
    const tags = (r.Tags||'').split(',').map(t=>t.trim()).filter(Boolean).join(', ');
    const tech = r.Technology || '';
    const sfiaL = r['SFIA – Level'] || r.SFIA_Level || '';
    const sfiaD = r['SFIA – Domain (?)'] || r.SFIA_Domain || '';
    const sfiaM = r['SFIA – Maturity'] || r.SFIA_Maturity || '';
    const ctx = r['Context, Origin, Why it was initiated?'] || r.Context || '';
    const slug = r._linkSlug || '';
    const position = parseInt(String(r.ID||'').replace(/^K/i,''),10) || '';
    const author = r._author || r.Author || r.Authors || '';

    return `### ${r.ID} – ${shortTitle}

**Author**: ${author}  
**Category**: ${r.Category||''}  
**Status**: ${r.Status||''}  
**Type**: ${r.Type||''}  
**Priority**: ${r.Priority||''}  
**Date**: ${getField(r,'date')||''}

**Technology**: ${tech}  
**Description**: ${(r.Description||'')}  
**Context**: ${ctx}  
**SFIA**: level=${sfiaL}, domain=${sfiaD}, maturity=${sfiaM}  
**Tags**: ${tags}  
**Link**: ${link}  
**Display ID**: ${getField(r,'display_id')||''}  
**GUID**: ${getField(r,'guid')||''}

**DAO**: ${r.dao||''}  
**Sidebar Label**: ${r.sidebar_label||''}  
**Sidebar Position**: ${position}  
**Locale**: ${locale}  
**License**: ${r.License||''}  
**Rights Holder (Content)**: ${r.rights_holder_content||r.RightsHolderContent||''}  
**Rights Holder (System)**: ${r.rights_holder_system||r.RightsHolderSystem||''}  
**Disclaimer**: ${r.Disclaimer||''}  
**Copyright**: ${r.Copyright||''}

**Metadáta (generated)**:  
- **slug**: \`${slug}\`  
- **sidebar_label**: \`${r.ID} – ${shortTitle}\`  
- **sidebar_position**: \`${position}\`  
- **locale**: \`${locale}\`  
- **provenance.org**: \`${org||''}\`  
- **provenance.project**: \`${project||''}\`

---
`;
  }

  const mdDetailsBlocks = rows.map(detailsBlock).join('\n');

  if(dryRun){
    console.log(`Would write lightweight overview at docs/${locale}/knifes/overview.md`);
    console.log(`Would write LIST at docs/${locale}/knifes/KNIFE_Overview_List.md`);
    console.log(`Would write DETAILS at docs/${locale}/knifes/KNIFE_Overview_Details.md`);
  }else{
    await writeText(path.join(overviewDir,'overview.md'), overviewShort);
    await writeText(path.join(overviewDir,'KNIFE_Overview_List.md'), buildOverviewListFM(locale)+mdListHeader+mdListBody+'\n');
    await writeText(path.join(overviewDir,'KNIFE_Overview_Details.md'), buildOverviewDetailsFM(locale)+`# 📰 KNIFE Overview – Details\n\n`+mdDetailsBlocks);
    console.log('Overview files written.');
  }
}

main().catch(e=>{ console.error(e); process.exit(1); });