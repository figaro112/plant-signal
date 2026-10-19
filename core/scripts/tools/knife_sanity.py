#!/usr/bin/env python3
import argparse
from pathlib import Path
import yaml
import sys

def load_yaml(path):
    try:
        with open(path, "r", encoding="utf-8") as f:
            return yaml.safe_load(f) or {}
    except Exception as e:
        print(f"❌ Error loading YAML: {path} → {e}")
        sys.exit(1)

def check_file(path, desc):
    if not Path(path).exists():
        print(f"❌ Missing {desc}: {path}")
        return False
    print(f"✅ {desc}: {path}")
    return True

def sanity_check(global_cfg, knife_cfg):
    ok = True
    ok &= check_file(global_cfg, "global config")
    ok &= check_file(knife_cfg, "knife config")

    if not ok:
        sys.exit(1)

    g = load_yaml(global_cfg)
    k = load_yaml(knife_cfg)

    for key in ["author", "default_locale"]:
        if key not in g:
            print(f"⚠️ Missing key '{key}' in global.yml")

    for key in ["template_fm", "template_header", "template_body", "content_dir"]:
        if key not in k:
            print(f"⚠️ Missing key '{key}' in knife_config.yml")

    for path in [k.get("template_fm"), k.get("template_header"), k.get("template_body")]:
        if path and not Path(path).exists():
            print(f"❌ Template not found: {path}")
            ok = False

    if not ok:
        print("💥 Sanity check failed.")
        sys.exit(1)

    print("✅ Sanity check passed – all essential files exist and configs look valid.")

def main():
    parser = argparse.ArgumentParser(description="Sanity check for KNIFE environment")
    parser.add_argument("--config-global", required=True)
    parser.add_argument("--config-knife", required=True)
    args = parser.parse_args()
    sanity_check(args.config_global, args.config_knife)

if __name__ == "__main__":
    main()