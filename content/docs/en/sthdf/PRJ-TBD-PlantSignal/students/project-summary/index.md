---
# 🧩 Versioning – systém dopĺňa automaticky
fm_version: "1.0.1"

# Dátum buildu – generuje skript
fm_build: "2026-10-19T12:19:51.050809+00:00"

# Poznámka k verzii – voliteľné
fm_version_comment: ""


# 🆔 IDENTITY --------------------------------------------------------

# ID generuje CLI / skript

# Unikátne UUID – generuje skript
guid: "752b0fe2-b1ce-4d13-8b90-4bb3b3d1d283"


# 🧭 CONTEXT ---------------------------------------------------------

# DAO / doména (knife, sdlc, q12, 7ds...) dopĺňa skript
dao: "sthdf"

# Názov zápisu – dopĺňa používateľ
title: "Project Summary — PlantSignal"

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

# Project Summary — PlantSignal concept 02

## Identification and team

`PRJ-TBD-PlantSignal` is temporary. Course: STHDF 2026–2027. Repository: https://github.com/figaro112/plant-signal. Marek Hužvar, Matuš Plško and Richard Sič are the three members; ST IDs and individual competencies remain to be supplied.

## Motivation and goal

Connect a physical plant-care prototype to a mobile app and automate routine watering from a user-refilled tank. Provide plant-specific context, sensor history, alerts and access to photo/question-based care guidance. The previous local indicator and manual-watering-only scope are superseded.

## Requested solution

- Plant profile with selected species/type and linked device.
- Soil-moisture readings, reservoir/refill state and timestamped history.
- Automatic watering using a pump and refillable tank, with a locally enforced policy.
- Mobile notifications and an in-app event log.
- Photos and questions sent through a backend to an external plant-care API.
- Integrated enclosure, removable probe holder, fill lid and hidden service compartment; no status LEDs or LED openings.

## Proposed architecture

A Wi-Fi-equipped ESP32 DevKit is a candidate for device control; the exact board is unselected. A backend mediates records, device/app access, push notifications and provider secrets. Watering runs locally with confirmed configuration and valid sensors, independent of the phone or photo service. Advice does not directly operate the pump.

[Architecture](../../../../../../../docs/ARCHITECTURE.en.md) · [Watering behavior](../../../../../../../docs/WATERING_CONTROL.en.md) · [Mobile features](../../../../../../../docs/APP_FEATURES.en.md)

## Suggested workstreams — not confirmed assignments

| Member | Proposed focus |
|---|---|
| Marek Hužvar | Mechanical CAD, tank/tubing layout and physical integration |
| Matuš Plško | Controller, sensors, pump driver and device communications |
| Richard Sič | Mobile/backend integration, notifications and plant-care API |

Everyone shares integration, measurements and documentation. Rebalance the app/backend workload when agreeing the implementation stack.

## Milestones

| Milestone | Intended evidence | State |
|---|---|---|
| M1 — scope and parts | Agree stack, providers, budget and measured hardware | Open |
| M2 — connected readings | One device and plant profile with timestamped sensor data | Not started |
| M3 — bounded watering | Flow calibration, low-water stop, dosing/settling and fault tests | Not started |
| M4 — app services | History, notifications, photos and external advice responses | Not started |
| M5 — complete prototype | Revised prints, integrated demo and real test records | Not started |

Dates, weekly capacity and the final course deadline are not supplied. The order stages the work; it does not remove requested features from the target system.

## Value, outcomes and acceptance

The intended user refills the reservoir during the normal watering routine, sees care status in the app and can request advice. Other plant care can still require human action. Market demand, willingness to pay and rescue effectiveness have not been tested.

Success should include calibrated readings, a demonstrated bounded water dose, empty-tank inhibition, useful timestamped mobile history, a tested notification path and a real or clearly unavailable photo-API response. A CAD render or mock data alone is not an end-to-end result.

## Risks and dependencies

The scope now includes mechanics, embedded control, networking, backend, mobile and an external service. Controller/pump compatibility, voltage levels, flow, substrate calibration, leakage/siphoning, stale data, offline operation, push permissions and API capability/cost must be resolved. Exact numeric limits require experiments. Provider credentials stay out of the app/device/repository.

## Next step

Agree the first mobile platform and framework, choose actual hardware and a photo-capable advice provider, and measure components before printing. Then prove sensing and local dosing before full integration.

[Deliverables](../index.md)

## Design progress

[Integrated mechanical design and five interactive UI designs](../../../../../../../docs/DESIGN_PREVIEW.en.md) are available as prototypes with sample data; runtime hardware/services remain unimplemented.
