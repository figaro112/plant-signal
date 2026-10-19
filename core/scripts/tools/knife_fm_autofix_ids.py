#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
knife_fm_autofix_ids.py — audit+autofix duplicít a placeholderov vo frontmatter ID

Pravidlá opráv:
1) Špeciálne overview stránky (konštantné ID):
   - content/docs/sk/index.md                       -> KNIFE_HOME
   - content/docs/sk/knifes/overview.md             -> KNIFE_OVERVIEW_HOME
   - content/docs/sk/knifes/KNIFE_Overview_List.md  -> KNIFE_OVERVIEW_LIST
   - content/docs/sk/knifes/KNIFE_Overview_Blog.md  -> KNIFE_OVERVIEW_BLOG

2) K000 placeholder / generické "K000":
   - Ak cesta obsahuje priečinok "Kdddddd-..." (napr. K000051-...), nastav id na "Kdddddd" (napr. K000051).
   - Ak nie, použij slug z názvu priečinka s md súborom.

3) id == "index":
   - Odstráň z FM (Docusaurus si vygeneruje unikátne ID z cesty).

4) id == "readme.migrated":
   - Nastav na "readme.migrated-<parentdir>" (unikát s kontextom priečinka).

5) id začína na "TMP-KNIFE-" a je duplicitné:
   - Pridaj sufix "-<parentdir-slug>" (napr. TMP-KNIFE-20251008-002-unclasified-LinkedIn-URL).

6) Chýbajúce id:
   - Doplň na slug z názvu priečinka (alebo z názvu súboru, ak nie je index.md).

