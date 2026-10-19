# core/scripts/tools/fm_fix_guid.py
import argparse, re, uuid, os, sys, pathlib, csv

FRONT_RE = re.compile(r'^---\s*\n(.*?)\n---\s*\n', re.DOTALL)
GUID_LINE_RE = re.compile(r'^(guid\s*:\s*)(["\']?)([^"\']*)(\2)\s*$', re.IGNORECASE)
ALL_ONES = "11111111-1111-1111-1111-111111111111"

def extract_front(text):
    m = FRONT_RE.match(text)
    if not m:
        return None, None, None
    return m.group(0), m.group(1), m.end()

def is_valid_guid(s: str):
    try:
        uuid.UUID(str(s))
        return True
    except Exception:
        return False

def gen_guid_for_path(relpath: str) -> str:
    norm = relpath.replace(os.sep, "/")
    return str(uuid.uuid5(uuid.NAMESPACE_URL, norm))

def fix_guid_in_front(front_body: str, relpath: str):
    lines = front_body.splitlines()
    found_idx = None
    current = None
    for i, line in enumerate(lines):
        m = GUID_LINE_RE.match(line.strip())
        if m:
            found_idx = i
            current = m.group(3).strip()
            break

    need_fix = False
    reason = ""
    if current is None or current == "" or current == ALL_ONES or not is_valid_guid(current):
        need_fix = True
        reason = ("missing" if (current is None or current == "") else
                  "all-ones" if current == ALL_ONES else "invalid")

    if not need_fix:
        return front_body, None, "ok"

    new_guid = gen_guid_for_path(relpath)

    if found_idx is None:
        # vlož za prvý riadok frontu (zachováme formátovanie)
        insert_line = f'guid: "{new_guid}"'
        # Vložíme guid tesne za prvý riadok (po fm_version, ak je, nerieši – jednoduché a bezpečné)
        lines.insert(0, insert_line)
    else:
        # zachovaj prefix (indent + key:)
        orig = lines[found_idx]
        prefix = orig.split("guid", 1)[0] + "guid: "
        lines[found_idx] = f'{prefix}"{new_guid}"'

    return "\n".join(lines), new_guid, reason

def process_file(path: pathlib.Path, root: pathlib.Path, dry: bool):
    rel = str(path.relative_to(root))
    text = path.read_text(encoding="utf-8")
    fm_block, fm_body, fm_end = extract_front(text)
    if fm_block is None:
        return ("no_fm", rel, None, None, False)

    new_body, new_guid, reason = fix_guid_in_front(fm_body, rel)
    if new_guid is None:
        return ("ok", rel, None, None, False)

    new_fm_block = f"---\n{new_body}\n---\n"
    new_text = new_fm_block + text[fm_end:]
    if not dry:
        path.write_text(new_text, encoding="utf-8")
    return ("fixed", rel, new_guid, reason, True)

def iter_md(roots):
    for r in roots:
        base = pathlib.Path(r)
        if not base.exists():
            continue
        for p in base.rglob("*.md"):
            yield base, p

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry", action="store_true", help="dry run (no writes)")
    ap.add_argument("--roots", nargs="+", default=["content/docs","publishing/docusaurus/docs"])
    ap.add_argument("--report", default="logs/fm_fix_guid.csv")
    args = ap.parse_args()

    os.makedirs(os.path.dirname(args.report), exist_ok=True)
    fixed = 0; scanned = 0; invalid = 0
    with open(args.report, "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["path","status","reason","guid"])
        for root, p in iter_md(args.roots):
            scanned += 1
            status, rel, new_guid, reason, changed = process_file(p, root, args.dry)
            if status == "fixed":
                fixed += 1
                invalid += 1
            elif status not in ("ok","no_fm"):
                invalid += 1
            w.writerow([str(p), status, reason or "", new_guid or ""])
    print(f"[fm_fix_guid] scanned={scanned} fixed={fixed} dry_run={args.dry}")
    print(f"[fm_fix_guid] report={args.report}")

if __name__ == "__main__":
    main()