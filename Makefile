# ─────────────────────────────────────────────────────────
# KNIFE / Docusaurus – Makefile (greenfield 2025-11-05)
# Čistý základ pre: build, deploy (worktree), KNIFE, FM, 7Ds
# ─────────────────────────────────────────────────────────

# 20260423-2056 – doplnené LOCALE pre všetky targets (claude -Sonet 4.6. adaptive)
# 20260426-0919 – opravený help-examples: DS_LOCALE odstránené, build SK+EN súčasne
# knifes-new  pridané --locale "$(LOCALE)"
# S21-sdlc-new #--output → --locale, pridané --id "$(SDLC_NAME)", opravený --config path
# Q21-q12-new  --output → --locale, pridané --id "$(Q12_NAME)", opravený --config path
# S31-sthdf-new. --output → --locale, pridané --id "$(STHDF_NAME)", opravený --config path
# new-item-instance  --output → --locale, pridané --id "$(NAME)"
# help-examples  aktualizované príklady pre LOCALE=en

#knifes-new


.DEFAULT_GOAL := help
SHELL := /bin/bash
NODE  := node
NPM   := npm

# ── Cesty (zostávajú kompatibilné s tvojou štruktúrou)
CONTENT_DOCS_DIR := content/docs
PUB_DOCUS_DIR    := publishing/docusaurus
PUB_DOCS_DIR     := $(PUB_DOCUS_DIR)/docs
PUB_BUILD_DIR    := $(PUB_DOCUS_DIR)/build
CONTENT_ASSETS_DIR := $(CONTENT_DOCS_DIR)/assets
PUB_STATIC_DIR     := $(PUB_DOCUS_DIR)/static

# i18n – DS_LOCALE je rezervované pre budúcnosť (i18n vypnuté v docusaurus.config.ts)
# make build vždy generuje SK aj EN súčasne (jeden build, jeden docs/ strom)
DS_LOCALE ?=
BUILD_LOCALE_OPT :=
ifneq ($(strip $(DS_LOCALE)),)
  BUILD_LOCALE_OPT := --locale $(DS_LOCALE)
endif

# Build voľby
BUILD_DATE := $(shell date -u '+%Y-%m-%d %H:%M:%S UTC')
# Build info (optional: include "-dirty" suffix)
TAG_INCLUDE_DIRTY ?= 0
ifeq ($(TAG_INCLUDE_DIRTY),1)
  RELEASE_TAG := $(shell git describe --tags --always --dirty 2>/dev/null || echo dev)
else
  # strip a possible "-dirty" suffix so builds don't fluctuate just because previews were regenerated
  RELEASE_TAG := $(shell git describe --tags --always 2>/dev/null | sed 's/-dirty$$//' || echo dev)
endif
COMMIT_SHA := $(shell git rev-parse --short HEAD 2>/dev/null || echo local)

GITHUB_REPO_URL ?= https://github.com/06-STH-Projects/2026_sthdf_class_template
# Derive repo name for GH Pages baseUrl (e.g., /knifes_overview/)
REPO_NAME := $(notdir $(basename $(GITHUB_REPO_URL)))
DEFAULT_SITE_URL := https://knifes.systemthinking.sk
DEFAULT_BASE_URL := /


MINIFY ?= 1
BUILD_EXTRA :=
ifeq ($(MINIFY),0)
  BUILD_EXTRA := --no-minify
endif

# Release / tags
TAG               ?=
RELEASE_TITLE     ?=
RELEASE_NOTES_FILE ?= ReleaseNote.md

# Build toggles
SYNC_CONTENT ?= 1         # 1=generate overview + rsync before build (default); 0=skip (behave like bare CLI)
KNIFE_DEBUG  ?= 0         # 1=pass --debug to knife_overview_generate.py

# Worktree deploy → gh-pages-docusaurus:/docs
DEPLOY_BRANCH := gh-pages-docusaurus
WORKTREE_DIR  := ../$(DEPLOY_BRANCH)
PAGES_DIR     := $(WORKTREE_DIR)/docs

# KNIFE / FM / 7Ds skripty
SCRIPTS_DIR            := core/scripts/tools
FM_TOOL                := core/scripts/tools/fix_frontmatter.py
FM_LINT                := core/scripts/tools/frontmatter_lint.py

SEVENDS_ROOT            = content/docs/$(LOCALE)/7Ds
SEVENDS_FM_CORE         := core/templates/system/FM-Core.md
SEVENDS_SCRIPT_CLONE    := core/scripts/tools/7ds_clone_from_template.py
SEVENDS_SCRIPT_FM_APPLY := core/scripts/tools/fm_apply_from_core_7ds.py
INSTANCE ?=

# KNIFES – CSV config
CONFIG_JSON   := config/knifes_config.json
CSV_DEFAULT   := $(shell node -p "try{require('./$(CONFIG_JSON)').csv||''}catch(e){''}")
ifeq ($(strip $(CSV_DEFAULT)),)
CSV_DEFAULT   := config/data/KNIFES-OVERVIEW-INPUTs.csv
endif
CSV_OVERVIEW ?= $(CSV_DEFAULT)
LOCALE       ?= sk

KNIFES_DIR   ?= content/docs/$(LOCALE)/knifes

# SDLC / Q12 scaffold dirs
SDLC_DIR ?= content/docs/$(LOCALE)/sdlc
Q12_DIR  ?= content/docs/$(LOCALE)/q12
STHDF_DIR ?= content/docs/$(LOCALE)/sthdf

# Ako sa má generator správať, keď cieľový súbor/priečinok už existuje.
# Povolené hodnoty (mapujú sa na --exists v new_item_instance.py):
#  - skip   ... (default) nič neprepíše, existujúce súbory ponechá
#  - error  ... skončí chybou, ak niečo existuje
#  - replace... prepíše/generuje nanovo podľa templatu
#  - merge  ... rezervované do budúcna, teraz = skip
EXISTS ?= skip

