# core/scripts/tools/fm_fix.py
# -----------------------------------------------------------
# FM normalizer – 3 režimy: audit | dry | apply
# VerzIA: 2025-11-02
#
# Použitie:
#   python3 core/scripts/tools/fm_fix.py --root docs/sk/7Ds --template core/templates/system/FM-Core.md --mode audit
#   python3 core/scripts/tools/fm_fix.py --root docs/sk/7Ds --template core/templates/system/FM-Core.md --mode dry
#   python3 core/scripts/tools/fm_fix.py --root docs/sk/7Ds --template core/templates/system/FM-Core.md --mode apply --backup
#
# Logika:
# 1. Načíta FM z template (FM-Core.md) – prvý blok --- ... ---
# 2. Prejde všetky .md pod --root
# 3. Každý súbor:
#    - vyberie existujúci FM
#    - porovná s template
#    - zachová existujúce hodnoty
#    - doplní chýbajúce z template
#    - voliteľne odstráni hash postfix v `id:` (napr. _A735)
# 4. V režime audit/dry len vypíše, v apply zapíše
#
# Poznámka:
#   Skript je písaný tak, aby NEMENIL polia, ktoré už máš v súbore,
#   iba dopĺňal chýbajúce – to je tvoj „add-only“ princíp.
# -----------------------------------------------------------

import argparse
import os
import re
import sys
from datetime import datetime

try:
    import yaml
except ImportError:
    print("❌ Missing PyYAML. Install: pip install pyyaml")
    sys.exit(1)


HASH_SUFFIX_RE = re.compile(r"_[A-F0-9]{3,5}$", re.IGNORECASE)


def load_template_fm(path: str) -> dict:
    if not os.path.exists(path):
        raise FileNotFoundError(f"Template FM not found: {path}")
    with open(path, "r", encoding="utf-8") as f:
        text = f.read()
    if not text.lstrip().startswith("---"):
        raise RuntimeError("Template must start with '---' frontmatter block.")
    parts = text.split("---", 2)
    fm_str = parts[1]
    return yaml.safe_load(fm_str) or {}


def split_frontmatter(md_text: str):
    """Return (fm_dict, body, had_fm)"""
    if md_text.lstrip().startswith("---"):
        parts = md_text.split("---", 2)
        fm_str = parts[1]
        body = parts[2].lstrip("\n")
        fm = yaml.safe_load(fm_str) or {}
        return fm, body, True
    else:
        return {}, md_text, False


def dump_frontmatter(fm: dict) -> str:
    return "---\n" + yaml.safe_dump(fm, sort_keys=False, allow_unicode=True) + "---\n"


def normalize_id(value: str) -> str:
    if not value:
        return value
    return HASH_SUFFIX_RE.sub("", value)


def process_file(path: str, template_fm: dict, mode: str, backup: bool, strip_hash_id: bool, locale_default: str):
    rel = path
    with open(path, "r", encoding="utf-8") as f:
        text = f.read()

    fm_orig, body, had_fm = split_frontmatter(text)

    # výsledné FM začíname originálom (ADD-ONLY)
    fm_new = dict(fm_orig)

    # 1) doplniť chýbajúce z template
    for k, v in template_fm.items():
        if k not in fm_new or fm_new.get(k) in (None, "", []):
            fm_new[k] = v

    # 2) špeciálne doplnenia
    if "locale" not in fm_new or not fm_new["locale"]:
        fm_new["locale"] = locale_default

    # 3) id bez hash postfixu (iba ak chceme)
    if strip_hash_id and "id" in fm_new and fm_new["id"]:
        fixed = normalize_id(str(fm_new["id"]))
        fm_new["id"] = fixed

    # 4) doplniť fm_build, ak chýba
    if "fm_build" not in fm_new or not fm_new["fm_build"]:
        fm_new["fm_build"] = datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")

    # zmenené?
    changed = (yaml.safe_dump(fm_new, sort_keys=False, allow_unicode=True) !=
               yaml.safe_dump(fm_orig, sort_keys=False, allow_unicode=True))

    if mode == "audit":
        if changed:
            print(f"[AUDIT] {rel} → needs fix")
        return changed

    if mode == "dry":
        if changed:
            print(f"[DRY] {rel}")
        return changed

    if mode == "apply":
        if not changed:
            return False
        # backup
        if backup:
            bak_path = path + ".fm.bak"
            with open(bak_path, "w", encoding="utf-8") as bf:
                bf.write(text)
        new_text = dump_frontmatter(fm_new) + "\n" + body.lstrip("\n")
        with open(path, "w", encoding="utf-8") as f:
            f.write(new_text)
        print(f"[APPLY] {rel}")
        return True

    return False


def iter_md_files(root: str):
    for dirpath, _, filenames in os.walk(root):
        for fn in filenames:
            if fn.endswith(".md") or fn.endswith(".mdx"):
                yield os.path.join(dirpath, fn)


def main():
    ap = argparse.ArgumentParser(description="FM audit/dry/apply tool")
    ap.add_argument("--root", required=True, help="root folder with .md")
    ap.add_argument("--template", required=True, help="FM-Core.md (only FM block will be used)")
    ap.add_argument("--mode", choices=["audit", "dry", "apply"], default="audit")
    ap.add_argument("--backup", action="store_true", help="create .fm.bak when applying")
    ap.add_argument("--strip-hash-id", action="store_true", help="remove _A735-like postfix from id:")
    ap.add_argument("--locale", default="sk", help="default locale to set when missing")
    args = ap.parse_args()

    template_fm = load_template_fm(args.template)

    total = 0
    changed = 0
    for path in iter_md_files(args.root):
        total += 1
        if process_file(
            path,
            template_fm,
            args.mode,
            args.backup,
            args.strip_hash_id,
            args.locale,
        ):
            changed += 1

    print(f"✅ done: scanned={total}, affected={changed}, mode={args.mode}")
    if args.mode != "apply" and changed > 0:
        # nech to v CI vie spadnúť
        sys.exit(2)


if __name__ == "__main__":
    main()