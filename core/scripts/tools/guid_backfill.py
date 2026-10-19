#!/usr/bin/env python3
"""
guid_backfill.py — string-only GUID fixer for Markdown Front Matter.

Usage:
  python3 core/scripts/tools/guid_backfill.py --root content
  python3 core/scripts/tools/guid_backfill.py --root content --apply
"""
import argparse, re, uuid
from pathlib import Path

FM_BLOCK_RE = re.compile(r'(?s)^\s*---\s*(.*?)\s*---\s*(.*)$')
KV_RE = lambda key: re.compile(rf'^({re.escape(key)}\s*:\s*)(["\']?)(.*?)(\2)\s*$', re.M)
UUID4_RE = re.compile(r'^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$')
PLACEHOLDER_RE = re.compile(r'^[xX]{8}-[xX]{4}-[xX]{4}-[xX]{4}-[xX]{12}$')

def replace_kv(fm, key, new_value):
    pat = KV_RE(key)
    if pat.search(fm):
        return pat.sub(lambda m: f'{m.group(1)}"{new_value}"', fm, count=1)
    lines = fm.splitlines()
    lines.insert(1 if len(lines)>1 else 0, f'{key}: "{new_value}"')
    return "\n".join(lines)

def get_kv(fm, key):
    pat = KV_RE(key)
    m = pat.search(fm)
    return m.group(3).strip() if m else None

def valid_uuid4(s): return bool(s and UUID4_RE.match(s.strip().lower()))
def placeholder(s): return bool(s and PLACEHOLDER_RE.match(s.strip()))

def process(md: Path, apply: bool):
    txt = md.read_text(encoding="utf-8", errors="ignore")
    m = FM_BLOCK_RE.match(txt)
    if not m:
        return ("skip-no-fm", "", "")
    fm, body = m.group(1), m.group(2)
    old = get_kv(fm, "guid")
    need = (not old) or placeholder(old) or (not valid_uuid4(old))
    if not need:
        return ("ok", old, old)
    new_guid = str(uuid.uuid4())
    fm2 = replace_kv(fm, "guid", new_guid)
    new_txt = f"---\n{fm2}\n---\n{body}"
    if apply:
        md.write_text(new_txt, encoding="utf-8")
    return ("inserted" if not old else "fixed", old or "", new_guid)

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--root", default="content")
    ap.add_argument("--include", action="append", default=["**/*.md", "**/*.mdx"])
    ap.add_argument("--limit", type=int, default=0)
    ap.add_argument("--apply", action="store_true")
    args = ap.parse_args()

    root = Path(args.root)
    files = []
    for pat in args.include:
        files += list(root.glob(pat))
    files = [p for p in files if p.is_file()]
    if args.limit: files = files[:args.limit]

    print(f"🔎 Scanning {root} ({len(files)} files)")
    ok=fixed=inserted=skipped=0
    for p in files:
        status, old, new = process(p, apply=args.apply)
        if status == "ok": ok+=1
        elif status in ("fixed","inserted"):
            print(f"{'✅' if args.apply else '🧪'} {status.upper()}: {p} {old or '<missing>'} → {new}")
            if status=="fixed": fixed+=1
            else: inserted+=1
        else:
            skipped+=1
    print(f"\n📊 Summary: ok={ok} fixed={fixed} inserted={inserted} skipped={skipped}")
    if not args.apply: print("ℹ️  Re-run with --apply to write changes.")

if __name__ == "__main__":
    main()