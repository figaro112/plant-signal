@echo off
REM Vytvori novu THESIS instanciu

python core\scripts\tools\new_item_instance.py ^
  --type thesis ^
  --config config/thesis/thesis_config.yml ^
  --id thesis_MojaZaverecnaPraca ^
  --name "thesis_MojaZaverecnaPraca" ^
  --title "Thesis – Moja záverečná práca (script)" ^
  --exists replace

pause