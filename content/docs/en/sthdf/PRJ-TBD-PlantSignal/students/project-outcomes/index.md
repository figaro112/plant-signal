---
# 🧩 Versioning – systém dopĺňa automaticky
fm_version: "1.0.1"

# Dátum buildu – generuje skript
fm_build: "2026-10-19T12:19:51.049819+00:00"

# Poznámka k verzii – voliteľné
fm_version_comment: ""


# 🆔 IDENTITY --------------------------------------------------------

# ID generuje CLI / skript

# Unikátne UUID – generuje skript
guid: "741f3a71-c44e-4ccf-8964-a50c97208da9"


# 🧭 CONTEXT ---------------------------------------------------------

# DAO / doména (knife, sdlc, q12, 7ds...) dopĺňa skript
dao: "sthdf"

# Názov zápisu – dopĺňa používateľ
title: "Project Outcomes"

# Krátky popis – dopĺňa používateľ (voliteľné)
description: "PlantSignal concept 02: mobile plant care, connected sensors and automatic watering; not implemented."


# 👥 AUTHORSHIP ------------------------------------------------------

# Hlavný autor – z globálneho configu
author: "Marek Hužvar; Matuš Plško; Richard Sič"

# Zoznam autorov – generuje skript
authors:
  - "Marek Hužvar"
  - "Matuš Plško"
  - "Richard Sič"


# 🗂 CLASSIFICATION ---------------------------------------------------

# Nadradená kategória – môže doplniť používateľ
category: ""

# Typ dokumentu (guide, case, tutorial...) – používateľ (voliteľné)
type: ""

# Priorita (low/medium/high) – voliteľné
priority: ""

# Tagy – odporúča sa 2–6 tagov.
# Typy tagov:
#   - rámce: knife, 7ds, sdlc, q12
#   - účel: tutorial, guide, pattern, case-study
#   - téma: git, backup, ai, communication
#   - úroveň: beginner, intermediate, advanced
tags: []


# 🌍 LOCALIZATION -----------------------------------------------------

# Jazyk dokumentu – doplní skript podľa štruktúry
locale: "en"


# 🕒 LIFECYCLE --------------------------------------------------------

# Dátum vytvorenia – generuje skript
created: "2026-10-19 14:19"

# Dátum poslednej úpravy – dopĺňa človek
modified: "2026-10-26"

# Stav dokumentu – default "backlog"
status: "inprogress"

# Viditeľnosť – default "public"
privacy: "public"


# ⚖ INTELLECTUAL PROPERTY -------------------------------------------

# Držiteľ práv k obsahu – dopĺňa skript
rights_holder_content: "Marek Hužvar; Matuš Plško; Richard Sič"

# Systémový vlastník práv
rights_holder_system: "CAA / KNIFE / LetItGrow"

# Licencia
license: "CC-BY-4.0"

# Disclaimer
disclaimer: "Use at your own risk. Methods provided as-is; participation is voluntary and context-aware."

# Copyright
copyright: "© 2026 Marek Hužvar; Matuš Plško; Richard Sič"


# 🔗 ORIGIN / PROVENANCE ---------------------------------------------

# Repozitár pôvodu
origin_repo: "06-STH-Projects/2026_sthdf_class_template"

# URL pôvodného repozitára
origin_repo_url: "https://github.com/06-STH-Projects/2026_sthdf_class_template"

# Commit pôvodu
origin_commit: "d30dd1dfe166e97d95ad7ffca26d84ca73fa2b64"

# Branch pôvodu
origin_branch: ""

# Systém pôvodu (CAA/KNIFE/STHDF…)
origin_system: "STHDF"

# Pôvodný autor
origin_author: "Roman Kazička / STHDF template contributors"

# Importovaný zdroj
origin_imported_from: ""

# Dátum importu
origin_import_date: "2026-10-19"


# 🧱 RESERVED ---------------------------------------------------------

fm_reserved1: ""
fm_reserved2: ""
---

# Project Outcomes — current evidence

**Concept 02, 26 October 2026.** Available outputs are documentation, CAD and renders only.

| Available | Evidence | Limit |
|---|---|---|
| Revised system scope | [Concept 02](../../../../../../../docs/CONCEPT.en.md) | Not a working system |
| App and architecture proposal | [Architecture](../../../../../../../docs/ARCHITECTURE.en.md) | No app/backend/provider integration |
| Watering control design | [Policy and planned tests](../../../../../../../docs/WATERING_CONTROL.en.md) | No flow, moisture or hydraulic measurements |
| Five mechanical meshes | [CAD guide](../../../../../../../models/README.md) | No physical fit/printing test |
| Solid controller lid and reservoir cradle | [Parts render](../../../../../../../assets/parts-render.png) | Bought tank/pump/tube envelopes are not final selections |
| Digital mesh checks | [Mesh report](../../../../../../../models/mesh-validation.json) | Closed connected geometry, not proof of physical performance |

There are no implemented readings, automatic doses, mobile screens, notifications, advice API calls, plant-recovery results or completed physical demonstrations. Add real photos, measurements, logs and limitations as implementation proceeds.

[Deliverables](../index.md)
