#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import argparse, re, uuid, hashlib
from pathlib import Path
from datetime import datetime, timezone
import yaml

ROOT = Path(__file__).resolve().parents[3]
DEF_FM_CORE = ROOT / "core" / "templates" / "system" / "FM-Core.md"

FM_RE = re.compile(r"^---\n(.*?)\n---\n", re.DOTALL)

def now_iso():
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

def short_hash(s: str) -> str:
    return hashlib.sha1(s.encode("utf-8")).hexdigest()[:6].upper()

def rel_tokens(md: Path, root: Path):
    rel = md.relative_to(root)
    parts = [p for p in rel.parts if p.lower() not in {"body", "index.md"}]
    return [p.replace(".md","") for p in parts if p != "index.md"]

def title_from_path(md: Path, root: Path) -> str:
    toks = rel_tokens(md, root)
    if not toks: return "index"
    last = toks[-1]
    return last.replace("-", " ")

def id_from_path(md: Path, root: Path) -> str:
    toks = rel_tokens(md, root)
    base = "_".join([t.upper().replace(".","_") for t in toks]) or "INDEX"
    return f"{base}_{short_hash(str(md))}"

def load_fm_core(path: Path) -> dict:
    txt = path.read_text(encoding="utf-8-sig")
    # Remove empty lines and comment lines before first ---
    lines = txt.splitlines()
    start_idx = None
    for i, line in enumerate(lines):
        stripped = line.strip()
        if stripped == "---":
            start_idx = i
            break
        if stripped == "" or stripped.startswith("#"):
            continue
        # If any other content before first '---', stop searching
        break
    if start_idx is None:
        snippet = txt[:100].replace("\n", "\\n")
        raise RuntimeError(f"FM-Core.md neobsahuje platný FM blok na začiatku. File start: {snippet}")
    # Find end of FM block
    end_idx = None
    for j in range(start_idx + 1, len(lines)):
        if lines[j].strip() == "---":
            end_idx = j
            break
    if end_idx is None:
        snippet = txt[:100].replace("\n", "\\n")
        raise RuntimeError(f"FM-Core.md neobsahuje ukončený FM blok. File start: {snippet}")
    fm_block = "\n".join(lines[start_idx + 1:end_idx])
    return yaml.safe_load(fm_block)

def render_core(core: dict, subs: dict) -> dict:
    def repl(v):
        if isinstance(v, str):
            out = v
            for k, val in subs.items():
                out = out.replace(f"{{{{{k}}}}}", val)
            return out
        return v
    return {k: repl(v) for k, v in core.items()}

def write_fm(md: Path, fm: dict, body: str):
    fm_txt = yaml.safe_dump(fm, sort_keys=False, allow_unicode=True).rstrip()
    md.write_text(f"---\n{fm_txt}\n---\n{body}", encoding="utf-8")

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--root", required=True)
    ap.add_argument("--apply", action="store_true")
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--instance-tag", default="")
    ap.add_argument("--fm-core", default=str(DEF_FM_CORE))
    args = ap.parse_args()

    root = Path(args.root)
    core = load_fm_core(Path(args.fm_core))

    changed = 0
    for md in root.rglob("*.md"):
        txt = md.read_text(encoding="utf-8")
        m = FM_RE.search(txt)
        body = txt[m.end():] if m else txt

        # Substitúcie
        created = now_iso()
        _title = title_from_path(md, root)
        _id = id_from_path(md, root)
        _guid = str(uuid.uuid4())

        subs = {
            "ID": _id,
            "GUID": _guid,
            "TITLE": _title,
            "AUTHOR": "Roman Kazička",
            "CREATED": created,
            "LOCALE": "sk",
            "LICENSE": "CC-BY-NC-SA-4.0",
            "RIGHTS_HOLDER_SYSTEM": "Roman Kazička (CAA/KNIFE/LetItGrow)",
            "ORIGIN_SYSTEM": "CAA/KNIFE",
        }

        fm = render_core(core, subs)

        # fixy špecifické pre 7ds
        fm["dao"] = "7ds"
        # doplň tagy
        tags = fm.get("tags", []) or []
        if "7ds" not in tags: tags.append("7ds")
        if args.instance_tag and args.instance_tag not in tags: tags.append(args.instance_tag)
        fm["tags"] = tags

        # title – ak už je v dokumente (pôvodný FM), preferuj ten
        if m:
            old = yaml.safe_load(m.group(1)) or {}
            if old.get("title"): fm["title"] = old["title"]

        if args.dry_run and not args.apply:
            print(f"🧪 {md} (dry-run) – would write FM id={fm.get('id')}, title={fm.get('title')}")
        else:
            write_fm(md, fm, body)
            changed += 1

    if args.dry_run and not args.apply:
        print(f"✅ Done (DRY). Files affected: {changed}")
    else:
        print(f"✅ Done. Files updated: {changed}")

if __name__ == "__main__":
    main()