# ─────────────────────────────────────────────────────────
# HELP (autogenerovaný z „##“ popisov)
# ─────────────────────────────────────────────────────────
.PHONY: help
help: ## Zobrazí prehľad príkazov podľa sekcií + príklady
	@printf "\n\033[1mKNIFE Makefile – Help (so sekciami)\033[0m\n"
	@printf "Built at: %s\n\n" "$(BUILD_DATE)"

	@printf "\033[1;90m🧩 CORE / BUILD / SERVE\033[0m\n"
	@printf " \033[1m%-28s\033[0m | \033[1m%s\033[0m\n" "Target" "Description"
	@printf "%-28s-+-%s\n" "----------------------------" "----------------------------------------------"
	@awk 'BEGIN{FS=":.*## "};/^(SY00-clean-pubdocs|SY01-sync-content|SY02-sync-assets|dev|build|build-fast|build-clean|serve):.*## /{printf " \033[36m%-28s\033[0m | %s\n",$$1,$$2}' $(MAKEFILE_LIST)
	@printf "\n"

	@printf "\033[1;90m📦 INSTANCE SCOPE\033[0m\n"
	@echo " LOCALE   = $(LOCALE)"
	@echo " INSTANCE = $(INSTANCE)"
	@bash -c 'ROOT_BASE="content/docs/$(LOCALE)/7Ds"; if [ -n "$(INSTANCE)" ]; then ROOT_PATH="content/docs/$(LOCALE)/$(INSTANCE)"; else ROOT_PATH="$$ROOT_BASE"; fi; echo " TARGET ROOT → $$ROOT_PATH"'
	@printf " Pattern: make D12-7ds-apply INSTANCE=sthdf_2025 LOCALE=sk\n"
	@printf " \033[36m%-28s\033[0m | %s\n" "new-item-instance" "Vytvorí novú inštanciu frameworku (TYPE, NAME, TITLE)"
	@printf " \033[36m%-28s\033[0m | %s\n" "S21-sdlc-new" "SDLC inštancia (SDLC_NAME, SDLC_TITLE, LOCALE)"
	@printf " \033[36m%-28s\033[0m | %s\n" "Q21-q12-new"  "Q12 inštancia (Q12_NAME, Q12_TITLE, LOCALE)"
	@printf " \033[36m%-28s\033[0m | %s\n" "S31-sthdf-new" "STHDF inštancia (STHDF_NAME, STHDF_TITLE, LOCALE)"
	@printf "\n"

	@printf "\033[1;33m🚀 DEPLOY / WORKTREE\033[0m\n"
	@printf " \033[1m%-28s\033[0m | \033[1m%s\033[0m\n" "Target" "Description"
	@printf "%-28s-+-%s\n" "----------------------------" "----------------------------------------------"
	@awk 'BEGIN{FS=":.*## "};/^(deploy):.*## /{printf " \033[1m%-28s\033[0m | %s\n",$$1,$$2}' $(MAKEFILE_LIST)
	@printf "\n"

	@printf "\033[1;35m🏷  RELEASE / TAGS\033[0m\n"
	@printf " \033[1m%-28s\033[0m | \033[1m%s\033[0m\n" "Target" "Description"
	@printf "%-28s-+-%s\n" "----------------------------" "----------------------------------------------"
	@awk 'BEGIN{FS=":.*## "};/^(release-[a-zA-Z0-9-]+):.*## /{printf " \033[1m%-28s\033[0m | %s\n",$$1,$$2}' $(MAKEFILE_LIST)
	@printf "\n"

	@printf "\033[1;32m🧾 FRONT MATTER (FM)\033[0m\n"
	@printf " \033[1m%-28s\033[0m | \033[1m%s\033[0m\n" "Target" "Description"
	@printf "%-28s-+-%s\n" "----------------------------" "----------------------------------------------"
	@awk 'BEGIN{FS=":.*## "};/^(FM[0-9]+-[a-zA-Z0-9-]+):.*## /{printf " \033[1m%-28s\033[0m | %s\n",$$1,$$2}' $(MAKEFILE_LIST)
	@printf "\n"

	@printf "\033[1;90m📚 KNIFE TOOLS\033[0m\n"
	@printf " \033[1m%-28s\033[0m | \033[1m%s\033[0m\n" "Target" "Description"
	@printf "%-28s-+-%s\n" "----------------------------" "----------------------------------------------"
	@awk 'BEGIN{FS=":.*## "};/^(knifes[-a-z]+):.*## /{printf " \033[1m%-28s\033[0m | %s\n",$$1,$$2}' $(MAKEFILE_LIST)
	@printf "\n"

	@printf "\033[1;90m🌱 7Ds TOOLS\033[0m\n"
	@printf " \033[1m%-28s\033[0m | \033[1m%s\033[0m\n" "Target" "Description"
	@printf "%-28s-+-%s\n" "----------------------------" "----------------------------------------------"
	@awk 'BEGIN{FS=":.*## "};/^(D[0-9]+-[a-zA-Z0-9-]+|FM7[0-9]+-[a-zA-Z0-9-]+):.*## /{printf " \033[1m%-28s\033[0m | %s\n",$$1,$$2}' $(MAKEFILE_LIST)
	@printf "\n"

	@printf " \033[1;90m 📐 SDLC (Solution Develepment Life Cycle)\033[0m\n"
	@printf " \033[1m%-28s\033[0m | \033[1m%s\033[0m\n" "Target" "Description"
	@printf "%-28s-+-%s\n" "----------------------------" "----------------------------------------------"
	@awk 'BEGIN{FS=":.*## "};/^(S11-sdlc-dry|S12-sdlc-apply|S21-sdlc-new):.*## /{printf " \033[1m%-28s\033[0m | %s\n",$$1,$$2}' $(MAKEFILE_LIST)
	@printf "\n"

	@printf "\033[1;90m🎓 STHDF (class instance)\033[0m\n"
	@printf " \033[1m%-28s\033[0m | \033[1m%s\033[0m\n" "Target" "Description"
	@printf "%-28s-+-%s\n" "----------------------------" "----------------------------------------------"
	@awk 'BEGIN{FS=":.*## "};/^(S31-sthdf-new):.*## /{printf " \033[1m%-28s\033[0m | %s\n",$$1,$$2}' $(MAKEFILE_LIST)
	@printf "\n"

	@printf "\033[1;90m🔢 Q12 (Twelve Quadrants)\033[0m\n"
	@printf " \033[1m%-28s\033[0m | \033[1m%s\033[0m\n" "Target" "Description"
	@printf "%-28s-+-%s\n" "----------------------------" "----------------------------------------------"
	@awk 'BEGIN{FS=":.*## "};/^(Q[0-9]+-[a-zA-Z0-9-]+):.*## /{printf " \033[1m%-28s\033[0m | %s\n",$$1,$$2}' $(MAKEFILE_LIST)
	@printf "\n"

	@printf "\033[1;90m📜 THESIS (placeholders)\033[0m\n"
	@printf " \033[1m%-28s\033[0m | \033[1m%s\033[0m\n" "Target" "Description"
	@printf "%-28s-+-%s\n" "----------------------------" "----------------------------------------------"
	@awk 'BEGIN{FS=":.*## "};/^(T[0-9]+-[a-zA-Z0-9-]+):.*## /{printf " \033[36m%-28s\033[0m | %s\n",$$1,$$2}' $(MAKEFILE_LIST)
	@printf "\n"

	@printf "\033[1;37m🩺 DIAGNOSTIKA / UTIL\033[0m\n"
	@printf " \033[1m%-28s\033[0m | \033[1m%s\033[0m\n" "Target" "Description"
	@printf "%-28s-+-%s\n" "----------------------------" "----------------------------------------------"
	@awk 'BEGIN{FS=":.*## "};/^(doctor|print-[a-z]+|print-locale|mode|validate-instance|help|help\+):.*## /{printf " \033[1m%-28s\033[0m | %s\n",$$1,$$2}' $(MAKEFILE_LIST)
	@printf "\n"

	@printf "\033[1m📘 Examples\033[0m\n"
	@$(MAKE) --no-print-directory help-examples

