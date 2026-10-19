# ------------------------------------------------------------
# mk/sthdf.mk — scaffold pre triedu STHDF (deliverables + work)
# Verzia: v1.0 • 2025-10-12 18:23:43 UTC
# Autor: STHDF / KNIFE
# ------------------------------------------------------------

.PHONY: help-sthdf
help-sthdf:
	@echo "——— sthdf.mk ———"
	@echo "Študentský scaffold: I01-student-init"
	@echo "Deliverables: D01-aboutme D02-project-summary D03-knowledge D04-outcomes D11-reflection"
	@echo "Work: W01-7ds W02-sdlc"

## I01-student-init: založí adresáre pre študenta (deliverables + work/7ds + work/sdlc)
.PHONY: I01-student-init
I01-student-init:
	@test "$(STUDENT_ID)" != "xxxx" || (echo "❌ Nastav STUDENT_ID=..." && exit 2)
	mkdir -p $(DELIV_DIR) $(WORK_DIR)/7ds $(WORK_DIR)/sdlc
	@echo "# $(YEAR) $(CLASS_CODE) $(STUDENT_ID)" > $(STUDENT_ROOT)/README.md
	@echo "✅ Scaffold OK → $(STUDENT_ROOT)"

## D01-aboutme: AboutMe skeleton alebo template (ak existuje)
.PHONY: D01-aboutme
D01-aboutme:
	mkdir -p $(DELIV_DIR)/01-AboutMe
	@if [ -d "$(TEMPLATES_DIR)/sthdf/about-me" ]; then \
	  rsync -a --ignore-existing $(TEMPLATES_DIR)/sthdf/about-me/ $(DELIV_DIR)/01-AboutMe/; \
	else \
	  echo "# About Me" > $(DELIV_DIR)/01-AboutMe/index.template.md; \
	fi
	@echo "➡️  $(DELIV_DIR)/01-AboutMe"

## D02-project-summary: SDLC v9 scaffold (bez FM)
.PHONY: D02-project-summary
D02-project-summary:
	@test -d "$(TPL_SDLC_V9)" || (echo "❌ Chýba $(TPL_SDLC_V9)"; exit 3)
	rsync -a --ignore-existing $(TPL_SDLC_V9)/ $(DELIV_DIR)/03-ProjectSummary/
	@echo "➡️  $(DELIV_DIR)/03-ProjectSummary"

## D03-knowledge: Knowledge Contribution skeleton
.PHONY: D03-knowledge
D03-knowledge:
	mkdir -p $(DELIV_DIR)/02-KnowledgeContribution
	@if [ -d "$(TEMPLATES_DIR)/sthdf/knowledge" ]; then \
	  rsync -a --ignore-existing $(TEMPLATES_DIR)/sthdf/knowledge/ $(DELIV_DIR)/02-KnowledgeContribution/; \
	else \
	  echo "# Knowledge Contribution" > $(DELIV_DIR)/02-KnowledgeContribution/index.template.md; \
	fi

## D04-outcomes: Project Outcomes skeleton
.PHONY: D04-outcomes
D04-outcomes:
	mkdir -p $(DELIV_DIR)/04-ProjectOutcomes
	@echo "# Project Outcomes" > $(DELIV_DIR)/04-ProjectOutcomes/index.template.md

## D11-reflection: Reflection skeleton
.PHONY: D11-reflection
D11-reflection:
	mkdir -p $(DELIV_DIR)/11-Reflection
	@echo "# Reflection" > $(DELIV_DIR)/11-Reflection/index.template.md

## W01-7ds: pracovný 7Ds strom
.PHONY: W01-7ds
W01-7ds:
	@test -d "$(TPL_7DS)" || (echo "❌ Chýba $(TPL_7DS)"; exit 3)
	rsync -a --ignore-existing $(TPL_7DS)/ $(WORK_DIR)/7ds/

## W02-sdlc: prázdny pracovný SDLC
.PHONY: W02-sdlc
W02-sdlc:
	mkdir -p $(WORK_DIR)/sdlc
	@touch $(WORK_DIR)/sdlc/README.md
