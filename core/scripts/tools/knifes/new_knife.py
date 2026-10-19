#!/usr/bin/env python3
"""
new_sthdf.py

Špecializovaný generátor pre STHDF inštancie (napr. 2025_ST_001).
Volá ho new_item_instance.py po vyhodnotení typu "sthdf".

Zodpovednosť:
- Vytvoriť cieľový priečinok pre inštanciu (pod content_dir).
- Prejsť celý strom šablón v core/templates/content/sthdf/body (alebo v ceste z configu).
- Pre každý .md súbor:
  - vygenerovať Front Matter na základe FM-Core + configu + ID + title
  - nahradiť placeholdery z FM-Core v tele šablóny
  - podľa potreby vložiť header template (pre index)
- Ostatné súbory iba skopírovať (obrázky, atď.).
"""

import re
import shutil
from pathlib import Path
from typing import Dict, Any, Optional, List

from base_fm import (
    debug_print,
    load_text,
    ensure_dir,
    build_fm_lines_for_file,
    render_fm_block,
    _build_placeholder_mapping_from_fm,
    should_inject_header,
    _set_or_replace_fm_key,
    _yaml_quote,
    _replace_placeholders,
)


def _safe_name(raw_name: str, fallback: str = "sthdf_instance") -> str:
    """
    Vytvorí bezpečný názov priečinka zo zadaného mena.
    Povolené znaky: A-Z, a-z, 0-9, -, _
    """
    raw_name = raw_name or fallback
    safe = re.sub(r"[^A-Za-z0-9_-]+", "-", raw_name).strip("-")
    return safe or fallback


def _resolve_body_root(config: Dict[str, Any]) -> Path:
    """
    Zistí koreňový adresár pre body šablóny STHDF.

    Preferuje sa hodnota v config/sthdf/sthdf_config.yml, napr.:
      template_body_root: "core/templates/content/sthdf/body"

    Ak tam nie je, fallback je práve táto cesta.
    """
    raw = config.get("template_body_root")
    if raw:
        return Path(raw)
    # Fallback – aktuálna defaultná cesta v projekte
    return Path("core/templates/content/sthdf/body")


def _build_combined_title(explicit_id: Optional[str], cli_title: Optional[str], instance_name: str) -> Optional[str]:
    """
    Vytvorí kombinovaný title podľa konvencie:
      ID – Title
    """
    base_title = cli_title or instance_name or explicit_id
    if not base_title:
        return None

    if explicit_id:
        return f"{explicit_id} – {base_title}"
    return base_title


def _process_markdown_file(
    src_path: Path,
    dest_path: Path,
    rel_path: Path,
    fm_core_lines: List[str],
    config: Dict[str, Any],
    instance_name: str,
    explicit_id: Optional[str],
    cli_title: Optional[str],
    template_header_path: Optional[str],
    debug: bool,
    dry_run: bool,
) -> None:
    """
    Spracuje jeden .md súbor šablóny:
      - vygeneruje FM
      - vykoná náhradu placeholderov
      - podľa potreby vloží header template
      - výsledok uloží do dest_path
    """
    body = load_text(src_path)

    # Vygenerovanie FM na základe FM-Core + configu
    fm_lines = build_fm_lines_for_file(
        fm_core_lines=fm_core_lines,
        config=config,
        instance_name=instance_name,
        rel_path=rel_path,
        explicit_id=explicit_id,
        cli_title=cli_title,
    )

    # Upravíme title tak, aby obsahoval ID + title (rovnako ako pri KNIFE)
    combined_title = _build_combined_title(explicit_id, cli_title, instance_name)
    if combined_title:
        _set_or_replace_fm_key(fm_lines, "title", _yaml_quote(combined_title))

    # Mapovanie placeholderov z FM pre použitie v texte
    fm_mapping = _build_placeholder_mapping_from_fm(fm_lines)

    parts: List[str] = []
    parts.append(render_fm_block(fm_lines))

    # Zistí, či telo obsahuje marker na vloženie header template
    inject_header = should_inject_header(body)

    # Header template použijeme len pre hlavný index (rel_path == "index.md")
    processed_header = ""
    if inject_header and template_header_path and rel_path == Path("index.md"):
        try:
            header_text = load_text(Path(template_header_path), optional=True)
        except FileNotFoundError:
            header_text = ""

        if header_text:
            header_lines = header_text.splitlines()
            _replace_placeholders(header_lines, fm_mapping)
            processed_header = "\n".join(header_lines).strip()
            if processed_header:
                parts.append(processed_header + "\n\n")

    # Spracovanie tela – náhrada placeholderov
    body_lines = body.splitlines()
    _replace_placeholders(body_lines, fm_mapping)
    processed_body = "\n".join(body_lines).strip()
    parts.append(processed_body + "\n")

    if not dry_run:
        ensure_dir(dest_path.parent, debug=debug, dry_run=dry_run)
        dest_path.write_text("".join(parts), encoding="utf-8")


