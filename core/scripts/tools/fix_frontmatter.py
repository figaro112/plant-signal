#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
fix_frontmatter.py  — ADD-ONLY variant

Goal
----
Keep everything EXACTLY as-is and only APPEND missing keys to the front matter.
No reformatting, no quoting changes, no reordering, no touching `slug`.

- --ensure-required  -> ensures 'category', 'type', 'author_id', 'author_did' keys exist (adds empty values if missing).
- --ensure-legal     -> ensures LEGAL keys exist; if missing/empty, appends with defaults.
- --verify-only      -> prints missing keys per file and exits with code 1 if something is missing.
- --dry-run          -> shows a unified diff instead of writing.
- --seed-guid-only   -> append a GUID (UUIDv4) only if the front matter exists and the 'guid' key is missing.

Defaults (override via CLI flags):
  --copyright "© 2025 Roman Kazička / SystemThinking"
  --rights-holder-content ""
  --rights-holder-system "Roman Kazička (CAA/KNIFE/LetItGrow)"
  --license "CC-BY-NC-SA-4.0"
  --disclaimer "Educational content. Use at your own risk."
"""
from __future__ import annotations

import argparse
import difflib
from pathlib import Path
import re
import uuid
import sys
from typing import List, Dict, Tuple

# UUID v4 regex
UUID_V4_RE = re.compile(r"[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}", re.IGNORECASE)

# --- Visible header (idempotent) ---------------------------------------------

VISIBLE_START = "<!-- fm-visible: start -->"
VISIBLE_END = "<!-- fm-visible: end -->"

def has_visible_header(body: str) -> bool:
    return (VISIBLE_START in body) and (VISIBLE_END in body)

def build_visible_header(meta: Dict[str, str]) -> str:
    """
    Builds a small, idempotent, human-visible header using FM values.
    Wrapped in HTML comments to allow safe re-run without duplicates.
    Only shows fields if they are present/non-empty.
    """
    # extract displayable fields without changing originals
    display_id = str(meta.get("display_id", "")).strip()
    ext_id = str(meta.get("ext_id", "")).strip()  # backward compatibility if you used ext_id
    if not display_id and ext_id:
        display_id = ext_id

    guid = str(meta.get("guid", "")).strip()

    category = str(meta.get("category", "")).strip()
    typ = str(meta.get("type", "")).strip()
    status = str(meta.get("status", "")).strip()
    author = str(meta.get("author", "")).strip()
    author_id = str(meta.get("author_id", "")).strip()
    license_ = str(meta.get("license", "")).strip()

    line2 = []
    if category: line2.append(f"**Category:** `{category}`")
    if typ:      line2.append(f"**Type:** `{typ}`")
    if status:   line2.append(f"**Status:** `{status}`")
    if author or author_id:
        who = author if author else author_id
        line2.append(f"**Author:** {who}")
    if license_:
        line2.append(f"**License:** {license_}")

    lines = [VISIBLE_START]
    if guid:
        lines.append(f"> **GUID:** `{guid}`")
    if display_id:
        lines.append(f"> **Display&nbsp;ID:** `{display_id}`")
    if line2:
        lines.append("> " + " · ".join(line2))
    lines.append(VISIBLE_END)
    return "\n".join(lines) + "\n\n"

def insert_visible_header(fm_dict: Dict[str, str], body: str) -> str:
    """
    Inserts the visible header after the first H1 if present,
    otherwise at the very beginning of the document.
    """
    header = build_visible_header(fm_dict)
    # find first H1
    lines = body.splitlines(True)
    for i, line in enumerate(lines):
        if line.lstrip().startswith("# "):  # H1
            # insert right after this line
            return "".join(lines[:i+1]) + header + "".join(lines[i+1:])
    # no H1 -> prepend
    return header + body

# --- Config -------------------------------------------------------------------

RE_REQUIRED = ["category", "type", "author_id", "author_did"]
LEGAL_KEYS = ["copyright",
              "rights_holder_content",
              "rights_holder_system",
              "license",
              "disclaimer"]

FM_BLOCK_RE = re.compile(r"^---\n(.*?)\n---\n", re.DOTALL)
KEY_LINE_RE = re.compile(r"^\s*([A-Za-z0-9_]+)\s*:\s*(.*)$")
COMMENT_RE = re.compile(r"^\s*#")

# --- Helpers ------------------------------------------------------------------

def split_front_matter(text: str) -> Tuple[str, str, str] | Tuple[None, None, None]:
    """
    Returns (fm_text, body_text, full_match) or (None, None, None) if no front matter.
    """
    m = FM_BLOCK_RE.match(text)
    if not m:
        return None, None, None
    fm_text = m.group(1)
    body = text[m.end():]
    full = m.group(0)
    return fm_text, body, full

def parse_existing_keys(fm_text: str) -> Dict[str, str]:
    """
    Very tolerant: collects keys exactly as present. Does NOT unquote or normalize.
    Ignores commented lines and blank lines.
    Returns dict {key -> raw_value_string}.
    """
    keys: Dict[str, str] = {}
    for line in fm_text.splitlines():
        if not line.strip():
            continue
        if COMMENT_RE.match(line):
            continue
        m = KEY_LINE_RE.match(line)
        if not m:
            continue
        k, v = m.group(1), m.group(2)
        keys.setdefault(k, v)
    return keys

def find_duplicate_keys(fm_text: str) -> Dict[str, int]:
    """
    Return a mapping of {key: count} for keys that appear more than once
    in the raw front matter block. Comments and blank lines are ignored.
    """
    counts: Dict[str, int] = {}
    for line in fm_text.splitlines():
        if not line.strip():
            continue
        if COMMENT_RE.match(line):
            continue
        m = KEY_LINE_RE.match(line)
        if not m:
            continue
        k = m.group(1)
        counts[k] = counts.get(k, 0) + 1
    return {k: c for k, c in counts.items() if c > 1}

# --- GUID normalization ------------------------------------------------------

def normalize_guid_in_fm(fm_text: str) -> Tuple[str, str, bool]:
    """
    If a 'guid' key exists and its value is not a clean UUIDv4, but a UUIDv4
    can be found inside, rewrite the line to a clean quoted UUIDv4.
    Returns: (new_fm_text, guid_value, changed)
    """
    lines = fm_text.splitlines()
    changed = False
    current_guid = ""
    for i, line in enumerate(lines):
        m = KEY_LINE_RE.match(line)
        if not m:
            continue
        k, v = m.group(1), m.group(2)
        if k != "guid":
            continue
        # Extract UUIDv4 anywhere in the value
        m_uuid = UUID_V4_RE.search(v)
        if m_uuid:
            clean = m_uuid.group(0)
            current_guid = clean
            # If already exactly clean (optionally quoted), skip rewrite
            v_stripped = v.strip().strip('"\'')
            if v_stripped.lower() == clean.lower():
                # Ensure we keep original line (no rewrite)
                continue
            # Rewrite the line to a clean, quoted UUID
            lines[i] = f'guid: "{clean}"'
            changed = True
        else:
            # No UUID found in value; keep as-is but remember raw for return
            current_guid = v.strip().strip('"\'')
    return "\n".join(lines), current_guid, changed

def append_missing_lines(fm_text: str,
                         ensure_required: bool,
                         ensure_legal: bool,
                         legal_defaults: Dict[str, str]) -> Tuple[str, List[str], List[str]]:
    """
    Returns (new_fm_text, added_keys, still_missing_keys)
    - Only appends lines for missing keys (or missing/empty LEGAL).
    - Never changes existing lines.
    """
    existing = parse_existing_keys(fm_text)
    added: List[str] = []
    still_missing: List[str] = []

    new_lines = fm_text.splitlines()

    # Required (category, type) -> add empty if key is missing
    if ensure_required:
        for k in RE_REQUIRED:
            if k not in existing:
                new_lines.append(f'{k}: ""')
                added.append(k)
            else:
                # if present but empty, keep it as-is (do not modify)
                val = existing.get(k, "")
                if not str(val).strip():
                    # consider empty as "missing" for verification report
                    still_missing.append(k)

    # LEGAL keys -> append ONLY if key is completely missing (avoid duplicates).
    # If present but empty, do NOT append; it will be reported as missing later.
    if ensure_legal:
        for k in LEGAL_KEYS:
            if k not in existing:
                new_lines.append(f'{k}: "{legal_defaults.get(k, "")}"')
                added.append(k)

    # After appending LEGAL defaults, check what is still missing (for verify)
    # A key is considered missing if absent or empty string.
    if ensure_required or ensure_legal:
        final_keys = parse_existing_keys("\n".join(new_lines))
        for k in (RE_REQUIRED + LEGAL_KEYS):
            v = final_keys.get(k, None)
            if v is None or (str(v).strip() == "" or str(v).strip() == '""' or str(v).strip() == "''"):
                if k not in added:  # if we just added it, we consider it satisfied
                    still_missing.append(k)

    return "\n".join(new_lines), added, still_missing

def process_text(text: str,
                 seed_guid_only: bool,
                 ensure_required: bool,
                 ensure_legal: bool,
                 ensure_visible: bool,
                 legal_defaults: Dict[str, str],
                 verify_only: bool,
                 dry_run: bool) -> Tuple[str, List[str], List[str], bool]:
    """
    Returns (new_text, added_keys, missing_after, changed)
    """
    fm_text, body, full = split_front_matter(text)

    # Seed GUID only (ADD-ONLY): if FM exists and guid is missing/empty, append a new UUIDv4 and return
    if seed_guid_only:
        if fm_text is None:
            # No FM present -> do nothing in seed-only mode
            return text, [], [], False
        existing = parse_existing_keys(fm_text)
        cur = str(existing.get("guid", "")).strip() if "guid" in existing else ""
        if cur:
            return text, [], [], False
        # append a single guid line at the end of FM text
        new_fm_text = fm_text if fm_text.endswith("\n") else fm_text + "\n"
        new_fm_text += f'guid: "{uuid.uuid4()}"\n'
        new_text = f"---\n{new_fm_text}---\n{body}"
        return new_text, ["guid"], [], True

    fm_dict = parse_existing_keys(fm_text) if fm_text is not None else {}

    if fm_text is None:
        # No front matter present -> do not invent one (ADD-ONLY policy)
        return text, [], [], False

    # Normalize GUID in FM to a clean UUIDv4 (rewrite the guid line only)
    guid_clean = ""
    fm_changed_for_guid = False
    if fm_text is not None:
        fm_text_norm, guid_clean, changed_guid = normalize_guid_in_fm(fm_text)
        if changed_guid:
            fm_text = fm_text_norm
            fm_changed_for_guid = True

    new_fm, added, still_missing = append_missing_lines(
        fm_text, ensure_required, ensure_legal, legal_defaults
    )

    # Optional: insert visible header (ADD-ONLY)
    new_body = body
    if ensure_visible:
        if not has_visible_header(body):
            # build from the most up-to-date FM snapshot: merge existing with any newly added defaults
            merged_fm = parse_existing_keys(new_fm)
            new_body = insert_visible_header(merged_fm, body)
        else:
            # Header exists: ensure GUID line is present
            merged_fm_for_guid = parse_existing_keys(new_fm)
            guid_value_for_header = str(merged_fm_for_guid.get("guid", "")).strip()
            new_body = ensure_guid_in_visible_header(new_body, guid_value_for_header)

    if (new_fm == fm_text) and (not fm_changed_for_guid) and (new_body == body):
        # nothing to change
        if verify_only:
            return text, added, still_missing, False
        return text, added, still_missing, False

    # Rebuild *only* the front matter block; keep body untouched
    new_text = f"---\n{new_fm}\n---\n{new_body}"
    return new_text, added, still_missing, True

# --- Ensure GUID in visible header if header block exists ---------------------

def ensure_guid_in_visible_header(body: str, guid_value: str) -> str:
    """
    If a visible header block exists but lacks a GUID line, insert the GUID
    as the first line inside the block. Idempotent.
    """
    if not guid_value:
        return body
    if not has_visible_header(body):
        return body
    # If GUID is already displayed, leave as-is
    if UUID_V4_RE.search(body):
        # A UUID appears somewhere; avoid double-inserting blindly.
        # We still try to check the GUID line specifically.
        pass
    start_idx = body.find(VISIBLE_START)
    end_idx = body.find(VISIBLE_END, start_idx + 1)
    if start_idx == -1 or end_idx == -1:
        return body
    prefix = body[:start_idx]
    block = body[start_idx:end_idx]
    suffix = body[end_idx:]
    # If block already contains a GUID line, do nothing
    if re.search(r">\s*\*\*GUID:\*\*\s*`?\"?`?[0-9a-fA-F-]{36}\"?`?", block):
        return body
    # Insert GUID as the first content line after the start marker
    lines = block.splitlines(True)
    new_lines = []
    inserted = False
    for idx, ln in enumerate(lines):
        new_lines.append(ln)
        if ln.strip() == VISIBLE_START and not inserted:
            new_lines.append(f"\n> **GUID:** `{guid_value}`\n")
            inserted = True
    new_block = "".join(new_lines)
    return prefix + new_block + suffix

def process_file(path: Path,
                 seed_guid_only: bool,
                 ensure_required: bool,
                 ensure_legal: bool,
                 ensure_visible: bool,
                 legal_defaults: Dict[str, str],
                 verify_only: bool,
                 dry_run: bool) -> Tuple[bool, List[str], List[str]]:
    old = path.read_text(encoding="utf-8")
    new, added, missing_after, changed = process_text(
        old, seed_guid_only, ensure_required, ensure_legal, ensure_visible, legal_defaults, verify_only, dry_run
    )

    # Inspect the post-change FM for duplicate keys (warn-only)
    # We re-extract the FM from the 'new' snapshot if changed, otherwise from 'old'.
    snap = new if changed else old
    m = FM_BLOCK_RE.match(snap)
    if m:
        fm_block_now = m.group(1)
        dups = find_duplicate_keys(fm_block_now)
        if dups:
            # Do not fail; just warn and enumerate duplicates
            dup_list = ", ".join(f"{k}×{c}" for k, c in dups.items())
            print(f"WARNING: Duplicate front-matter keys in {path}: {dup_list}", file=sys.stderr)

    if verify_only:
        # do not write; just report missing
        return False, added, missing_after

    if not changed:
        return False, added, missing_after

    if dry_run:
        diff = difflib.unified_diff(
            old.splitlines(True),
            new.splitlines(True),
            fromfile=str(path) + " (old)",
            tofile=str(path) + " (new)",
            lineterm=""
        )
        sys.stdout.writelines(diff)
        if not str(new).endswith("\n"):
            print()
        return True, added, missing_after

    path.write_text(new, encoding="utf-8")
    print(f"✔ Updated: {path}")
    return True, added, missing_after

def iter_targets(root: Path, single: Path | None):
    if single:
        yield single
        return
    for ext in ("*.md", "*.mdx"):
        for p in root.rglob(ext):
            yield p

# --- CLI ----------------------------------------------------------------------

def main():
    ap = argparse.ArgumentParser(description="ADD-ONLY front matter fixer: only appends missing keys; never rewrites existing lines.")
    ap.add_argument("--apply", action="store_true", help="Alias for write mode (no effect, kept for Makefile compatibility)")
    ap.add_argument("--root", default="docs", help="Root directory to scan")
    ap.add_argument("--file", help="Single file path to process")

    # Modes
    ap.add_argument("--verify-only", action="store_true", help="Only verify; exit 1 if some required/LEGAL keys missing")
    ap.add_argument("--dry-run", action="store_true", help="Show diff; do not write")

    # What to ensure
    ap.add_argument("--ensure-required", action="store_true", help="Ensure 'category', 'type', 'author_id', 'author_did' exist (adds empty if missing)")
    ap.add_argument("--ensure-legal", action="store_true", help="Ensure LEGAL keys exist (adds defaults if missing/empty)")
    ap.add_argument("--ensure-visible-header", action="store_true", help="Insert a small, human-visible FM header block after the first H1 (idempotent).")
    ap.add_argument("--seed-guid-only", action="store_true",
                    help="If a file has front matter but no GUID, append guid with a new UUIDv4 (ADD-ONLY).")

    # LEGAL defaults (used only with --ensure-legal)
    ap.add_argument("--copyright", default="© 2025 Roman Kazička / SystemThinking")
    ap.add_argument("--rights-holder-content", dest="rights_holder_content", default="")
    ap.add_argument("--rights-holder-system", dest="rights_holder_system", default="Roman Kazička (CAA/KNIFE/LetItGrow)")
    ap.add_argument("--license", default="CC-BY-NC-SA-4.0")
    ap.add_argument("--disclaimer", default="Educational content. Use at your own risk.")

    args = ap.parse_args()

    root = Path(args.root).resolve()
    single = Path(args.file).resolve() if args.file else None

    if single and not single.exists():
        print(f"❌ File not found: {single}", file=sys.stderr)
        sys.exit(2)
    if not single and not root.exists():
        print(f"❌ Root not found: {root}", file=sys.stderr)
        sys.exit(2)

    legal_defaults = {
        "copyright": args.copyright,
        "rights_holder_content": args.rights_holder_content,
        "rights_holder_system": args.rights_holder_system,
        "license": args.license,
        "disclaimer": args.disclaimer,
    }

    changed_total = 0
    missing_any = False
    for path in iter_targets(root, single):
        try:
            changed, added, missing_after = process_file(
                path,
                seed_guid_only=args.seed_guid_only,
                ensure_required=args.ensure_required or args.verify_only,
                ensure_legal=args.ensure_legal or args.verify_only,
                ensure_visible=args.ensure_visible_header,
                legal_defaults=legal_defaults,
                verify_only=args.verify_only,
                dry_run=args.dry_run
            )
            if changed:
                changed_total += 1
            if missing_after:
                missing_any = True
                print(f"Missing in {path}: {', '.join(sorted(set(missing_after)))}")
        except Exception as e:
            print(f"⚠️  Skip {path}: {e}", file=sys.stderr)

    mode = "VERIFY" if args.verify_only else ("DRY-RUN" if args.dry_run else "WRITE")
    print(f"✅ Done ({mode}). Files changed: {changed_total}")

    if args.verify_only and missing_any:
        sys.exit(1)

if __name__ == "__main__":
    main()