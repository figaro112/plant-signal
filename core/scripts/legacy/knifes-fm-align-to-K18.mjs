#!/usr/bin/env node
// KNIFES – FM aligner to K18 template (DRY/APPLY)
// Usage:
//   node scripts/knifes-fm-align-to-K18.mjs --root docs/sk/knifes --dry
//   node scripts/knifes-fm-align-to-K18.mjs --root docs/sk/knifes --apply
//   node scripts/knifes-fm-align-to-K18.mjs --root docs/sk/knifes --dry --scope all
// Flags:
//   --dry (default) | --apply
//   --root <dir>      Base directory to scan (default: docs/sk/knifes)
//   --scope index|all Process only index.md (default) or ALL .md files
//   --help            Print this help and exit

import fs from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
const get = (flag, def=null) => {
  const i = args.indexOf(flag);
  return i>=0 ? (args[i+1] && !args[i+1].startsWith("--") ? args[i+1] : true) : def;
};
const ROOT = get("--root", "docs/sk/knifes");
const APPLY = !!get("--apply", false);
const DRY = !!get("--dry", !APPLY);

const SCOPE = String(get("--scope", "index")).toLowerCase(); // "index" | "all"
const HELP  = !!get("--help", false);
if (HELP) {
  console.log(`KNIFES – FM aligner to K18
Usage:
  node scripts/knifes-fm-align-to-K18.mjs --root <dir> [--dry|--apply] [--scope index|all]
Flags:
  --dry (default)    Run without writing (prints diffs)
  --apply            Write changes in-place
  --root <dir>       Base directory to scan (default: docs/sk/knifes)
  --scope index|all  Process only index.md (default) or ALL .md files
  --help             Show this message
Notes:
  • Only the first front matter block (--- ... ---) is touched.
  • Extra keys are preserved (never deleted).
  • Arrays like authors/tags are normalized; [""] → [].
  • Scalars are re-quoted; smart quotes are normalized.
`);
  process.exit(0);
}

const REQUIRED_KEYS = [
  "id","guid","dao","title","description",
  "author","authors","category","type","priority",
  "tags","created","modified","status","locale",
  "sidebar_label",
  "rights_holder_content","rights_holder_system",
  "license","disclaimer","copyright",
  "author_id","author_did"
];

const ARRAY_KEYS = new Set(["authors","tags"]);
const REMOVE_KEYS = new Set(["date"]); // úplne odstrániť

const QUOTE_ALWAYS = new Set([
  "id","guid","dao","title","description",
  "author","category","type","priority",
  "created","modified","status","locale",
  "sidebar_label",
  "rights_holder_content","rights_holder_system",
  "license","disclaimer","copyright",
  "author_id","author_did"
]);

const DEFAULTS = {
  author: "Roman Kazička",
  authors: ["Roman Kazička"],
  rights_holder_content: "Roman Kazička",
  rights_holder_system: "Roman Kazička (CAA/KNIFE/LetItGrow)",
  license: "CC-BY-NC-SA-4.0",
  disclaimer: "Use at your own risk. Methods provided as-is; participation is voluntary and context-aware.",
  copyright: "© 2025 Roman Kazička / SystemThinking",
};

function isMd(p){ return p.endsWith(".md"); }

function listFiles(dir){
  const out = [];
  (function walk(d){
    for (const e of fs.readdirSync(d,{withFileTypes:true})) {
      if (e.name.startsWith(".")) continue;
      const p = path.join(d,e.name);
      if (e.isDirectory()) walk(p);
      else if (isMd(p)) out.push(p);
    }
  })(dir);
  return out;
}

function extractFM(text){
  // only first block starting at line1 with '---'
  if (!text.startsWith("---")) return null;
  const end = text.indexOf("\n---", 3);
  if (end === -1) return null;
  const fm = text.slice(3, end).replace(/^\s*\n/,"");
  const body = text.slice(end+4); // skip \n---
  return { fm, body, endIndex:end+4 };
}