# ─────────────────────────────────────────────────────────
# CORE: SYNC / DEV / BUILD / SERVE
# ─────────────────────────────────────────────────────────
.PHONY: SY00-clean-pubdocs SY01-sync-content SY02-sync-assets dev build build-fast build-clean serve

SY00-clean-pubdocs: ## Hard clean: vyprázdni publishing/docusaurus/docs (ponechá priečinok)
	@mkdir -p "$(PUB_DOCS_DIR)"
	@echo "🧹 Hard clean: $(PUB_DOCS_DIR)/*"
	@rm -rf "$(PUB_DOCS_DIR)"/* 2>/dev/null || true
build-clean: ## Hard clean + sync + production build (istý reset publish/docs)
	$(MAKE) SY00-clean-pubdocs
	$(MAKE) build
SY01-sync-content: ## Sync SSOT content → publishing/docusaurus/docs (hard, delete)
	@if [ ! -d "$(CONTENT_DOCS_DIR)" ]; then echo "❌ Missing $(CONTENT_DOCS_DIR)"; exit 1; fi
	@$(MAKE) --no-print-directory knifes-overview LOCALE=sk
	@$(MAKE) --no-print-directory knifes-overview LOCALE=en
	@mkdir -p "$(PUB_DOCS_DIR)"
	rsync -av --delete --checksum \
	  --exclude 'assets/' \
	  "$(CONTENT_DOCS_DIR)/" "$(PUB_DOCS_DIR)/"
	@echo "✅ Synced: $(CONTENT_DOCS_DIR) → $(PUB_DOCS_DIR)"

SY02-sync-assets: ## Sync assets (HTML5, obrázky…) → publishing/docusaurus/static/assets
	@if [ ! -d "$(CONTENT_ASSETS_DIR)" ]; then \
	  echo "ℹ️  Skipping assets sync: $(CONTENT_ASSETS_DIR) neexistuje"; exit 0; fi
	@mkdir -p "$(PUB_STATIC_DIR)/assets"
	rsync -av --delete --checksum "$(CONTENT_ASSETS_DIR)/" "$(PUB_STATIC_DIR)/assets/"
	@echo "✅ Synced assets: $(CONTENT_ASSETS_DIR) → $(PUB_STATIC_DIR)/assets"

dev: ## Spustí lokálny dev server Docusaurusu
	cd "$(PUB_DOCUS_DIR)" && \
	SITE_URL="$${SITE_URL:-http://localhost:3000}" \
	BASE_URL="$${BASE_URL:-/}" \
	BUILD_DATE="$(BUILD_DATE)" \
	RELEASE_TAG="$(RELEASE_TAG)" \
	COMMIT_SHA="$(COMMIT_SHA)" \
	GITHUB_REPO_URL="$(GITHUB_REPO_URL)" \
	NODE_OPTIONS=--max-old-space-size=16384 \
	$(NPM) start -- $(BUILD_LOCALE_OPT)

build: ## Production build (MINIFY=1|0, DS_LOCALE=sk|en, SYNC_CONTENT=1|0)
	@if [ "$(SYNC_CONTENT)" != "0" ]; then \
	  $(MAKE) --no-print-directory SY01-sync-content; \
	  $(MAKE) --no-print-directory SY02-sync-assets; \
	else \
	  echo "ℹ️  SYNC_CONTENT=0 → skipping overview generation + rsync (CLI-like build)."; \
	fi
	cd "$(PUB_DOCUS_DIR)" && BUILD_DATE="$(BUILD_DATE)" RELEASE_TAG="$(RELEASE_TAG)" COMMIT_SHA="$(COMMIT_SHA)" GITHUB_REPO_URL="$(GITHUB_REPO_URL)" SITE_URL="$${SITE_URL:-$(DEFAULT_SITE_URL)}" BASE_URL="$${BASE_URL:-$(DEFAULT_BASE_URL)}" NODE_OPTIONS=--max-old-space-size=16384 $(NPM) run build -- $(BUILD_EXTRA) $(BUILD_LOCALE_OPT)

build-fast: ## Build bez minifikácie (rýchly test)
	$(MAKE) build MINIFY=0

.PHONY: build-core
build-core: ## Build bez syncu obsahu (nerobí rsync ani regeneráciu overview)
	cd "$(PUB_DOCUS_DIR)" && BUILD_DATE="$(BUILD_DATE)" RELEASE_TAG="$(RELEASE_TAG)" COMMIT_SHA="$(COMMIT_SHA)" GITHUB_REPO_URL="$(GITHUB_REPO_URL)" SITE_URL="$${SITE_URL:-$(DEFAULT_SITE_URL)}" BASE_URL="$${BASE_URL:-$(DEFAULT_BASE_URL)}" NODE_OPTIONS=--max-old-space-size=16384 $(NPM) run build -- $(BUILD_EXTRA) $(BUILD_LOCALE_OPT)

serve: ## Naservíruje statický build lokálne
	cd "$(PUB_DOCUS_DIR)" && BUILD_DATE="$(BUILD_DATE)" RELEASE_TAG="$(RELEASE_TAG)" COMMIT_SHA="$(COMMIT_SHA)" GITHUB_REPO_URL="$(GITHUB_REPO_URL)" SITE_URL="$${SITE_URL:-$(DEFAULT_SITE_URL)}" BASE_URL="$${BASE_URL:-$(DEFAULT_BASE_URL)}" $(NPM) run serve


# ─────────────────────────────────────────────────────────
# WORKTREE DEPLOY (Cesta 1) – bezpečné, stručné
# ─────────────────────────────────────────────────────────
.PHONY: W10-check-worktree W20-copy-build W30-commit-deploy W50-full-deploy W60-worktree-status deploy

.PHONY: W05-clean-worktree
W05-clean-worktree: ## Vyčistí worktree (zachová .git), vhodné pred rsync
	@if ! git -C "$(WORKTREE_DIR)" rev-parse --is-inside-work-tree >/dev/null 2>&1; then \
	  echo "❌ Worktree neexistuje. Spusť najprv W10-check-worktree"; exit 1; fi
	@echo "🧹 Čistím worktree: $(WORKTREE_DIR)"
	@git -C "$(WORKTREE_DIR)" clean -fdx
W10-check-worktree: ## Vytvorí/overí worktree ../gh-pages-docusaurus → /docs
	@if [ -d "$(WORKTREE_DIR)" ] && ! git -C "$(WORKTREE_DIR)" rev-parse --is-inside-work-tree >/dev/null 2>&1; then \
	  echo "⚠️  $(WORKTREE_DIR) existuje, ale nie je git worktree – čistím…"; rm -rf "$(WORKTREE_DIR)"; git worktree prune; \
	fi; \
	if ! git worktree list | grep -q "$(WORKTREE_DIR)"; then \
	  echo "ℹ️  Zakladám worktree pre $(DEPLOY_BRANCH)…"; \
	  git fetch origin || true; \
	  if git ls-remote --exit-code --heads origin $(DEPLOY_BRANCH) >/dev/null 2>&1; then \
	    git worktree add -B $(DEPLOY_BRANCH) "$(WORKTREE_DIR)" origin/$(DEPLOY_BRANCH); \
	  else \
	    git worktree add "$(WORKTREE_DIR)" -B $(DEPLOY_BRANCH); \
	    cd "$(WORKTREE_DIR)" && git commit --allow-empty -m "init $(DEPLOY_BRANCH)" && git push -u origin $(DEPLOY_BRANCH); \
	  fi; \
	fi; \
	echo "✅ Worktree OK: $(WORKTREE_DIR) → $(DEPLOY_BRANCH)"

W20-copy-build: ## Rsync build/ → worktree /docs (bezpečné, chráni .git)
	@if ! git -C "$(WORKTREE_DIR)" rev-parse --is-inside-work-tree >/dev/null 2>&1; then echo "❌ Spusť najprv W10-check-worktree"; exit 1; fi
	@if [ -z "$(PUB_BUILD_DIR)" ] || [ ! -d "$(PUB_BUILD_DIR)" ]; then echo "❌ Najprv make build (chýba $(PUB_BUILD_DIR))"; exit 1; fi
	@mkdir -p "$(PAGES_DIR)"
	@echo "🔁 rsync: '$(PUB_BUILD_DIR)/' → '$(PAGES_DIR)/'"
	rsync -av --delete --filter='P .git' --filter='P .gitignore' "$(PUB_BUILD_DIR)/" "$(PAGES_DIR)/"

W30-commit-deploy: ## Commit & push worktree (deploy)
	@if ! git -C "$(WORKTREE_DIR)" rev-parse --is-inside-work-tree >/dev/null 2>&1; then echo "❌ Worktree nie je pripravený"; exit 1; fi
	cd "$(WORKTREE_DIR)" && git add -A
	cd "$(WORKTREE_DIR)" && ts=$$(date -u +'%Y-%m-%d %H:%M:%S UTC'); git commit -m "Deploy $$ts" || echo "ℹ️  Žiadne zmeny"
	# Bezpečné riešenie non-fast-forward: najprv rebase proti originu, potom push
	cd "$(WORKTREE_DIR)" && git fetch origin $(DEPLOY_BRANCH)
	cd "$(WORKTREE_DIR)" && git pull --rebase --autostash origin $(DEPLOY_BRANCH) || true
	cd "$(WORKTREE_DIR)" && git push origin $(DEPLOY_BRANCH)
	@echo "✅ Deploy pushnutý → $(DEPLOY_BRANCH)"

deploy: ## Full deploy na vlastnú doménu (SITE_URL=https://knifes.systemthinking.sk BASE_URL=/, no-minify)
	$(MAKE) W10-check-worktree
	$(MAKE) W05-clean-worktree
	SITE_URL=https://knifes.systemthinking.sk BASE_URL=/ $(MAKE) build MINIFY=0
	$(MAKE) W20-copy-build
	$(MAKE) W30-commit-deploy
	@echo "🎉 Full deploy hotový (domain, no-minify)."

W50-full-deploy: ## Plný scenár: push main + build + stage + commit
	@if [ -n "$$(git status --porcelain)" ]; then echo "❌ Máš necommitnuté zmeny na main!"; exit 1; fi
	git push origin main
	$(MAKE) W40-deploy

W60-worktree-status: ## Status worktree (debug)
	@git worktree list
	@echo "----"
	@git -C "$(WORKTREE_DIR)" status -sb || true

# ─────────────────────────────────────────────────────────
# RELEASE / TAGS – GitHub CLI
# ─────────────────────────────────────────────────────────
.PHONY: release-gh

release-gh: ## Vytvorí GitHub release pre TAG (TAG=v0.4.0, RELEASE_TITLE='...', RELEASE_NOTES_FILE=ReleaseNote.md)
	@if ! command -v gh >/dev/null 2>&1; then \
	  echo "❌ GitHub CLI 'gh' nie je nainštalovaný. Pozri https://cli.github.com/"; \
	  exit 1; \
	fi
	@if [ -z "$(TAG)" ]; then \
	  echo "❌ Musíš zadať TAG, napr.:"; \
	  echo "   make release-gh TAG=v0.4.0 RELEASE_TITLE='KNIFE Overview v0.4.0'"; \
	  exit 1; \
	fi
	@if ! git rev-parse "$(TAG)" >/dev/null 2>&1; then \
	  echo "❌ TAG '$(TAG)' neexistuje v tomto repozitári. Najprv ho vytvor/pushni."; \
	  exit 1; \
	fi
	@TITLE="$(RELEASE_TITLE)"; \
	if [ -z "$$TITLE" ]; then \
	  TITLE="$(TAG)"; \
	fi; \
	if [ ! -f "$(RELEASE_NOTES_FILE)" ]; then \
	  echo "ℹ️ Súbor '$(RELEASE_NOTES_FILE)' neexistuje – použijem --generate-notes."; \
	  gh release create "$(TAG)" \
	    --title "$$TITLE" \
	    --verify-tag \
	    --generate-notes; \
	else \
	  echo "📄 Používam release poznámky z '$(RELEASE_NOTES_FILE)'"; \
	  gh release create "$(TAG)" \
	    --title "$$TITLE" \
	    --verify-tag \
	    --notes-file "$(RELEASE_NOTES_FILE)"; \
	fi

# ─────────────────────────────────────────────────────────
# FRONT MATTER – audit / lint / fix
# ─────────────────────────────────────────────────────────
.PHONY: FM10-audit FM11-lint FM20-fix-dry FM20-fix-apply
FM10-audit: ## Audit Front Matter (read-only) – root=content/docs (OPTS=--root dir)
	@python3 $(FM_TOOL) --root "$(CONTENT_DOCS_DIR)" --dry-run $(OPTS) || true

FM11-lint: ## Lint Front Matter (read-only) – root=content/docs
	@python3 $(FM_LINT) --root "$(CONTENT_DOCS_DIR)" || true

FM20-fix-dry: ## DRY: normalizácia Front Matter (no writes)
	@python3 $(FM_TOOL) --root "$(CONTENT_DOCS_DIR)" --dry-run $(OPTS)

FM20-fix-apply: ## APPLY: normalizácia Front Matter (writes)
	@python3 $(FM_TOOL) --root "$(CONTENT_DOCS_DIR)" --apply $(OPTS)

# ─────────────────────────────────────────────────────────
# UNIVERSAL FRAMEWORK INSTANCE – new_item_instance.py
# ─────────────────────────────────────────────────────────
.PHONY: new-item-instance
new-item-instance: ## Vytvorí novú inštanciu frameworku (TYPE, NAME, TITLE)
	@if [ -z "$(TYPE)" ] || [ -z "$(NAME)" ] || [ -z "$(TITLE)" ]; then \
		echo "❌ Usage: make new-item-instance TYPE=sdlc NAME=integration TITLE='Integration Project'"; \
		exit 1; \
	fi
	@python3 core/scripts/tools/new_item_instance.py \
		--type "$(TYPE)" \
		--id "$(NAME)" \
		--name "$(NAME)" \
		--title "$(TITLE)" \
		--locale "$(LOCALE)" \
		--exists "$(EXISTS)"
	@echo "✅ Instance created: $(TYPE)_$(NAME) (locale=$(LOCALE))"

# ─────────────────────────────────────────────────────────
# 7Ds – scaffold + FM-Core merge
# ─────────────────────────────────────────────────────────
.PHONY: D10-7ds-print-root D11-7ds-dry D12-7ds-apply FM71-7ds-dry-from-core FM70-7ds-apply-from-core

D10-7ds-print-root: ## Debug: vypíše cieľový root pre 7Ds (berie ohľad na INSTANCE a LOCALE)
	@ROOT_BASE="content/docs/$(LOCALE)/7Ds"; \
	if [ -n "$(INSTANCE)" ]; then ROOT_PATH="content/docs/$(LOCALE)/$(INSTANCE)"; else ROOT_PATH="$$ROOT_BASE"; fi; \
	echo "[LOCALE]      = $(LOCALE)"; \
	echo "[INSTANCE]    = $(INSTANCE)"; \
	echo "[TARGET ROOT] = $$ROOT_PATH"

D11-7ds-dry: ## DRY: Scaffold 7Ds z templatu (iba plán; bez zápisu FM)
	@ROOT_BASE="content/docs/$(LOCALE)/7Ds"; \
	if [ -n "$(INSTANCE)" ]; then ROOT_PATH="content/docs/$(LOCALE)/$(INSTANCE)"; else ROOT_PATH="$$ROOT_BASE"; fi; \
	echo "🧪 7Ds DRY scaffold → $$ROOT_PATH"; \
	python3 "$(SEVENDS_SCRIPT_CLONE)" \
	  --instance "$${ROOT_PATH##*/}" \
	  --template-root core/templates/content/7ds \
	  --header-template core/templates/7ds/header/7ds_user_header.md \
	  --fm-core "$(SEVENDS_FM_CORE)" \
	  --dry

