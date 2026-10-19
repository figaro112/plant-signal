#!/usr/bin/env python3
"""
new_7ds.py

Špecializovaný generátor pre 7ds inštancie (napr. 7ds-2025_ST_001).
Volá ho new_item_instance.py po vyhodnotení typu "7ds".

Zodpovednosť:
- Vytvoriť cieľový priečinok pre inštanciu (pod content_dir).
- Prejsť celý strom šablón v core/templates/content/7ds/body (alebo v ceste z configu).
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


def _safe_name(raw_name: str, fallback: str = "7ds_instance") -> str:
    """
    Vytvorí bezpečný názov priečinka zo zadaného mena.
    Povolené znaky: A-Z, a-z, 0-9, -, _
    """
    raw_name = raw_name or fallback
    safe = re.sub(r"[^A-Za-z0-9_-]+", "-", raw_name).strip("-")
    return safe or fallback


def _resolve_body_root(config: Dict[str, Any]) -> Path:
    """
    Zistí koreňový adresár pre body šablóny 7Ds.

    Preferuje sa hodnota v config/7ds/7ds_config.yml, napr.:
      template_body_root: "core/templates/content/7ds/body"

    Ak tam nie je, fallback je práve táto cesta.
    """
    raw = config.get("template_body_root")
    if raw:
        return Path(raw)
    # Fallback – aktuálna defaultná cesta v projekte
    return Path("core/templates/content/7ds/body")


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

    is_root = (rel_path == Path("index.md"))
    effective_explicit_id = explicit_id if is_root else None
    fm_lines = build_fm_lines_for_file(
        fm_core_lines=fm_core_lines,
        config=config,
        instance_name=instance_name,
        rel_path=rel_path,
        explicit_id=effective_explicit_id,
        cli_title=cli_title,
    )

    # Upravíme title tak, aby obsahoval ID + title (rovnako ako pri KNIFE)
    # 👉 Platí iba pre root `index.md`. Podstránky si nechávajú vlastný title
    # (napr. odvodený z prvého H1 alebo z názvu súboru cez base_fm).
    if is_root:
        combined_title = _build_combined_title(explicit_id, cli_title, instance_name)
        if combined_title:
            _set_or_replace_fm_key(fm_lines, "title", _yaml_quote(combined_title))

    # Pre nested 7ds docs odstránime id z FM, aby sa neopakoval rovnaký id
    if not is_root:
        cleaned_fm_lines: List[str] = []
        for line in fm_lines:
            if not line.lstrip().startswith("id:"):
                cleaned_fm_lines.append(line)
        fm_lines = cleaned_fm_lines

    # Mapovanie placeholderov z FM pre použitie v texte
    fm_mapping = _build_placeholder_mapping_from_fm(fm_lines)

    parts: List[str] = []
    parts.append(render_fm_block(fm_lines))

    # Pre všetky podstránky pridáme komentár s ID 7Ds inštancie
    id_7ds_for_comment = explicit_id or instance_name
    if not is_root and id_7ds_for_comment:
        parts.append(f"<!-- 7DS_INSTANCE_ID: {id_7ds_for_comment} -->\n\n")

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
    Hlavný vstupný bod pre generovanie 7ds inštancie.

    ŠPECIÁLNA verzia pre 7Ds:
      - nepoužíva common_generate_tree,
      - prechádza strom šablóny a pre každý .md súbor volá _process_markdown_file,
      - rešpektuje FM-Core ako SSOT,
      - pre root index.md nastaví title v tvare "ID – Title",
      - pre podstránky necháva title odvodený z H1 / názvu súboru (cez base_fm).

    Očakávané položky v ctx (pripravené new_item_instance.py):
      - config: načítaný YAML config/7ds/7ds_config.yml
      - content_dir: Path – koreň pre zápis 7Ds inštancií (content/docs/sk/7ds)
      - instance_name: napr. "7ds_PlatobnyPortal"
      - explicit_id: napr. "7ds_PlatobnyPortal" (môže byť rovnaké ako instance_name)
      - cli_title: ľudský title (napr. "7Ds – Platobný portál")
      - fm_core_lines: List[str] – obsah FM-Core template
      - template_header_path: voliteľná cesta na header template
      - exists_mode: "skip" | "error" | "replace"
      - debug: bool
      - dry_run: bool
    """
    config: Dict[str, Any] = ctx["config"]
    content_dir: Path = ctx["content_dir"]
    instance_name: str = ctx["instance_name"]

    explicit_id: Optional[str] = ctx.get("explicit_id")
    cli_title: Optional[str] = ctx.get("cli_title")
    fm_core_lines: List[str] = ctx["fm_core_lines"]
    template_header_path: Optional[str] = ctx.get("template_header_path")

    exists_mode: str = ctx.get("exists_mode", "error")
    debug: bool = ctx.get("debug", False)
    dry_run: bool = ctx.get("dry_run", False)

    # Koreň šablóny pre 7Ds (z configu alebo default)
    template_root = _resolve_body_root(config)

    # Cieľový koreň jedného 7Ds zápisu
    output_root = content_dir / instance_name

    debug_print(debug, f"[7ds] template_root={template_root}")
    debug_print(debug, f"[7ds] output_root={output_root}")

    # Konflikt cieľového priečinka podľa režimu exists_mode
    if output_root.exists():
        if exists_mode == "error":
            raise SystemExit(f"[7ds] Cieľový priečinok už existuje: {output_root}")
        if exists_mode == "skip":
            debug_print(debug, f"[7ds] Exists + skip → nič nerobím ({output_root})")
            return
        if exists_mode == "replace":
            shutil.rmtree(output_root)

    if dry_run:
        print(f"[DRY-RUN][7ds] Vytvoril by som strom pod {output_root}")
        return

    # Reálne kopírovanie stromu z template_root do output_root
    for src_path in template_root.rglob("*"):
        rel_path = src_path.relative_to(template_root)
        dest_path = output_root / rel_path

        if src_path.is_dir():
            ensure_dir(dest_path, debug=debug, dry_run=dry_run)
            continue

        if src_path.suffix.lower() == ".md":
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
        else:
            # Nekopírujeme nič v DRY režime
            if not dry_run:
                ensure_dir(dest_path.parent, debug=debug, dry_run=dry_run)
                shutil.copy2(src_path, dest_path)

    print(f"7ds instance generated at: {output_root}")