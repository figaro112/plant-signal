#!/usr/bin/env python3
"""
new_item_instance.py

Generický generátor inštancií (STHDF / SDLC / Q12 / ...),
postavený na jednoduchom textovom YAML konfiguráku.

⚠️ DOHODA:
- Nepoužívame žiadnu YAML knižnicu (žiadny `pyyaml`).
- Všetko riešime cez čisté Python string operácie.
- Docusaurus si YAML aj tak parsuje, preto musíme generovať validný YAML.

Primárny use-case teraz: STHDF (študentský priestor)

Typický call (z Makefile):

  python3 core/scripts/tools/new_item_instance.py \
    --config config/sthdf/sthdf_config.yml \
    --instance "2025_ST_0001"

Alebo jednoduchšie cez typ:

  python3 core/scripts/tools/new_item_instance.py \
    --type sthdf \
    --instance "2025_ST_0001"

Ak --instance NEzadáš, použije sa default:
  sthdf_instance
"""

import argparse
import datetime
import os
import shutil
import uuid
import re
from pathlib import Path
from typing import Dict, Any, Optional, List


# ------------ Helpers: všeobecné ------------
def debug_print(enabled: bool, msg: str) -> None:
    if enabled:
        print(f"[new_item_instance] {msg}")


def load_text(path: Path, optional: bool = False) -> str:
    if path.is_file():
        return path.read_text(encoding="utf-8")
    if optional:
        return ""
    raise FileNotFoundError(f"Template file not found: {path}")


def ensure_dir(path: Path, debug: bool = False, dry_run: bool = False) -> None:
    if path.is_dir():
        return
    debug_print(debug, f"mkdir -p {path}")
    if not dry_run:
        path.mkdir(parents=True, exist_ok=True)


# ------------ Helpers: jednoduchý YAML config parser ------------


def _strip_yaml_value(value: str) -> str:
    """
    Odstráni okrajové úvodzovky z hodnoty (ak sú).
    Nehráme sa na plnohodnotný YAML typový systém.
    """
    if not value:
        return ""
    if (value.startswith("'") and value.endswith("'")) or (
        value.startswith('"') and value.endswith('"')
    ):
        return value[1:-1]
    return value


def parse_simple_yaml(path: Path) -> Dict[str, Any]:
    """
    Extrémne jednoduchý parser pre YAML-like config.

    Podporuje:
      key: value
      key:
        subkey: value

    Nepodporuje:
      - zoznamy
      - viacúrovňové vnorenia
      - špeciálne typy

    Pre sthdf_config.yml to stačí (dao, content_dir, locale, templates, defaults,...).
    """
    if not path.is_file():
        raise FileNotFoundError(f"Config YAML not found: {path}")

    cfg: Dict[str, Any] = {}
    current_parent: Optional[str] = None

    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.rstrip("\n")
        stripped = line.strip()

        # preskoč prázdne riadky a komentáre
        if not stripped or stripped.startswith("#"):
            continue

        # root-level kľúč (žiadne odsadenie)
        if not line.startswith(" "):
            current_parent = None
            if ":" not in stripped:
                continue
            key, value = stripped.split(":", 1)
            key = key.strip()
            value = value.strip()

            if value == "":
                # začiatok bloku (napr. defaults:, templates:)
                cfg[key] = {}
                current_parent = key
            else:
                cfg[key] = _strip_yaml_value(value)
        else:
            # vnorený kľúč – očakávame, že máme parent dict
            if current_parent is None:
                continue
            inner = stripped
            if ":" not in inner:
                continue
            skey, svalue = inner.split(":", 1)
            skey = skey.strip()
            svalue = svalue.strip()
            subdict = cfg.setdefault(current_parent, {})
            subdict[skey] = _strip_yaml_value(svalue)

    return cfg


# ------------ Helpers: FM-Core spracovanie cez stringy ------------


def parse_fm_core_block(fm_core_path: Path, debug: bool = False) -> List[str]:
    """
    Načíta FM-Core (core/templates/system/FM-Core.md),
    zoberie prvý YAML blok medzi --- ... --- a vráti zoznam riadkov (bez ---).

    ŽIADNE yaml.safe_load – len text.
    """
    raw = load_text(fm_core_path)
    lines = raw.splitlines()
    if len(lines) < 3 or lines[0].strip() != "---":
        debug_print(debug, f"FM-Core nemá YAML blok na začiatku: {fm_core_path}")
        return []

    end_idx = None
    for i in range(1, len(lines)):
        if lines[i].strip() == "---":
            end_idx = i
            break

    if end_idx is None:
        debug_print(debug, f"FM-Core: nenašiel sa koniec YAML bloku v {fm_core_path}")
        return []

    yaml_lines = lines[1:end_idx]
    return yaml_lines