D12-7ds-apply: ## APPLY: Scaffold 7Ds + apply FM-Core (idempotentné)
	@set -e; \
	ROOT_BASE="content/docs/$(LOCALE)/7Ds"; \
	if [ -n "$(INSTANCE)" ]; then ROOT_PATH="content/docs/$(LOCALE)/$(INSTANCE)"; else ROOT_PATH="$$ROOT_BASE"; fi; \
	echo "⚙️  7Ds APPLY scaffold → $$ROOT_PATH"; \
	python3 "$(SEVENDS_SCRIPT_CLONE)" \
	  --instance "$${ROOT_PATH##*/}" \
	  --template-root core/templates/content/7ds \
	  --header-template core/templates/7ds/header/7ds_user_header.md \
	  --fm-core "$(SEVENDS_FM_CORE)" \
	  --apply; \
	echo "🛠  Merge FM-Core → $$ROOT_PATH"; \
	python3 "$(SEVENDS_SCRIPT_FM_APPLY)" \
	  --root  "$$ROOT_PATH" \
	  --fm-core "$(SEVENDS_FM_CORE)" \
	  --apply \
	  --instance-tag "$${ROOT_PATH##*/}"; \
	echo "✅ DONE: $$ROOT_PATH"

FM71-7ds-dry-from-core: ## DRY: Merge FM-Core → 7Ds (berie ohľad na INSTANCE)
	@ROOT_BASE="content/docs/$(LOCALE)/7Ds"; \
	if [ -n "$(INSTANCE)" ]; then ROOT_PATH="content/docs/$(LOCALE)/$(INSTANCE)"; else ROOT_PATH="$$ROOT_BASE"; fi; \
	echo "🧪 DRY merge FM-Core → $$ROOT_PATH"; \
	python3 "$(SEVENDS_SCRIPT_FM_APPLY)" \
	  --root  "$$ROOT_PATH" \
	  --fm-core "$(SEVENDS_FM_CORE)" \
	  --dry-run \
	  --instance-tag "$${ROOT_PATH##*/}"

