#!/usr/bin/env python3
"""
knifes_fix_titles_once.py

Jednorazový FIX skript pre KNIFE tituly:

- prejde všetky index.md v content/docs/sk/knifes
- načíta front matter
- ak má `id` aj `title` a `title` sa NEZAČÍNA na `id`,
  prepíše title na "ID – pôvodný title"
- ak chýba `sidebar_label`, doplní ho na rovnakú hodnotu ako nový title

Použitie:

  DRY-RUN (len logovanie, bez zápisu):

    python3 core/scripts/tools/knifes_fix_titles_once.py --dry-run

  Ostrý beh (prepíše súbory):

    python3 core/scripts/tools/knifes_fix_titles_once.py
"""

from pathlib import Path
from typing import List, Tuple
import argparse


def _strip_yaml_value(value: str) -> str:
    if not value:
        return ""
    value = value.strip()
    if (value.startswith("'") and value.endswith("'")) or (
        value.startswith('"') and value.endswith('"')
    ):
        return value[1:-1]
    return value


def _split_front_matter(text: str) -> Tuple[List[str], List[str]]:
    """
    Rozdelí celý MD súbor na (fm_lines, body_lines).

    fm_lines: zoznam riadkov medzi prvými dvoma '---'
    body_lines: zvyšok súboru
    """
    lines = text.splitlines()
    if len(lines) < 3 or lines[0].strip() != "---":
        return [], lines

    end_idx = None
    for i in range(1, len(lines)):
        if lines[i].strip() == "---":
            end_idx = i
            break

    if end_idx is None:
        return [], lines

    fm_lines = lines[1:end_idx]
    body_lines = lines[end_idx + 1 :]
    return fm_lines, body_lines


def _extract_fm_scalar(fm_lines: List[str], key: str) -> str:
    key_prefix = f"{key}:"
    for line in fm_lines:
        stripped = line.lstrip()
        if stripped.startswith(key_prefix):
            try:
                _, raw_val = stripped.split(":", 1)
            except ValueError:
                return ""
            return _strip_yaml_value(raw_val.strip())
    return ""


def _yaml_quote(value: str) -> str:
    escaped = value.replace('"', '\\"')
    return f'"{escaped}"'


def _set_or_replace_fm_key(lines: List[str], key: str, raw_value: str) -> None:
    key_prefix = f"{key}:"
    for idx, line in enumerate(lines):
        stripped = line.lstrip()
        if stripped.startswith(key_prefix):
            indent_len = len(line) - len(stripped)
            indent = line[:indent_len]
            lines[idx] = f"{indent}{key}: {raw_value}"
            return
    lines.append(f"{key}: {raw_value}")


def _render_fm_block(fm_lines: List[str]) -> str:
    return "---\n" + "\n".join(fm_lines).rstrip() + "\n---\n\n"


def fix_knifes_titles_once(
    root: Path,
    dry_run: bool = False,
) -> None:
    if not root.is_dir():
        print(f"[WARN] KNIFE root neexistuje: {root}")
        return

    for index_path in root.rglob("index.md"):
        try:
            text = index_path.read_text(encoding="utf-8")
        except Exception as exc:
            print(f"[SKIP] Read error {index_path}: {exc}")
            continue

        fm_lines, body_lines = _split_front_matter(text)
        if not fm_lines:
            print(f"[SKIP] No FM: {index_path}")
            continue

        knife_id = _extract_fm_scalar(fm_lines, "id").strip()
        title_val = _extract_fm_scalar(fm_lines, "title").strip()

        if not knife_id or not title_val:
            print(f"[SKIP] Missing id/title: {index_path}")
            continue

        if title_val.startswith(knife_id):
            print(f"[OK] Title already has id: {index_path}")
            continue

        new_title = f"{knife_id} – {title_val}"
        print(f"[FIX] {index_path}")
        print(f"      '{title_val}' → '{new_title}'")

        _set_or_replace_fm_key(fm_lines, "title", _yaml_quote(new_title))

        sidebar_val = _extract_fm_scalar(fm_lines, "sidebar_label").strip()
        if not sidebar_val:
            _set_or_replace_fm_key(
                fm_lines, "sidebar_label", _yaml_quote(new_title)
            )

        if dry_run:
            continue

        new_text = _render_fm_block(fm_lines) + "\n".join(body_lines).lstrip("\n")
        try:
            index_path.write_text(new_text, encoding="utf-8")
        except Exception as exc:
            print(f"[ERROR] Write error {index_path}: {exc}")


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Jednorazový FIX: doplní KNIFE ID do title a sidebar_label."
    )
    parser.add_argument(
        "--root",
        default="content/docs/sk/knifes",
        help="Root priečinok s KNIFE obsahom (default: content/docs/sk/knifes)",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Len vypíše plánované zmeny, bez zápisu súborov.",
    )

    args = parser.parse_args()
    root = Path(args.root)

    fix_knifes_titles_once(root=root, dry_run=args.dry_run)

    print(
        "KNIFE titles fix completed "
        f"{'(dry-run)' if args.dry_run else ''}"
    )


if __name__ == "__main__":
    main()
