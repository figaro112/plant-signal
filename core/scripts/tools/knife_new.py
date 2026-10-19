#!/usr/bin/env python3
import argparse
from pathlib import Path
from datetime import datetime
import uuid
import yaml
import sys


# --- Ensure project root is in sys.path ---
import os
from pathlib import Path
import sys

# try relative (for IDE runs)
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../../../..')))

# ensure also current working directory (for makefile runs)
if str(Path.cwd()) not in sys.path:
    sys.path.insert(0, str(Path.cwd()))

from core.scripts.tools.knife_sanity import sanity_check
 
def load_yaml(path: Path) -> dict:
    if not path.exists():
        return {}
    with path.open("r", encoding="utf-8") as f:
        return yaml.safe_load(f) or {}


def fill(text: str, ctx: dict) -> str:
    for k, v in ctx.items():
        text = text.replace("{{" + k + "}}", v)
    return text


def main():
    parser = argparse.ArgumentParser(description="KNIFE generator (FM + user header + body)")
    parser.add_argument("--id", required=True)
    parser.add_argument("--name", required=True)
    parser.add_argument("--title", required=False, default="")
    parser.add_argument("--locale", required=False, default="")
    parser.add_argument("--outroot", required=False)
    # allow override, but we will usually load from config
    parser.add_argument("--config-global", default="config/global.yml")
    parser.add_argument("--config-knife", default="config/knifes/knife_config.yml")
    parser.add_argument("--dry", action="store_true")
    parser.add_argument("--force", action="store_true")
    args = parser.parse_args()

    # sanity check environment before generating
    sanity_check(args.config_global, args.config_knife)

    # 1) load configs
    global_cfg = load_yaml(Path(args.config_global))
    knife_cfg = load_yaml(Path(args.config_knife))

    # 2) resolve paths from config
    template_fm = Path(knife_cfg.get("template_fm", "core/templates/system/FM-Core.md"))
    template_header = Path(knife_cfg.get("template_header", "core/templates/content/knifes/knife-user-header.md"))
    template_body = Path(knife_cfg.get("template_body", "core/templates/content/knifes/knife-body-template.md"))
    outroot = Path(args.outroot or knife_cfg.get("content_dir", "content/docs/sk/knifes"))

    # 3) read templates
    fm_core = template_fm.read_text(encoding="utf-8")
    user_header = template_header.read_text(encoding="utf-8")
    body = template_body.read_text(encoding="utf-8")
    nav_path = Path("core/templates/content/knifes/knife-nav.md")
    if nav_path.exists():
        nav = nav_path.read_text(encoding="utf-8")
    else:
        nav = ""

    # 4) context
    now = datetime.now().strftime("%Y-%m-%d")
    guid = str(uuid.uuid4())
    title = args.title or args.name
    locale = args.locale or knife_cfg.get("locale") or global_cfg.get("default_locale", "sk")

    ctx = {
        "ID": args.id,
        "NAME": args.name,
        "TITLE": title,
        "GUID": guid,
        "CREATED": now,
        "LOCALE": locale,
        "AUTHOR": global_cfg.get("author", "Unknown"),
        "LICENSE": global_cfg.get("license", "CC-BY-NC-SA-4.0"),
        "RIGHTS_HOLDER_SYSTEM": global_cfg.get("rights_holder_system", ""),
        "ORIGIN_SYSTEM": global_cfg.get("default_origin_system", "mix"),
    }

    # 5) compose
    fm_part = fill(fm_core, ctx).strip()
    header_part = fill(user_header, ctx).strip()
    nav = fill(nav, ctx).strip()
    body_part = fill(body, ctx).strip()
    final_doc = f"{fm_part}\n{header_part}\n{nav}\n{body_part}\n"

    # 6) output path
    out_dir = outroot / f"{args.id}-{args.name}"
    out_file = out_dir / "index.md"

    if out_file.exists() and not args.force and not args.dry:
        print(f"❗ {out_file} already exists. Use --force.", file=sys.stderr)
        sys.exit(1)

    if args.dry:
        print(final_doc)
        return

    out_dir.mkdir(parents=True, exist_ok=True)
    out_file.write_text(final_doc, encoding="utf-8")
    print(f"✅ KNIFE created: {out_file}")


if __name__ == "__main__":
    main()