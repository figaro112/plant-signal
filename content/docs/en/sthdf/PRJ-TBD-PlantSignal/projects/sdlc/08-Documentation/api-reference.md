---
# 🧩 Versioning – systém dopĺňa automaticky
fm_version: "1.0.1"

# Dátum buildu – generuje skript
fm_build: "2026-10-19T12:19:51.037883+00:00"

# Poznámka k verzii – voliteľné
fm_version_comment: ""


# 🆔 IDENTITY --------------------------------------------------------

# ID generuje CLI / skript

# Unikátne UUID – generuje skript
guid: "08691d0c-44a6-4a5e-9549-fbbf54e502d5"


# 🧭 CONTEXT ---------------------------------------------------------

# DAO / doména (knife, sdlc, q12, 7ds...) dopĺňa skript
dao: "sthdf"

# Názov zápisu – dopĺňa používateľ
title: "api reference"

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
status: "backlog"

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

# API boundaries — proposal

Define authenticated telemetry/event upload, plant/profile access, versioned device configuration, notification events, photo upload and care-question requests. External calls go through a backend. Document timestamps, ownership, deduplication, errors and configuration acknowledgment. Endpoint names and provider schemas remain to be specified; this is not an implemented API.

## Current design references

- [Current concept](../../../../../../../../docs/CONCEPT.en.md)
- [Architecture](../../../../../../../../docs/ARCHITECTURE.en.md)
- [App scope](../../../../../../../../docs/APP_FEATURES.en.md)
- [Watering policy](../../../../../../../../docs/WATERING_CONTROL.en.md)
- [Change record](../../../../../../../../docs/SCOPE_CHANGELOG.en.md)

[Project dashboard](../../../index.md)
