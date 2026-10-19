#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
knife_idempotent_fix_v5.py  —  KNIFE FM & user-header fixer (all-strings edition)

-Design goals (per Roman):
- Treat ALL FM scalar values as strings (avoid YAML auto-typing like dates/bools/ints).
- Backup original FM block next to the file as <name>.FM.bak.md for audit.
- Rebuild FM strictly from FM-Core keys/order; fill from original FM (normalized), append unknown keys at end.
- Deterministic manual FM emission (no YAML library): every scalar is double-quoted; lists are [ "a","b" ].
- Idempotent body fix: single H1, exactly one fm-visible block under H1; dedupe <!-- nav:knifes --> and <!-- body:start -->.

CLI:
  python3 knife_idempotent_fix_v5.py --root content/docs/sk --core core/templates/system/FM-Core.md --dry-run
  python3 knife_idempotent_fix_v5.py --root content/docs/sk --core core/templates/system/FM-Core.md --apply
  python3 knife_idempotent_fix_v5.py --file content/docs/sk/knifes/K000/index.md --core core/templates/system/FM-Core.md --apply
"""

import os, re, sys, argparse, uuid, unicodedata, difflib
from typing import Dict, Any, List, Tuple

# ---------------- Canonical maps (status/priority) ----------------

STATUS_CANON = {"backlog","inprogress","done","archived","other"}
PRIORITY_CANON = {"top","middle","low","no"}

STATUS_ALIASES = {
    # Backlog
    "": "backlog", "todo":"backlog","tbd":"backlog","idea":"backlog",
    "napad":"backlog","nápad":"backlog","now":"backlog","new":"backlog","init":"backlog",
    "queue":"backlog","queued":"backlog","pending":"backlog","backlog":"backlog",
    # Inprogress
    "inprogress":"inprogress","in-progress":"inprogress","wip":"inprogress",
    "work-in-progress":"inprogress","ongoing":"inprogress","active":"inprogress",
    "aktivna":"inprogress","aktívna":"inprogress","working":"inprogress",
    "rozpracovane":"inprogress","rozpracované":"inprogress","draft":"inprogress",
    # Done
    "done":"done","final":"done","finished":"done","complete":"done","completed":"done",
    "hotovo":"done","finalized":"done","zverejnene":"done","zverejnené":"done",
    # Archived
    "archived":"archived","archive":"archived","retired":"archived","deprecated":"archived",
    # Other
    "onhold":"other","on-hold":"other","paused":"other","pause":"other",
    "blocked":"other","later":"other","review":"other","kontrola":"other",
    "revizia":"other","revízia":"other"
}

PRIORITY_ALIASES = {
    "": "no","none":"no","no":"no",
    "low":"low","minor":"low","trivial":"low",
    "middle":"middle","medium":"middle","normal":"middle",
    "high":"top","hi":"top","top":"top","urgent":"top","critical":"top"
}

# ---------------- Utility: accents/normalization ----------------

def strip_accents(s: str) -> str:
    return ''.join(ch for ch in unicodedata.normalize('NFD', s) if unicodedata.category(ch) != 'Mn')

def norm_alias(value: Any, aliases: Dict[str,str], canon: set, default: str) -> str:
    """Normalize raw value to canonical (accent/emoji tolerant). Returns canonical or default."""
    if value is None:
        return default
    v = str(value).strip()
    # remove emojis/symbols except - _ and spaces
    v = ''.join(ch for ch in v if ch.isalnum() or ch.isspace() or ch in "-_")
    v = v.strip('"').strip("'")
    low = v.lower()
    if low in canon:
        return low
    key = strip_accents(low)
    if key in aliases:
        return aliases[key]
    cleaned = ''.join(ch for ch in low if ch.isalnum() or ch.isspace() or ch in "-_")
    key2 = strip_accents(cleaned)
    if key2 in aliases:
        return aliases[key2]
    return default if low == "" else (low if low in canon else default)


# ---------------- FM parsing: ALL STRINGS (no YAML lib) ----------------

def _unquote(s: str) -> str:
    s = s.strip()
    if (s.startswith('"') and s.endswith('"')) or (s.startswith("'") and s.endswith("'")):
        s = s[1:-1]
    # unescape common sequences
    s = s.replace('\\n', '\n').replace('\\"', '"')
    return s


def _split_list_items(inner: str) -> list:
    items, buf, in_q, esc = [], [], False, False
    for ch in inner:
        if esc:
            buf.append(ch)
            esc = False
            continue
        if ch == '\\':
            esc = True
            continue
        if ch == '"':
            in_q = not in_q
            continue
        if ch == ',' and not in_q:
            item = ''.join(buf).strip()
            if item:
                items.append(_unquote(item))
            buf = []
            continue
        buf.append(ch)
    last = ''.join(buf).strip()
    if last:
        items.append(_unquote(last))
    return items

# --- Inline-comment stripper for FM values ---
def _strip_inline_comment(s: str) -> str:
    """Remove trailing inline comment starting with '#' that is not inside quotes nor inside [ ... ]."""
    out = []
    in_q = False
    bracket = 0
    esc = False
    for ch in s:
        if esc:
            out.append(ch); esc = False; continue
        if ch == '\\':
            esc = True; out.append(ch); continue
        if ch == '"':
            in_q = not in_q; out.append(ch); continue
        if ch == '[' and not in_q:
            bracket += 1; out.append(ch); continue
        if ch == ']' and not in_q and bracket > 0:
            bracket -= 1; out.append(ch); continue
        if ch == '#' and not in_q and bracket == 0:
            break
        out.append(ch)
    return ''.join(out).rstrip()

def parse_fm_block(fm_text: str) -> Dict[str, Any]:
    """Parse a simple key: value / key: [..] block where ALL scalars are kept as strings.
    - Lines starting with '#' are ignored.
    - Lists must be on one line: key: ["a", "b"]
    - Scalars may be quoted or unquoted; result is a string.
    """
    out: Dict[str, Any] = {}
    for raw_line in fm_text.splitlines():
        line = raw_line.strip()
        if not line or line.startswith('#'):
            continue
        if ':' not in line:
            continue
        key, val = line.split(':', 1)
        key = key.strip()
        val = _strip_inline_comment(val.strip())
        if val.startswith('[') and val.endswith(']'):
            inner = val[1:-1].strip()
            inner = _strip_inline_comment(inner)
            out[key] = _split_list_items(inner) if inner else []
        else:
            out[key] = _unquote(val)
    return out

def extract_fm_and_body(md_text: str) -> Tuple[Dict[str,Any], str, str]:
    """Extract FM dict, body text, and raw FM (for backup)."""
    m = re.match(r'^\s*---\s*\n', md_text)
    if not m:
        return {}, md_text, ""
    end = re.search(r'\n---\s*\n', md_text[m.end():])
    if not end:
        return {}, md_text, ""
    fm_raw = md_text[m.end(): m.end() + end.start()]
    body = md_text[m.end() + end.end():]
    fm = parse_fm_block(fm_raw)
    return fm, body, fm_raw

# ---------------- FM dumping: manual, deterministic (no YAML lib) ----------------

def esc(s: str) -> str:
    # keep existing backslashes as-is; only escape quotes and newlines
    s = s.replace('"', '\\"').replace('\n','\\n')
    return s

def dump_fm(core_keys_order: List[str], fm: Dict[str,Any]) -> str:
    lines = ["---"]
    # first: core keys in order
    for k in core_keys_order:
        v = fm.get(k, "")
        if isinstance(v, list):
            items = ",".join(f'"{esc(str(x))}"' for x in v)
            lines.append(f'{k}: [{items}]')
        else:
            lines.append(f'{k}: "{esc(str(v))}"')
    # then: extras
    for k, v in fm.items():
        if k in core_keys_order:
            continue
        if isinstance(v, list):
            items = ",".join(f'"{esc(str(x))}"' for x in v)
            lines.append(f'{k}: [{items}]')
        else:
            lines.append(f'{k}: "{esc(str(v))}"')
    lines.append("---")
    return "\n".join(lines) + "\n"

# ---------------- File IO ----------------

def read_text(path:str) -> str:
    with open(path, "r", encoding="utf-8") as f:
        return f.read()

def write_text(path:str, s:str):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        f.write(s)

# ---------------- Core template loader (as strings) ----------------

def load_core(core_path: str) -> Dict[str,Any]:
    core_text = read_text(core_path)
    # Prefer the first FM block between leading '---' pairs
    m = re.search(r'^\s*---\s*\n', core_text, flags=re.MULTILINE)
    if m:
        m2 = re.search(r'\n---\s*\n', core_text[m.end():])
        if m2:
            fm_text = core_text[m.end(): m.end() + m2.start()]
            fm = parse_fm_block(fm_text)
            if isinstance(fm, dict) and fm:
                return fm
    # Fallback: treat entire file as a simple FM block
    return parse_fm_block(core_text)

# ---------------- FM normalization & merge ----------------

def ensure_guid(fm: Dict[str,Any]) -> Dict[str,Any]:
    if not fm.get("guid"):
        fm["guid"] = str(uuid.uuid4())
    return fm

def ensure_authors_dual(fm: Dict[str,Any]) -> Dict[str,Any]:
    author = fm.get("author","")
    authors = fm.get("authors", [])
    if not isinstance(authors, list):
        authors = [str(authors)] if str(authors).strip() else []
    # ensure author present
    if not isinstance(author, str):
        author = str(author) if author is not None else ""
    if not author.strip():
        first_nonempty = next((a for a in authors if isinstance(a,str) and a.strip()), "")
        fm["author"] = first_nonempty
    else:
        fm["author"] = author.strip()
    # ensure at least two placeholders in authors (as in Core sample)
    while len(authors) < 2:
        authors.append("")
    fm["authors"] = [str(x) for x in authors]
    return fm

def normalize_status_priority(fm: Dict[str,Any]) -> Dict[str,Any]:
    fm["status"] = norm_alias(fm.get("status",""), STATUS_ALIASES, STATUS_CANON, "backlog")
    fm["priority"] = norm_alias(fm.get("priority",""), PRIORITY_ALIASES, PRIORITY_CANON, "no")
    return fm

def rebuild_fm_from_core(core: Dict[str,Any], fm_old: Dict[str,Any]) -> Dict[str,Any]:
    # Start brand-new FM from Core
    out = {}
    core_keys_order = list(core.keys())
    for k in core_keys_order:
        core_v = core[k]
        # pull original value if exists; otherwise core default
        v = fm_old.get(k, core_v)
        # coerce to string or list[str]
        if isinstance(core_v, list):
            if isinstance(v, list):
                v = ["" if x is None else str(x) for x in v]
            else:
                # if original scalar but core expects list, keep core default list
                v = ["" if x is None else str(x) for x in (core_v if isinstance(core_v, list) else [])]
        else:
            v = "" if v is None else str(v)
        out[k] = v
    # augment & normalize known fields
    out = ensure_guid(out)
    out = ensure_authors_dual(out)
    out = normalize_status_priority(out)
    # append unknown keys from old FM (preserve info)
    for k, v in fm_old.items():
        if k not in out:
            if isinstance(v, list):
                out[k] = ["" if x is None else str(x) for x in v]
            else:
                out[k] = "" if v is None else str(v)
    return out

# ---------------- Body fixes ----------------

def ensure_single_h1(body: str, title: str) -> Tuple[str,str]:
    lines = body.splitlines()
    h1_idx = [i for i, line in enumerate(lines) if re.match(r'^\s*#\s+', line)]
    if not h1_idx:
        h1_text = title if title else "Untitled"
        return f"# {h1_text}\n" + ("\n".join(lines).lstrip("\n")), h1_text
    first = h1_idx[0]
    h1_line = re.sub(r'^\s*#\s+', '', lines[first]).strip()
    for i in h1_idx[1:]:
        lines[i] = re.sub(r'^\s*#\s+', '## ', lines[i], count=1)
    return "\n".join(lines), h1_line

def dedupe_marker_single(body: str, marker: str) -> Tuple[str, str]:
    lines = body.splitlines()
    seen = False
    new_lines = []
    kept = None
    pattern = re.compile(rf'^\s*<!--\s*{re.escape(marker)}\s*-->\s*$', re.IGNORECASE)
    for line in lines:
        if pattern.match(line):
            if not seen:
                seen = True; kept = line; new_lines.append(line)
            else:
                continue
        else:
            new_lines.append(line)
    return "\n".join(new_lines), (kept or f"<!-- {marker} -->")

def remove_fm_visible_blocks(body: str) -> str:
    pattern = re.compile(r'<!--\s*fm-visible\s*:\s*start\s*-->(.*?)<!--\s*fm-visible\s*:\s*end\s*-->', re.DOTALL | re.IGNORECASE)
    return pattern.sub('', body)

def build_fm_visible_block(fm: Dict[str,Any]) -> str:
    guid = fm.get("guid") or ""
    status = fm.get("status") or ""
    authors = fm.get("authors") or []
    if isinstance(authors, list):
        authors = [a for a in authors if isinstance(a,str) and a.strip()]
    lic = fm.get("license") or "CC-BY-NC-SA-4.0"
    parts = [f'> **GUID:** `{guid}`']
    tail = []
    if status: tail.append(f'**Status:** `{status}`')
    if authors: tail.append(f'**Author:** ' + " · ".join(authors))
    if lic: tail.append(f'**License:** {lic}')
    if tail:
        parts.append("> " + " · ".join(tail))
    block = "\n".join(parts)
    return f"<!-- fm-visible: start -->\n{block}\n<!-- fm-visible: end -->"

def insert_after_h1(body: str, block: str) -> str:
    lines = body.splitlines()
    for i, line in enumerate(lines):
        if re.match(r'^\s*#\s+', line):
            j = i + 1
            while j < len(lines) and lines[j].strip() == "":
                j += 1
            return "\n".join(lines[:j] + [block, ""] + lines[j:])
    return block + "\n\n" + body

# ---------------- Per-file processing ----------------

def backup_fm_raw(path_md: str, fm_raw: str, is_apply: bool):
    if not fm_raw:
        return None
    base, name = os.path.split(path_md)
    bak_path = os.path.join(base, os.path.splitext(name)[0] + ".FM.bak.md")
    if is_apply:
        with open(bak_path, "w", encoding="utf-8") as f:
            f.write(fm_raw.strip() + "\n")
    return bak_path

def process_file(path: str, core: Dict[str,Any], is_apply: bool, return_out: bool = False) -> Tuple[Any, ...]:
    try:
        src = read_text(path)
    except Exception as e:
        return False, f"[skip] {path} (read error: {e})"
    fm_old, body, fm_raw = extract_fm_and_body(src)
    # Backup
    bak = backup_fm_raw(path, fm_raw, is_apply)
    # Rebuild FM
    fm_new = rebuild_fm_from_core(core, fm_old)
    # Body ops
    title = fm_new.get("title","")
    body, _ = ensure_single_h1(body, title)
    body, _ = dedupe_marker_single(body, "nav:knifes")
    body, _ = dedupe_marker_single(body, "body:start")
    body = remove_fm_visible_blocks(body)
    fm_visible = build_fm_visible_block(fm_new)
    body_final = insert_after_h1(body, fm_visible)
    body_final = re.sub(r'\n{3,}', '\n\n', body_final.strip()) + "\n"
    # Emit FM deterministically
    core_keys_order = list(core.keys())
    fm_text = dump_fm(core_keys_order, fm_new)
    out = fm_text + body_final
    changed = (out != src)
    if is_apply and changed:
        write_text(path, out)
    msg = f"[OK] {path} {'(backup: '+bak+')' if bak else ''}"
    if return_out:
        return changed, msg, src, out
    return changed, msg

# ---------------- CLI ----------------

def iter_md_files(root: str) -> List[str]:
    res = []
    for base, _, names in os.walk(root):
        for n in names:
            if n.lower().endswith(".md"):
                res.append(os.path.join(base, n))
    return res

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--root", help="Root folder (recursive)")
    ap.add_argument("--file", help="Single file")
    ap.add_argument("--core", required=True, help="Path to FM-Core.md")
    ap.add_argument("--apply", action="store_true")
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--preview", action="store_true", help="During --dry-run, show unified diff for the first changed file (or the specified --file)")
    ap.add_argument("--preview-all", action="store_true", help="During --dry-run, show unified diff for ALL changed files")
    ap.add_argument("--limit", type=int, help="With --preview-all, show at most N diffs (still counts all changes)")
    args = ap.parse_args()

    if not (args.root or args.file):
        sys.stderr.write("Provide --root or --file\n")
        sys.exit(2)

    # Load FM-Core as all-strings dict
    core = load_core(args.core)
    if not core:
        sys.stderr.write(f"❌ Failed to load FM-Core from: {args.core}\n")
        sys.exit(2)

    targets = [args.file] if args.file else iter_md_files(args.root)
    changed = 0
    preview_shown = False
    previews_printed = 0
    for p in targets:
        # Preview ALL changed files
        if args.dry_run and args.preview_all:
            res = process_file(p, core, is_apply=False, return_out=True)
            if not isinstance(res, tuple) or len(res) < 4:
                continue
            ch, msg, src, out = res
            if ch:
                changed += 1
                if args.limit is None or previews_printed < args.limit:
                    print(f"\n===== PREVIEW: {p} =====")
                    diff = difflib.unified_diff(
                        src.splitlines(), out.splitlines(),
                        fromfile=f"{p} (current)", tofile=f"{p} (new)", lineterm=""
                    )
                    print("\n".join(diff))
                    previews_printed += 1
            continue

        # Preview only the first changed file
        if args.dry_run and args.preview and not preview_shown:
            res = process_file(p, core, is_apply=False, return_out=True)
            if not isinstance(res, tuple) or len(res) < 4:
                continue
            ch, msg, src, out = res
            if ch:
                print(f"\n===== PREVIEW: {p} =====")
                diff = difflib.unified_diff(
                    src.splitlines(), out.splitlines(),
                    fromfile=f"{p} (current)", tofile=f"{p} (new)", lineterm=""
                )
                print("\n".join(diff))
                preview_shown = True
                changed += 1
            continue

        # Default path (no preview): print [would-change] per file in dry-run
        ch, msg = process_file(p, core, is_apply=args.apply)
        if ch:
            changed += 1
        if args.dry_run:
            if ch:
                print(f"[would-change] {p}")
        else:
            print(msg)
    if args.dry_run and (args.preview or args.preview_all) and changed == 0:
        print("No changes detected for preview.")
    if args.dry_run and args.preview_all and args.limit is not None and previews_printed >= args.limit:
        remaining = max(changed - previews_printed, 0)
        if remaining:
            print(f"(preview limit {args.limit} reached; {remaining} additional changed file(s) not shown)")
    if args.apply:
        print(f"Done. Changed files: {changed}")
    else:
        print(f"Dry-run complete. Would change files: {changed}")

if __name__ == "__main__":
    main()
