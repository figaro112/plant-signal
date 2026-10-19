#!/usr/bin/env python3
"""
base_fm.py

Spoločná infra pre generátory (KNIFE / STHDF / Q12 / ...).
Bez YAML knižníc, všetko cez čistý text.
"""

import datetime
import shutil
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
    if not value:
        return ""
    if (value.startswith("'") and value.endswith("'")) or (
        value.startswith('"') and value.endswith('"')
    ):
        return value[1:-1]
    return value


def parse_simple_yaml(path) -> Dict[str, Any]:
    # Normalize to Path
    if not isinstance(path, Path):
        path = Path(path)
    if not path.is_file():
        raise FileNotFoundError(f"Config YAML not found: {path}")

    cfg: Dict[str, Any] = {}
    current_parent: Optional[str] = None

    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.rstrip("\n")
        stripped = line.strip()

        if not stripped or stripped.startswith("#"):
            continue

        if not line.startswith(" "):
            current_parent = None
            if ":" not in stripped:
                continue
            key, value = stripped.split(":", 1)
            key = key.strip()
            value = value.strip()

            if value == "":
                cfg[key] = {}
                current_parent = key
            else:
                cfg[key] = _strip_yaml_value(value)
        else:
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
    key_prefix = f"{key}:"
    for idx, line in enumerate(lines):
        stripped = line.lstrip()
        if stripped.startswith(key_prefix):
            indent_len = len(line) - len(stripped)
            indent = line[:indent_len]
            lines[idx] = f"{indent}{key}: {raw_value}"
            return
    lines.append(f"{key}: {raw_value}")


def _yaml_quote(value: str) -> str:
    escaped = value.replace('"', '\\"')
    return f'"{escaped}"'



# ------------ Helpers: ID, Title, Author, Placeholders ------------

def extract_h1_from_body(body_text: str) -> Optional[str]:
    """
    Nájde prvý riadok, ktorý vyzerá ako Markdown nadpis (#, ##, ...),
    a vráti jeho text bez hashov. Ak sa nenájde, vráti None.
    """
    for raw in body_text.splitlines():
        line = raw.strip()
        if not line.startswith("#"):
            continue
        # odstráň úvodné # a medzery
        title = line.lstrip("#").strip()
        if title:
            return title
    return None

def _generate_id(instance_name: str, rel_path: Path) -> str:
    rel_no_suffix = rel_path.with_suffix("").as_posix()
    slug = rel_no_suffix.replace("/", "_")
    if instance_name:
        return f"{instance_name}_{slug}"
    return slug


def _generate_title(rel_path: Path) -> str:
    stem = rel_path.stem
    parent_name = rel_path.parent.name

    if stem.lower() == "index":
        base = parent_name or "Index"
    else:
        base = stem

    title = base.replace("_", " ").replace("-", " ")
    return title.strip() or "Untitled"


def _get_author_from_config(config: Dict[str, Any]) -> str:
    defaults = config.get("defaults") or {}
    author = defaults.get("author") or config.get("author") or ""
    return str(author).strip()


def _replace_placeholders(lines: List[str], mapping: Dict[str, str]) -> None:
    if not mapping:
        return

    for idx, line in enumerate(lines):
        new_line = line
        for key, value in mapping.items():
            placeholder = f"{{{{{key}}}}}"
            if placeholder in new_line:
                new_line = new_line.replace(placeholder, value)
        lines[idx] = new_line


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