Skript je idempotentný. Má 2 fázy: (A) audit ids, (B) fix podľa pravidiel.
"""

import os, re, sys, argparse
from collections import defaultdict

DEF_ROOT = "content/docs"

# ---- helpers ---------------------------------------------------------------

def read_text(p):
    with open(p, "r", encoding="utf-8") as f:
        return f.read()

def write_text(p, s):
    with open(p, "w", encoding="utf-8") as f:
        f.write(s)

def between_fm(text):
    m1 = re.match(r'^\s*---\s*\n', text)
    if not m1: return None
    m2 = re.search(r'\n---\s*\n', text[m1.end():])
    if not m2: return None
    s = m1.end()
    e = m1.end() + m2.start()
    return (s, e)

def get_fm(text):
    be = between_fm(text)
    if not be: return {}
    s, e = be
    fm = {}
    for line in text[s:e].splitlines():
        line = line.strip()
        if not line or line.startswith("#") or ":" not in line: continue
        k, v = line.split(":", 1)
        fm[k.strip()] = v.strip().strip('"').strip("'")
    return fm

def set_id(text, new_id):
    be = between_fm(text)
    if not be: 
        return text
    s, e = be
    fm = text[s:e]
    # either replace existing id: "..." or append new id line
    replaced, n = re.subn(r'^(\s*id\s*:\s*)".*?"(\s*)$', r'\1"'+new_id+r'"\2', fm, count=1, flags=re.MULTILINE)
    if n == 0:
        if not fm.endswith("\n"): fm += "\n"
        fm = fm + f'id: "{new_id}"\n'
    else:
        fm = replaced
    return text[:s] + fm + text[e:]

def remove_id(text):
    be = between_fm(text)
    if not be: 
        return text
    s, e = be
    fm = text[s:e]
    fm2, n = re.subn(r'^\s*id\s*:\s*".*?"\s*\n?', '', fm, flags=re.MULTILINE)
    return text[:s] + fm2 + text[e:]

def slugify(s):
    s = s.strip().replace(" ", "-")
    s = re.sub(r'[^A-Za-z0-9._-]+', '-', s)
    s = re.sub(r'-{2,}', '-', s).strip('-')
    return s or "untitled"

def detect_kcode(path):
    # returns e.g. "K000051" from ".../knifes/K000051-something/index.md"
    m = re.search(r'/K(\d{6})[^/]*/', path)
    if m:
        return "K" + m.group(1)
    return None

def parent_dir_slug(md_path):
    base = os.path.dirname(md_path.rstrip("/"))
    return slugify(os.path.basename(base))

def is_index(md_path):
    return os.path.basename(md_path).lower() in ("index.md",)

# ---- rule mapping for special overviews -----------------------------------

SPECIAL_PATH_MAP = {
    # normalized to posix-style
    "content/docs/sk/index.md": "KNIFE_HOME",
    "content/docs/sk/knifes/overview.md": "KNIFE_OVERVIEW_HOME",
    "content/docs/sk/knifes/KNIFE_Overview_List.md": "KNIFE_OVERVIEW_LIST",
    "content/docs/sk/knifes/KNIFE_Overview_Blog.md": "KNIFE_OVERVIEW_BLOG",
}

def norm_path(p):
    return p.replace("\\", "/")

# ---- scan all md files -----------------------------------------------------

def iter_md(root):
    for b, _, ns in os.walk(root):
        for n in ns:
            if n.lower().endswith(".md"):
                yield os.path.join(b, n)

# ---- main logic ------------------------------------------------------------

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("root", nargs="?", default=DEF_ROOT)
    ap.add_argument("--apply", action="store_true", help="write changes")
    ap.add_argument("--dry-run", action="store_true", help="show planned changes (default)")
    args = ap.parse_args()
    if not args.apply:
        args.dry_run = True

    files = list(iter_md(args.root))
    ids = defaultdict(list)
    missing = []

    # Pass A: collect ids
    for p in files:
        try:
            t = read_text(p)
        except Exception:
            continue
        fm = get_fm(t)
        did = fm.get("id", "")
        if did:
            ids[did].append(p)
        else:
            missing.append(p)

    # Helper to know duplicates
    dup_ids = {k for k,v in ids.items() if len(v) > 1}

    changes = []
    for p in files:
        np = norm_path(p)
        try:
            t = read_text(p)
        except Exception:
            continue
        fm = get_fm(t)
        cur = fm.get("id", "")
        new_t = t
        action = None

        # (1) Special known paths
        if np in SPECIAL_PATH_MAP:
            wanted = SPECIAL_PATH_MAP[np]
            if cur != wanted:
                new_t = set_id(t, wanted)
                action = f'id: "{cur or "-"}" -> "{wanted}"'

        # (2) id == "index"  -> remove id
        elif cur == "index":
            new_t = remove_id(t)
            if new_t != t:
                action = 'remove id: "index"'

        # (3) readme.migrated -> add suffix
        elif cur == "readme.migrated":
            suffix = parent_dir_slug(p)
            wanted = f"readme.migrated-{suffix}"
            if cur != wanted:
                new_t = set_id(t, wanted)
                action = f'id: "readme.migrated" -> "{wanted}"'

        # (4) placeholder KXXXXXXX
        elif cur == "KXXXXXXX":
            # route overview ones already handled in (1)
            # for any other file, derive from parent dir slug
            wanted = parent_dir_slug(p)
            if cur != wanted:
                new_t = set_id(t, wanted)
                action = f'id: "KXXXXXXX" -> "{wanted}"'

        # (5) generic K000 (seen in your audit)
        elif cur == "K000":
            code = detect_kcode(np)
            if code:
                wanted = code
            else:
                wanted = parent_dir_slug(p)
            if cur != wanted:
                new_t = set_id(t, wanted)
                action = f'id: "K000" -> "{wanted}"'

        # (6) TMP-KNIFE-* and duplicated -> add -<parentdir>
        elif cur.startswith("TMP-KNIFE-") and cur in dup_ids:
            wanted = f"{cur}-{parent_dir_slug(p)}"
            new_t = set_id(t, wanted)
            action = f'id: "{cur}" -> "{wanted}"'

        # (7) missing id -> fill from parent dir (or filename if not index)
        elif not cur:
            base_slug = parent_dir_slug(p) if is_index(p) else slugify(os.path.splitext(os.path.basename(p))[0])
            wanted = base_slug
            new_t = set_id(t, wanted)
            action = f'add id: "{wanted}"'

        if action and new_t != t:
            if args.apply:
                write_text(p, new_t)
            changes.append((p, action))

    # Report
    mode = "APPLY" if args.apply else "DRY-RUN"
    print(f"[{mode}] planned changes: {len(changes)}")
    for p, act in changes:
        print(f"  - {p}\n      {act}")

    # Exit codes: 0 ok (or planned), 2 if still duplicates remain after apply
    if args.apply:
        # re-audit duplicates after apply
        ids2 = defaultdict(int)
        for p in files:
            try:
                fm = get_fm(read_text(p))
            except Exception:
                continue
            did = fm.get("id", "")
            if did: ids2[did] += 1
        dup_left = [k for k, cnt in ids2.items() if cnt > 1]
        if dup_left:
            print("\n❌ Duplicates remain:", ", ".join(dup_left))
            sys.exit(2)
    sys.exit(0)

if __name__ == "__main__":
    main()