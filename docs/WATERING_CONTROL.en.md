# Automatic watering — proposed control and verification

**Concept 02, 26 October 2026. Not implemented or physically tested.** The refillable reservoir supplies a pump; the user refills it. The controller decides locally when a bounded watering cycle is allowed. The app, push service and photo-advice API are outside the direct pump-control loop.

## Operating policy to implement

1. Start with the pump off. Require a valid calibration, current trustworthy moisture reading, confirmed local configuration and enough water.
2. Filter several readings. If the calibrated dry trigger is met and the cooldown/budget allows it, deliver one short calibrated dose.
3. Stop after the dose/runtime limit, on low water, on invalid readings or on a stop/fault condition.
4. Wait for water to distribute through the substrate before reassessing. Use separate trigger/stop thresholds to avoid rapid cycling.
5. Record the event and stop reason. Repeat only if still required and all limits permit it. Report refill/fault status and sync when connected.

Do not keep the pump running continuously while waiting for the probe to become wet. Flow rate, dose, maximum runtime, daily budget, settling time and moisture thresholds must come from experiments with the chosen plant, substrate and pump; none is specified as a universal safe constant here.

## Proposed states

| State | Pump behavior | Next condition |
|---|---|---|
| Setup / calibration required | Off | Valid confirmed settings and sensors |
| Monitoring | Off | Dry trigger and all checks permit a dose |
| Dosing | On for a bounded dose | Dose complete, low water, invalid input or fault |
| Settling / cooldown | Off | Delay complete, reassess against remaining budget |
| Refill required | Off | Refill detected, valid inputs, policy permits resumption |
| Fault / paused | Off | Cause resolved and explicit permitted reset/resume |

## Hardware and calibration work

Choose the pump and a suitable driver/power supply; do not drive a pump directly from a controller GPIO. Measure pump flow into a measuring vessel and estimate delivered volume from the verified operating conditions. Select low-water detection that can reliably inhibit pumping before dry running.

Use a bought watertight tank initially. Keep the water route separate from electronics and check tubing retention, leaks, backflow and unwanted siphoning with the pump off. Tank placement, outlet height and any valve/anti-siphon measure must be validated on the real assembly. The render is not a hydraulic design approval.

## Planned tests

| Scenario | Expected behavior to verify |
|---|---|
| Calibrated dry sample, adequate water | One bounded dose, stop, settling delay and event record |
| Wet sample | No unnecessary pump start |
| Low/empty tank | Pump inhibited/stopped; refill event recorded |
| Sensor disconnected, implausible or stale | Pump off; fault recorded |
| Repeated dry readings / blocked delivery | Runtime/daily budget prevents unlimited watering; fault/action-needed state |
| Wi-Fi/backend/phone unavailable | Valid local policy remains bounded; events sync later |
| Photo API unavailable | No effect on local watering limits |
| Restart or repeated network message | Pump defaults off; no duplicate unintended dose |
| Pump switched off | No continuing flow due to siphoning; no leak at fittings |
| Reservoir refilled | Stable refill detection; no unconditional immediate unlimited watering |

These are acceptance-test intentions, not completed results. Also verify that any app-provided settings remain proposals until the controller confirms application.

[Architecture](ARCHITECTURE.en.md) · [App features](APP_FEATURES.en.md) · [Concept](CONCEPT.en.md)