def _build_placeholder_mapping_from_fm(fm_lines: List[str]) -> Dict[str, str]:
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
    body_h1: Optional[str] = None,
) -> List[str]:
    lines = list(fm_core_lines)

    dao = str(config.get("dao", "")).strip()
    if dao:
        _set_or_replace_fm_key(lines, "dao", _yaml_quote(dao))

    locale = str(config.get("locale", "")).strip()
    if locale:
        _set_or_replace_fm_key(lines, "locale", _yaml_quote(locale))

    # guid
    import uuid
    fm_guid = str(uuid.uuid4())
    _set_or_replace_fm_key(lines, "guid", _yaml_quote(fm_guid))

    now_local = datetime.datetime.now()
    created_ts = now_local.strftime("%Y-%m-%d %H:%M")
    fm_build_ts = datetime.datetime.now(datetime.timezone.utc).isoformat()

    generated_id = explicit_id or _generate_id(instance_name, rel_path)

    rel_str = rel_path.as_posix()
    if rel_str == "index.md" and cli_title:
        # Root index – použijeme CLI title (napr. "7Ds – Platobný portál")
        generated_title = cli_title
    elif body_h1:
        # Bežné stránky – použijeme prvý H1 nadpis z tela
        generated_title = body_h1
    else:
        # Fallback – pôvodné správanie z názvu súboru/cesty
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

    _replace_placeholders(lines, placeholder_mapping)

    has_created_key = any(
        l.lstrip().startswith("created:") for l in lines
    )
    if not has_created_key:
        # Ak created v FM-Core nie je, nastavíme ho na aktuálny čas
        _set_or_replace_fm_key(lines, "created", _yaml_quote(created_ts))
    else:
        # Ak created už existuje, pri generovaní doplníme/aktualizujeme modified
        _set_or_replace_fm_key(lines, "modified", _yaml_quote(created_ts))

    return lines


def render_fm_block(fm_lines: List[str]) -> str:
    return "\n".join(fm_lines).rstrip() + "\n\n"


def should_inject_header(body_text: str) -> bool:
    return "<!-- USER-HEADER:BEGIN -->" not in body_text


def process_template_tree(
    src_root,
    dst_root: Path,
    fm_core_lines: List[str],
    config: Dict[str, Any],
    instance_name: str,
    template_header_path,
    explicit_id: Optional[str] = None,
    cli_title: Optional[str] = None,
    exists_mode: str = "skip",
    debug: bool = False,
    dry_run: bool = False,
) -> None:
    if src_root is None:
        debug_print(debug, "Skip (no templates root configured).")
        return
    src_root = Path(src_root)
    if not src_root.is_dir():
        debug_print(debug, f"Skip (missing templates root): {src_root}")
        return

    header_text = ""
    if template_header_path is not None:
        try:
            header_text = load_text(Path(template_header_path), optional=True)
        except FileNotFoundError:
            header_text = ""

    for src_path in src_root.rglob("*"):
        if src_path.is_dir():
            continue

        rel = src_path.relative_to(src_root)
        dst_path = dst_root / rel

        if src_path.suffix == ".md":
            if dst_path.exists():
                if exists_mode in ("skip", "merge"):
                    debug_print(debug, f"exists → skip: {dst_path}")
                    continue
                if exists_mode == "error":
                    raise SystemExit(f"Target already exists (exists=error): {dst_path}")

            debug_print(debug, f"create: {dst_path}")
            body = load_text(src_path)

            # Z tela si vezmeme prvý H1 nadpis (ak existuje)
            body_h1 = extract_h1_from_body(body)

            fm_lines = build_fm_lines_for_file(
                fm_core_lines=fm_core_lines,
                config=config,
                instance_name=instance_name,
                rel_path=rel,
                explicit_id=explicit_id,
                cli_title=cli_title,
                body_h1=body_h1,
            )

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

            dst_dir = dst_path.parent
            ensure_dir(dst_dir, debug=debug, dry_run=dry_run)

            if not dry_run:
                dst_path.write_text("".join(parts), encoding="utf-8")
        else:
            if dst_path.exists():
                if exists_mode in ("skip", "merge"):
                    debug_print(debug, f"exists (non-md) → skip: {dst_path}")
                    continue
                if exists_mode == "error":
                    raise SystemExit(f"Target already exists (exists=error): {dst_path}")
            dst_dir = dst_path.parent
            ensure_dir(dst_dir, debug=debug, dry_run=dry_run)
            if not dry_run:
                shutil.copy2(src_path, dst_path)
                debug_print(debug, f"copy (non-md): {src_path} → {dst_path}")