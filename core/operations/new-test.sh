#!/bin/bash
set -e

# presun na root projektu – funkčné vždy
cd "$(dirname "$0")/../.."

python3 core/scripts/tools/new_item_instance.py \
  --type 7ds \
  --config config/7ds/7ds_config.yml \
  --id 7ds_PlatobnyPortal \
  --name "7ds_PlatobnyPortal" \
  --title "7Ds – Platobný portál" \
  --exists replace