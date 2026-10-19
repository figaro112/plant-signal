#!/usr/bin/env python3
"""
Fix Front Matter placeholder IDs (KXXXXXXX) and missing GUIDs in Markdown files.

- Targets all .md files under content/docs (or path given as CLI arg).
- Generates deterministic ID based on path (last 2 segments + hash).
- Adds UUIDv4 if GUID is missing or placeholder.
- Preserves other FM fields (add-only behavior).
- Produces CSV report for audit trace.
"""

import sys, re, csv, uuid, hashlib, yaml
from pathlib import Path
from datetime import datetime

ROOT = Path(sys.argv[1] if len(sys.argv) > 1 else "content/docs")
DRY = "--dry-run" in sys.argv

PLACEHOLDER_ID_RE = re.compile(r"^KX{3,}.*$", re.IGNORECASE)
PLACEHOLDER_GUID_RE = re.compile(r"^0{8}-0{4}-0{4}-0{4}-0{12}$")

def is_placeholder_id(val: str) -> bool:
    return not val or PLACEHOLDER_ID_RE.match(val.strip())

def is_placeholder_guid(val: str) -> bool:
    return not val or PLACEHOLDER_GUID_RE.match(val.strip())

def short_hash(s: str) -> str:
    return hashlib.sha1(s.encode("utf-8")).hexdigest()[:4].upper()

def stable_id_from_path(path: Path) -> str:
    rel = path.relative_to(ROOT).as_posix()
    rel = re.sub(r"/index\.md$", "", rel)
    parts = [p for p in rel.split("/") if p]
    tail = parts[-2:] if len(parts) >= 2 else parts
    cleaned = [re.sub(r"[^A-Za-z0-9]+", "_", p).strip("_").upper() for p in tail]
    base = "_".join(cleaned) or "DOC"
    return f"{base}_{short_hash(rel)}"

def read_fm(content: str):
    if not content.startswith("---"):
        return None, content
    try:
        _, fm_text, body = content.split("---", 2)
    except ValueError:
        return None, content
    data = yaml.safe_load(fm_text) or {}
    return data, body

def write_fm(data, body):
    return "---\n" + yaml.safe_dump(data, sort_keys=False) + "---" + body

def walk_markdown_files(root: Path):
    return [p for p in root.rglob("*.md") if p.is_file()]

out_dir = Path("logs"); out_dir.mkdir(parents=True, exist_ok=True)
csv_path = out_dir / "fm_fix_placeholders.csv"
with csv_path.open("w", newline="", encoding="utf-8") as fh:
    writer = csv.writer(fh)
    writer.writerow(["file", "old_id", "new_id", "old_guid", "new_guid", "changed"])

    total = changed = 0
    for file in walk_markdown_files(ROOT):
        total += 1
        text = file.read_text(encoding="utf-8", errors="ignore")
        fm, body = read_fm(text)
        if not fm:
            continue

        old_id = str(fm.get("id", "")).strip()
        old_guid = str(fm.get("guid", "")).strip()

        new_id = old_id
        new_guid = old_guid
        modified = False

        if is_placeholder_id(old_id):
            new_id = stable_id_from_path(file)
            fm["id"] = new_id
            modified = True

        if is_placeholder_guid(old_guid):
            new_guid = str(uuid.uuid4())
            fm["guid"] = new_guid
            modified = True

        writer.writerow([str(file), old_id, new_id, old_guid, new_guid, modified])

        if modified and not DRY:
            file.write_text(write_fm(fm, body), encoding="utf-8")
            changed += 1
        elif modified:
            changed += 1

print(f"[fm_fix_placeholders] scanned={total} changed={changed} dry_run={DRY}")
print(f"[fm_fix_placeholders] report={csv_path}")