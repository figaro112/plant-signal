#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
frontmatter_lint.py
Simple linter for Markdown frontmatter (YAML-like) without external deps.

Usage:
  python3 tools/frontmatter_lint.py <docs_root> --required guid dao id title created modified
Optional:
  --date-fields created modified      # enforce ISO YYYY-MM-DD
  --extensions .md .mdx               # default: .md .mdx
  --fail-warn                         # treat warnings as errors (exit 1)
Exit codes:
  0 = OK, 1 = errors found, 2 = bad args
"""

import argparse
import pathlib
import re
import sys
from datetime import datetime
from typing import Dict, Tuple, Optional, List

FM_RE = re.compile(r"^---\n(.*?)\n---\n", re.DOTALL)
ISO_DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")

def parse_frontmatter(text: str) -> Tuple[Dict[str, str], str]:
    """
    Very small YAML-ish parser for k: v lines inside --- ... ---.
    Strings may be quoted with single/double quotes; arrays/objects are not parsed (treated as raw strings).
    Returns (data, body). If no frontmatter, data is {}.
    """
    m = FM_RE.match(text)
    if not m:
        return {}, text
    raw = m.group(1)
    body = text[m.end():]
    data: Dict[str, str] = {}
    for line in raw.splitlines():
        s = line.strip()
        if not s or s.startswith("#"):
            continue
        if ":" not in s:
            # ignore non k:v lines
            continue
        k, v = s.split(":", 1)
        k = k.strip()
        v = v.strip()
        if v.startswith('"') and v.endswith('"'):
            v = v[1:-1]
        elif v.startswith("'") and v.endswith("'"):
            v = v[1:-1]
        data[k] = v
    return data, body

def is_iso_date(val: str) -> bool:
    if not ISO_DATE_RE.match(val or ""):
        return False
    try:
        datetime.strptime(val, "%Y-%m-%d")
        return True
    except Exception:
        return False

def lint_file(path: pathlib.Path, required: List[str], date_fields: List[str]) -> Tuple[List[str], List[str]]:
    """
    Returns (errors, warnings)
    """
    try:
        text = path.read_text(encoding="utf-8")
    except Exception as e:
        return ([f"{path}: cannot read file ({e})"], [])

    data, _ = parse_frontmatter(text)
    errors: List[str] = []
    warnings: List[str] = []

    if not data:
        warnings.append(f"{path}: missing frontmatter block (--- ... ---)")
        return errors, warnings

    # Required keys present and non-empty
    for k in required:
        if k not in data or (isinstance(data[k], str) and not data[k].strip()):
            errors.append(f"{path}: missing required '{k}'")

    # Basic date validation
    for k in date_fields:
        if k in data and data[k].strip():
            if not is_iso_date(data[k].strip()):
                errors.append(f"{path}: '{k}' must be ISO date YYYY-MM-DD (got '{data[k]}')")

    # Light sanity: guid format hint
    if "guid" in data and data["guid"].strip():
        if " " in data["guid"]:
            warnings.append(f"{path}: guid should not contain spaces")

    # Light sanity: id looks like K### if present
    if "id" in data and data["id"].strip():
        if not re.match(r"^K\d{3}$", data["id"].strip()):
            warnings.append(f"{path}: id does not match pattern K### (got '{data['id']}')")

    return errors, warnings

def main() -> int:
    ap = argparse.ArgumentParser(description="Lint Markdown frontmatter", add_help=True)
    ap.add_argument("root", nargs="?", help="Docs root (folder to scan)")
    ap.add_argument("--required", nargs="+", default=["guid", "dao", "id", "title", "created", "modified"], help="Required keys")
    ap.add_argument("--date-fields", nargs="+", default=["created", "modified"], help="Keys that must be ISO dates (YYYY-MM-DD)")
    ap.add_argument("--extensions", nargs="+", default=[".md", ".mdx"], help="File extensions to include")
    ap.add_argument("--fail-warn", action="store_true", help="Treat warnings as errors (non-zero exit)")
    ap.add_argument("--file", default="", help="Lint exactly this single file instead of walking a directory")
    ap.add_argument("--only-index", action="store_true", help="When walking a directory, lint only files named 'index.md'")
    args = ap.parse_args()

    md_files: List[pathlib.Path] = []

    # Support either a single --file or a directory root
    if args.file:
        p = pathlib.Path(args.file)
        if not p.exists() or not p.is_file():
            print(f"bad file: {p}", file=sys.stderr)
            return 2
        md_files = [p]
    else:
        if not args.root:
            print("missing root (directory) argument", file=sys.stderr)
            return 2
        root = pathlib.Path(args.root)
        if not root.exists() or not root.is_dir():
            print(f"bad root: {root}", file=sys.stderr)
            return 2
        for ext in args.extensions:
            md_files.extend(root.rglob(f"*{ext}"))
        if args.only_index:
            md_files = [p for p in md_files if p.name == "index.md"]

    total_errors: List[str] = []
    total_warnings: List[str] = []

    for p in sorted(md_files):
        # Only lint paths that clearly belong to docs content
        if "/.git/" in str(p).replace("\\", "/"):
            continue
        errs, warns = lint_file(p, args.required, args.date_fields)
        total_errors.extend(errs)
        total_warnings.extend(warns)

    if total_errors:
        print("❌ Frontmatter errors:")
        for e in total_errors:
            print("  -", e)
    if total_warnings:
        print("⚠️  Frontmatter warnings:")
        for w in total_warnings:
            print("  -", w)

    if total_errors or (args.fail_warn and total_warnings):
        return 1

    print("✅ Frontmatter OK")
    return 0

if __name__ == "__main__":
    sys.exit(main())