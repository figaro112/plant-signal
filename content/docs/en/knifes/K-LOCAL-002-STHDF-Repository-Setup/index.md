---
# 🧩 Versioning – systém dopĺňa automaticky
fm_version: "1.0.1"

# Dátum buildu – generuje skript
fm_build: "2026-10-19T12:19:51.052809+00:00"

# Poznámka k verzii – voliteľné
fm_version_comment: ""


# 🆔 IDENTITY --------------------------------------------------------

# ID generuje CLI / skript
id: "K-LOCAL-002"

# Unikátne UUID – generuje skript
guid: "12356f0d-48b9-4dcb-ac44-0308f40960d0"


# 🧭 CONTEXT ---------------------------------------------------------

# DAO / doména (knife, sdlc, q12, 7ds...) dopĺňa skript
dao: "knife"

# Názov zápisu – dopĺňa používateľ
title: "Adapting an existing project to the STHDF template"

# Krátky popis – dopĺňa používateľ (voliteľné)
description: "PlantSignal student project: concept and documentation; physical verification pending."


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
modified: "2026-10-19 14:19"

# Stav dokumentu – default "backlog"
status: "inprogress"

# Viditeľnosť – default "public"
privacy: "private"


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

# Adapting an existing project to the STHDF template

**Local draft ID:** K-LOCAL-002. This is a repository-local contribution, not an allocated global course identifier.

## Purpose

Bring an existing plant reminder concept into the official course documentation structure while retaining its files and project commits.

## Principle

The course guide describes a fresh, independent copy of a template. For an already existing project, import the template files without its `.git` directory into the existing repository. This preserves PlantSignal's own history and avoids importing upstream template history or changing `origin` to the teacher's repository.

## Application

The source is `06-STH-Projects/2026_sthdf_class_template`, snapshot `d30dd1dfe166e97d95ad7ffca26d84ca73fa2b64`. Its STHDF generator created the standard hierarchy under `content/docs/en/sthdf/PRJ-TBD-PlantSignal/`.

## Quick guide

1. Read the [course guide](https://knifes.systemthinking.sk/sk/knifes/K000119-klon-triedneho-repozitara/).
2. Inspect and copy the template source without its Git metadata.
3. Use a project-specific configuration and the official generator with `--exists error`.
4. Fill the seven deliverables with known facts, evidence and clearly marked pending work.
5. Check navigation and metadata before committing to the project's own `origin`.

Do not rerun the generator in replace mode over filled content. The full one-time commands and deviations from a fresh clone are recorded in the [migration record](../../../../../docs/TEMPLATE_MIGRATION.md).

## Detailed article

The seven sections are About Me, Knowledge Contribution, Project Summary, Project Outcomes, Pitch Presentation, Final Presentation and Reflexia. Project work is organized separately into 7Ds, SDLC and Q12. The initial CAD remains in `models/` and its illustrations remain in `assets/`.

`PRJ-TBD-PlantSignal` is explicitly temporary because the team has no official project number. Individual ST roster IDs and personal profiles remain unfilled. The teacher handles import into the class dashboard after receiving the required identifiers and repository link.

## Tips and notes

Imported workflows are reference files with a disabled extension. No deployment or release automation is enabled by this migration. The repository stays private. Upstream content retains attribution and licenses; project-specific configuration is separated from upstream defaults.

## Value

The team can navigate the expected deliverables immediately and add evidence gradually without losing the already prepared concept or pretending that unfinished work is complete.

## References

- [K000119 — clean class-template clone](https://knifes.systemthinking.sk/sk/knifes/K000119-klon-triedneho-repozitara/).
- [Official class template](https://github.com/06-STH-Projects/2026_sthdf_class_template).
- [PlantSignal migration record](../../../../../docs/TEMPLATE_MIGRATION.md).