FM70-7ds-apply-from-core: ## APPLY: Merge FM-Core → 7Ds (berie ohľad na INSTANCE)
	@set -e; \
	ROOT_BASE="content/docs/$(LOCALE)/7Ds"; \
	if [ -n "$(INSTANCE)" ]; then ROOT_PATH="content/docs/$(LOCALE)/$(INSTANCE)"; else ROOT_PATH="$$ROOT_BASE"; fi; \
	echo "🛠 APPLY merge FM-Core → $$ROOT_PATH"; \
	python3 "$(SEVENDS_SCRIPT_FM_APPLY)" \
	  --root  "$$ROOT_PATH" \
	  --fm-core "$(SEVENDS_FM_CORE)" \
	  --apply \
	  --instance-tag "$${ROOT_PATH##*/}"; \
	echo "✅ FM-Core applied to $$ROOT_PATH"

# ─────────────────────────────────────────────────────────
# KNIFES – validate / generate / verify
# ─────────────────────────────────────────────────────────
.PHONY: knifes-build-dry knifes-build-apply knifes-verify knifes-new knifes-overview
knifes-build-dry: ## DRY: CSV→MD build podľa configu (nič nezapisuje)
	@CSV="$(csv)"; if [ -z "$$CSV" ]; then CSV="$(strip $(CSV_OVERVIEW))"; fi; \
	echo "🧪 DRY: KNIFES build CSV='$$CSV' locale=$(LOCALE)"; \
	node "$(SCRIPTS_DIR)/knifes-build.mjs" --csv "$$CSV" --root . --locale $(LOCALE) --dry-run

