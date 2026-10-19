#!/usr/bin/env python3
"""
fm_sync_visible.py — Sync 'fm-visible' header in body with Front Matter values.
String-only (no YAML libs). Safe DRY/Apply modes.

What it does:
- Reads FM (between first two '---' lines) and extracts keys:
    guid, author (or authors[0..]), status
- Finds block:
    <!-- fm-visible: start -->
      ... lines ...
    <!-- fm-visible: end -->
  and replaces only these lines (if present):
    > **GUID:** `...`
    > **Status:** `...`
    > **Author:** ...
- If fm-visible block is missing -> skip file (no change).

Usage examples:
  DRY (default): python3 fm_sync_visible.py --root content/docs
  APPLY:         python3 fm_sync_visible.py --root content/docs --apply
  Limit files:   python3 fm_sync_visible.py --root content/docs --limit 10
"""
import argparse
import os
import re
from pathlib import Path
from typing import Dict, Optional, Tuple

FM_RE = re.compile(r"(?s)^\s*---\s*(.*?)\s*---\s*(.*)$")
SIMPLE_KV = re.compile(r'^\s*([A-Za-z0-9_]+)\s*:\s*"(.*?)"\s*$', re.M)
INLINE_LIST = re.compile(r'^\s*([A-Za-z0-9_]+)\s*:\s*\[(.*?)\]\s*$', re.M)

FMV_START = "<!-- fm-visible: start -->"
FMV_END   = "<!-- fm-visible: end -->"

# line patterns inside fm-visible block
RE_GUID   = re.compile(r'^(\s*>\s*\*\*GUID:\*\*\s*`)([^`]*)(`)\s*$', re.M)
RE_STATUS = re.compile(r'^(\s*>\s*\*\*Status:\*\*\s*`)([^`]*)(`)\s*$', re.M)
RE_AUTHOR = re.compile(r'^(\s*>\s*\*\*Author:\*\*\s*)(.*?)(\s*)$', re.M)

def parse_fm(text: str) -> Tuple[Optional[str], Optional[str]]:
    m = FM_RE.match(text)
    if not m:
        return None, None
    return m.group(1), m.group(2)

def parse_kv(fm: str) -> Dict[str, str]:
    data: Dict[str, str] = {}
    for m in SIMPLE_KV.finditer(fm):
        data[m.group(1)] = m.group(2)
    for m in INLINE_LIST.finditer(fm):
        key = m.group(1)
        inner = m.group(2)
        parts = [p.strip().strip('"') for p in inner.split(',') if p.strip()]
        data[key] = ", ".join(parts)
    return data

def extract_visible_block(body: str) -> Tuple[int, int, Optional[str]]:
    start = body.find(FMV_START)
    if start == -1:
        return -1, -1, None
    end = body.find(FMV_END, start)
    if end == -1:
        return -1, -1, None
    content_start = start + len(FMV_START)
    content = body[content_start:end]
    return start, end, content

def sync_block(block: str, guid: Optional[str], status: Optional[str], author: Optional[str]) -> str:
    new_block = block

    def esc(val: Optional[str]) -> str:
        # Escape any backslashes to prevent accidental regex backreferences
        if not val:
            return ""
        return val.replace("\\", "\\\\")
    
    if guid:
        safe_guid = esc(guid)
        # Use \g<1>/\g<3> to avoid \1<digit> → \10 group-reference confusion
        new_block = RE_GUID.sub(rf"\g<1>{safe_guid}\g<3>", new_block)

    if status:
        safe_status = esc(status)
        new_block = RE_STATUS.sub(rf"\g<1>{safe_status}\g<3>", new_block)

    if author:
        safe_author = esc(author)
        new_block = RE_AUTHOR.sub(rf"\g<1>{safe_author}\g<3>", new_block)

    return new_block

def preferred_author(data: Dict[str, str]) -> Optional[str]:
    if data.get("author"):
        return data["author"]
    if data.get("authors"):
        return data["authors"]  # already joined as "a, b, c"
    return None

def main():
    ap = argparse.ArgumentParser(description="Sync fm-visible block with Front Matter (GUID/Status/Author).")
    ap.add_argument("--root", default="content/docs", help="Root directory to scan (default: content/docs)")
    ap.add_argument("--include", action="append", default=["**/*.md"], help="Glob patterns (default: **/*.md)")
    ap.add_argument("--limit", type=int, default=0, help="Process at most N files")
    ap.add_argument("--apply", action="store_true", help="Write changes (default: DRY)")
    args = ap.parse_args()

    root = Path(args.root)
    files = []
    for pat in args.include:
        files += list(root.glob(pat))
    files = [p for p in files if p.is_file()]
    files.sort()
    if args.limit > 0:
        files = files[:args.limit]

    changed = 0
    skipped_no_block = 0
    scanned = 0

    for path in files:
        scanned += 1
        text = path.read_text(encoding="utf-8", errors="ignore")
        fm_text, body = parse_fm(text)
        if not fm_text:
            continue  # no FM → ignore silently

        data = parse_kv(fm_text)
        guid = data.get("guid")
        status = data.get("status")
        author = preferred_author(data)

        b_start, b_end, block = extract_visible_block(body)
        if block is None:
            skipped_no_block += 1
            continue

        new_block = sync_block(block, guid, status, author)

        if new_block != block:
            changed += 1
            if args.apply:
                new_body = body[:b_start+len(FMV_START)] + new_block + body[b_end:]
                new_text = f"---\n{fm_text}\n---\n{new_body}"
                path.write_text(new_text, encoding="utf-8")
                print(f"🛠  SYNC: {path}")
            else:
                print(f"🧪 would SYNC: {path}")

    mode = "APPLY" if args.apply else "DRY"
    print(f"\n📊 Summary [{mode}] scanned={scanned} changed={changed} skipped_no_block={skipped_no_block}")
    if not args.apply:
        print("ℹ️  Re-run with --apply to write changes.")

if __name__ == "__main__":
    raise SystemExit(main())