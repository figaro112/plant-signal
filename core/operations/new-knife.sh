#!/usr/bin/env sh
# Vytvorí novú KNIFE inštanciu – test

set -e

python3 core/scripts/tools/new_item_instance.py \
  --type knife \
  --config config/knifes/knifes_config.yml \
  --id K1000999 \
  --name "K1000999" \
  --title "KNIFE – Test script-created instance" \
  --exists error