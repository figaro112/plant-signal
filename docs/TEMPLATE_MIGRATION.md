# Migration to the STHDF class template

**Date:** 19 October 2026. **Repository:** [figaro112/plant-signal](https://github.com/figaro112/plant-signal), private, `main`. **Project:** `PRJ-TBD-PlantSignal`, provisional; project and ST roster numbers are not assigned.

## Source

- [K000119 — class-template setup](https://knifes.systemthinking.sk/sk/knifes/K000119-klon-triedneho-repozitara/).
- [Official template snapshot](https://github.com/06-STH-Projects/2026_sthdf_class_template/tree/d30dd1dfe166e97d95ad7ffca26d84ca73fa2b64).
- [Preserved upstream README](STHDF_TEMPLATE_README.md), whose original relative links refer to the upstream source.

Source files were copied from a shallow checkout without its `.git` directory. Existing PlantSignal commits and its own remote were retained. There was no history reset, force push, upstream push or modification of the class repository.

## Adaptations

1. Imported `core/`, `config/`, `content/`, `mk/`, `publishing/`, tools, Makefiles, licenses and reference files.
2. Retained all existing CAD and image bytes. Preserved the long project page as [CONCEPT.en.md](CONCEPT.en.md), rebasing its links.
3. Merged template ignore/attribute rules with project rules. Added settings under `config/plant-signal/`; kept upstream defaults and FM-Core intact.
4. Generated the standard STHDF hierarchy using the official generator. Replaced generic example prose in the project instance with actual facts or explicitly unstarted placeholders.
5. Filled the seven required sections, added three member profile drafts, and kept unknown IDs, personal details and reflections unfilled.
6. Added two repository-local KNIFE drafts and a Slovak entry point. English is the canonical project documentation language.
7. Added project documentation checks and an optional project-only Docusaurus configuration.

## One-time generation

The upstream `make S31-sthdf-new` target wraps the generator below. It was called directly to avoid requiring Make on Windows:

```sh
python core/scripts/tools/new_item_instance.py \
  --type sthdf --id PRJ-TBD-PlantSignal --name PRJ-TBD-PlantSignal \
  --title PlantSignal --locale en \
  --config config/plant-signal/sthdf.en.yml --exists error
```

KNIFE generation used `--type knife`, local IDs `K-LOCAL-001` and `K-LOCAL-002`, and `config/plant-signal/knife.en.yml`. Generated folder names were normalized once to remove a duplicated prefix; IDs and GUIDs were retained. These are setup commands, not updates: do not use `--exists replace` over filled content.

## Publication boundaries

Upstream workflow YAML files were imported with `.disabled` extensions. Their example deployments and releases are inactive. A separate project documentation workflow only checks links, metadata and original assets with read-only repository permissions.

The repository remains private. The optional Docusaurus configuration renders project documents and selected supporting references; it does not deploy or enable GitHub Pages. Unrelated historical examples and `static=broken` remain upstream reference material and are excluded from that preview. Their legacy links and configuration have not been audited or repaired.

## Identifiers and class integration

The team confirmed that no project number has been assigned. `PRJ-TBD-PlantSignal` is temporary, and `K-LOCAL-*` identifiers are local drafts. Once identifiers are allocated, update the folder, `config/plant-signal/project.json`, document metadata and links consistently. The teacher may request separate personal deliverables or repositories; this team scaffold does not assert those are complete.

The teacher handles the class-dashboard import. The team's task is to provide the assigned roster numbers and repository link as instructed. No class-repository synchronization is configured.

## Verification scope

`python tools/check-plant-signal.py` checks seven deliverable paths, private localized front matter, unique GUIDs and project navigation. The migration was additionally checked with `--check-original-assets`, comparing original CAD/image bytes against commit `1315d1f` (text files are compared with normalized line endings). The optional asset check is not required in ongoing CI, so legitimate future CAD revisions remain possible. The checker does not apply the legacy global schema to imported historical examples.

The optional documentation build starts with `python tools/prepare-plant-signal-site.py`. Existing [mesh validation](../models/mesh-validation.json) remains available; digital geometry does not prove physical fit, printability, water resistance or sensor performance.