knifes-build-apply: ## APPLY: CSV→MD build podľa configu (zapíše)
	@CSV="$(csv)"; if [ -z "$$CSV" ]; then CSV="$(strip $(CSV_OVERVIEW))"; fi; \
	echo "🛠 APPLY: KNIFES build CSV='$$CSV' locale=$(LOCALE)"; \
	node "$(SCRIPTS_DIR)/knifes-build.mjs" --csv "$$CSV" --root . --locale $(LOCALE)

knifes-verify: ## Verify: CSV/docs + FM (smart)
	@CSV_ARG="$(strip $(CSV_OVERVIEW))"; \
	LOCALE_ARG="$(LOCALE)"; \
	DOCS_DIR_ARG="$(CONTENT_DOCS_DIR)"; \
	if [ -f "$(CONFIG_JSON)" ]; then \
	  CSV_FROM_CFG=$$(node -p "try{require('./$(CONFIG_JSON)').csv||''}catch(e){''}"); \
	  if [ -n "$$CSV_FROM_CFG" ]; then CSV_ARG="$$CSV_FROM_CFG"; fi; \
	fi; \
	node scripts/knifes-verify.mjs --csv "$$CSV_ARG" --root . --locale "$$LOCALE_ARG" --section "knifes" --docs-dir "$$DOCS_DIR_ARG"

# „new“ + „overview“ volajú tvoje existujúce Python skripty
ID ?=
id ?= $(ID)
name ?=
title ?=
KNIFE_DRY   ?=
KNIFE_FORCE ?=
CONFIG_GLOBAL     ?= config/global.yml
CONFIG_KNIFE      ?= config/knifes/knife_config.yml
KNIFE_OVERVIEW_SCRIPT ?= core/scripts/tools/knife_overview_generate.py
KNIFE_OVERVIEW_ROOT   ?= content/docs
KNIFE_OVERVIEW_OUT    ?= content/docs/$(LOCALE)/knifes/knifes_overview
KNIFE_OVERVIEW_FM     ?= core/templates/system/FM-Core.md
KNIFE_OVERVIEW_LOCALE ?= $(LOCALE)

knifes-new: ## Vytvorí novú KNIFE (ID=K000123 name="..." title="...")
	@echo "🚀 Generujem KNIFE…"
	@if [ -z "$(name)" ] || [ -z "$(title)" ]; then \
	  echo "❌ Usage: make knifes-new ID=K000123 name='...' title='...'"; \
	  exit 1; \
	fi
	@mkdir -p "content/docs/$(LOCALE)/knifes"
	@_RAW_ID="$(id)"; \
	if [ -n "$$_RAW_ID" ] && [ "$(LOCALE)" = "en" ]; then \
	  _FINAL_ID="$${_RAW_ID}_EN"; \
	  echo "ℹ️  EN locale: id → $$_FINAL_ID (suffix _EN pridaný automaticky)"; \
	else \
	  _FINAL_ID="$$_RAW_ID"; \
	fi; \
	_ID_ARG=$$([ -n "$$_FINAL_ID" ] && echo "--id $$_FINAL_ID" || echo ""); \
	python3 core/scripts/tools/new_item_instance.py \
	  --type knife \
	  --name "$(name)" \
	  --title "$(title)" \
	  $$_ID_ARG \
	  --locale "$(LOCALE)" \
	  --config config/knifes/knifes_config.yml \
	  --exists "$(EXISTS)"
	@echo "✅ Hotovo: content/docs/$(LOCALE)/knifes/$(if $(id),$(id)-,knife_)$(name)/index.md"

knifes-overview: ## Zregeneruje KNIFE prehľady (Blog/List/Details)
	@mkdir -p "$(KNIFE_OVERVIEW_OUT)"
	python3 "$(KNIFE_OVERVIEW_SCRIPT)" \
	  --root "$(KNIFE_OVERVIEW_ROOT)" \
	  --fm-core "$(KNIFE_OVERVIEW_FM)" \
	  --out-dir "$(KNIFE_OVERVIEW_OUT)" \
	  --locale "$(KNIFE_OVERVIEW_LOCALE)" \
	  $(if $(filter 1,$(KNIFE_DEBUG)),--debug,)

.PHONY: knifes-overview-commit
knifes-overview-commit: ## Commitne zmeny v KNIFE overview (ak existujú)
	@git add "content/docs/*/knifes/knifes_overview/KNIFE_Overview_"*.md 2>/dev/null || true
	@ts=$$(date -u +'%Y-%m-%d %H:%M:%S UTC'); git commit -m "chore(overview): regenerate KNIFE overview ($$ts)" || echo "ℹ️  Žiadne zmeny na commit"

# ─────────────────────────────────────────────────────────
# UTIL: diagnostika
# ─────────────────────────────────────────────────────────
.PHONY: mode doctor print-vars
mode: ## Zobrazí deploy režim (worktree dostupnosť)
	@echo "🔎 Deploy mode:"
	@if [ -d "$(WORKTREE_DIR)/.git" ]; then echo " • Worktree: ENABLED ($(WORKTREE_DIR))"; else echo " • Worktree: disabled"; fi

doctor: ## Rýchla diagnostika prostredia
	@echo "🩺 Node:  $$(node -v 2>/dev/null || echo n/a)"
	@echo "🩺 NPM:   $$(npm -v 2>/dev/null || echo n/a)"
	@echo "🩺 Git:   $$(git --version 2>/dev/null || echo n/a)"
	@echo "🩺 Origin: $$(git remote -v | awk 'NR==1{print $$2}')"
	@echo "🩺 Branch: $$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo n/a)"

.PHONY: print-vars
print-vars: ## Vypíše kľúčové premenné
	@echo "[CONTENT_DOCS_DIR] = $(CONTENT_DOCS_DIR)"
	@echo "[PUB_DOCUS_DIR]    = $(PUB_DOCUS_DIR)"
	@echo "[PUB_DOCS_DIR]     = $(PUB_DOCS_DIR)"
	@echo "[PUB_BUILD_DIR]    = $(PUB_BUILD_DIR)"
	@echo "[WORKTREE_DIR]     = $(WORKTREE_DIR)"
	@echo "[PAGES_DIR]        = $(PAGES_DIR)"
	@echo "[DS_LOCALE]        = $(DS_LOCALE)"
	@echo "[BUILD_EXTRA]      = $(BUILD_EXTRA)"
	@echo "[RELEASE_TAG]     = $(RELEASE_TAG)"
	@echo "[COMMIT_SHA]      = $(COMMIT_SHA)"
	@echo "[GITHUB_REPO_URL] = $(GITHUB_REPO_URL)"
	@echo "[TAG_INCLUDE_DIRTY] = $(TAG_INCLUDE_DIRTY)"
	@echo "[BUILD_DATE]       = $(BUILD_DATE)"
	@echo "[REPO_NAME]       = $(REPO_NAME)"
	@echo "[DEFAULT_BASE_URL]= $(DEFAULT_BASE_URL)"

