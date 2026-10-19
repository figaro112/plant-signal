#!/usr/bin/env sh
# Vytvorí novú THESIS inštanciu – zatiaľ len placeholder

set -e

python3 core/scripts/tools/new_item_instance.py \
  --type thesis \
  --config config/thesis/thesis_config.yml \
  --id thesis_Sample_001 \
  --name "thesis_Sample_001" \
  --title "Thesis – Sample 001 (script placeholder)" \
  --exists error