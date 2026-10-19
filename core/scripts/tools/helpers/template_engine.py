
"""Template engine helpers for KNIFE/STHDF generators.

Tento modul má jednu hlavnú úlohu:

- rekurzívne skopírovať obsah šablónového adresára (template_root)
  do cieľového adresára inštancie (output_root),
- pri kopírovaní poskytnúť háčik (callback) na úpravu Markdown súborov,
  napríklad na doplnenie Front Matter, USER-HEADER a navigácie.

Zámer:
- `template_engine` NERIADI štruktúru (nevie nič o "students"/"projects"),
  len ju verne kopíruje.
- Všetka logika pre jednotlivé typy (knifes, sthdf, q12, ...) je
  v samostatných skriptoch (napr. `new_knife.py`, `new_sthdf.py`),
  ktoré tento modul používajú.

Použitie v typovom generátore (príklad):

```python
from pathlib import Path
from core.scripts.tools.helpers import template_engine as te

def generate(context: dict) -> Path:
    template_root = Path("core/templates/content/sthdf")
    output_root = Path(context["target_dir"])  # napr. content/docs/sk/sthdf/2025_ST_001

    def process_md(content: str, path: Path, ctx: dict) -> str:
        # 1) doplniť FM blok, ak chýba
        # 2) doplniť USER-HEADER a NAV bloky
        fm_block = ctx.get("fm_block", "")
        user_header = ctx.get("user_header", "")
        nav_block = ctx.get("nav_block", "")
        text = content
        if fm_block:
            text = te.inject_front_matter_block(text, fm_block)
        if user_header:
            text = te.replace_block(text, "<!-- USER-HEADER:BEGIN -->", "<!-- USER-HEADER:END -->", user_header)
        if nav_block:
            text = te.replace_block(text, "<!-- NAV:BEGIN -->", "<!-- NAV:END -->", nav_block)
        return text

    created_paths = te.copy_template_tree(
        template_root=template_root,
        output_root=output_root,
        ctx=context,
        markdown_processor=process_md,
    )
    return output_root
```

Tento modul je zámerne jednoduchý a generický: rieši len kopírovanie
a manipuláciu s textom, nevie nič o konkrétnych DAO/ID.
"""

from __future__ import annotations

import shutil
from pathlib import Path
from typing import Any, Callable, Dict, Iterable, List, Optional

# Typ alias pre callback, ktorý upravuje obsah Markdown súboru
MarkdownProcessor = Callable[[str, Path, Dict[str, Any]], str]


# ---------------------------------------------------------------------------
# ZÁKLADNÁ REKURZIA: KOPÍROVANIE ŠABLÓNY DO INŠTANCIE
# ---------------------------------------------------------------------------

def copy_template_tree(
    template_root: Path | str,
    output_root: Path | str,
    ctx: Optional[Dict[str, Any]] = None,
    markdown_processor: Optional[MarkdownProcessor] = None,
    dry_run: bool = False,
) -> List[Path]:
    """Rekurzívne skopíruje celý obsah z `template_root` do `output_root`.

    - zachová adresárovú štruktúru,
    - pri .md súboroch voliteľne zavolá `markdown_processor(content, dst_path, ctx)`,
    - vráti zoznam všetkých Markdown súborov, ktoré vytvorila.

    Funkcia je úmyselne "hlúpa" – nič nepredpokladá o tom,
    čo je vo vnútri šablóny. O tom rozhoduje volajúci skript.
    """

    ctx = ctx or {}
    src_root = Path(template_root).resolve()
    dst_root = Path(output_root).resolve()

    if not src_root.exists():
        raise FileNotFoundError(f"Template root does not exist: {src_root}")

    created_markdown: List[Path] = []

    for src_path in src_root.rglob("*"):
        rel = src_path.relative_to(src_root)
        dst_path = dst_root / rel

        if src_path.is_dir():
            if dry_run:
                continue
            dst_path.mkdir(parents=True, exist_ok=True)
            continue

        # Súbor
        if dry_run:
            # V DRY-RUN režime len evidujeme, čo by vzniklo
            if src_path.suffix.lower() == ".md":
                created_markdown.append(dst_path)
            continue

        dst_path.parent.mkdir(parents=True, exist_ok=True)

        if src_path.suffix.lower() == ".md" and markdown_processor is not None:
            # Markdown: načítať, upraviť, zapísať
            content = src_path.read_text(encoding="utf-8")
            processed = markdown_processor(content, dst_path, ctx)
            dst_path.write_text(processed, encoding="utf-8")
            created_markdown.append(dst_path)
        else:
            # Ostatné súbory – obyčajná kópia
            shutil.copy2(src_path, dst_path)

    return created_markdown


