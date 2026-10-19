# ------------------------------------------------------------
# mk/common.mk — spoločné premenné, sync, build, hosting profily
# Verzia: v1.0 • 2025-10-12 18:23:43 UTC
# Autor: STHDF / KNIFE
# Účel: centralizované premenné, cesty content→publishing, build & serve,
#       a profilové buildy pre rôzne hostingy (GH Pages, Netlify, Vercel…)
# ------------------------------------------------------------

# ====== ZÁKLADNÉ PREMENNÉ (upraviť podľa potreby) ======
LOCALE        ?= sk
YEAR          ?= 2025
CLASS_CODE    ?= ST
STUDENT_ID    ?= xxxx

# SSOT obsah (Content) a cieľ pre publikovanie (Docusaurus)
CONTENT_DIR      ?= content/docs
PUBLISHING_DIR   ?= publishing/docusaurus
PUBLISHING_DOCS  := $(PUBLISHING_DIR)/docs

# Docusaurus paths
BUILD_DIR := $(PUBLISHING_DIR)/build
DOCS_DIR  ?= $(PUBLISHING_DOCS)

# Študentský koreň (pre scaffoldy)
STUDENT_ROOT  ?= $(CONTENT_DIR)/$(LOCALE)/$(YEAR)_$(CLASS_CODE)_$(STUDENT_ID)
DELIV_DIR     := $(STUDENT_ROOT)/deliverables
WORK_DIR      := $(STUDENT_ROOT)/work

# Šablóny (SSOT)
TEMPLATES_DIR ?= core/templates/content
TPL_SDLC_V9   ?= $(TEMPLATES_DIR)/sdlc/project-summary-sdlc-v9
TPL_7DS       ?= $(TEMPLATES_DIR)/7ds
TPL_KNIFE     ?= $(TEMPLATES_DIR)/knife

# Build nastavenia
MINIFY ?= 1
BUILD_EXTRA :=
ifeq ($(MINIFY),0)
  BUILD_EXTRA := --no-minify
endif

# Hosting profil (gh | netlify | vercel | cloudflare)
HOST ?= gh

.PHONY: help-common
help-common:
	@echo "——— common.mk ———"
	@echo "Premenné: LOCALE=$(LOCALE) YEAR=$(YEAR) CLASS_CODE=$(CLASS_CODE) STUDENT_ID=$(STUDENT_ID)"
	@echo "Cesty: CONTENT_DIR=$(CONTENT_DIR) → PUBLISHING_DOCS=$(PUBLISHING_DOCS)"
	@echo "Profil hostingu: HOST=$(HOST)"
	@echo "Ciele: SY01-sync-content, SY02-clean-publishing, I10-install, D10-dev, B10-build, B11-build-fast, R10-serve, C10-clean, P10-host-print, P11-configure-baseurl, P20-build-profile"

# ====== SYNC: Content (SSOT) → Publishing (build source) ======
.PHONY: SY01-sync-content SY02-clean-publishing
## SY01-sync-content: zosynchronizuje content/ → publishing/docusaurus/docs/
SY01-sync-content:
	rsync -a --delete \
	  --exclude '.DS_Store' \
	  --exclude '_meta' \
	  $(CONTENT_DIR)/ $(PUBLISHING_DOCS)/

## SY02-clean-publishing: vyčistí dočasné adresáre v publishing
SY02-clean-publishing:
	rm -rf $(PUBLISHING_DIR)/.docusaurus $(BUILD_DIR)

# ====== Docusaurus (beží v priečinku publishing/docusaurus) ======
.PHONY: I10-install D10-dev C10-clean B10-build B11-build-fast R10-serve
I10-install:
	cd $(PUBLISHING_DIR) && npm install

D10-dev:
	cd $(PUBLISHING_DIR) && BUILD_DATE="$$(date -u '+%Y-%m-%d %H:%M:%S UTC')" NODE_OPTIONS=--max-old-space-size=8192 npm start

C10-clean:
	cd $(PUBLISHING_DIR) && npm run clear || true
	rm -rf $(PUBLISHING_DIR)/.docusaurus $(BUILD_DIR)

B10-build:
	cd $(PUBLISHING_DIR) && BUILD_DATE="$$(date -u '+%Y-%m-%d %H:%M:%S UTC')" NODE_OPTIONS=--max-old-space-size=8192 npm run build -- $(BUILD_EXTRA)

B11-build-fast:
	$(MAKE) B10-build MINIFY=0

R10-serve:
	cd $(PUBLISHING_DIR) && npm run serve

# ====== Hosting profily ======
.PHONY: P10-host-print P11-configure-baseurl P20-build-profile
## P10-host-print: zobrazí nastavený HOST profil
P10-host-print:
	@echo "HOST=$(HOST)"
	@echo "Tip: GH Pages → baseUrl='/$$(basename $$(git rev-parse --show-toplevel))/' | Netlify/Vercel/Cloudflare → baseUrl='/'"

## P11-configure-baseurl: prepíše baseUrl v docusaurus.config.ts podľa HOST
P11-configure-baseurl:
	@test -f "$(PUBLISHING_DIR)/docusaurus.config.ts" || (echo "❌ Chýba docusaurus.config.ts"; exit 2)
	@if [ "$(HOST)" = "gh" ]; then \
	  BASE="/$$(basename $$(git rev-parse --show-toplevel))/"; \
	else \
	  BASE="/"; \
	fi; \
	sed -E -i '' "s|baseUrl: .*|baseUrl: '$${BASE}',|" $(PUBLISHING_DIR)/docusaurus.config.ts; \
	echo "✅ baseUrl → $${BASE}"

## P20-build-profile: sync → configure baseUrl → build
P20-build-profile: SY01-sync-content P11-configure-baseurl B10-build