# Helper: Print current LOCALE and DS_LOCALE
.PHONY: print-locale
print-locale: ## Vypíše aktuálne LOCALE a DS_LOCALE
	@echo "[LOCALE]    = $(LOCALE)"
	@echo "[DS_LOCALE] = $(DS_LOCALE)"

# Validate INSTANCE variable format
.PHONY: validate-instance
validate-instance: ## Overí konvenciu INSTANCE (<typ>_<meno>)
	@if [ -z "$(INSTANCE)" ]; then \
	  echo "❌ INSTANCE nie je nastavené. Použi napr. INSTANCE=7ds_sthdf_2025"; \
	  exit 1; \
	fi; \
	BASE="$${INSTANCE%%_*}"; \
	NAME="$${INSTANCE#*_}"; \
	if [ -z "$$BASE" ] || [ "$$BASE" = "$$NAME" ] || [ -z "$$NAME" ]; then \
	  echo "❌ INSTANCE musí byť vo formáte <typ>_<meno>, napr. 7ds_sthdf_2025"; \
	  exit 1; \
	fi; \
	echo "✅ INSTANCE OK"; \
	echo " • TYPE = $$BASE"; \
	echo " • NAME = $$NAME";
# ─────────────────────────────────────────────────────────
# HELP+: praktické príklady (copy‑paste)
# ─────────────────────────────────────────────────────────
.PHONY: help-examples help+
help-examples:
	@printf " \033[1m%-40s\033[0m | \033[1m%s\033[0m\n" "Command" "What it does"
	@printf "%-40s-+-%s\n" "----------------------------------------" "----------------------------------------------"
	@printf " %-40s | %s\n" "make dev" "Spustí Docusaurus dev server"
	@printf " %-40s | %s\n" "SITE_URL=http://localhost:3000 BASE_URL=/ make dev" "Spustí dev s lokálnym URL a \"/\" baseUrl (funguje aj na GH po zmene BASE_URL)"
	@printf " %-40s | %s\n" "make build" "Production build – SK + EN súčasne (minify default)"
	@printf " %-40s | %s\n" "make build SYNC_CONTENT=0" "Build bez overview/rsync (rýchlejší, len Docusaurus)"
	@printf " %-40s | %s\n" "make build-fast" "Rýchly build bez minifikácie – SK + EN"
	@printf " %-40s | %s\n" "make build-core" "Build bez rsync/sync (len Docusaurus)"
	@printf " %-40s | %s\n" "make SY00-clean-pubdocs" "Vyprázdni publishing/docusaurus/docs (hard clean)"
	@printf " %-40s | %s\n" "make build-clean" "Hard clean + sync + production build"
	@printf " %-40s | %s\n" "make W05-clean-worktree" "Vyčistí worktree pred rsyncom"
	@printf " %-40s | %s\n" "make knifes-overview-commit" "Commitne zmeny overview → odstráni '-dirty'"
	@printf " %-40s | %s\n" "make serve" "Naservíruje lokálne už vybuildované stránky"
	@printf "\n"
	@printf " %-40s | %s\n" "make deploy" "Full deploy na vlastnú doménu (no-minify)"
	@printf "\n"
	@printf " %-40s | %s\n" "make FM10-audit" "Audit Front Matter (read-only)"
	@printf " %-40s | %s\n" "make FM11-lint" "Lint FM (read-only)"
	@printf " %-40s | %s\n" "make FM20-fix-dry" "DRY run normalizácie FM (bez zápisu)"
	@printf " %-40s | %s\n" "make FM20-fix-apply" "APPLY normalizácie FM (zapisuje)"
	@printf "\n"
	@printf " %-40s | %s\n" "make D11-7ds-dry INSTANCE=7ds_sthdf_2025 LOCALE=sk" "Scaffold 7Ds (DRY) do /sk/7ds_sthdf_2025"
	@printf " %-40s | %s\n" "make S31-sthdf-new STHDF_NAME=sthdf_2025 STHDF_TITLE='STHDF 2025/2026' LOCALE=sk [EXISTS=skip|replace|error]" "Vytvorí alebo re‑vygeneruje STHDF inštanciu cez generátor"
	@printf " %-40s | %s\n" "make D12-7ds-apply INSTANCE=7ds_sthdf_2025 LOCALE=sk" "Scaffold 7Ds (APPLY) do /sk/7ds_sthdf_2025"
	@printf " %-40s | %s\n" "make validate-instance INSTANCE=7ds_sthdf_2025" "Overí konvenciu INSTANCE (<typ>_<meno>)"
	@printf " %-40s | %s\n" "make knifes-new ID=K000123 name=... title=... LOCALE=sk" "Vytvorí kostru nového KNIFE – SK"
	@printf " %-40s | %s\n" "make knifes-new ID=K000123 name=... title=... LOCALE=en" "Vytvorí kostru nového KNIFE – EN"
	@printf " %-40s | %s\n" "make knifes-new ID=K000123 name=... title=... LOCALE=sk EXISTS=replace" "Znovu vygeneruje KNIFE (SK) aj keď priečinok existuje"
	@printf " %-40s | %s\n" "make knifes-overview" "Zregeneruje prehľady SK (default)"
	@printf " %-40s | %s\n" "make knifes-overview LOCALE=en" "Zregeneruje prehľady EN"
	@printf " %-40s | %s\n" "make knifes-overview KNIFE_DEBUG=1" "Spustí prehľady s --debug (diagnostika zberu položiek)"
	@printf " %-40s | %s\n" "make knifes-build-dry" "CSV → MD build (DRY) podľa configu"
	@printf " %-40s | %s\n" "make knifes-build-apply" "CSV → MD build (APPLY) podľa configu"
	@printf " %-40s | %s\n" "make S21-sdlc-new SDLC_NAME=integration SDLC_TITLE='Integration Project' LOCALE=sk" "Vytvorí novú SDLC inštanciu – SK"
	@printf " %-40s | %s\n" "make S21-sdlc-new SDLC_NAME=integration SDLC_TITLE='Integration Project' LOCALE=en" "Vytvorí novú SDLC inštanciu – EN"
	@printf " %-40s | %s\n" "make Q21-q12-new Q12_NAME=mgmt Q12_TITLE='Q12 Management Layer' LOCALE=sk" "Vytvorí novú Q12 inštanciu – SK"
	@printf " %-40s | %s\n" "make Q21-q12-new Q12_NAME=mgmt Q12_TITLE='Q12 Management Layer' LOCALE=en" "Vytvorí novú Q12 inštanciu – EN"
	@printf " %-40s | %s\n" "make S31-sthdf-new STHDF_NAME=sthdf_2025 STHDF_TITLE='STHDF 2025/2026' LOCALE=sk" "Vytvorí novú STHDF inštanciu – SK"
	@printf " %-40s | %s\n" "make S31-sthdf-new STHDF_NAME=sthdf_2025 STHDF_TITLE='STHDF 2025/2026' LOCALE=en" "Vytvorí novú STHDF inštanciu – EN"
	@printf "\n"
	@printf " %-40s | %s\n" "make doctor" "Rýchla diagnostika prostredia"
	@printf " %-40s | %s\n" "make print-vars" "Vypíše dôležité premenné"
	@printf " %-40s | %s\n" "make print-locale" "Zobrazí LOCALE a DS_LOCALE"
	@printf " %-40s | %s\n" "make mode" "Zobrazí zvolený deploy režim"

