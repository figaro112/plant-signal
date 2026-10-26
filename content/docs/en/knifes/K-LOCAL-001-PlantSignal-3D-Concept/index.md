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

# Preparing a measurable 3D pot concept — revision 02

**Local draft ID: K-LOCAL-001.** Updated 26 October 2026. No global course KNIFE number, physical fit test or working watering system is claimed.

## Purpose

Keep the mechanical design aligned with a changed product scope: mobile status and advice, connected sensors and reservoir/pump watering.

## Principle

Separate printable support/enclosure parts from purchased water-contact hardware. Keep dimensions and illustrative objects explicit. Replace the indicator lid with a solid fastener-only lid and add a dry cradle for a bought reservoir.

## Application

Use the model to review the plant pot, probe position, tank support, dry enclosure and proposed tubing route before choosing hardware and printing. The illustrated pump and tank are reference envelopes, not validated selections.

## Quick guide

1. Open [the current model guide](../../../../../models/README.md) and [GLB assembly](../../../../../models/assembly-concept.glb).
2. Inspect five STL components and the [editable source](../../../../../models/plant-signal.scad).
3. Measure the chosen board, driver, pump, liner, tank and tube fittings.
4. Revise mounting, ports and retention. Fit-test small samples, then verify water routing and local control on actual hardware.

## Detailed article and observed digital results

The initial 19 October concept had four printed components. The 26 October revision retains the sleeve, base and probe clip, removes the two indicator openings from the lid and adds a Ø92 × 20 mm reservoir cradle with Ø84 mm cavity. The lid has four fastener holes only. The existing 100 × 68 mm enclosure footprint is not confirmed for the proposed new hardware.

All five exported meshes were reloaded and checked for positive volume, a closed surface and one connected solid. The lid topology has four through-holes. See [the current mesh report](../../../../../models/mesh-validation.json). No print-fit, electrical or hydraulic result exists. OpenSCAD was not command-line compiled; equivalent Boolean geometry produced the supplied STLs.

## Tips and notes

The tank and saucer must be bought watertight components for the first build. A dry printed cradle is not a tank. Test leaks, siphoning and flow; keep electronics separated. Do not treat the render as a working assembly or claim that a plant has been saved by an unimplemented advice service.

## Value

The team can trace how a scope change affected real digital artifacts and which assumptions still need measurements. A later contribution should report actual flow and print-fit experiments, including failed attempts.

## References

- [Mechanical concept 02](../../../../../models/README.md)
- [Scope changes](../../../../../docs/SCOPE_CHANGELOG.en.md)
- [Watering policy and planned tests](../../../../../docs/WATERING_CONTROL.en.md)
