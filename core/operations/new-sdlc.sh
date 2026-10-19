#!/usr/bin/env sh
# Vytvorí novú SDLC inštanciu pre projekt

set -e

python3 core/scripts/tools/new_item_instance.py \
  --type sdlc \
  --config config/sdlc/sdlc_config.yml \
  --id sdlc_PlatobnyPortal \
  --name "sdlc_PlatobnyPortal" \
  --title "SDLC – Platobný portál (script)" \
  --exists replace