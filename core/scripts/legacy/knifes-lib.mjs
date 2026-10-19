// knifes-lib.mjs — zdieľané utility (ESM)

import fs from 'node:fs/promises';
import fssync from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

/* ========== FS helpers ========== */
export async function ensureDir(p){ await fs.mkdir(p,{recursive:true}); }
export async function fileExists(p){ try{ await fs.access(p); return true; }catch{ return false; } }
export function readTextSync(p){ return fssync.readFileSync(p,'utf8'); }
export async function writeText(p, txt){ await ensureDir(path.dirname(p)); await fs.writeFile(p, txt, 'utf8'); }

/* ========== Slug / kebab ========== */
export function kebab(s){
  return String(s||'untitled')
    .normalize('NFKD').replace(/[\u0300-\u036f]/g,'')
    .replace(/[^a-zA-Z0-9]+/g,'-').replace(/^-+|-+$/g,'')
    .toLowerCase();
}

/* ========== Sanitizácia ========== */
export function sanitizeScalar(v, max=4000){
  let s = String(v ?? '');
  s = s.replace(/\u00A0/g, ' '); // NBSP -> space
  s = s.replace(/\\{5,}/g,'\\').replace(/[ \t]{3,}/g,' ');
  if (s.length>max) s = s.slice(0,max)+'…';
  return s;
}
export function sanitizeRow(row){
  const out={}; for (const [k,v] of Object.entries(row)) out[k]=sanitizeScalar(v);
  return out;
}

/* ========== CSV parser (preface tolerant, quoted newlines) ========== */
export const HEADER_ALIASES = {
  id: ['ID','Id','id','\uFEFFID'],
  short_title: ['ShortTitle','Short Title','title'],
  folder_name: ['FolderName','Folder Name'],
  sidebar_label: ['SidebarLabel','Sidebar Label'],
  date: ['Date','Date of Record','created'],
  guid: ['GUID','Guid','guid'],
  display_id: ['DisplayID','HumanID','Alias','display_id'],
};

export function getField(row, key){
  const aliases = HEADER_ALIASES[key] || [key];
  for(const k of aliases){ if(row[k]!==undefined && row[k]!==null && row[k]!=='') return row[k]; }
  return '';
}

