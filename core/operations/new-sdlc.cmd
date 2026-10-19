@echo off
REM Vytvori novu SDLC instanciu pre projekt

python core\scripts\tools\new_item_instance.py ^
  --type sdlc ^
  --config config/sdlc/sdlc_config.yml ^
  --id sdlc_PlatobnyPortal ^
  --name "sdlc_PlatobnyPortal" ^
  --title "SDLC – Platobny portal (script)" ^
  --exists replace

pause