@echo off
REM Vytvori novu 7Ds instanciu pre projekt

python core\scripts\tools\new_item_instance.py ^
  --type 7ds ^
  --config config/7ds/7ds_config.yml ^
  --id 7ds_PlatobnyPortal ^
  --name "7ds_PlatobnyPortal" ^
  --title "7Ds – Platobny portal (script)" ^
  --exists replace

pause