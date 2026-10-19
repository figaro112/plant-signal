#!/usr/bin/env python3
"""new_7ds.py

Generátor pre 7Ds inštancie.

Cieľ:
- správa sa rovnako ako STHDF generátor,
- použije 7Ds template štruktúru z `core/templates/content/7ds/body`,
- vygeneruje celý strom do `content_dir / instance_name`,
- na root `index.md` doplní platný Front Matter z FM-Core (s ID/TITLE),
- ostatné .md súbory len skopíruje bezo zmeny (FM riešime neskôr),
- FM-Core je SSOT: delimitery `---` nechávame tak, ako sú v template.

Očakávaný `ctx` z `new_item_instance.py` obsahuje:
  - content_dir: Path (koreňová cieľová zložka pre DAO 7ds, napr. content/docs/sk/7ds)
  - instance_name: str (napr. "7ds_PlatobnyPortal")
  - cli_title: str (titulok z CLI)
  - fm_core_lines: list[str] (FM-Core template s `---` delimitermi)
  - explicit_id: str | None (ID z CLI, ak je)
  - exists_mode: str (error/skip/replace)
  - debug: bool
  - dry_run: bool
"""

from __future__ import annotations

from pathlib import Path
from typing import Any, Dict, Iterable, List

from base_fm import debug_print
from helpers import template_engine as te


def _ensure_dir(path: Path) -> None:
    path.mkdir(parents=True, exist_ok=True)


def _build_fm_block(
    fm_core_lines: Iterable[str], *, title: str, explicit_id: str | None
) -> str:
    """Postaví FM blok pre root 7Ds index na základe FM-Core.

    Princípy:
    - FM-Core je SSOT vrátane `---` delimitrov,
    - nahrádzame iba placeholdery `{{TITLE}}` a `{{ID}}` (ak je explicitné ID),
    - ostatné placeholdery (GUID, CREATED, AUTHOR, DAO, ...) nechávame na orchestrátor,
    - vraciame jeden kompaktný textový blok ukončený \n.
    """

    processed: List[str] = []
    for raw in fm_core_lines:
        line = raw.rstrip("\n")
        line = line.replace("{{TITLE}}", title)
        if explicit_id:
            line = line.replace("{{ID}}", explicit_id)
        processed.append(line)

    # ensure leading/trailing FM delimiters
    first_idx = next((i for i, l in enumerate(processed) if l.strip()), None)
    if first_idx is not None and not processed[first_idx].strip().startswith("---"):
        processed.insert(0, "---")

    last_idx = next((i for i in range(len(processed) - 1, -1, -1) if processed[i].strip()), None)
    if last_idx is not None and not processed[last_idx].strip().startswith("---"):
        processed.append("---")

    fm_text = "\n".join(processed)
    if not fm_text.endswith("\n"):
        fm_text += "\n"
    return fm_text


def _process_md(content: str, path: Path, ctx: Dict[str, Any]) -> str:
    """Markdown processor pre 7Ds template strom.

    - pre root `index.md` pridá vygenerovaný FM blok (z FM-Core) + pôvodný obsah,
    - ostatné súbory vracia bezo zmeny (FM v nich budeme riešiť neskôr).
    """

    output_root = Path(ctx["output_root"]).resolve()
    path_resolved = path.resolve()

    try:
        rel = path_resolved.relative_to(output_root)
    except ValueError:
        # Nie je pod output_root → neriešime (defenzívne, nemalo by nastať)
        return content

    # Root index.md novej 7Ds inštancie
    if rel.parts == ("index.md",):
        fm_block: str = ctx["fm_block"]

        # Necháme obsah z template (môže obsahovať nadpis, navigáciu...).
        # Docusaurus berie ako FM prvý `---` blok v súbore, t.j. náš FM-Core.
        body = content.lstrip("\n")
        return fm_block + "\n" + body

    # Všetko ostatné zatiaľ nepretvárame.
    return content


def generate(ctx: Dict[str, Any]) -> None:
    """Hlavný vstup pre generovanie 7Ds inštancie.

    Používa `template_engine.copy_template_tree` rovnako ako STHDF generátor.
    """

    content_dir: Path = ctx["content_dir"]
    instance_name: str = ctx["instance_name"]
    cli_title: str = ctx["cli_title"]
    fm_core_lines: List[str] = list(ctx["fm_core_lines"])
    explicit_id = ctx.get("explicit_id")
    exists_mode: str = ctx["exists_mode"]
    debug: bool = ctx["debug"]
    dry: bool = ctx["dry_run"]

    # Konzistentný titulok ako pri KNIFE/STHDF
    if explicit_id:
        full_title = f"{explicit_id} – {cli_title}"
    else:
        full_title = cli_title

    target_root = content_dir / instance_name
    template_root = Path("core/templates/content/7ds/body")

    debug_print(debug, f"[7DS] template_root={template_root}")
    debug_print(debug, f"[7DS] target_root={target_root}")

    if target_root.exists():
        if exists_mode == "error":
            raise SystemExit(f"[7DS] Cieľový priečinok už existuje: {target_root}")
        if exists_mode == "skip":
            debug_print(debug, f"[7DS] Exists + skip → nič nerobím ({target_root})")
            return
        if exists_mode == "replace":
            import shutil

            debug_print(debug, f"[7DS] Exists + replace → mazem {target_root}")
            shutil.rmtree(target_root)

    if dry:
        print(f"[DRY-RUN][7DS] Vygeneroval by som strom do {target_root}")
        return

    _ensure_dir(target_root)

    # Priprav FM blok pre root index.md z FM-Core (s delimitermi)
    fm_block = _build_fm_block(
        fm_core_lines,
        title=full_title,
        explicit_id=explicit_id,
    )

    # Kontext pre template_engine
    engine_ctx: Dict[str, Any] = {
        "fm_block": fm_block,
        "full_title": full_title,
        "output_root": target_root.resolve(),
    }

    # Skopíruj celý template strom 7Ds do novej inštancie
    created_paths = te.copy_template_tree(
        template_root=template_root,
        output_root=target_root,
        ctx=engine_ctx,
        markdown_processor=_process_md,
    )

    debug_print(debug, f"[7DS] Vytvorených súborov: {len(created_paths)}")
    print(f"[7DS] 7Ds instance generated under: {target_root}")