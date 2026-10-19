#!/usr/bin/env sh
# Vytvorí nového STHDF študenta – test

set -e

python3 core/scripts/tools/new_item_instance.py \
  --type sthdf \
  --config config/sthdf/sthdf_config.yml \
  --id 2025_ST_010 \
  --name "2025_ST_010" \
  --title "STHDF – Študent 010 (script)" \
  --exists replace