help+: help-examples


# ─────────────────────────────────────────────────────────
# SDLC / Q12 – scaffold cez univerzálny generátor
# ─────────────────────────────────────────────────────────
.PHONY: S21-sdlc-new S31-sthdf-new Q21-q12-new

# SDLC / Q12 / STHDF – scaffold cez univerzálny generátor
S21-sdlc-new: ## SDLC: vytvor novú SDLC inštanciu (SDLC_NAME=..., SDLC_TITLE=...)
	@if [ -z "$(SDLC_NAME)" ] || [ -z "$(SDLC_TITLE)" ]; then \
		echo "❌ Usage: make S21-sdlc-new SDLC_NAME=integration SDLC_TITLE='Integration Project' LOCALE=sk"; \
		exit 1; \
	fi
	@mkdir -p "$(SDLC_DIR)"
	@python3 core/scripts/tools/new_item_instance.py \
		--type sdlc \
		--id "$(SDLC_NAME)" \
		--name "$(SDLC_NAME)" \
		--title "$(SDLC_TITLE)" \
		--locale "$(LOCALE)" \
		--config config/sdlc/sdlc_config.yml \
		--exists "$(EXISTS)"
	@echo "✅ SDLC created: $(SDLC_DIR)/sdlc_$(SDLC_NAME)"

Q21-q12-new: ## Q12: vytvor novú Q12 inštanciu (Q12_NAME=..., Q12_TITLE=...)
	@if [ -z "$(Q12_NAME)" ] || [ -z "$(Q12_TITLE)" ]; then \
		echo "❌ Usage: make Q21-q12-new Q12_NAME=mgmt Q12_TITLE='Q12 Management Layer' LOCALE=sk"; \
		exit 1; \
	fi
	@mkdir -p "$(Q12_DIR)"
	@python3 core/scripts/tools/new_item_instance.py \
		--type q12 \
		--id "$(Q12_NAME)" \
		--name "$(Q12_NAME)" \
		--title "$(Q12_TITLE)" \
		--locale "$(LOCALE)" \
		--config config/q12/q12_config.yml \
		--exists "$(EXISTS)"
	@echo "✅ Q12 created under: $(Q12_DIR)"
# ─────────────────────────────────────────────────────────
# ROADMAP / sthdf
# ─────────────────────────────────────────────────────────
S31-sthdf-new: ## STHDF: vytvor novú STHDF inštanciu (STHDF_NAME=..., STHDF_TITLE=...)
	@if [ -z "$(STHDF_NAME)" ] || [ -z "$(STHDF_TITLE)" ]; then \
		echo "❌ Usage: make S31-sthdf-new STHDF_NAME=sthdf_2025 STHDF_TITLE='STHDF 2025/2026' LOCALE=sk"; \
		exit 1; \
	fi
	@mkdir -p "$(STHDF_DIR)"
	@python3 core/scripts/tools/new_item_instance.py \
		--type sthdf \
		--id "$(STHDF_NAME)" \
		--name "$(STHDF_NAME)" \
		--title "$(STHDF_TITLE)" \
		--locale "$(LOCALE)" \
		--config config/sthdf/sthdf_config.yml \
		--exists "$(EXISTS)"
	@echo "✅ STHDF created: $(STHDF_DIR)/sthdf_$(STHDF_NAME)"
# ─────────────────────────────────────────────────────────
# ROADMAP / TODO – placeholdery (neblokujú CI)
# ─────────────────────────────────────────────────────────
.PHONY: S11-sdlc-dry S12-sdlc-apply T11-thesis-dry T12-thesis-apply Q11-q12-dry Q12-q12-apply \
        I10-i18n-extract I20-i18n-merge \
        NAV10-rebuild-sidebars NAV20-rewrite-links \
        ADMIN-ui

S11-sdlc-dry: ## 🚧 SDLC scaffold (DRY) – zatiaľ neimplementované
	@echo "🚧 SDLC scaffold (DRY) – zatiaľ neimplementované"

S12-sdlc-apply: ## 🚧 SDLC scaffold (APPLY) – zatiaľ neimplementované
	@echo "🚧 SDLC scaffold (APPLY) – zatiaľ neimplementované"

T11-thesis-dry: ## 🚧 Thesis scaffold (DRY) – zatiaľ neimplementované
	@echo "🚧 Thesis scaffold (DRY) – zatiaľ neimplementované"

T12-thesis-apply: ## 🚧 Thesis scaffold (APPLY) – zatiaľ neimplementované
	@echo "🚧 Thesis scaffold (APPLY) – zatiaľ neimplementované"

I10-i18n-extract: ## 🚧 i18n extract – zatiaľ neimplementované
	@echo "🚧 i18n extract – zatiaľ neimplementované"

I20-i18n-merge: ## 🚧 i18n merge – zatiaľ neimplementované
	@echo "🚧 i18n merge – zatiaľ neimplementované"

NAV10-rebuild-sidebars: ## 🚧 Rebuild sidebars – zatiaľ neimplementované
	@echo "🚧 Rebuild sidebars – zatiaľ neimplementované"

NAV20-rewrite-links: ## 🚧 Rewrite internal links – zatiaľ neimplementované
	@echo "🚧 Rewrite internal links – zatiaľ neimplementované"

ADMIN-ui: ## 🚧 Webová admin konzola – zatiaľ neimplementované
	@echo "🚧 Webová admin konzola – zatiaľ neimplementované"
Q11-q12-dry: ## 🚧 Q12 scaffold (DRY) – zatiaľ neimplementované
	@echo "🚧 Q12 scaffold (DRY) – zatiaľ neimplementované"

Q12-q12-apply: ## 🚧 Q12 scaffold (APPLY) – zatiaľ neimplementované
	@echo "🚧 Q12 scaffold (APPLY) – zatiaľ neimplementované"