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

# Project Summary — PlantSignal

## 1. Project identification

- **Working identifier:** `PRJ-TBD-PlantSignal`; the teacher has not assigned a project number yet.
- **Course:** Systemic Thinking in IT & Digital Fabrication, 2026–2027.
- **Repository:** https://github.com/figaro112/plant-signal (public at the last GitHub verification).
- **Stage:** concept; not yet approved or physically validated.

PlantSignal is a desk plant pot concept that uses a capacitive soil probe and red/green LEDs to remind the user to check watering. The physical design combines a purchased liner and saucer with a printed sleeve, removable probe clip and separate controller enclosure.

## 2. Team

| ST ID | Member | Proposed responsibility | Competencies |
|---|---|---|---|
| Not assigned | Marek Hužvar | CAD and print preparation | To be supplied by member |
| Not assigned | Matuš Plško | Electronics and later controller implementation | To be supplied by member |
| Not assigned | Richard Sič | Calibration, verification and presentation | To be supplied by member |

Responsibilities are proposals, not confirmed assignments.

## 3. Motivation

The concept addresses forgotten watering with a visible reminder and offers a manageable physical project for three students. The team can learn design iteration, sensing and evidence-based validation while producing an object for a desk.

## 4. Goal and added value

The intended MVP is one assembled pot reminder, calibrated for a selected plant and substrate, with documented limitations. Success would mean reproducibly distinguishing the chosen dry and watered reference conditions, a stable indicator and a mechanically usable assembly. Exact thresholds and acceptance tolerances will be agreed after initial measurements.

## 5. Proposed solution

- Purchased plant liner and watertight saucer.
- Four printed components: sleeve, probe clip, enclosure base and lid.
- Proposed Arduino Uno R3, capacitive analog probe, two LEDs and USB power.
- Manual watering; no pump, app, Wi-Fi or cloud in the first version.

[Full concept and component list](../../../../../../../docs/CONCEPT.en.md)

## 6. Project plan

| Milestone | Deliverable | Current state |
|---|---|---|
| M1 | Agree scope, assign roles and identify available hardware | Pending |
| M2 | Measure components and revise CAD | Digital first concept exists; real measurements pending |
| M3 | Bench-test the chosen probe and LEDs | Not started |
| M4 | Print, assemble and calibrate | Not started |
| M5 | Repeat tests, publish KNIFEs and demonstrate | Not started |

Weekly capacity, milestone dates and the final deadline must be agreed with the team and teacher; no commitment is invented here.

## 7. User and value

The intended user keeps one small plant on a desk and wants a visible reminder. The project can also demonstrate fabrication and measurement in the lab. Demand, willingness to pay and market advantage have not been researched.

## 8. Expected outputs

- One physical prototype, if the project proceeds.
- Editable CAD, exported STL parts and assembly visuals.
- A documented sensor experiment and calibrated reminder.
- Team documentation, KNIFE contributions, presentation and individual reflections.

## Context and references

- [Digital CAD concept KNIFE](../../../../knifes/K-LOCAL-001-PlantSignal-3D-Concept/index.md)
- [DFRobot probe documentation](https://wiki.dfrobot.com/sen0193/) — an example sensor, not a claim that all generic V1.2 probes have the same specifications.
- [Course repository setup guide](https://knifes.systemthinking.sk/sk/knifes/K000119-klon-triedneho-repozitara/).

## Risks and dependencies

Actual hardware and printer access are unconfirmed. Probe readings depend on substrate and placement. The controller and sensor electronics must stay outside water exposure. The current enclosure and clip are dimension assumptions, not demonstrated fits. The team should verify project overlap with classmates before committing to implementation.

## 9. Learning and next step

Review this summary, confirm the project direction, check lab stock and choose the actual liner, saucer, controller and probe. Possible extensions belong after the first reminder works reliably.

[Deliverables](../index.md)