# ---------------------------------------------------------------------------
# POMOCNÉ FUNKCIE PRE FRONT MATTER A BLOKY S MARKERMI
# ---------------------------------------------------------------------------

def has_front_matter(content: str) -> bool:
    """Zistí, či text začína YAML Front Matter blokom (`---` na prvom riadku).

    Nehodnotí korektnosť YAML, len kontroluje prvý riadok.
    """

    stripped = content.lstrip()
    return stripped.startswith("---\n") or stripped.startswith("---\r\n")


def inject_front_matter_block(content: str, fm_block: str) -> str:
    """Doplní alebo nahradí Front Matter blok na začiatku súboru.

    Očakáva, že `fm_block` už obsahuje ohraničenie `---` hore aj dole,
    napríklad:

    ```yaml
    ---
    id: K000123
    title: "K000123 – Môj prvý KNIFE"
    ...
    ---
    ```

    Pravidlá:
    - ak súbor už má FM na začiatku, nahradí sa celý pôvodný blok,
    - ak nemá, FM sa vloží úplne na začiatok.
    """

    fm_block = fm_block.strip() + "\n"  # istota jedného koncového riadku

    if not content:
        return fm_block + "\n"

    text = content

    if has_front_matter(text):
        # Nájsť prvé dva výskyty riadku s `---` (začiatok a koniec FM)
        lines = text.splitlines(keepends=True)
        first_sep_index = None
        second_sep_index = None

        for i, line in enumerate(lines):
            if line.strip() == "---":
                if first_sep_index is None:
                    first_sep_index = i
                else:
                    second_sep_index = i
                    break

        if first_sep_index is not None and second_sep_index is not None:
            before = "".join(lines[:first_sep_index])
            after = "".join(lines[second_sep_index + 1 :])
            # FM blok dáme hneď na začiatok (ignorujeme čokoľvek pred ním)
            return fm_block + "\n" + after.lstrip("\r\n")

    # Ak sme tu, pôvodný FM blok sme nenašli – pridáme nový na začiatok
    return fm_block + "\n" + text.lstrip("\r\n")


def replace_block(
    content: str,
    marker_begin: str,
    marker_end: str,
    new_block: str,
    keep_markers: bool = True,
) -> str:
    """Nahradí časť textu medzi dvoma markermi novým blokom.

    Typické použitie:

    ```md
    <!-- USER-HEADER:BEGIN -->
    (pôvodný obsah hlavičky)
    <!-- USER-HEADER:END -->
    ```

    `replace_block` nájde marker_begin a marker_end, a vloží `new_block`
    medzi ne. Ak markery neexistujú, pridá blok na koniec súboru.

    Parametre:
    - content: pôvodný text
    - marker_begin / marker_end: celé markerové reťazce
    - new_block: nový obsah (bez markerov)
    - keep_markers: ak True, marker_begin a marker_end zostanú v texte
    """

    new_block = new_block.rstrip() + "\n"

    start = content.find(marker_begin)
    end = content.find(marker_end)

    if start != -1 and end != -1 and end >= start:
        before = content[:start]
        after = content[end + len(marker_end) :]

        if keep_markers:
            # marker_begin + nový obsah + marker_end
            block = (
                marker_begin.rstrip()
                + "\n"
                + new_block
                + marker_end.strip()
                + "\n"
            )
        else:
            block = new_block

        # Udržíme jednu prázdnu líniu okolo bloku
        before = before.rstrip("\r\n") + "\n\n"
        after = "\n" + after.lstrip("\r\n")

        return before + block + after

    # Markery neexistujú – pripojíme blok na koniec súboru
    if not content.endswith("\n"):
        content += "\n"
    return content + "\n" + new_block


def inject_token(content: str, token: str, replacement: str) -> str:
    """Jednoduchý textový `replace` helper.

    Použiteľné napr. pre `<!-- FM:INJECT FROM FM-Core.md -->`.
    """

    return content.replace(token, replacement)


# ---------------------------------------------------------------------------
# MALÉ UTILITIES
# ---------------------------------------------------------------------------

def list_markdown_files(root: Path | str) -> Iterable[Path]:
    """Vracia všetky `.md` súbory pod daným rootom.

    Nie je viazaná na šablóny – môže sa použiť aj v auditoch.
    """

    r = Path(root)
    for p in r.rglob("*.md"):
        if p.is_file():
            yield p