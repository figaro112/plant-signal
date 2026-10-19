#!/usr/bin/env python3
"""
FM Audit (Python-only, no YAML parsing)
- Scans Markdown files for Front Matter (between first two lines with ---)
- Pure string/regex extraction (no YAML libs)
- Reports presence/quality of key fields to CSV

Compatible with Makefile targets using:
  --root, --output, --template, --locales, --also
(Extra flags like --template/--locales/--also are accepted but not required.)
"""
import argparse
import csv
import os
import re
import sys
from datetime import datetime
from typing import Dict, Optional, Tuple

FRONT_MATTER_DELIM = "---"
UUID_V4_RE = re.compile(r"^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-4[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$")
PLACEHOLDER_GUID_RE = re.compile(r"^x{8}-x{4}-4x{3}-y{4}-x{12}$", re.IGNORECASE)

SIMPLE_KEY_RE = re.compile(r'^\s*([A-Za-z0-9_]+)\s*:\s*"(.*?)"\s*$', re.M)
# One-line JSON-like list: tags: ["a","b"] (optional)
LIST_INLINE_RE = re.compile(r'^\s*([A-Za-z0-9_]+)\s*:\s*\[(.*?)\]\s*$', re.M)


def find_front_matter(text: str) -> Tuple[Optional[str], Optional[int], Optional[int]]:
    """Return (fm_text, start_index, end_index) or (None, None, None) if not found."""
    first = text.find(FRONT_MATTER_DELIM)
    if first == -1:
        return None, None, None
    # Find next delimiter after newline following first
    second = text.find(FRONT_MATTER_DELIM, first + len(FRONT_MATTER_DELIM))
    if second == -1:
        return None, None, None
    # Extract between delimiters, trimming surrounding newlines
    fm_text = text[first + len(FRONT_MATTER_DELIM):second]
    # Remove leading newline if present
    if fm_text.startswith("\n"):
        fm_text = fm_text[1:]
    return fm_text, first, second


def parse_simple_kv(fm_text: str) -> Dict[str, str]:
    """Very simple extractor for lines like: key: "value" and inline lists."""
    data: Dict[str, str] = {}
    for m in SIMPLE_KEY_RE.finditer(fm_text):
        k, v = m.group(1), m.group(2)
        data[k] = v
    # inline list extraction → joined by comma (for reporting only)
    for m in LIST_INLINE_RE.finditer(fm_text):
        k, inner = m.group(1), m.group(2)
        # remove quotes and spaces safely
        parts = [p.strip().strip('"') for p in inner.split(',') if p.strip()]
        data[k] = ",".join(parts)
    return data


def guid_status(guid: Optional[str]) -> str:
    if guid is None or guid == "":
        return "missing"
    g = guid.strip()
    if PLACEHOLDER_GUID_RE.match(g):
        return "placeholder"
    if UUID_V4_RE.match(g):
        return "ok"
    return "invalid"


def audit_file(path: str) -> Dict[str, str]:
    try:
        with open(path, "r", encoding="utf-8") as f:
            text = f.read()
    except Exception as e:
        return {
            "path": path,
            "id": "",
            "guid": "",
            "guid_status": f"error: {type(e).__name__}",
            "title": "",
            "has_title": "0",
            "has_created": "0",
            "has_fm_version": "0",
            "errors": f"read_error:{e}"
        }

    fm_text, s, e = find_front_matter(text)
    if fm_text is None:
        return {
            "path": path,
            "id": "",
            "guid": "",
            "guid_status": "no_fm",
            "title": "",
            "has_title": "0",
            "has_created": "0",
            "has_fm_version": "0",
            "errors": "no_front_matter"
        }

    data = parse_simple_kv(fm_text)
    kid = data.get("id", "")
    g = data.get("guid")
    gstatus = guid_status(g)
    title = data.get("title", "")
    has_title = "1" if title else "0"
    has_created = "1" if data.get("created") else "0"
    has_fm_version = "1" if data.get("fm_version") else "0"

    return {
        "path": path,
        "id": kid,
        "guid": g or "",
        "guid_status": gstatus,
        "title": title,
        "has_title": has_title,
        "has_created": has_created,
        "has_fm_version": has_fm_version,
        "errors": ""
    }


def walk_md_files(root: str) -> list:
    """Recursively walk root and return all .md or .mdx files (case-insensitive)."""
    results = []
    for dirpath, dirnames, filenames in os.walk(root):
        for fn in filenames:
            lower = fn.lower()
            if lower.endswith(".md") or lower.endswith(".mdx"):
                results.append(os.path.join(dirpath, fn))
    return results


def parse_args():
    ap = argparse.ArgumentParser(description="Audit Markdown Front Matter (no YAML parsing)")
    ap.add_argument("--root", default="content", help="Root directory to scan (default: content)")
    ap.add_argument("--output", default="logs/fm_audit_report.csv", help="CSV report output path")
    # Accepted for compatibility; not used internally but won't break Makefile
    ap.add_argument("--template", default=None, help="(ignored) Template file path")
    ap.add_argument("--locales", default=None, help="(ignored) Locales filter")
    ap.add_argument("--also", default=None, help="(ignored) Extra subpaths")
    ap.add_argument("--short", action="store_true", help="Print only summary counts")
    return ap.parse_args()


def main():
    args = parse_args()

    start = datetime.utcnow()
    root = args.root
    paths = walk_md_files(root)
    if not paths:
        print(f"⚠️ No markdown files found under {root}")

    issues = 0
    rows = []
    for p in sorted(paths):
        row = audit_file(p)
        rows.append(row)
        if row["guid_status"] in ("missing", "placeholder", "invalid", "no_fm"):
            issues += 1

    os.makedirs(os.path.dirname(args.output), exist_ok=True)
    with open(args.output, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=[
            "path", "id", "guid", "guid_status", "title", "has_title", "has_created", "has_fm_version", "errors"
        ])
        w.writeheader()
        w.writerows(rows)

    total = len(rows)
    dur = (datetime.utcnow() - start).total_seconds()

    # Summary
    missing = sum(1 for r in rows if r["guid_status"] == "missing")
    placeholder = sum(1 for r in rows if r["guid_status"] == "placeholder")
    invalid = sum(1 for r in rows if r["guid_status"] == "invalid")
    ok = sum(1 for r in rows if r["guid_status"] == "ok")
    nofm = sum(1 for r in rows if r["guid_status"] == "no_fm")

    if args.short:
        print(f"Total: {total} | ok: {ok} | missing: {missing} | placeholder: {placeholder} | invalid: {invalid} | no_fm: {nofm} | {dur:.2f}s")
    else:
        print("📊 Summary:")
        print(f"  scanned:     {total}")
        print(f"  ok:          {ok}")
        print(f"  missing:     {missing}")
        print(f"  placeholder: {placeholder}")
        print(f"  invalid:     {invalid}")
        print(f"  no_fm:       {nofm}")
        print(f"  time:        {dur:.2f}s")
        print(f"  report:      {args.output}")

    # Exit 0 always (audit is read-only). CI could change to nonzero if desired.
    return 0


if __name__ == "__main__":
    sys.exit(main())
