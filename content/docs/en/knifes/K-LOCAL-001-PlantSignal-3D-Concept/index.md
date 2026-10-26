---
# 🧩 Versioning – systém dopĺňa automaticky
fm_version: "1.0.1"

# Dátum buildu – generuje skript
fm_build: "2026-10-19T12:19:51.051809+00:00"

# Poznámka k verzii – voliteľné
fm_version_comment: ""


# 🆔 IDENTITY --------------------------------------------------------

# ID generuje CLI / skript
id: "K-LOCAL-001"

# Unikátne UUID – generuje skript
guid: "1c83d56a-f2cc-4b42-97b5-bb0787de16dc"


# 🧭 CONTEXT ---------------------------------------------------------

# DAO / doména (knife, sdlc, q12, 7ds...) dopĺňa skript
dao: "knife"

# Názov zápisu – dopĺňa používateľ
title: "Preparing a measurable 3D pot concept"

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

# Preparing a measurable 3D pot concept — design 03

**K-LOCAL-001, repository-local draft.** Updated 26 October 2026. No allocated global course number, physical fit test or working device is claimed.

## Purpose

Turn a disconnected component sketch into a coherent product concept while retaining actual editable geometry for review.

## Principle

Use one rounded outer enclosure for the planting chamber, reservoir bay and service area. Separate five mechanical components and keep reference objects distinct from manufacturing parts. Present photorealistic concept art and actual CAD views with clear provenance.

## Application and quick guide

1. Open [the current model guide](../../../../../models/v3/README.md) and the actual [GLB assembly](../../../../../models/v3/assembly.glb).
2. Rotate/explode the model in the local viewer and inspect the five STL components.
3. Review the [exact CAD source](../../../../../models/v3/build_model.py) or the OpenSCAD counterpart.
4. Measure real tank, pot/liner, controller, pump and connectors, then revise fit and printing strategy.

## Detailed article and observed digital results

The body footprint is 230 × 160 mm with a Ø134 mm planting cavity; the refill lid reaches 162 mm high. The small rear cover adds about 2 mm depth. The design exports main shell, base plinth, refill lid, rear service cover and sensor holder. Product status LEDs remain absent; the narrow front feature is a passive viewing-window concept.

Each exported STL was reloaded with positive volume, a closed surface and one connected solid. The actual GLB loaded in a WebGL viewer and the exploded control changed the scene. See [the mesh report](../../../../../models/v3/mesh-validation.json) and [preview verification](../../../../../docs/DESIGN_PREVIEW.en.md).

## Tips and notes

The studio image was generated with imagegen and is not a literal CAD render or a photo of a built unit. The optional plant, reservoir, water, window, liner, pump and controller meshes are reference objects. Internal tank selection, leak/siphon behavior, fasteners, print supports/orientation and physical operation require experiments. OpenSCAD compilation was not performed; the Boolean Python source produced the exports.

## Value

The team can review a plausible integrated form, inspect real downloadable geometry and see the app design direction without confusing those artifacts with a working connected product.

## References

- [Model guide](../../../../../models/v3/README.md)
- [Product-image provenance and prompt](../../../../../assets/product/generation-notes.md)
- [Design and scope record](../../../../../docs/SCOPE_CHANGELOG.en.md)
