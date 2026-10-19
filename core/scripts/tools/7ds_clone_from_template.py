#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
7ds_clone_from_template.py

Clone a hierarchical 7Ds template tree into a new instance under content/docs/sk/<instance>.
- Accepts a template root (defaults to core/templates/content/7ds).
- If the template root contains a top-level "body" directory, that layer is stripped from the destination paths.
- Injects an optional user header comment (HTML or Markdown) at the top of each generated .md file.
- Optionally runs fm_apply_from_core_7ds.py to replace the front matter from FM-Core.md.

Usage examples:
  # Create new instance skeleton (no FM replacement)
  python3 core/scripts/tools/7ds_clone_from_template.py --instance 7ds-jahody

  # Create skeleton and immediately apply FM from core
  python3 core/scripts/tools/7ds_clone_from_template.py \
    --instance 7ds-jahody \
    --apply \
    --fm-core core/templates/system/FM-Core.md
"""

import argparse
import os
import re
import shutil
import sys
from pathlib import Path

# ---------- helpers ----------

def load_text(p: Path) -> str:
    return p.read_text(encoding="utf-8")

def write_text(p: Path, s: str) -> None:
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(s, encoding="utf-8")

def load_fm_core(path: Path) -> dict:
    """
    Load FM core YAML from a file that contains a front-matter block near the top.
    Tolerates UTF-8 BOM, leading whitespace/newlines, and comments.
    Returns a dict (empty if parsing yields None). Raises if not a dict.
    """
    text = path.read_text(encoding="utf-8")
    # Strip BOM + leading whitespace/newlines
    text = text.lstrip("\ufeff\r\n\t ")
    # Find the first front-matter block delimited by --- ... ---
    m = re.search(r"^---\s*\n(.*?)\n---\s*", text, re.DOTALL | re.MULTILINE)
    if not m:
        raise RuntimeError("FM-Core.md neobsahuje platný FM blok na začiatku (--- ... ---).")
    yaml_block = m.group(1)
    try:
        import yaml  # ensure PyYAML
    except Exception as e:
        raise RuntimeError(f"PyYAML nie je dostupný: {e}")
    data = yaml.safe_load(yaml_block)
    if data is None:
        data = {}
    if not isinstance(data, dict):
        raise RuntimeError("FM-Core front-matter sa neparsuje na mapu/dict.")
    return data

def render_header(header_template: Path | None) -> str:
    if not header_template:
        return ""
    if not header_template.exists():
        # Header is optional; just warn in console and continue silently for generation.
        print(f"⚠️  Header template not found: {header_template}", file=sys.stderr)
        return ""
    return load_text(header_template).rstrip() + "\n\n"

def find_content_root(tpl_root: Path) -> tuple[Path, Path]:
    """
    Returns (content_root, strip_prefix).
    If tpl_root/body exists, use that as content_root and strip_prefix=tpl_root/'body'.
    Otherwise use tpl_root for both.
    """
    body = tpl_root / "body"
    if body.exists() and body.is_dir():
        return body, body
    return tpl_root, tpl_root

def copy_tree_with_header(src_root: Path, strip_prefix: Path, dst_root: Path, header: str, dry: bool, verbose: bool) -> list[Path]:
    """
    Copy all files from src_root into dst_root, preserving relative paths after removing strip_prefix.
    If header is non-empty and destination is a Markdown file, prepend header.
    Returns list of written file paths.
    """
    written: list[Path] = []
    for p in src_root.rglob("*"):
        if p.is_dir():
            continue
        rel = p.relative_to(strip_prefix)
        out = dst_root / rel
        if dry:
            if p.suffix.lower() == ".md":
                print(f"[DRY] would write: {out}")
            else:
                print(f"[DRY] would copy: {p} to {out}")
            written.append(out)
            continue
        # Always ensure directory structure exists
        out.parent.mkdir(parents=True, exist_ok=True)
        if p.suffix.lower() == ".md":
            content = load_text(p)
            # Prepend header (if any)
            if header:
                content = header + content.lstrip()
            write_text(out, content)
        else:
            # For non-md assets, just copy
            shutil.copy2(p, out)
        written.append(out)
    return written

def run_auto_fm_apply(root: Path, fm_core: Path, instance_tag: str) -> int:
    """
    Call fm_apply_from_core_7ds.py residing in core/scripts/tools/.
    Returns process exit code.
    """
    tool = Path(__file__).parent / "fm_apply_from_core_7ds.py"
    if not tool.exists():
        # also allow it one level up (historical locations)
        alt = (Path(__file__).parent / ".." / "fm_apply_from_core_7ds.py").resolve()
        if alt.exists():
            tool = alt
        else:
            print(f"⚠️  Auto-FM tool not found: {tool}", file=sys.stderr)
            return 2

    cmd = [
        sys.executable,
        str(tool),
        "--root", str(root),
        "--fm-core", str(fm_core),
        "--apply",
        "--instance-tag", instance_tag,
    ]
    print("↪️ Running auto FM apply:", " ".join(cmd))
    return os.spawnvp(os.P_WAIT, cmd[0], cmd)

# ---------- main ----------

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--instance", required=True, help="Názov inštancie (napr. 7ds-STHDF-2025). Vytvorí sa pod content/docs/sk/<instance>.")
    ap.add_argument("--template-root", default="core/templates/content/7ds", help="Koreň šablóny 7Ds.")
    ap.add_argument("--header-template", default="core/templates/7ds/header/7ds_user_header.md", help="Voliteľná hlavička pridávaná na začiatok .md.")
    ap.add_argument("--fm-core", default="core/templates/system/FM-Core.md", help="FM-Core s YAML front-matterom.")
    # CLI contract v1.0 additions
    ap.add_argument("--dry", action="store_true", help="Dry run mode: nevytvára súbory, len vypíše, čo by vytvoril (default ak --apply nie je zadané).")
    ap.add_argument("--apply", action="store_true", help="Skutočný zápis súborov a aplikácia FM.")
    ap.add_argument("--root", default="content/docs/sk", help="Koreň pre inštancie (default: content/docs/sk).")
    ap.add_argument("--out-root", help="Výstupný koreň namiesto --root (ak je zadaný).")
    ap.add_argument("--locale", help="Locale (voliteľné).")
    ap.add_argument("--force", action="store_true", help="Force overwrite existing files (voliteľné).")
    ap.add_argument("--verbose", action="store_true", help="Verbose output (voliteľné).")
    args = ap.parse_args()

    # Ak nie je explicitne --apply, tak predpokladaj dry režim
    dry = not args.apply

    instance = args.instance.strip()
    base_root = Path(args.out_root) if args.out_root else Path(args.root)
    dest_root = base_root / instance
    print(f"📁 Destination root: {dest_root.resolve()}")
    print(f"ℹ️  Instance: {instance}")
    if dry:
        print("ℹ️  Running in DRY mode (no files will be written)")

    tpl_root = Path(args.template_root)
    if not tpl_root.exists():
        raise SystemExit(f"Template root neexistuje: {tpl_root}")

    content_root, strip_prefix = find_content_root(tpl_root)
    if content_root != tpl_root:
        print("🗂️  Stripping template top-level folder: body")

    header = render_header(Path(args.header_template))

    # 1) Copy tree (+ optional header injection)
    written = copy_tree_with_header(content_root, strip_prefix, dest_root, header, dry=dry, verbose=args.verbose)
    for w in written:
        # echo minimal list but not too verbose
        if w.suffix.lower() == ".md" and not dry:
            print(f"✓ wrote: {w}")

    # 2) Optionally apply FM from core
    if args.apply:
        fm_core = Path(args.fm_core)
        # Validate FM-Core is parseable to provide an early, clear error
        try:
            _ = load_fm_core(fm_core)
        except Exception as e:
            raise SystemExit(str(e))
        rc = run_auto_fm_apply(dest_root, fm_core, instance_tag=instance)
        if rc != 0:
            print(f"⚠️ Auto-FM step failed with exit code {rc}", file=sys.stderr)
        else:
            print("✅ FM application completed successfully.")
        print("➡️ Next step: FM70-7ds-apply-from-core")

if __name__ == "__main__":
    main()