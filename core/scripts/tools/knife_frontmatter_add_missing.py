#!/usr/bin/env python3
import re, uuid, sys, yaml
from pathlib import Path
from datetime import date

DOCS_DIR = Path("docs")
FM_START = "---\n"
FM_END = "---\n"

TODAY = date.today().isoformat()

# Files that should NOT get frontmatter auto-injected
OVERVIEW_BASENAMES = {
    "overview.md",
}

def should_skip_file(p: Path) -> bool:
    name = p.name
    # Skip overviews and auto-generated listing files
    if name in OVERVIEW_BASENAMES:
        return True
    if name.startswith("KNIFE_Overview_") and name.endswith(".md"):
        return True
    # Skip non-content or support areas already handled elsewhere
    if any(seg in {"_helpers", "static"} for seg in p.parts):
        return True
    # Skip VCS internals
    if ".git" in p.parts:
        return True
    return False

PARENT_DIR_RE = re.compile(r"/((K\d{3})[^/]*)/")
SUB_ID_RE = re.compile(r"^(K\d{3})(?:_|-)(\d{1,3})$")

def find_parent_kid(path: Path) -> str:
    """Find nearest ancestor dir that starts with K### and return its base K-ID (e.g., K000068)."""
    parts = [*path.parts]
    for i in range(len(parts)-1, -1, -1):
        m = re.match(r"^(K\d{3})", parts[i])
        if m:
            return m.group(1)
    return ""

def parse_frontmatter(text: str) -> dict:
    if not text.startswith(FM_START):
        return {}
    end = text.find(FM_END, len(FM_START))
    if end == -1:
        return {}
    body = text[len(FM_START):end]
    try:
        return yaml.safe_load(body) or {}
    except Exception:
        return {}

def read_parent_meta(path: Path) -> dict:
    """Try to read parent index.md to inherit fields like locale/author if available."""
    parent_kid = find_parent_kid(path)
    if not parent_kid:
        return {}
    # search for index.md in that folder
    knife_dir = None
    for i in range(len(path.parts)-1, -1, -1):
        if re.match(rf"^{parent_kid}", path.parts[i] or ""):
            knife_dir = Path(*path.parts[:i+1])
            break
    if not knife_dir:
        return {}
    idx = knife_dir / "index.md"
    if not idx.exists():
        return {}
    try:
        return parse_frontmatter(idx.read_text(encoding="utf-8"))
    except Exception:
        return {}

def next_sub_postfix(parent_dir: Path, parent_kid: str) -> str:
    """Compute next available _XX postfix by scanning .md files with frontmatter id starting with parent_kid_."""
    used = set()
    for p in parent_dir.glob("*.md"):
        try:
            txt = p.read_text(encoding="utf-8")
        except Exception:
            continue
        fm = parse_frontmatter(txt)
        sid = (fm.get("id") or "").strip()
        m = SUB_ID_RE.match(sid)
        if m and m.group(1) == parent_kid:
            try:
                used.add(int(m.group(2)))
            except Exception:
                pass
    n = 1
    while n in used:
        n += 1
    return f"{n:02d}"

def has_frontmatter(text: str) -> bool:
    return text.startswith(FM_START)

def detect_locale(path: Path) -> str:
    parts = path.parts
    return "sk" if "sk" in parts else ("en" if "en" in parts else "")

def detect_id_from_path(path: Path) -> str:
    # hľadá napr. .../knifes/K000044-backup-one-drive/...
    m = re.search(r"/(K\d{3})[-_/]", "/".join(path.parts)+"/")
    return m.group(1) if m else ""

def build_guid(kid: str) -> str:
    base = kid.lower() if kid else "unknown"
    return f"knife-{base}-{uuid.uuid4()}"

def make_frontmatter(kid: str, locale: str, sub_id: str = "", parent: str = "") -> str:
    # decide final id
    final_id = f"{kid}_{sub_id}" if (kid and sub_id) else (kid or "")
    guid = build_guid(final_id or kid)
    lines = [FM_START]
    # stable canonical order
    items = [
        ("id", final_id),
        ("guid", guid),
        ("dao", "knife"),
        ("title", ""),
        ("author", ""),
        ("created", TODAY),
        ("modified", TODAY),
        ("status", "draft"),
        ("type", "knife"),
        ("category", "deliverable"),
        ("tags", []),
        ("slug", ""),
        ("sidebar_label", f"{final_id or kid} – " if (final_id or kid) else ""),
        ("locale", locale or ""),
    ]
    if parent:
        items.insert(1, ("parent", parent))

    for k, v in items:
        if k == "tags":
            lines.append(f"tags: []\n")
        elif k == "slug":
            lines.append(f"# slug: \"\"\n")
        else:
            sval = "" if v is None else str(v)
            lines.append(f"{k}: {sval}\n")
    lines.append(FM_END)
    return "".join(lines)

def process_file(path: Path, dry: bool=False) -> bool:
    txt = path.read_text(encoding="utf-8")
    if has_frontmatter(txt):
        return False
    parent_kid = find_parent_kid(path)
    locale = detect_locale(path)
    sub_id = ""
    if parent_kid and path.name != "index.md":
        # try to read digits from filename first
        stem = path.stem
        m = re.search(rf"^(?:{parent_kid})(?:_|-)(\d{{1,3}})", stem)
        if m:
            sub_id = f"{int(m.group(1)):02d}"
        else:
            sub_id = next_sub_postfix(path.parent, parent_kid)
    fm = make_frontmatter(parent_kid or detect_id_from_path(path), locale, sub_id=sub_id, parent=parent_kid if sub_id else "")
    if dry:
        print(f"[DRY] would add FM → {path} (id={parent_kid + ('_' + sub_id if sub_id else '')})")
        return False
    path.write_text(fm + "\n" + txt, encoding="utf-8")
    print(f"[ADD] frontmatter → {path}")
    return True

def main():
    dry = "--dry" in sys.argv
    changed = 0
    for p in DOCS_DIR.rglob("*.md"):
        if should_skip_file(p):
            continue
        changed += 1 if process_file(p, dry=dry) else 0
    print(f"Done. Added FM to {changed} file(s).")

if __name__ == "__main__":
    main()