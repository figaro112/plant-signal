#!/usr/bin/env python3
"""
fm_normalize_7ds.py
Jednorazové (ale opakovateľné) zjednotenie FM v content/docs/sk/7Ds
podľa tvojho FM-Core.md.

Použitie:
    python3 core/scripts/tools/fm_normalize_7ds.py --root content/docs/sk/7Ds --dry
    python3 core/scripts/tools/fm_normalize_7ds.py --root content/docs/sk/7Ds --apply
"""

import argparse
import pathlib
import sys
import copy
from datetime import datetime

import yaml

# --- 1) Sem si vlož svoj FM-Core (presne ten, čo si poslal) ---
FM_CORE_REF = {
    "fm_version": "1.0.1",
    "fm_build": "2025-10-12T10:35:00Z",
    "fm_version_comment": "Added field fm_version_comment to document reasons for FM updates",
    "id": "",
    "guid": "",
    "dao": "knife",
    "title": "",
    "description": "",
    "author": "Roman Kazička",
    "authors": ["Roman Kazička", ""],
    "category": "",
    "type": "",
    "priority": "no",
    "tags": ["KNIFE"],
    "locale": "sk",
    "created": "",
    "modified": "",
    "status": "done",
    "privacy": "public",
    "rights_holder_content": "Roman Kazička",
    "rights_holder_system": "Roman Kazička (CAA/KNIFE/LetItGrow)",
    "license": "CC-BY-NC-SA-4.0",
    "disclaimer": "Use at your own risk. Methods provided as-is; participation is voluntary and context-aware.",
    "copyright": "© 2025 Roman Kazička / SystemThinking",
    "origin_repo": "",
    "origin_repo_url": "",
    "origin_commit": "",
    "origin_system": "",
    "author_id": "",
    "author_did": "",
    "fm_reserved1": "",
    "fm_reserved2": "",
    # v tvojom príklade bol zakomentovaný sidebar_label – necháme to na súbor
    "date": "",
    "sidebar_position": "1",
}

# --- YAML setup: chceme dvojité úvodzovky ---
class QuotedDumper(yaml.SafeDumper):
    pass

def _str_representer(dumper, data):
    # všetky stringy ako double-quoted
    return dumper.represent_scalar('tag:yaml.org,2002:str', data, style='"')

QuotedDumper.add_representer(str, _str_representer)


def load_md_with_frontmatter(path: pathlib.Path):
    text = path.read_text(encoding="utf-8")
    if not text.startswith("---"):
        return {}, text  # žiadny FM
    parts = text.split("---", 2)
    if len(parts) < 3:
        return {}, text
    fm_raw = parts[1]
    body = parts[2].lstrip("\n")
    try:
        fm = yaml.safe_load(fm_raw) or {}
    except Exception as e:
        print(f"⚠️  YAML error in {path}: {e}", file=sys.stderr)
        fm = {}
    return fm, body


def dump_md(path: pathlib.Path, fm: dict, body: str, dry: bool):
    fm_yaml = yaml.dump(
        fm,
        Dumper=QuotedDumper,
        sort_keys=False,
        allow_unicode=True,
    ).rstrip()
    out = f"---\n{fm_yaml}\n---\n{body.lstrip()}"
    if dry:
        print(f"🧪 DRY: {path}")
        print(out)
    else:
        path.write_text(out, encoding="utf-8")


def normalize_single(path: pathlib.Path, dry: bool) -> bool:
    orig_fm, body = load_md_with_frontmatter(path)
    fm = copy.deepcopy(orig_fm) if orig_fm else {}

    changed = False

    # 1) doplň chýbajúce kľúče z FM_CORE_REF (ADD-ONLY!)
    for key, val in FM_CORE_REF.items():
        if key not in fm:
            fm[key] = val
            changed = True

    # 2) uisti sa, že sidebar_position je string
    if "sidebar_position" in fm:
        if not isinstance(fm["sidebar_position"], str):
            fm["sidebar_position"] = str(fm["sidebar_position"])
            changed = True

    # 3) ak chýba modified a máme created -> doplniť
    if fm.get("created") and not fm.get("modified"):
        fm["modified"] = fm["created"]
        changed = True

    # 4) ak chýba date -> daj created (ako máš v KNIFE)
    if not fm.get("date") and fm.get("created"):
        fm["date"] = fm["created"]
        changed = True

    # 5) ak chýba fm_build → doplň aktuálny UTC
    if not fm.get("fm_build"):
        fm["fm_build"] = datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")
        changed = True

    # 6) necháme tvoje existujúce hodnoty NAJVIAC, žiadne prepisovanie
    #    t.j. ak máš id, guid, dao → ostáva

    if changed:
        dump_md(path, fm, body, dry)
    else:
        if dry:
            print(f"🧪 DRY: {path} – no change")
    return changed


def main():
    ap = argparse.ArgumentParser(description="Normalize 7Ds FM to KNIFE FM-Core style (add-only).")
    ap.add_argument("--root", default="content/docs/sk/7Ds", help="root folder with 7Ds .md files")
    g = ap.add_mutually_exclusive_group()
    g.add_argument("--dry", action="store_true", help="show changes, do not write")
    g.add_argument("--apply", action="store_true", help="write changes in-place")
    args = ap.parse_args()

    root = pathlib.Path(args.root)
    if not root.exists():
        print(f"❌ root not found: {root}")
        sys.exit(1)

    md_files = sorted(root.rglob("*.md"))
    total = 0
    changed = 0

    for md in md_files:
        total += 1
        if normalize_single(md, dry=not args.apply):
            changed += 1

    mode = "APPLY" if args.apply else "DRY"
    print(f"✅ {mode} done. Files: {total}, changed: {changed}")


if __name__ == "__main__":
    main()