# Scope change record

## 26 October 2026 — industrial design 03 and app design 01

The team requested a more realistic product model and initial app screens. Replaced the separated bottle/box presentation with a rounded integrated enclosure, internal reservoir bay, fill lid, passive viewing window and hidden service compartment. Added actual editable CAD and five STL components, a GLB viewer and a photorealistic AI-generated studio visualization with recorded provenance.

Added five authored app design screens, a clickable HTML prototype and browser screenshots. Navigation, profile edits and sample advice/watering feedback work locally; no hardware, backend, real advice API or push notifications are connected. The functional scope below is unchanged.

[Design artifacts and verification](DESIGN_PREVIEW.en.md).

## 26 October 2026 — concept 02

The team changed PlantSignal from a local dry-soil reminder into a mobile-connected plant-care and automatic-watering concept.

**Added to the intended system:** mobile app, species/type profiles, timestamped sensor readings and history, notifications, photos and plant-care questions through an external API, refillable water reservoir and automatic pump watering.

**Removed from the product:** red/green status LEDs, LED holes in the enclosure lid and the requirement for the user to perform routine watering manually.

**Design proposals, not finalized selections:** a native-Wi-Fi ESP32 DevKit, low-water sensing, a backend holding provider credentials and a locally bounded watering policy. Framework, cloud/provider choice, hardware variants and budget remain open.

The CAD concept was revised to a solid electronics lid and an additional dry reservoir cradle. The rendered pump, tank and tubing are reference envelopes only. No app/firmware, API integration, hydraulic test or physical assembly is claimed.

## 19 October 2026 — concept 01 and course structure

Initial sleeve, probe clip and controller enclosure were prepared as digital concept parts. The official STHDF structure was imported while preserving project history. That version used a local indicator and manual watering; it is superseded as the active product scope. Its files remain recoverable through Git history.

The original migration's optional `--check-original-assets` comparison refers to concept 01; current concept 02 intentionally changes those assets. Use the current mesh report and documentation checks for this revision.

[Current concept](CONCEPT.en.md) · [Architecture](ARCHITECTURE.en.md)
