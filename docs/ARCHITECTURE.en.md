# Proposed architecture — concept 02

**26 October 2026. Proposed design, not an implemented system.** The app framework, backend stack, protocol and external providers remain undecided.

## Boundaries

| Component | Responsibility |
|---|---|
| Wi-Fi-capable controller, proposed ESP32 DevKit | Read moisture and low-water state; validate data; apply a stored watering configuration; drive a suitable pump driver; record and synchronize events |
| Pot, refillable tank, pump and tubing | Supply water in calibrated bursts; keep electronics separate from water and provide service/refill access |
| Mobile app | Plant/type selection, device association, current readings, timestamps, history, photos, questions, care advice and notification settings |
| Backend | Authenticate/authorize app and device operations; store plant and device records; mediate configuration; deliver push events; protect external API credentials |
| External plant-care service | Return information or suggestions supported by its actual API, using the supplied species, photos, question and sensor context |
| Mobile push service | Deliver notification requests subject to connectivity, permissions and platform behavior |

The original Uno-only configuration is superseded by a proposal for a controller with native Wi-Fi. Verify the exact ESP32 board's features and voltage limits; the family name alone is not a hardware specification. Telemetry transport over TLS (for example HTTPS or MQTT) is a design decision to confirm.

## Intended data flow

1. The user creates a plant profile and links the correct physical device. The selected plant type provides care context; it is not a universal moisture calibration.
2. The controller sends timestamped readings and events. The app distinguishes the latest stored value from a fresh live reading.
3. A confirmed, versioned watering configuration is stored on the device. The app displays desired versus last device-confirmed settings if synchronization is delayed.
4. The device waters locally only when the policy's conditions and limits allow it. It reports start/stop, amount estimate and stop reason.
5. The backend creates refill, fault, offline and watering events and requests push delivery. Event history remains visible even if notification permission is denied or push is delayed.
6. A user submits a photo and question. The backend checks access, adds approved context, calls the selected plant-care API and returns a response or a clear unavailable state.

## Offline and failure behavior

With valid current sensors and a previously confirmed local policy, bounded watering can continue without the app or backend. If a required sensor/configuration is invalid, the pump remains off. During a network outage, data and relevant events are synchronized later; no immediate remote alert is promised. Cloud errors must not replay a watering action.

Reboots default the pump to off. Duplicate network requests/events need deduplication, and configuration updates need acknowledgment. The proposed command interface must never bypass local dose, cooldown or low-water checks.

## Minimal data model to review

- **Plant:** local identifier, owner, display name, selected species/type, notes, device identifier and care-profile version.
- **Telemetry:** device identifier, observation time, raw moisture reading, relative calibrated moisture index, reservoir low-water state, pump state and validity flags.
- **Watering event:** unique event identifier, start/stop times, cause, stop reason, configuration version and delivered-volume estimate from calibrated flow.
- **Photo/advice request:** plant identifier, uploaded photo reference, question, selected contextual observations and provider response/status.
- **Device configuration:** calibrated ranges, trigger/stop bands, dose/runtime/daily limits and settling delay; exact values require experiments.

Do not display raw probe values as measured volumetric water percentage or low-water detection as an exact remaining volume. Providers and sensor outputs must support any value shown.

## Credentials and photos

Keep paid/provider secrets in the backend, not in the mobile package, device firmware or Git repository. Associate devices and records with the correct user; review upload limits, image retention/deletion and request costs before implementation. No credentials or provider services are provisioned by this design update.

[Concept](CONCEPT.en.md) · [Watering policy](WATERING_CONTROL.en.md) · [Mobile app](APP_FEATURES.en.md)

## Reference examples

- [Espressif documentation](https://www.espressif.com/en/products/socs/esp32/documentation).
- [Firebase Cloud Messaging architecture](https://firebase.google.com/docs/cloud-messaging/fcm-architecture): trusted server, transport and mobile receiver; an example, not a chosen provider.