def generate(ctx: Dict[str, Any]) -> None:
    """
    Hlavný vstupný bod pre generovanie STHDF inštancie.

    Očakávané položky v ctx:
      - config: načítaný YAML config/sthdf/sthdf_config.yml
      - content_dir: Path – koreň pre zápis STHDF inštancií (content/docs/sk/sthdf)
      - instance_name: napr. "2025_ST_001"
      - explicit_id: napr. "2025_ST_001" (môže byť rovnaké ako instance_name)
      - cli_title: ľudský title (napr. "Môj prvý STHDF študent")
      - fm_core_lines: List[str] – obsah FM-Core template
      - template_header_path: voliteľná cesta na header template
      - exists_mode: "skip" | "error" | "replace" | "merge"
      - debug: bool
      - dry_run: bool
      - raw_name: voliteľné surové meno (napr. z CLI)
    """
    config: Dict[str, Any] = ctx["config"]
    content_dir: Path = ctx["content_dir"]
    instance_name: str = ctx["instance_name"]
    explicit_id: Optional[str] = ctx.get("explicit_id")
    cli_title: Optional[str] = ctx.get("cli_title")
    fm_core_lines: List[str] = ctx["fm_core_lines"]
    template_header_path: Optional[str] = ctx.get("template_header_path")
    exists_mode: str = ctx.get("exists_mode", "skip")
    debug: bool = ctx.get("debug", False)
    dry_run: bool = ctx.get("dry_run", False)
    raw_name: Optional[str] = ctx.get("raw_name")

    # Názvy a cesty
    base_name = explicit_id or raw_name or instance_name or "sthdf_instance"
    folder_name = _safe_name(base_name, fallback="sthdf_instance")
    target_root = content_dir / folder_name

    debug_print(debug, f"[STHDF] instance_name={instance_name}, explicit_id={explicit_id}")
    debug_print(debug, f"[STHDF] target_root={target_root}")

    # Riešenie existujúceho priečinka
    target_index = target_root / "index.md"
    if target_index.exists():
        if exists_mode in ("skip", "merge"):
            debug_print(debug, f"[STHDF] exists → skip/merge: {target_index}")
            print(
                f"STHDF instance already exists at: {target_root} (exists={exists_mode})"
            )
            return
        if exists_mode == "error":
            raise SystemExit(
                f"STHDF instance already exists at: {target_root} (exists=error)"
            )
        if exists_mode == "replace":
            if not dry_run:
                if target_root.exists() and target_root.is_dir():
                    shutil.rmtree(target_root)
                ensure_dir(target_root, debug=debug, dry_run=dry_run)

    # Zistíme koreň šablóny pre STHDF
    body_root = _resolve_body_root(config)
    if not body_root.exists() or not body_root.is_dir():
        raise FileNotFoundError(
            f"STHDF template body root not found or not a directory: {body_root}"
        )

    debug_print(debug, f"[STHDF] Using body_root={body_root}")

    # Prejdeme celý strom šablón
    for src_path in body_root.rglob("*"):
        if src_path.is_dir():
            continue

        rel_path = src_path.relative_to(body_root)
        dest_path = target_root / rel_path

        # Nemarkdownové súbory len skopírujeme
        if src_path.suffix.lower() != ".md":
            if not dry_run:
                ensure_dir(dest_path.parent, debug=debug, dry_run=dry_run)
                shutil.copy2(src_path, dest_path)
            debug_print(debug, f"[STHDF] copied asset: {rel_path}")
            continue

        # Markdown – spracujeme ako šablónu s FM
        debug_print(debug, f"[STHDF] rendering markdown: {rel_path}")
        _process_markdown_file(
            src_path=src_path,
            dest_path=dest_path,
            rel_path=rel_path,
            fm_core_lines=fm_core_lines,
            config=config,
            instance_name=instance_name,
            explicit_id=explicit_id,
            cli_title=cli_title,
            template_header_path=template_header_path,
            debug=debug,
            dry_run=dry_run,
        )

    print(
        f"STHDF instance generated at: {target_root} "
        f"{'(dry-run)' if dry_run else ''}"
    )