def _set_or_replace_fm_key(lines: List[str], key: str, raw_value: str) -> None:
    """
    Nájde riadok `key: ...` a nahradí ho hodnotou `raw_value`.
    Ak kľúč neexistuje, pridá sa na koniec.

    raw_value musí byť validný YAML fragment za dvojbodkou – string escapujeme vyššie.
    """
    key_prefix = f"{key}:"
    for idx, line in enumerate(lines):
        stripped = line.lstrip()
        if stripped.startswith(key_prefix):
            indent_len = len(line) - len(stripped)
            indent = line[:indent_len]
            lines[idx] = f"{indent}{key}: {raw_value}"
            return
    # ak sa nenašlo, pridáme úplne na koniec
    lines.append(f"{key}: {raw_value}")



def _yaml_quote(value: str) -> str:
    """
    Bezpečné uzavretie stringu do dvojitých úvodzoviek tak,
    aby to Docusaurus/Node YAML parser strávil.
    """
    escaped = value.replace('"', '\\"')
    return f'"{escaped}"'


# ------------ Helpers: ID, Title, Author, Placeholders ------------

def _generate_id(instance_name: str, rel_path: Path) -> str:
    """
    Vygeneruje deterministické ID na základe inštancie a relatívnej cesty súboru.

    Príklady:
      instance_name = "sthdf_2025", rel_path = "students/index.md"
      → "sthdf_2025_students_index"
    """
    rel_no_suffix = rel_path.with_suffix("").as_posix()
    slug = rel_no_suffix.replace("/", "_")
    if instance_name:
        return f"{instance_name}_{slug}"
    return slug


def _generate_title(rel_path: Path) -> str:
    """
    Vygeneruje jednoduchý textový titul na základe názvu súboru / priečinka.

    - ak je názov súboru 'index', použijeme názov nadradeného priečinka
    - inak použijeme stem súboru
    - nahradíme '_' a '-' medzerami (len kozmetika)
    """
    stem = rel_path.stem
    parent_name = rel_path.parent.name

    if stem.lower() == "index":
        base = parent_name or "Index"
    else:
        base = stem

    title = base.replace("_", " ").replace("-", " ")
    return title.strip() or "Untitled"


def _get_author_from_config(config: Dict[str, Any]) -> str:
    """
    Získa autora z configu.

    Preferencia:
      1. config['defaults']['author']
      2. config['author']
    """
    defaults = config.get("defaults") or {}
    author = defaults.get("author") or config.get("author") or ""
    return str(author).strip()



def _replace_placeholders(lines: List[str], mapping: Dict[str, str]) -> None:
    """
    Nahradí fúzaté placeholdery {{KEY}} → value v zozname riadkov.

    Používa sa len na FM-Core časť (nie na telo dokumentu).
    """
    if not mapping:
        return

    for idx, line in enumerate(lines):
        new_line = line
        for key, value in mapping.items():
            placeholder = f"{{{{{key}}}}}"
            if placeholder in new_line:
                new_line = new_line.replace(placeholder, value)
        lines[idx] = new_line


# ------------ Helpers: FM placeholder extraction ----------

def _extract_fm_scalar(fm_lines: List[str], key: str) -> str:
    """
    Získa scalar hodnotu z FM riadkov pre daný kľúč (napr. 'title', 'status').
    Vráti prázdny string, ak sa nenašlo.
    """
    key_prefix = f"{key}:"
    for line in fm_lines:
        stripped = line.lstrip()
        if stripped.startswith(key_prefix):
            # vezmeme časť za dvojbodkou a očistíme ju ako YAML value
            try:
                _, raw_val = stripped.split(":", 1)
            except ValueError:
                return ""
            return _strip_yaml_value(raw_val.strip())
    return ""