function parseSimpleYamlLines(fm){
  // line-based tolerant parser for key: value (no nested objects)
  const lines = fm.split(/\r?\n/);
  const kv = [];
  let inArrayKey = null;
  let arrayBuf = [];

  for (let i=0;i<lines.length;i++){
    const L = lines[i];
    // collect multi-line arrays: key:\n  - "a"\n  - "b"
    const mKey = L.match(/^\s*([A-Za-z0-9_#-]+)\s*:\s*(.*)$/);
    if (mKey) {
      const k = mKey[1];
      const v = mKey[2].trim();

      if (v === "" && i+1<lines.length && lines[i+1].trim().startsWith("-")) {
        // start of array
        inArrayKey = k;
        arrayBuf = [];
        continue;
      } else {
        kv.push([k, v]);
      }
      continue;
    }
    if (inArrayKey) {
      const mItem = L.match(/^\s*-\s*(.*)$/);
      if (mItem) {
        arrayBuf.push(mItem[1].trim());
        // lookahead end of array
        const next = lines[i+1] ?? "";
        const nextIsItem = /^\s*-\s*/.test(next);
        const nextIsKey  = /^\s*[A-Za-z0-9_#-]+\s*:/.test(next);
        if (!nextIsItem) {
          // end array now
          kv.push([inArrayKey, arrayBuf.map(s=>s.replace(/^\s*"?|"?\s*$/g,"")).filter(x=>x.length>0)]);
          inArrayKey = null; arrayBuf = [];
        }
        continue;
      } else {
        // unexpected line ends array
        kv.push([inArrayKey, arrayBuf.map(s=>s.replace(/^\s*"?|"?\s*$/g,"")).filter(x=>x.length>0)]);
        inArrayKey = null; arrayBuf = [];
        // fallthrough to treat line normally next loop
        i--; // re-process this line
        continue;
      }
    }
  }
  return kv;
}

function yamlEscape(s){
  // convert smart quotes to straight
  s = s.replace(/[“”]/g,'"').replace(/[‘’]/g,"'");
  // ensure safe quoted scalar
  s = String(s);
  return `"${s.replace(/\\/g,"\\\\").replace(/"/g,'\\"')}"`;
}

function parseInlineArrayScalar(s) {
  if (typeof s !== "string") return [];
  const trimmed = s.trim();
  if (!trimmed.startsWith("[") || !trimmed.endsWith("]")) return [];
  // Try JSON first after normalizing quotes
  const jsonish = trimmed
    .replace(/“|”/g, '"')
    .replace(/‘|’/g, "'")
    // change single-quoted items to double-quoted for JSON.parse
    .replace(/\[\s*'([^']*)'\s*(,|\])/g, '["$1"$2')
    .replace(/,\s*'([^']*)'\s*(,|\])/g, ',"$1"$2')
    .replace(/,\s*\]/g, ",]");
  try {
    const arr = JSON.parse(jsonish);
    return Array.isArray(arr) ? arr.map(x => String(x)) : [];
  } catch {
    // Fallback: naive split
    const inner = trimmed.slice(1, -1).trim();
    if (!inner) return [];
    return inner
      .split(",")
      .map(x => x.trim().replace(/^"(.*)"$/,'$1').replace(/^'(.*)'$/,'$1'))
      .filter(Boolean);
  }
}

function renderFM(obj){
  const lines = [];
  // Render required keys first in order
  for (const k of REQUIRED_KEYS) {
    const v = obj[k];
    if (ARRAY_KEYS.has(k)) {
      const arr = Array.isArray(v) ? v : [];
      lines.push(`${k}: [${arr.map(x=>yamlEscape(x)).join(", ")}]`);
    } else if (QUOTE_ALWAYS.has(k)) {
      lines.push(`${k}: ${yamlEscape(v ?? "")}`);
    } else {
      // fallback: quote
      lines.push(`${k}: ${yamlEscape(v ?? "")}`);
    }
  }
  // Render extra keys (not in REQUIRED_KEYS) preserving order
  for (const [k,v] of Object.entries(obj)) {
    if (REQUIRED_KEYS.includes(k)) continue;
    if (ARRAY_KEYS.has(k)) {
      const arr = Array.isArray(v) ? v : [];
      lines.push(`${k}: [${arr.map(x=>yamlEscape(x)).join(", ")}]`);
    } else if (typeof v === "string") {
      lines.push(`${k}: ${yamlEscape(v)}`);
    } else {
      // fallback stringify
      lines.push(`${k}: ${yamlEscape(String(v))}`);
    }
  }
  return lines.join("\n");
}

function alignOne(file){
  const raw = fs.readFileSync(file,"utf8");
  const fmBlock = extractFM(raw);
  if (!fmBlock) return {changed:false};

  const kv = parseSimpleYamlLines(fmBlock.fm);
  const map = new Map();
  for (const [k,v] of kv) {
    const key = String(k).trim();
    if (REMOVE_KEYS.has(key)) continue;
    if (ARRAY_KEYS.has(key)) {
      if (Array.isArray(v)) {
        map.set(key, v);
      } else {
        const parsed = parseInlineArrayScalar(String(v));
        map.set(key, parsed);
      }
    } else if (REQUIRED_KEYS.includes(key)) {
      // strip quotes if they exist, we will re-quote later
      let val = Array.isArray(v) ? "" : String(v).trim();
      // remove trailing comments
      val = val.replace(/\s+#.*$/, "");
      // remove surrounding quotes
      val = val.replace(/^"(.*)"$/,'$1').replace(/^'(.*)'$/,'$1');
      map.set(key, val);
    } else {
      // extra keys: preserve, quote if scalar
      if (DRY) {
        console.warn(`⚠️  extra key preserved: ${key}`);
      }
      // treat value as string, stripping trailing comments and quotes
      let val = Array.isArray(v) ? v : String(v).trim();
      if (typeof val === "string") {
        val = val.replace(/\s+#.*$/, "");
        val = val.replace(/^"(.*)"$/,'$1').replace(/^'(.*)'$/,'$1');
      }
      map.set(key, val);
    }
  }

  // defaults for missing keys
  for (const k of REQUIRED_KEYS) {
    if (!map.has(k)) map.set(k, ARRAY_KEYS.has(k) ? [] : "");
  }

  // Fill in default constants for empty values (non-destructive for non-empty fields)
  for (const [k, defVal] of Object.entries(DEFAULTS)) {
    if (!map.has(k)) continue; // already ensured above, but keep guard
    const cur = map.get(k);
    if (ARRAY_KEYS.has(k)) {
      if (!Array.isArray(cur) || cur.length === 0) {
        map.set(k, Array.isArray(defVal) ? defVal : []);
      }
    } else {
      const isEmpty = cur === null || cur === undefined || String(cur).trim() === "";
      if (isEmpty) {
        map.set(k, defVal);
      }
    }
  }

  // Rule enforcing "" → "-" for parser stability:
  // Convert empty strings in REQUIRED_KEYS to "-" (scalar) or ["-"] (array)
  for (const k of REQUIRED_KEYS) {
    if (!map.has(k)) continue;
    const val = map.get(k);
    if (ARRAY_KEYS.has(k)) {
      if (Array.isArray(val) && val.length === 1 && val[0] === "") {
        map.set(k, ["-"]);
      }
    } else {
      if (val === "") {
        map.set(k, "-");
      }
    }
  }

  // rebuild FM
  const newFM = renderFM(Object.fromEntries(map));
  const normalized = `---\n${newFM}\n---`;

  const current = `---\n${fmBlock.fm}\n---`;
  if (current === normalized) return {changed:false};

  if (!APPLY && DRY) {
    return {
      changed:true,
      preview: diffPreview(current, normalized)
    };
  }

  // write back
  const out = normalized + fmBlock.body;
  fs.writeFileSync(file, out, "utf8");
  return {changed:true};
}

function diffPreview(oldS, newS){
  const oldL = oldS.split(/\r?\n/);
  const newL = newS.split(/\r?\n/);
  const max = Math.max(oldL.length, newL.length);
  const out = [];
  for (let i=0;i<max;i++){
    const a = oldL[i] ?? "";
    const b = newL[i] ?? "";
    if (a !== b) {
      out.push(`- ${a}`);
      out.push(`+ ${b}`);
    }
  }
  return out.join("\n");
}

function main(){
  if (!fs.existsSync(ROOT)) {
    console.error(`❌ Root not found: ${ROOT}`);
    process.exit(2);
  }
  const all = listFiles(ROOT).filter(p => isMd(p));
  const files = SCOPE === "all"
    ? all
    : all.filter(p => p.endsWith("/index.md") || path.basename(p) === "index.md");
  let changed=0, scanned=0;
  for (const f of files) {
    const res = alignOne(f);
    scanned++;
    if (res.changed) {
      changed++;
      if (res.preview && DRY) {
        console.log(`~ DRY: would align ${f}`);
        console.log(res.preview+"\n");
      } else if (APPLY) {
        console.log(`Updated: ${f}`);
      }
    }
  }
  const mode = APPLY ? "APPLY" : "DRY";
  console.log(`Summary: ${mode} scope=${SCOPE} scanned=${scanned}, changed=${changed}`);
}

main();