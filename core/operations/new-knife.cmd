@echo off
REM Vytvori novu KNIFE instanciu – test

python core\scripts\tools\new_item_instance.py ^
  --type knifes ^
  --config config/knifes/knifes_config.yml ^
  --id K000999 ^
  --name "K000999" ^
  --title "KNIFE – Test script-created instance" ^
  --exists error

pause