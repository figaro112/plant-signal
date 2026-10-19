#!/usr/bin/env python3
import sys, re, csv
from pathlib import Path
from collections import defaultdict

try:
    import yaml
except ImportError:
    print("PyYAML not installed. pip install pyyaml")
    sys.exit(2)

ROOT = Path(sys.argv[1] if len(sys.argv) > 1 else "content/docs")
files = list(ROOT.rglob("*.md"))

PLACEHOLDER_RE = re.compile(r"^KX{3,}.*$", re.IGNORECASE)  # KXXXX..., KXXXXXXX

ids = defaultdict(list)   # id -> [paths]
rows = []

for f in files:
    text = f.read_text(encoding="utf-8", errors="ignore")
    if not text.lstrip().startswith("---"):
        rows.append([str(f), "", "no_fm", "missing_id", ""])
        continue

    # extrahuj YAML FM
    try:
        # jednoduchý split; stačí na náš formát
        fm = text.split("---", 2)[1]
        data = yaml.safe_load(fm) or {}
    except Exception as e:
        rows.append([str(f), "", "bad_fm", "parse_error", str(e)])
        continue

    _id = str(data.get("id", "")).strip()
    status = "ok"
    note = ""

    if not _id:
        status, note = "invalid", "missing_id"
    elif PLACEHOLDER_RE.match(_id):
        status, note = "invalid", "placeholder_id"

    if _id:
        ids[_id].append(f)

    rows.append([str(f), _id, status, note, ""])

# označ duplicity
dups = {k: v for k, v in ids.items() if len(v) > 1 and k != ""}
for k, paths in dups.items():
    for f in paths:
        for r in rows:
            if r[0] == str(f):
                r[2], r[3] = "invalid", (r[3] + "|duplicate_id").strip("|")

# výstup CSV
out = Path("logs"); out.mkdir(parents=True, exist_ok=True)
csv_path = out / "fm_audit_ids.csv"
with csv_path.open("w", newline="", encoding="utf-8") as fh:
    w = csv.writer(fh)
    w.writerow(["file","id","status","issue","note"])
    w.writerows(rows)

# sumar
scanned = len(files)
invalid = sum(1 for r in rows if r[2]=="invalid")
print(f"[fm_audit_ids] scanned={scanned} invalid={invalid} report={csv_path}")