def _build_placeholder_mapping_from_fm(fm_lines: List[str]) -> Dict[str, str]:
    """
    Postaví mapovanie placeholderov {{KEY}} → hodnota z FM blokov.

    Tým, že aj prázdne hodnoty mapujeme na prázdny string,
    vieme bezpečne odstrániť všetky {{KEY}} placeholdery z tela MD.
    """
    mapping: Dict[str, str] = {}
    key_pairs = [
        ("id", "ID"),
        ("title", "TITLE"),
        ("guid", "GUID"),
        ("status", "STATUS"),
        ("license", "LICENSE"),
        ("author", "AUTHOR"),
        ("dao", "DAO"),
        ("locale", "LOCALE"),
        ("instance", "INSTANCE"),
        ("created", "CREATED"),
    ]
    for fm_key, ph_key in key_pairs:
        val = _extract_fm_scalar(fm_lines, fm_key)
        mapping[ph_key] = val or ""
    return mapping


def build_fm_lines_for_file(
    fm_core_lines: List[str],
    config: Dict[str, Any],
    instance_name: str,
    rel_path: Path,
    explicit_id: Optional[str] = None,
    cli_title: Optional[str] = None,
) -> List[str]:
    """
    Z FM-Core riadkov spraví konkrétne FM pre daný súbor.

    Meníme len to, čo vieme bezpečne doplniť:
    - dao, locale, instance
    - guid
    - fm_build / created (ak sú použité ako fúzaté placeholdery)
    - fúzaté placeholdery {{ID}}, {{TITLE}}, {{AUTHOR}}, {{INSTANCE}}, {{FM_BUILD}}, {{CREATED}}

    Všetko ostatné nechávame tak, ako je v FM-Core.
    """
    lines = list(fm_core_lines)  # shallow copy

    # dao / locale z configu (ak sú)
    dao = str(config.get("dao", "")).strip()
    if dao:
        _set_or_replace_fm_key(lines, "dao", _yaml_quote(dao))

    locale = str(config.get("locale", "")).strip()
    if locale:
        _set_or_replace_fm_key(lines, "locale", _yaml_quote(locale))


    # guid – unikátny, UUIDv4 (prepíše prázdny placeholder z FM-Core)
    fm_guid = str(uuid.uuid4())
    _set_or_replace_fm_key(lines, "guid", _yaml_quote(fm_guid))

    # Dátumy / časy – pre placeholders
    #  - today_date: len dátum (YYYY-MM-DD)
    #  - created_ts: dátum + čas (YYYY-MM-DD HH:MM)
    now_local = datetime.datetime.now()
    today_date = now_local.date().isoformat()
    created_ts = now_local.strftime("%Y-%m-%d %H:%M")

    # fm_build_ts nechávame v UTC s plným ISO formátom
    fm_build_ts = datetime.datetime.now(datetime.timezone.utc).isoformat()

    # Fúzaté placeholdery {{ID}}, {{TITLE}}, {{AUTHOR}}, {{INSTANCE}}, {{FM_BUILD}}, {{CREATED}}
    # If explicit_id is provided (e.g., from CLI --id), use it; otherwise generate
    generated_id = explicit_id or _generate_id(instance_name, rel_path)

    # Precedence for TITLE:
    # 1. If this is root index.md and CLI title is provided → use cli_title
    # 2. Otherwise, fall back to automatic title from path
    rel_str = rel_path.as_posix()
    if rel_str == "index.md" and cli_title:
        generated_title = cli_title
    else:
        generated_title = _generate_title(rel_path)

    author_value = _get_author_from_config(config)

    placeholder_mapping: Dict[str, str] = {
        "ID": generated_id,
        "TITLE": generated_title,
        "FM_BUILD": fm_build_ts,
        "CREATED": created_ts,
    }

    if instance_name:
        placeholder_mapping["INSTANCE"] = instance_name

    if author_value:
        placeholder_mapping["AUTHOR"] = author_value

    # Najprv nahradíme placeholdery v existujúcich riadkoch
    _replace_placeholders(lines, placeholder_mapping)

    # Potom sa postaráme o created, ak v FM-Core vôbec nebolo definované
    has_created_key = any(
        l.lstrip().startswith("created:") for l in lines
    )
    if not has_created_key:
        _set_or_replace_fm_key(lines, "created", _yaml_quote(created_ts))

    return lines


def render_fm_block(fm_lines: List[str]) -> str:
    """
    Zoznam riadkov → YAML blok s --- na začiatku a konci.
    """
    return "---\n" + "\n".join(fm_lines).rstrip() + "\n---\n\n"


