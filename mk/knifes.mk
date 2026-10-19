# ------------------------------------------------------------
# mk/knifes.mk — KNIFE generovanie, audit, verify (light variant)
# Verzia: v1.0 • 2025-10-12 18:23:43 UTC
# Autor: STHDF / KNIFE
# Pozn.: Tento modul predpokladá existenciu skriptov v ./scripts/
#        a konfigu v ./config/knifes_config.json
# ------------------------------------------------------------

SCRIPTS_DIR ?= scripts
CONFIG_JSON ?= config/knifes_config.json
CSV_DEFAULT ?= $(shell node -p "try{require('./$(CONFIG_JSON)').csv || ''}catch(e){''}")
CSV_OVERVIEW ?= $(if $(strip $(CSV_DEFAULT)),$(strip $(CSV_DEFAULT)),config/data/KNIFES-OVERVIEW-INPUTs.csv)

.PHONY: help-knifes
help-knifes:
	@echo "——— knifes.mk ———"
	@echo "CSV: $(CSV_OVERVIEW) | Config: $(CONFIG_JSON)"
	@echo "Ciele: K01-validate K02-generate K03-prepare K10-build-profile"

# Základné ciele (light mapping na tvoje existujúce skripty)
.PHONY: K01-validate K02-generate K03-prepare
K01-validate:
	@echo "🔎 Validujem KNIFES CSV podľa $(CONFIG_JSON)"
	node $(SCRIPTS_DIR)/knifes-validate.mjs

K02-generate:
	@echo "🛠  Generujem KNIFE obsah podľa $(CONFIG_JSON)"
	node $(SCRIPTS_DIR)/knifes-generate.mjs

K03-prepare: K01-validate K02-generate
	@echo "✅ CSV OK → KNIFE vygenerované."

# Pomocný profilový build, ak KNIFE tvorí časť publikácie
.PHONY: K10-build-profile
K10-build-profile: SY01-sync-content P11-configure-baseurl B10-build
