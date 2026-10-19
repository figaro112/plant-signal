#!/usr/bin/env sh
# Vytvorí novú Q12 inštanciu

set -e

python3 core/scripts/tools/new_item_instance.py \
  --type q12 \
  --config config/q12/q12_config.yml \
  --id Q12_Sample_001 \
  --name "Q12_Sample_001" \
  --title "Q12 – Sample Question 001 (script)" \
  --exists replace