export function parseCSV(text){
  text = text.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
  const lines = text.split('\n');

  // header autodetect
  let headerIdx=-1, delim=',';
  const parseHdr = (line,d)=>{
    const cells=[]; let field='',inQ=false;
    for(let i=0;i<line.length;i++){
      const c=line[i];
      if(inQ){
        if(c==='\"'){
          if(i+1<line.length && line[i+1]==='\"'){ field+='\"'; i++; }
          else inQ=false;
        } else field+=c;
      }else{
        if(c==='\"') inQ=true;
        else if(c===d){ cells.push(field); field=''; }
        else field+=c;
      }
    }
    cells.push(field);
    return cells.map(s=>String(s).replace(/^\uFEFF/,'').trim().replace(/^\"|\"$/g,''));
  };
  outer: for(let i=0;i<lines.length;i++){
    const L=lines[i]; if(!L.trim()) continue;
    for(const d of [',',';','\t','|']){
      const cells=parseHdr(L,d).map(s=>s.toLowerCase());
      const hasId=cells.some(c=>c==='id'||c==='\ufeffid');
      const hasTitle=cells.some(c=>c==='shorttitle'||c==='short title'||c==='title');
      if(hasId && hasTitle){ headerIdx=i; delim=d; break outer; }
    }
  }
  if(headerIdx===-1) return [];

  // full parse (quoted newlines)
  const block = lines.slice(headerIdx).join('\n');
  const rows=[]; let field='', row=[], inQ=false;
  for(let i=0;i<block.length;i++){
    const c=block[i];
    if(inQ){
      if(c==='\"'){
        if(i+1<block.length && block[i+1]==='\"'){ field+='\"'; i++; }
        else inQ=false;
      } else field+=c;
    }else{
      if(c==='\"') inQ=true;
      else if(c===delim){ row.push(field); field=''; }
      else if(c==='\n'){ row.push(field); rows.push(row); field=''; row=[]; }
      else field+=c;
    }
  }
  row.push(field); rows.push(row);

  const header = rows[0].map(h=>String(h).trim());
  const out=[];
  for(let i=1;i<rows.length;i++){
    const cols = rows[i]; const obj={};
    header.forEach((h,idx)=>obj[h]=(cols[idx]??'').trim());
    out.push(obj);
  }
  return out;
}

/* ========== YAML FM I/O (jednoduché a stabilné) ========== */
export function splitFrontMatter(text){
  const m=text.match(/^---\s*\n([\s\S]*?)\n---\s*\n?/);
  if(!m) return [null,text];
  return [m[1], text.slice(m[0].length)];
}
export function parseSimpleYAML(yaml){
  if(!yaml) return {};
  const obj={};
  for(const line of yaml.split('\n')){
    const mm=line.match(/^([A-Za-z0-9_]+):\s*(.*)$/);
    if(mm) obj[mm[1]]=mm[2].replace(/^\"|\"$/g,'').trim();
  }
  return obj;
}
export function writeFrontMatter(obj){
  const order=[
    'id','guid','dao','title','description','author',
    'created','modified','date',
    'status','tags',
    'slug','sidebar_label','sidebar_position','locale',
    'category','type','author_id','author_did',
    'copyright','rights_holder_content','rights_holder_system','license','disclaimer'
  ];
  const quote=(s)=>JSON.stringify(String(s??''));
  const print=(v)=>{
    if(v===null||v===undefined) return '""';
    if(typeof v==='number'||typeof v==='boolean') return String(v);
    return quote(v);
  };
  const b=['---'];
  for(const k of order){
    if(!(k in obj)) continue;
    const val=obj[k]; if(val===undefined) continue;
    if(k==='tags' && Array.isArray(val)){ b.push(`${k}: [${val.map(quote).join(', ')}]`); continue; }
    if(k==='slug'){ const printed=(typeof val==='string'&&val)?quote(val):'""'; b.push(`# slug: ${printed}`); continue; }
    b.push(`${k}: ${print(val)}`);
  }
  b.push('---');
  return b.join('\n')+'\n';
}

/* ========== Date utils ========== */
export function parseDateSafe(s){
  const raw=String(s||'').trim(); if(!raw) return null;
  let m=raw.match(/^(\d{4})[-\/.](\d{1,2})[-\/.](\d{1,2})$/);
  if(m){ const [,y,mo,d]=m; const dt=new Date(+y,+mo-1,+d); return isNaN(dt)?null:dt; }
  m=raw.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if(m){ const [,d,mo,y]=m; const dt=new Date(+y,+mo-1,+d); return isNaN(dt)?null:dt; }
  m=raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if(m){ const [,mo,d,y]=m; const dt=new Date(+y,+mo-1,+d); return isNaN(dt)?null:dt; }
  const dt=new Date(raw); return isNaN(dt)?null:dt;
}

/* ========== Authors / tags helpers ========== */
export function parseAuthors(row){
  const raw = row.Authors ?? row.Author ?? row.author ?? '';
  return String(raw).split(/[,;|]/).map(s=>s.trim()).filter(Boolean).slice(0,10);
}
export function normToArray(v){
  if(Array.isArray(v)) return v.filter(Boolean).map(s=>String(s).trim());
  if(typeof v==='string'){
    let str=v.trim(); if(!str) return [];
    if(/^\[.*\]$/.test(str)){
      try{ const arr=JSON.parse(str); if(Array.isArray(arr)) return arr.map(x=>String(x).trim()); }catch{}
      const inner=str.replace(/^\[/,'').replace(/\]$/,'');
      return inner.split(/\s*,\s*/).map(s=>s.replace(/^\s*["']|["']\s*$/g,'').trim()).filter(Boolean);
    }
    return str.split(/[,;|]/).map(s=>s.trim()).filter(Boolean);
  }
  return [];
}

/* ========== NAV & body:start & visible header ========== */
export const NAV_MARKER = '<!-- nav:knifes -->';
export function navBlock(){
  return `${NAV_MARKER}
> [⬅ KNIFES – Prehľad](../overview.md)
---
`;
}
export function ensureBodyDelimiter(body){
  const t=body.trimStart();
  return t.startsWith('<!-- body:start -->') ? body : `<!-- body:start -->\n\n${body}`;
}
export function injectNav(body){
  if(body.includes(NAV_MARKER)) return body;
  const idx=body.indexOf('<!-- body:start -->');
  if(idx>=0){
    const before=body.slice(0, idx + '<!-- body:start -->'.length);
    const after =body.slice(idx + '<!-- body:start -->'.length);
    return `${before}\n\n${navBlock()}${after}`.replace(/\n{3,}/g,'\n\n');
  }
  return `${navBlock()}${body}`;
}
export function buildVisibleHeader(guid, fm){
  const parts=[];
  if(fm.category) parts.push(`**Category:** \`${fm.category}\``);
  if(fm.type)     parts.push(`**Type:** \`${fm.type}\``);
  if(fm.status)   parts.push(`**Status:** \`${fm.status}\``);
  const who=fm.author||fm.author_id||'';
  if(who)         parts.push(`**Author:** ${who}`);
  if(fm.license)  parts.push(`**License:** ${fm.license}`);
  const guidLine = guid ? `> **GUID:** \`${guid}\`\n` : '';
  const metaLine = parts.length ? `> ${parts.join(' · ')}\n` : '';
  return `<!-- fm-visible: start -->\n${guidLine}${metaLine}<!-- fm-visible: end -->\n`;
}

/* ========== Misc ========== */
export const UUID_V4_RE=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function isUuidV4(s){ return UUID_V4_RE.test(String(s||'').trim()); }

/* ========== Common derivations ========== */
export function computeDerived(row, locale='sk'){
  const shortTitle = getField(row,'short_title') || 'Untitled';
  const id = String(getField(row,'id')||'').trim().toUpperCase();
  const folderName = (getField(row,'folder_name') || `${id}-${kebab(shortTitle)}`).trim();
  const sidebarLabel = (getField(row,'sidebar_label') || `${id} – ${shortTitle}`).trim();
  const linkSlug = `/${locale}/knifes/${kebab(`${id} ${shortTitle}`)}`;
  return { shortTitle, folderName, sidebarLabel, linkSlug };
}

/* ========== Overview FM builders ========== */
export function buildOverviewListFM(locale){
  return `---
id: KNIFE_Overview_List
dao: knife
title: "📑 KNIFE Overview – List"
description: ""
status: draft
locale: ${locale}
tags: ["KNIFE"]
sidebar_label: "📑 KNIFE Overview – List"
---
`;
}
export function buildOverviewDetailsFM(locale){
  return `---
id: KNIFE_Overview_Details
dao: knife
title: "📰 KNIFE Overview – Details"
description: ""
status: draft
locale: ${locale}
tags: ["KNIFE"]
sidebar_label: "📰 KNIFE Overview – Details"
---
`;
}