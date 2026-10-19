#!/usr/bin/env sh
# Vytvorí novú 7Ds inštanciu pre projekt

set -e

python3 core/scripts/tools/new_item_instance.py \
  --type 7ds \
  --config config/7ds/7ds_config.yml \
  --id 01-7ds_PlatobnyPortal \
  --name "01-7ds_PlatobnyPortal" \
  --title "01-7Ds – Platobný portál" \
  --exists replace