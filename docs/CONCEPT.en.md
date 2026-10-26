# PlantSignal — functional concept with integrated design 03

**Scope updated: 26 October 2026.** This is a requirements and digital design revision. An interactive HTML UI design prototype exists. No integrated mobile app, firmware, backend, working irrigation or plant-health API connection has been implemented.

![Concept 02](../assets/hero.png)

## Confirmed direction

PlantSignal combines a physical connected plant pot with a mobile app. The user adds a plant and its species/type, sees sensor readings, receives notifications and submits photos and questions for plant-care guidance through an external API. The device waters the plant automatically from a refillable reservoir. The user's normal watering task is to refill that reservoir.

The earlier red/green indicator has been removed. The product has no external status LEDs or LED openings; status and alerts belong in the app.

## Physical system

| Element | Intended purpose | Design state |
|---|---|---|
| Purchased liner and saucer | Hold plant/substrate and collect drainage | Actual sizes and material to choose |
| Integrated shell, base and probe holder | Package the plant, reservoir and dry service area; hold the probe | Concept geometry available; fit untested |
| Soil moisture probe | Provide calibrated substrate readings | Exact probe and calibration pending |
| Reservoir and low-water sensing | Store water and detect when refill is needed | Capacity and sensing method pending |
| Small dosing pump and tubing | Deliver measured watering bursts | Pump, driver, power and flow rate pending |
| Networked controller | Read sensors, apply local watering policy and sync data | Wi-Fi-equipped ESP32 DevKit is a proposal, not a purchased part |
| Dry controller enclosure | House controller and driver away from spills | Solid lid; actual mounting/connector layout pending |

A purchased watertight reservoir is the proposed first implementation. The current model has an internal reservoir bay, rounded fill lid and a passive viewing-window concept; the separate bottle cradle is superseded. The CAD reservoir, pump, window and tubing are illustrative envelopes, not verified hardware choices. Reservoir capacity cannot be inferred from the image.

## Design previews

- [Industrial design, actual CAD and five app screens](DESIGN_PREVIEW.en.md).
- [Actual GLB and STL model](../models/v3/README.md).

The studio visualization is AI-generated; the actual CAD is supplied separately. UI screen captures show a local design prototype with sample data, not a live device or advice service.

## App and service features

- Plant profile with name, manually selected species/type, notes and linked device.
- Current readings with their timestamps, reservoir state and last successful sync.
- History of measurements, watering events and photos.
- Notifications for refill, abnormal moisture, device offline/fault and watering events.
- Photo upload and a question such as “What might be wrong, and what can I do?”.
- Care guidance combining the selected plant, user observations, photos and recent readings, subject to the chosen API's actual capabilities.

Photo guidance is a suggested explanation and action plan, not a demonstrated disease diagnosis. External advice does not directly switch the pump or rewrite watering policy. The plant owner can still need to perform other care suggested by the app; the project automates watering, not every aspect of plant health.

## Proposed architecture and control

The controller performs bounded watering locally. The mobile app uses a backend for records, notifications and external plant-care API calls. The app does not need to remain open for a valid locally configured watering cycle. Cloud or advice-service failure must not start a pump or remove local limits.

- [Architecture and responsibilities](ARCHITECTURE.en.md)
- [App scope and review decisions](APP_FEATURES.en.md)
- [Local watering policy and planned verification](WATERING_CONTROL.en.md)
- [3D files and current dimensions](../models/README.md)

## Incremental implementation plan

1. Confirm the actual pot, reservoir, pump, Wi-Fi controller and sensor parts; measure them and revise CAD.
2. Read sensors and expose timestamped readings in the app; select and save a plant type.
3. Calibrate pump flow and substrate response, then prove the bounded local watering cycle and low-water stop.
4. Add history, device association and notifications through a backend and mobile push service.
5. Connect the photo/question API behind the backend; show failures and unavailable responses clearly.
6. Integrate, test normal and failure cases, document real evidence and present a working physical demo.

The app framework, first mobile platform, backend hosting, push service, plant-data/advice provider, budget and milestones remain to be agreed. No provider account, paid resource or API key has been created. Final scope includes all requested features; staging is an implementation order, not removal of features.

## References

- [Espressif ESP32 documentation](https://www.espressif.com/en/products/socs/esp32/documentation) — one Wi-Fi-capable controller family; verify the selected variant and electrical limits.
- [FCM architecture](https://firebase.google.com/docs/cloud-messaging/fcm-architecture) — an example push service using a trusted server and mobile clients; not yet selected.
- [DFRobot capacitive probe reference](https://wiki.dfrobot.com/sen0193/) — an example sensor; generic probes need their own specifications and calibration.
