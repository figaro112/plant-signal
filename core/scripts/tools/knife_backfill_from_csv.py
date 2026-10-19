#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
knife_backfill_from_csv.py
Backfills frontmatter dates (created, modified) and optional metadata for KNIFE index.md files from a CSV.

Usage:
  python3 tools/knife_backfill_from_csv.py data/KNIFE-OVERVIEW-ONLY.csv docs

Behavior:
  - Finds KNIFE index.md files under <docs_root>/<lang>/knifes/**/index.md (lang in {sk,en} if present).
  - Reads CSV (utf-8-sig) and builds mapping: K### -> created (ISO date) + optional fields.
  - If a KNIFE frontmatter is missing 'created', inserts created from CSV (normalized to YYYY-MM-DD).
  - If 'modified' is missing, sets modified = created (existing 'modified' is NOT changed).
  - Optionally fills category/type/priority/title/author if missing in frontmatter and present in CSV.
  - **Sanitization**: if a KNIFE page contains `slug: "/"` or `slug: "/index"`, remove that slug
    (KNIFE pages must not hijack the site homepage; only real root index pages may use "/").

Notes:
  - CSV columns (case-insensitive) – accepted aliases:
      id:        ['id','knife_id','knife','knifeid','ID']
      created:   ['created','date_created','created_date','date','datum','created_at','date of record','date_of_record']
      title:     ['title','short_title','short title','Short Title','name']
      category:  ['category','kategoria','group','Category']
      type:      ['type','typ','kind','Type']
      priority:  ['priority','prio','Priority']
      author:    ['author','Author','authors','Authors']