def should_inject_header(body_text: str) -> bool:
    """
    Ak v tele nenájdeme kotvu USER-HEADER, doplníme default header.

    Všetky tvoje typy majú HEADERS aj BODY; tu len rešpektujeme existujúcu kotvu,
    ak ju template používa.
    """
    return "<!-- USER-HEADER:BEGIN -->" not in body_text


def process_template_tree(
    src_root: Optional[Path],
    dst_root: Path,
    fm_core_lines: List[str],
    config: Dict[str, Any],
    instance_name: str,
    template_header_path: Optional[Path],
    explicit_id: Optional[str] = None,
    cli_title: Optional[str] = None,
    exists_mode: str = "skip",
    debug: bool = False,
    dry_run: bool = False,
) -> None:
    """
    Rekurzívne prejde strom template_root a vytvorí mirror
    v dst_root, pričom do každého .md vloží FM-Core + header (ak treba).

    Idempotentné:
    - ak cieľový .md existuje, NESAHÁME naň (ani FM, ani telo).
    """
    if src_root is None:
        debug_print(debug, "Skip (no templates root configured).")
        return
    if not src_root.is_dir():
        debug_print(debug, f"Skip (missing templates root): {src_root}")
        return

    header_text = ""
    if template_header_path is not None:
        try:
            header_text = load_text(template_header_path, optional=True)
        except FileNotFoundError:
            header_text = ""

    for src_path in src_root.rglob("*"):
        if src_path.is_dir():
            continue

        rel = src_path.relative_to(src_root)
        dst_path = dst_root / rel

        if src_path.suffix == ".md":
            # Handle existence according to exists_mode
            if dst_path.exists():
                if exists_mode == "skip" or exists_mode == "merge":
                    debug_print(debug, f"exists → skip: {dst_path}")
                    continue
                if exists_mode == "error":
                    raise SystemExit(f"Target already exists (exists=error): {dst_path}")
                # exists_mode == "replace" → fall through and regenerate content

            debug_print(debug, f"create: {dst_path}")

            # načítaj telo templatu
            body = load_text(src_path)

            content_parts: List[str] = []

            fm_lines = build_fm_lines_for_file(
                fm_core_lines=fm_core_lines,
                config=config,
                instance_name=instance_name,
                rel_path=rel,
                explicit_id=explicit_id,
                cli_title=cli_title,
            )
            content_parts.append(render_fm_block(fm_lines))

            # Mapovanie pre placeholdery v headeri a tele ({{ID}}, {{TITLE}}, {{AUTHOR}}…)
            fm_mapping = _build_placeholder_mapping_from_fm(fm_lines)

            # Zistíme, či potrebujeme injectnúť header ešte pred úpravou textov
            inject_header = should_inject_header(body)

            # Spracuj header (ak sa má injectnúť) cez placeholder mapping
            processed_header = header_text
            if inject_header and header_text:
                header_lines = header_text.splitlines()
                _replace_placeholders(header_lines, fm_mapping)
                processed_header = "\n".join(header_lines)

            # Spracuj telo cez placeholder mapping
            body_lines = body.splitlines()
            _replace_placeholders(body_lines, fm_mapping)
            processed_body = "\n".join(body_lines)

            if inject_header and processed_header:
                content_parts.append(processed_header.strip() + "\n\n")

            content_parts.append(processed_body.strip() + "\n")

            dst_dir = dst_path.parent
            ensure_dir(dst_dir, debug=debug, dry_run=dry_run)

            if not dry_run:
                dst_path.write_text("".join(content_parts), encoding="utf-8")
        else:
            if dst_path.exists():
                if exists_mode == "skip" or exists_mode == "merge":
                    debug_print(debug, f"exists (non-md) → skip: {dst_path}")
                    continue
                if exists_mode == "error":
                    raise SystemExit(f"Target already exists (exists=error): {dst_path}")
                # exists_mode == "replace" → fall through and overwrite via copy2

            dst_dir = dst_path.parent
            ensure_dir(dst_dir, debug=debug, dry_run=dry_run)

            if not dry_run:
                shutil.copy2(src_path, dst_path)
                debug_print(debug, f"copy (non-md): {src_path} → {dst_path}")


# ------------ Main ------------


