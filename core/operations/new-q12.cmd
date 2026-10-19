@echo off
REM Vytvori novu Q12 instanciu

python core\scripts\tools\new_item_instance.py ^
  --type q12 ^
  --config config/q12/q12_config.yml ^
  --id Q12_Sample_001 ^
  --name "Q12_Sample_001" ^
  --title "Q12 – Sample Question 001 (script)" ^
  --exists replace

pause