"""

import sys
import csv
import pathlib
import re
from datetime import datetime

# --- Frontmatter helpers -----------------------------------------------------

FM_RE = re.compile(r"^---\n(.*?)\n---\n", re.DOTALL)

def parse_frontmatter(text: str):
    m = FM_RE.match(text)
    if not m:
        return {}, text, None
    raw = m.group(1)
    body = text[m.end():]
    data = {}
    for line in raw.splitlines():
        s = line.strip()
        if not s or s.startswith("#") or ":" not in s:
            continue
        k, v = s.split(":", 1)
        k = k.strip()
        v = v.strip()
        if v.startswith('"') and v.endswith('"'):
            v = v[1:-1]
        elif v.startswith("'") and v.endswith("'"):
            v = v[1:-1]
        data[k] = v
    return data, body, m

def dump_frontmatter(data: dict, body: str) -> str:
    # keep a friendly order; append unknown keys at the end
    order = [
        "id","guid","dao","title","description","author","authors","status","tags",
        "slug","sidebar_label","sidebar_position","locale",
        "created","modified","category","type","priority"
    ]
    keys = [k for k in order if k in data] + [k for k in data if k not in order]
    out = ["---"]
    for k in keys:
        v = data[k]
        if v is None or (isinstance(v, str) and v == ""):
            continue
        # quote everything for safety (colons etc.)
        out.append(f'{k}: "{v}"')
    out.append("---")
    return "\n".join(out) + "\n" + body

# --- CSV helpers -------------------------------------------------------------

ID_ALIASES = ["id","knife_id","knife","knifeid","ID"]
CREATED_ALIASES = [
    "created","date_created","created_date","date","datum","created_at",
    "date of record","date_of_record"
]
TITLE_ALIASES = ["title","short_title","short title","Short Title","name"]
CATEGORY_ALIASES = ["category","kategoria","group","Category"]
TYPE_ALIASES = ["type","typ","kind","Type"]
PRIORITY_ALIASES = ["priority","prio","Priority"]
AUTHOR_ALIASES = ["author","Author","authors","Authors"]

DATE_FORMATS = [
    "%Y-%m-%d",        # 2025-09-16
    "%d.%m.%Y",        # 16.09.2025
    "%d.%m.%y",        # 16.09.25
    "%Y/%m/%d",        # 2025/09/16
    "%d/%m/%Y",        # 16/09/2025
    "%m/%d/%Y",        # 09/16/2025
    "%m/%d/%y",        # 09/16/25
    "%d-%m-%Y",        # 16-09-2025
    "%Y.%m.%d",        # 2025.09.16
    "%Y-%m-%d %H:%M",  # 2025-09-16 10:30
    "%d.%m.%Y %H:%M",  # 16.09.2025 10:30
]

def normalize_date(s: str) -> str:
    s = (s or "").strip()
    if not s:
        return ""
    # Already ISO?
    if re.match(r"^\d{4}-\d{2}-\d{2}$", s):
        return s
    # Try known formats
    for fmt in DATE_FORMATS:
        try:
            dt = datetime.strptime(s, fmt)
            return dt.strftime("%Y-%m-%d")
        except Exception:
            continue
    # Try generic year-month-day extraction
    m = re.search(r"(\d{4})[./-](\d{1,2})[./-](\d{1,2})", s)
    if m:
        y, mo, d = m.group(1), m.group(2).zfill(2), m.group(3).zfill(2)
        try:
            dt = datetime.strptime(f"{y}-{mo}-{d}", "%Y-%m-%d")
            return dt.strftime("%Y-%m-%d")
        except Exception:
            pass
    return ""

def first_matching(headers, aliases):
    """Return the real header name from DictReader that matches any alias (case-insensitive)."""
    lower = {h.lower(): h for h in headers}
    for a in aliases:
        if a.lower() in lower:
            return lower[a.lower()]
    return None

def find_header_row(csv_path: pathlib.Path):
    with csv_path.open("r", encoding="utf-8-sig", newline="") as f:
        reader = csv.reader(f)
        for idx, row in enumerate(reader):
            if not row:
                continue
            lower_row = [cell.lower() for cell in row]
            for alias in ID_ALIASES:
                if alias.lower() in lower_row:
                    return idx, row
    raise ValueError(f"Header row with ID column not found in CSV: {csv_path}")

def load_csv_index(csv_path: pathlib.Path):
    try:
        header_idx, header_row = find_header_row(csv_path)
    except ValueError as e:
        print(f"❌ {e}", file=sys.stderr)
        return {}

    with csv_path.open("r", encoding="utf-8-sig", newline="") as f:
        for _ in range(header_idx):
            next(f)
        reader = csv.DictReader(f, fieldnames=header_row)
        headers = header_row
        if not headers:
            return {}

        id_col = first_matching(headers, ID_ALIASES)
        created_col = first_matching(headers, CREATED_ALIASES)
        title_col = first_matching(headers, TITLE_ALIASES)
        category_col = first_matching(headers, CATEGORY_ALIASES)
        type_col = first_matching(headers, TYPE_ALIASES)
        priority_col = first_matching(headers, PRIORITY_ALIASES)
        author_col = first_matching(headers, AUTHOR_ALIASES)

        if not id_col:
            print("❌ CSV: cannot find ID column (aliases: %s)" % ID_ALIASES, file=sys.stderr)
            return {}

        idx = {}
        for row in reader:
            rid = (row.get(id_col) or "").strip().upper()
            if not rid:
                continue
            # Normalize IDs like "K000075 – Lean canvas" -> "K000075"
            mm = re.match(r"^(K\d{3})", rid)
            if mm:
                rid = mm.group(1)
            if not re.match(r"^K\d{3}$", rid):
                continue

            rec = {}
            if created_col:
                rec["created"] = normalize_date(row.get(created_col) or "")
            if title_col:
                rec["title"] = (row.get(title_col) or "").strip()
            if category_col:
                rec["category"] = (row.get(category_col) or "").strip()
            if type_col:
                rec["type"] = (row.get(type_col) or "").strip()
            if priority_col:
                rec["priority"] = (row.get(priority_col) or "").strip()
            if author_col:
                rec["author"] = (row.get(author_col) or "").strip()
            idx[rid] = rec
        return idx

# --- Core update -------------------------------------------------------------

def apply_backfill(mdpath: pathlib.Path, csv_index: dict) -> bool:
    text = mdpath.read_text(encoding="utf-8")
    data, body, m = parse_frontmatter(text)
    if not data:
        return False

    # SLUG SANITIZATION for KNIFE pages: never let them set "/" or "/index"
    # Only allow those for real root index pages, which are outside of KNIFE paths.
    cleaned = False
    bad_slug = (data.get("slug") or "").strip()
    if bad_slug in ("/", "/index"):
        # KNIFE pages live under knifes/**, they must not claim the homepage.
        del data["slug"]
        cleaned = True

    kid = (data.get("id") or "").strip().upper()
    # Accept "K### ..." but keep only K###
    mm = re.match(r"^(K\d{3})", kid)
    kid = mm.group(1) if mm else kid

    changed = False

    if kid and kid in csv_index:
        src = csv_index[kid]
        # created
        if not data.get("created"):
            iso = src.get("created") or ""
            if iso:
                data["created"] = iso
                changed = True

        # modified == created if missing
        if not data.get("modified"):
            base = data.get("created") or src.get("created") or ""
            if base:
                data["modified"] = base
                changed = True

        # optional fields (only if missing)
        for opt in ("category","type","priority","title","author"):
            if src.get(opt) and not data.get(opt):
                data[opt] = src[opt]
                changed = True

    if not (changed or cleaned):
        return False

    new_text = dump_frontmatter(data, body)
    mdpath.write_text(new_text, encoding="utf-8")
    return True

def main():
    if len(sys.argv) < 3:
        print("Usage: knife_backfill_from_csv.py <csv_path> <docs_root>", file=sys.stderr)
        sys.exit(2)

    csv_path = pathlib.Path(sys.argv[1])
    docs_root = pathlib.Path(sys.argv[2])

    if not csv_path.exists():
        print(f"❌ CSV not found: {csv_path}", file=sys.stderr)
        sys.exit(2)
    if not docs_root.exists() or not docs_root.is_dir():
        print(f"❌ bad docs root: {docs_root}", file=sys.stderr)
        sys.exit(2)

    csv_index = load_csv_index(csv_path)
    if not csv_index:
        print("⚠️  CSV index appears empty or missing required headers.", file=sys.stderr)

    # Collect KNIFE index.md files under sk/en
    targets = []
    for lang in ["sk", "en"]:
        base = docs_root / lang / "knifes"
        if base.exists():
            targets.extend(base.rglob("index.md"))

    updated = 0
    for p in sorted(targets):
        try:
            if apply_backfill(p, csv_index):
                updated += 1
        except Exception as e:
            print(f"⚠️  Cannot update {p}: {e}", file=sys.stderr)

    print(f"✅ Backfill complete. Updated files: {updated}")
    sys.exit(0)

if __name__ == "__main__":
    main()