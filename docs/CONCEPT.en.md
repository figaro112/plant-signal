# PlantSignal 🌱

**A desk plant pot that tells you when its soil is getting dry.**

![PlantSignal concept: printed sleeve, removable soil probe and separate LED status module](../assets/hero.png)

> **Status: project idea / concept 01.** Prepared for a team discussion on **20 October 2026**. The CAD model has not been printed or fitted to real hardware. Electronics, firmware and measurements have not been implemented.

**Team:** Marek Hužvar · Matuš Plško · Richard Sič  
**[Slovenské zhrnutie na stretnutie →](../docs/PROJECT_BRIEF.sk.md)** · **[3D files →](../models/README.md)** · **[KNIFE template →](../knives/TEMPLATE.md)**

## The idea

It is easy to forget a small plant on a busy desk. PlantSignal would monitor the moisture of its substrate and display a simple reminder:

- 🔴 **Red:** the calibrated dry threshold has been reached; check whether the plant needs watering.
- 🟢 **Green:** the reading is above the selected moisture threshold.

The intended first version uses a **capacitive soil moisture sensor**, an **Arduino Uno R3** and **two LEDs**, powered over USB. A printed sleeve gives the project its own appearance; a removable clip holds the probe; a separate enclosure keeps the controller away from the pot and saucer. Watering remains manual.

This is a prototype reminder for one selected plant and substrate. It is not a precision soil-water instrument, and green does not mean that every growing condition is healthy.

## The physical concept

| Part | Purpose | Concept dimensions |
|---|---|---|
| Printed outer sleeve | Decorative cover around a purchased pot and saucer | Ø144 × 130 mm; Ø138 mm cavity; 3 mm wall and floor |
| Purchased inner pot | Holds the substrate and plant | Assumed maximum Ø120 × 110 mm |
| Purchased saucer | Collects drainage water inside the sleeve | Assumed maximum Ø128 × 15 mm |
| Removable sensor clip | Holds the probe at a repeatable depth | 6 mm rim gap; 25 × 3.2 mm probe slot |
| Electronics base | Separate tabletop box for the controller | 100 × 68 × 35 mm; 3 mm walls |
| Electronics lid | Carries two status LEDs | 100 × 68 × 3 mm; two Ø5.3 mm LED holes |

The sleeve has four drain holes and **must not be treated as a watertight container**. Use a bought watertight saucer and keep the sleeve on a surface that tolerates accidental drips. The electronics enclosure is not waterproof.

![Exploded view of the four printable concept parts](../assets/parts-render.png)

**[Download STL parts](../models/stl/)** · **[Editable OpenSCAD source](../models/plant-signal.scad)** · **[3D assembly in GLB format](../models/assembly-concept.glb)**

The GLB includes illustrative objects for the plant, liner, soil, sensor and LEDs. Only the four STL files represent printable parts. Hole sizes, connector positions, board mounting and clip retention need checking against purchased hardware.

## What we would need

| Item | Quantity | Notes |
|---|---:|---|
| Arduino Uno R3 | 1 | Check whether the lab can lend one; another board would require adapting the enclosure |
| Capacitive analog soil moisture sensor | 1 + optional spare | Choose a specific variant before finalizing voltage, wiring and probe dimensions |
| Red LED + green LED | 1 each | Concept assumes 5 mm round LEDs |
| 330 Ω resistors | 2 | One for each LED in the proposed Uno circuit |
| Breadboard + jumper wires | 1 set | Prototype without soldering |
| USB cable + suitable USB power supply | 1 each | Match the actual board connector |
| Pot, saucer, substrate and plant | 1 set | Measure the real pot and saucer before printing |
| PLA or PETG filament | As needed | For an indoor concept; verify printer settings locally |
| Enclosure screws | 4 | Concept uses Ø3.4 mm lid clearance holes and Ø2.6 mm pilot holes; trial-fit the selected screws |

**Sensor price reference, checked on 19 October 2026:** [Drotik Elektro lists a V1.2 analog capacitive probe at €1.35 including VAT](https://www.drotik-elektro.sk/arduino-platforma/4875-podny-analogovy-vlhkomer-s-antikoroznou-sondou-v1.2.html), excluding delivery. It is a generic alternative to the DFRobot SEN0193, not the same product. Prices, availability and specifications may change. The full project budget is still to be agreed after checking lab stock.

## Why this fits the course

- **Physical output:** a designed, printed and assembled desk object.
- **Sensing and measurement:** observe how a probe responds to the selected substrate.
- **System modelling:** describe the user, components, states and interfaces before implementation.
- **Iteration:** improve the clip, enclosure and threshold using evidence from the prototype.
- **Knowledge sharing:** publish short English KNIFE entries with real observations, photos and model revisions.

Use the modelling tools requested by the course for the system model when implementation starts. This repository currently contains the idea and mechanical concept only.

## Suggested team split — to agree together

| Team member | Proposed focus | Possible KNIFE topic |
|---|---|---|
| Marek Hužvar | CAD, print preparation and mechanical fit | Designing a removable probe clip |
| Matuš Plško | Sensor connection and later Arduino implementation | Reading a capacitive soil sensor |
| Richard Sič | Calibration, experiments and presentation | Selecting and validating a dry threshold |

Everyone contributes to requirements, assembly and shared documentation. These are proposed roles, not confirmed assignments.

## A manageable first version

1. **Agree on the concept.** Choose one plant, check lab equipment and measure the actual parts.
2. **Prove the sensor on the bench.** Read values in dry and watered samples of the same substrate.
3. **Create the reminder.** Add two LEDs, averaging and a small hysteresis band to avoid flickering near a threshold.
4. **Revise and print.** Fit-test a small clip sample first, then adapt the enclosure and print the remaining parts.
5. **Demonstrate and document.** Record measurements and show how feedback changed the design.

Thresholds must be established for the selected substrate and plant. Any displayed percentage would be a relative calibration scale unless independently validated. No measured threshold is available yet.

## Planned demonstration and evidence

Prepare dry and watered samples of the **same substrate**, with comparable packing and the same probe insertion depth. Let readings settle after moving the probe. Show the raw readings and the corresponding LED state. Repeat the comparison to check that the result is reproducible.

Before calling the project complete, we would want evidence that:

- The purchased components fit and the USB connector is accessible.
- The probe stays at a repeatable depth and its electronics remain above soil and water.
- The dry and watered samples can be distinguished consistently after calibration.
- The light does not flicker around the selected threshold.
- The finished assembly can be carried to a presentation without loose connections.

These are proposed checks, **not completed test results**.

## Decisions for the first team meeting

- Do we all want to build this project?
- Which board, probe and printer are already available in the lab?
- Which plant and pot should the design fit?
- Should the status module remain a separate box or eventually attach to the sleeve?
- What is our budget, first prototype date and final division of work?
- Which teammates should get access to the private GitHub repository, and should it eventually become public?

Possible later extensions: a small display, recorded measurements or automatic watering. The first milestone is a reliable manual-watering reminder.

## References

- [DFRobot SEN0193](https://wiki.dfrobot.com/sen0193/)
- [Arduino Analog Read Serial](https://docs.arduino.cc/built-in-examples/basics/AnalogReadSerial/)
