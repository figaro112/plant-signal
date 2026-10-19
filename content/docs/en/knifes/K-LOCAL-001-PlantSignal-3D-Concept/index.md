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
modified: "2026-10-19 14:19"

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

# Preparing a measurable 3D pot concept

**Local draft ID:** K-LOCAL-001. A global course KNIFE number has not been allocated. This article records digital preparation only.

## Purpose

Turn the plant reminder idea into inspectable mechanical components before purchasing or assembling hardware.

## Principle

Separate the purchased liner and saucer from the decorative printed sleeve. Put the controller in a separate box and use a removable clip to control probe placement. Keep assumptions visible so a digital illustration is not mistaken for a tested device.

## Application

Use the model to discuss dimensions, part boundaries and access to LEDs and connectors. Measure the actual hardware before changing the concept into a printing release.

## Quick guide

1. Open the [model guide](../../../../../models/README.md).
2. Inspect the [GLB assembly](../../../../../models/assembly-concept.glb) and four separate STL parts.
3. Compare the dimensions with the real liner, saucer, probe and board.
4. Adapt the [OpenSCAD source](../../../../../models/plant-signal.scad), then test a small fit sample before full printing.

## Detailed article and current evidence

The digital sleeve is Ø144 × 130 mm with a Ø138 mm cavity and 3 mm floor. The electronics base is 100 × 68 × 35 mm; its lid is 3 mm thick. The removable clip has a 6 mm rim gap and a 25 × 3.2 mm probe slot.

The [geometry report](../../../../../models/mesh-validation.json) records bounds, volume and triangle count. The exported STLs were reloaded and checked for a closed surface, positive volume and one connected solid per part. This does not establish support requirements, material strength, water resistance, dimensional accuracy or hardware fit. The OpenSCAD source was not command-line compiled; the supplied meshes were generated using equivalent Boolean geometry.

## Tips and notes

The sleeve drains through its floor, so use a separate watertight saucer. Keep probe electronics above soil and water. Connector openings and board mounting need actual measurements. The illustrated plant, liner, probe and LEDs are context objects; they are not extra printable parts.

## Value

The team can review a concrete design and make a measured revision instead of deciding from a picture alone. The next learning contribution should document a real print-fit experiment, including failures.

## References

- [PlantSignal mechanical concept and limitations](../../../../../models/README.md)
- [Concept illustration](../../../../../assets/hero.png)
- [DFRobot SEN0193 documentation](https://wiki.dfrobot.com/sen0193/) — dimensional and electrical reference for one example sensor; verify the actual purchased variant.
