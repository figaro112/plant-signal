#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import os, re, sys, collections

ROOT = sys.argv[1] if len(sys.argv) > 1 else "content/docs"

def extract_fm(text):
    m = re.match(r'^\s*---\s*\n', text)
    if not m: return {}
    end = re.search(r'\n---\s*\n', text[m.end():])
    if not end: return {}
    fm_block = text[m.end(): m.end()+end.start()]
    fm = {}
    for line in fm_block.splitlines():
        line = line.strip()
        if not line or line.startswith("#") or ":" not in line: continue
        k, v = line.split(":", 1)
        k = k.strip()
        v = v.strip().strip('"').strip("'")
        fm[k] = v
    return fm

ids = collections.defaultdict(list)
missing = []
for base, _, names in os.walk(ROOT):
    for n in names:
        if not n.lower().endswith(".md"): continue
        p = os.path.join(base, n)
        try:
            with open(p, "r", encoding="utf-8") as f:
                t = f.read()
        except Exception:
            continue
        fm = extract_fm(t)
        doc_id = fm.get("id", "")
        if not doc_id:
            missing.append(p)
        else:
            ids[doc_id].append(p)

dups = {k:v for k,v in ids.items() if len(v) > 1}
print("== FM ID AUDIT ==")
print(f"Scanned root: {ROOT}")
print(f"Total docs with id: {sum(1 for k in ids)}")
print(f"Docs missing id: {len(missing)}")
if missing:
    print("\n[missing id]")
    for p in missing: print("  -", p)

print(f"\nDuplicate id groups: {len(dups)}")
for i,(k,paths) in enumerate(sorted(dups.items()), 1):
    print(f"\n[{i}] id = {k} (count {len(paths)})")
    for p in paths: print("  -", p)

# Exit non-zero if problems
if missing or dups:
    sys.exit(2)
else:
    print("\nOK: No missing/duplicate ids.")