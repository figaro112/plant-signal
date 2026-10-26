# PlantSignal 🌱 — STHDF 2026–2027

**Mobile-connected plant care with sensor readings, photo-based guidance and automatic watering.**

**Design 03 — integrated planter and first app screens · 26 October 2026.**

![PlantSignal industrial-design visualization](assets/hero.png)

*Studio visualization. [Actual editable CAD and 3D downloads](models/v3/README.md) · [Image provenance](assets/product/generation-notes.md).*

## First app screens

![PlantSignal first app designs](assets/app/app-screens-v1.png)

Five initial designs: **My plants, Plant detail, Care assistant, Watering and Plant profile**. The [clickable HTML prototype](prototypes/app/index.html) supports navigation, local profile edits and simulated feedback. [Screens, instructions and verification](docs/DESIGN_PREVIEW.en.md). All data and advice are illustrative; the prototype is not connected to hardware or a provider API.

**Team:** Marek Hužvar · Matuš Plško · Richard Sič  
**Working project ID:** `PRJ-TBD-PlantSignal` — no official project number assigned yet.  
**Status:** industrial design, editable CAD and a clickable UI design prototype. Real mobile/backend integration, firmware, irrigation and physical tests are not implemented.

**Repository:** [figaro112/plant-signal](https://github.com/figaro112/plant-signal), public at the last GitHub verification.

This repository follows the [official STHDF class template](https://github.com/06-STH-Projects/2026_sthdf_class_template) referenced by [K000119 — class repository setup](https://knifes.systemthinking.sk/sk/knifes/K000119-klon-triedneho-repozitara/). PlantSignal's own history is retained; CAD has evolved into integrated design 03. Upstream Git history is not imported.

**[English project dashboard →](content/docs/en/sthdf/PRJ-TBD-PlantSignal/index.md)** · **[Slovenský rozcestník →](content/docs/sk/sthdf/PRJ-TBD-PlantSignal/index.md)** · **[Slovenské zhrnutie →](docs/PROJECT_BRIEF.sk.md)**

## Seven required sections

| # | Deliverable | Current state |
|---|---|---|
| 01 | [About Me](content/docs/en/sthdf/PRJ-TBD-PlantSignal/students/about-me/index.md) | Three member profiles; personal details and ST IDs pending |
| 02 | [Knowledge Contribution](content/docs/en/sthdf/PRJ-TBD-PlantSignal/students/knowledge-contribution/index.md) | Two local KNIFE drafts |
| 03 | [Project Summary](content/docs/en/sthdf/PRJ-TBD-PlantSignal/students/project-summary/index.md) | Scope, team, proposed milestones and risks |
| 04 | [Project Outcomes](content/docs/en/sthdf/PRJ-TBD-PlantSignal/students/project-outcomes/index.md) | Digital outputs; physical results pending |
| 05 | [Pitch Presentation](content/docs/en/sthdf/PRJ-TBD-PlantSignal/students/pitch-presentation/index.md) | Draft outline; no completed slide deck |
| 06 | [Final Presentation](content/docs/en/sthdf/PRJ-TBD-PlantSignal/students/final-presentation/index.md) | Not started |
| 07 | [Reflexia / Reflection](content/docs/en/sthdf/PRJ-TBD-PlantSignal/students/reflexia/index.md) | Prompts for each member; not started |

## Project work and physical concept

- [7Ds — management and learning](content/docs/en/sthdf/PRJ-TBD-PlantSignal/projects/7ds/index.md)
- [SDLC — technical lifecycle](content/docs/en/sthdf/PRJ-TBD-PlantSignal/projects/sdlc/index.md)
- [Q12 — product and value perspectives](content/docs/en/sthdf/PRJ-TBD-PlantSignal/projects/q12/index.md)
- [Full concept and component list](docs/CONCEPT.en.md)
- [Integrated 3D model and STL downloads](models/v3/README.md)
- [Interactive 3D viewer](prototypes/model/index.html) · [App design guide](docs/DESIGN_PREVIEW.en.md)
- [GLB assembly](models/assembly-concept.glb) · [Editable OpenSCAD](models/plant-signal.scad)

The target system combines a sensor-equipped pot and refillable water reservoir in one integrated enclosure, linked to a mobile app. The device automatically doses water; the normal watering task for the owner is refilling the tank. The app stores a plant species/type profile, readings and history, sends notifications and accepts photos/questions for care guidance through an external API. Product status LEDs and their enclosure openings have been removed.

Proposed implementation: a Wi-Fi-equipped ESP32 DevKit, soil-moisture and low-water sensing, a pump with suitable driver/power, and a backend for data, push and provider credentials. Watering is controlled locally with calibrated limits, independently of an open phone app or the photo service. Board, framework, providers and dose parameters are unselected.

- [Proposed architecture](docs/ARCHITECTURE.en.md)
- [Mobile app features](docs/APP_FEATURES.en.md)
- [Watering control and planned tests](docs/WATERING_CONTROL.en.md)
- [Scope change record](docs/SCOPE_CHANGELOG.en.md)

## KNIFE contributions

- [K-LOCAL-001 — preparing a measurable 3D pot concept](content/docs/en/knifes/K-LOCAL-001-PlantSignal-3D-Concept/index.md)
- [K-LOCAL-002 — adapting an existing project to STHDF](content/docs/en/knifes/K-LOCAL-002-STHDF-Repository-Setup/index.md)

These are repository-local draft identifiers, not allocated global KNIFE numbers. No hardware experiment or completed personal contribution is claimed. The original [simple KNIFE template](knives/TEMPLATE.md) is retained for reference.

## Repository layout

```text
content/docs/en/sthdf/PRJ-TBD-PlantSignal/
  index.md              Project dashboard
  students/             Seven sections and member profiles
  projects/7ds/         Management and learning
  projects/sdlc/        Nine-stage technical lifecycle
  projects/q12/         Product and value perspectives
content/docs/en/knifes/ Two local project KNIFEs and upstream reference index
content/docs/sk/sthdf/  Slovak entry point
core/                  Official tools and source templates
config/plant-signal/   Project-specific metadata and generator settings
publishing/docusaurus/ Optional documentation renderer
models/                Current CAD, five STL parts and GLB assembly
assets/                Current concept illustrations
docs/                  Concept, Slovak brief and migration record
```

Imported examples are reference material, not team achievements. Unstarted project sections are explicitly marked as planning placeholders.

## Checks and optional documentation preview

```sh
python tools/check-plant-signal.py
python tools/prepare-plant-signal-site.py
cd publishing/docusaurus
npm ci
npm run build -- --config docusaurus.plant-signal.config.ts
```

The optional configuration renders only this project's documentation and does not deploy a website. Upstream generator instructions are retained in [STHDF_TEMPLATE_README.md](docs/STHDF_TEMPLATE_README.md); its original relative links refer to the upstream repository.

## Next steps

1. Obtain the official project number and individual ST roster IDs; replace temporary identifiers consistently.
2. Complete personal profiles, agree responsibilities and review project scope.
3. Choose controller/sensors, pump, tank, mobile framework and API provider; check lab stock and measure actual hardware before printing.
4. Implement and test; add real evidence and personal reflections as work progresses.
5. Share the repository link as instructed. The teacher handles class-dashboard integration; this repository does not push to the template or class repository.

No mobile app, backend, firmware or external API integration is included. GitHub currently reports the repository as public; this migration did not change its visibility. No separate website is published. The source can be cloned with:

```sh
git clone https://github.com/figaro112/plant-signal.git
```

## Provenance

Imported template snapshot: `d30dd1dfe166e97d95ad7ffca26d84ca73fa2b64`. See [migration notes](docs/TEMPLATE_MIGRATION.md). Upstream code retains its [MIT license](LICENSE); documentation attribution is retained with [LICENSE-DOCS](LICENSE-DOCS). The original FM-Core remains unchanged, with separate project metadata settings.