def main() -> None:
    # Argument parser – jediná centrálna inštancia
    parser = argparse.ArgumentParser(
        description=(
            "Vytvorí novú inštanciu frameworku (napr. STHDF/KNIFE/SDLC/Q12) "
            "podľa YAML configu (bez YAML knižnice)."
        )
    )

    parser.add_argument(
        "--type",
        dest="item_type",
        help=(
            "Typ inštancie (napr. sthdf, sdlc, q12, knifes). "
            "Ak je zadaný, vyberie sa zodpovedajúci default config a prepíše --config."
        ),
    )
    parser.add_argument(
        "--config",
        dest="config_path",
        default="config/sthdf/sthdf_config.yml",
        help="Cesta ku config YAML (default: config/sthdf/sthdf_config.yml)",
    )
    parser.add_argument(
        "--name",
        dest="name",
        default=None,
        help=(
            "Logické meno inštancie (napr. sthdf_2025 alebo KNIFE-User-Guide). "
            "Používa sa v názve priečinka a ako fallback pre title."
        ),
    )
    parser.add_argument(
        "--title",
        dest="title",
        default=None,
        help=(
            "Ľudský názov inštancie (napr. 'STHDF 2025/2026' alebo 'KNIFE User Guide'). "
            "Používa sa v FM.title a sidebar_label."
        ),
    )
    parser.add_argument(
        "--id",
        dest="item_id",
        default=None,
        help=(
            "Explicit ID to inject into Front Matter (použije sa v {{ID}} placeholderi). "
            "Ak nie je zadané, ID sa vygeneruje z instance + relatívnej cesty."
        ),
    )
    parser.add_argument(
        "--output",
        dest="output_dir",
        default=None,
        help=(
            "Cieľový root pre obsah (napr. content/docs/sk/sthdf alebo content/docs/sk/knifes). "
            "Ak je zadaný, prepíše content_dir z configu."
        ),
    )
    parser.add_argument(
        "--instance",
        dest="instance",
        default=None,
        help=(
            "Názov inštancie (napr. sthdf_2025 alebo 2025_ST_0001). "
            "Ak nie je zadaný, použije sa meno z --name alebo fallback 'sthdf_instance'."
        ),
    )
    parser.add_argument(
        "--exists",
        dest="exists_mode",
        choices=["skip", "error", "replace", "merge"],
        default="skip",
        help=(
            "Ako sa správať, ak cieľové súbory/priečinky už existujú: "
            "'skip' (default) = nesiahať na existujúce; "
            "'error' = skončiť s chybou; "
            "'replace' = zmazať cieľový priečinok a znovu vygenerovať; "
            "'merge' = rezervované (aktuálne sa správa ako 'skip')."
        ),
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Len vypíše, čo by sa spravilo (bez zápisu súborov).",
    )
    parser.add_argument(
        "--debug",
        action="store_true",
        help="Detailnejší výpis krokov.",
    )

    args = parser.parse_args()

    # Fallback: ak nebol zadaný --id, skús environment premennú ID (napr. z Makefile: ID=K000100)
    if not args.item_id:
        env_id = os.environ.get("ID")
        if env_id:
            args.item_id = env_id

    # Mapovanie typ → default config
    type_to_config = {
        "sthdf": "config/sthdf/sthdf_config.yml",
        "sdlc": "config/sdlc/sdlc_config.yml",
        "q12": "config/q12/q12_config.yml",
        "knife": "config/knifes/knifes_config.yml",
        "knifes": "config/knifes/knifes_config.yml",
    }

    # Výber config_path podľa --type (ak je) alebo podľa --config
    if args.item_type:
        mapped = type_to_config.get(args.item_type)
        if mapped:
            config_path = Path(mapped)
            debug_print(
                args.debug,
                f"--type={args.item_type} → config={config_path}",
            )
        else:
            debug_print(
                args.debug,
                f"Neznámy --type '{args.item_type}', používam --config {args.config_path}",
            )
            config_path = Path(args.config_path)
    else:
        config_path = Path(args.config_path)

    config = parse_simple_yaml(config_path)

    # Effective type: prefer CLI --type, fallback to config["dao"]
    effective_type = (args.item_type or str(config.get("dao", ""))).lower()

    # Rozhodnutie mena inštancie:
    # 1) ak je zadané --instance, použijeme ho (kvôli spätnej kompatibilite),
    # 2) inak ak je zadané --name, použijeme ho,
    # 3) inak:
    #    - pre KNIFE/KNIFES použijeme 'new_knife'
    #    - pre ostatné typy fallback na 'sthdf_instance'.
    if args.instance:
        instance_name = args.instance
    elif args.name:
        instance_name = args.name
    else:
        if effective_type in ("knife", "knifes"):
            instance_name = "new_knife"
        else:
            instance_name = "sthdf_instance"

    # Pre KNIFE/KNIFES, ak nebol zadaný --name, zosúladíme ho s instance_name,
    # aby sa použil aj pri tvorbe názvu priečinka (safe_name).
    if effective_type in ("knife", "knifes") and not args.name:
        args.name = instance_name

    # Unified CLI title fallback: prefer explicit --title, then --name, then instance_name
    cli_title = args.title or args.name or instance_name

    debug_print(
        args.debug,
        (
            f"Config: {config_path}, dao={config.get('dao')}, "
            f"instance={instance_name}, name={args.name}, title={args.title}"
        ),
    )

    # Output root
    if args.output_dir:
        content_dir = Path(args.output_dir)
    else:
        # Default root podľa typu, ak nie je v configu špecifikovaný content_dir
        default_root = "content/docs/sk/sthdf"
        if effective_type in ("knife", "knifes"):
            default_root = "content/docs/sk/knifes"
        elif effective_type == "q12":
            default_root = "content/docs/sk/q12"
        content_dir = Path(config.get("content_dir", default_root))
    target_root = content_dir / instance_name

    # Špecifické nastavenia pre STHDF / SDLC / Q12 (strom šablón)
    templates_cfg = config.get("templates") or {}
    projects_root_str = templates_cfg.get("projects_root", "")
    students_root_str = templates_cfg.get("students_root", "")
    templates_root_str = templates_cfg.get("root", "") or templates_cfg.get("templates_root", "")

    projects_root: Optional[Path] = Path(projects_root_str) if projects_root_str else None
    students_root: Optional[Path] = Path(students_root_str) if students_root_str else None
    templates_root: Optional[Path] = Path(templates_root_str) if templates_root_str else None

    # FM-Core (spoločný)
    fm_core_path = Path(config.get("template_fm", "core/templates/system/FM-Core.md"))
    fm_core_lines = parse_fm_core_block(fm_core_path, debug=args.debug)

    # default header (fallback)
    template_header_cfg = config.get("template_header")
    template_header_path = (
        Path(template_header_cfg) if template_header_cfg is not None else None
    )

    explicit_id = args.item_id
    exists_mode = args.exists_mode

    # KNIFE / KNIFES: single-item generation (žiadny projects/students strom)
    if effective_type in ("knife", "knifes"):
        raw_name = args.name or instance_name or "knife_item"

        # slug: len [A-Za-z0-9_-], ostatné nahradíme pomlčkou
        safe_name = re.sub(r"[^A-Za-z0-9_-]+", "-", raw_name).strip("-") or "knife_item"

        if explicit_id:
            folder_name = f"{explicit_id}-{safe_name}"
        else:
            folder_name = safe_name

        target_root = content_dir / folder_name

        header_text = ""
        if template_header_path is not None:
            try:
                header_text = load_text(template_header_path, optional=True)
            except FileNotFoundError:
                header_text = ""

        body_template = config.get("template_body")
        if not body_template:
            raise FileNotFoundError(
                "KNIFE config missing 'template_body' path (template_body)."
            )
        body_path = Path(body_template)
        body = load_text(body_path)

        # always generate index.md at target_root
        rel = Path("index.md")
        fm_lines = build_fm_lines_for_file(
            fm_core_lines=fm_core_lines,
            config=config,
            instance_name=instance_name,
            rel_path=rel,
            explicit_id=explicit_id,
            cli_title=cli_title,
        )

        # KNIFE: ak máme CLI title/name, prepíšeme 'title' vo FM.
        # Ak je k dispozícii explicitné ID, spojíme ho s názvom, napr. "K000099 – Moje KNIFE".
        # sidebar_label nechávame na Docusaurus – generátor nezasahuje do Docusaurus‑špecifických polí.
        knife_title = args.title or args.name or instance_name
        if knife_title:
            if explicit_id:
                combined_title = f"{explicit_id} – {knife_title}"
            else:
                combined_title = knife_title
            _set_or_replace_fm_key(fm_lines, "title", _yaml_quote(combined_title))

        # Mapovanie placeholderov z FM pre telo a header
        fm_mapping = _build_placeholder_mapping_from_fm(fm_lines)

        parts: List[str] = []
        parts.append(render_fm_block(fm_lines))

        inject_header = should_inject_header(body)

        processed_header = header_text
        if inject_header and header_text:
            header_lines = header_text.splitlines()
            _replace_placeholders(header_lines, fm_mapping)
            processed_header = "\n".join(header_lines)

        body_lines = body.splitlines()
        _replace_placeholders(body_lines, fm_mapping)
        processed_body = "\n".join(body_lines)

        if inject_header and processed_header:
            parts.append(processed_header.strip() + "\n\n")

        parts.append(processed_body.strip() + "\n")

        index_path = target_root / "index.md"

        if index_path.exists():
            if exists_mode in ("skip", "merge"):
                debug_print(args.debug, f"exists → skip: {index_path}")
                print(
                    f"KNIFE item already exists at: {index_path} (exists={exists_mode})"
                )
                return
            if exists_mode == "error":
                raise SystemExit(
                    f"KNIFE item already exists at: {index_path} (exists=error)"
                )
            if exists_mode == "replace":
                if not args.dry_run:
                    if target_root.exists() and target_root.is_dir():
                        shutil.rmtree(target_root)
                    ensure_dir(target_root, debug=args.debug, dry_run=args.dry_run)

        if not args.dry_run:
            ensure_dir(target_root, debug=args.debug, dry_run=args.dry_run)
            index_path.write_text("".join(parts), encoding="utf-8")

        print(
            f"KNIFE item generated at: {index_path} "
            f"{'(dry-run)' if args.dry_run else ''}"
        )
        return

    # STHDF / SDLC / Q12 vetva – generuje strom z templátov
    # Q12: single-root strom (bez projects/students)
    if effective_type == "q12":
        debug_print(args.debug, f"Q12 target root: {target_root}")
        debug_print(args.debug, f"Q12 templates root: {templates_root}")

        process_template_tree(
            src_root=templates_root,
            dst_root=target_root,
            fm_core_lines=fm_core_lines,
            config=config,
            instance_name=instance_name,
            template_header_path=template_header_path,
            explicit_id=explicit_id,
            cli_title=cli_title,
            exists_mode=exists_mode,
            debug=args.debug,
            dry_run=args.dry_run,
        )

        print(
            f"Q12 instance generated at: {target_root} "
            f"{'(dry-run)' if args.dry_run else ''}"
        )
        return

    # Default: STHDF / SDLC – projects + students
    debug_print(args.debug, f"Target root: {target_root}")
    debug_print(args.debug, f"Projects templates root: {projects_root}")
    debug_print(args.debug, f"Students templates root: {students_root}")

    # Rozlíšenie STHDF stromu pre projekty a študentov cez odlišný CLI title.
    # Ako základ použijeme buď cli_title (ak bol zadaný z CLI),
    # alebo instance_name (napr. STHDF_2025_ST_001).
    base_title = cli_title or instance_name or ""

    projects_cli_title = f"{base_title} – projekty" if base_title else "projekty"
    students_cli_title = f"{base_title} – študenti" if base_title else "študenti"

    projects_dst = target_root / "projects"
    process_template_tree(
        src_root=projects_root,
        dst_root=projects_dst,
        fm_core_lines=fm_core_lines,
        config=config,
        instance_name=instance_name,
        template_header_path=template_header_path,
        explicit_id=explicit_id,
        cli_title=projects_cli_title,
        exists_mode=exists_mode,
        debug=args.debug,
        dry_run=args.dry_run,
    )

    students_dst = target_root / "students"
    process_template_tree(
        src_root=students_root,
        dst_root=students_dst,
        fm_core_lines=fm_core_lines,
        config=config,
        instance_name=instance_name,
        template_header_path=template_header_path,
        explicit_id=explicit_id,
        cli_title=students_cli_title,
        exists_mode=exists_mode,
        debug=args.debug,
        dry_run=args.dry_run,
    )

    print(
        f"STHDF instance generated at: {target_root} "
        f"{'(dry-run)' if args.dry_run else ''}"
    )


if __name__ == "__main__":
    main()