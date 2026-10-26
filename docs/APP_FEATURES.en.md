# Mobile app — agreed direction and proposed scope

**Concept 02, 26 October 2026.** A clickable HTML UI design prototype has been built; no integrated mobile app or backend exists. Android/iOS priority and framework are to be selected by the team.

## Available design preview

[Five first screen designs and the interactive prototype](DESIGN_PREVIEW.en.md) demonstrate navigation, plant/type editing, sample readings, example advice and local watering/refill feedback. No API or device calls occur.

## Requested features

1. **Plant profiles:** enter a plant name and select its species/type; associate the sensor device.
2. **Sensor overview:** show moisture and reservoir state with timestamps and freshness indicators.
3. **Notifications:** inform the user when action is needed, especially refilling the tank; retain an event history.
4. **Automatic-watering overview:** show the enabled configuration, latest watering event and any blocked/fault state.
5. **Photos and care questions:** attach photos, describe symptoms and ask an external API what may be wrong and what actions may help.
6. **Plant history:** link photos, readings, watering events and previous advice to the relevant plant.

There is no red/green LED interface on the pot. The app is the user-facing status interface.

## Suggested screens for team review

| Screen | Information/action |
|---|---|
| Plants | List profiles and highlight action-needed states |
| Plant detail | Species/type, latest readings, freshness, reservoir/refill state and last watering |
| Add/edit plant | Name, manually selected species/type, notes and linked device |
| History | Measurement and watering events with their real timestamps |
| Ask about this plant | Take/select a photo, enter a question and review submitted context |
| Advice detail | Explanation, possible causes, proposed care steps and unavailable/error state |
| Settings | Notification permission/preferences and review of device-confirmed watering configuration |

Manual watering requests or pause/resume controls are useful candidates, not yet confirmed scope. Any implemented request must remain subject to local device limits. A failed or delayed command must not be shown as successful.

## Advice behavior

Use the selected plant type, photo and available context only if the chosen provider supports those inputs. Ask for clearer photos or additional observations when useful. Show suggestions as possible explanations; do not claim a certain diagnosis from sensor readings alone. The user confirms any care/configuration change; advice never operates the pump directly.

If the advice API fails, the app must still show locally stored history and available telemetry. No response should be fabricated or silently reused as a new analysis.

## Notifications and limits

Proposed events: refill required, unusually dry/wet substrate, blocked watering/fault, offline device and watering completed. Choose severity, deduplication and frequency during design. Push delivery depends on network/platform/permission; the in-app event log is also required. Low-water detection must distinguish “refill needed” from “exact remaining millilitres”.

## Decisions still open

First mobile platform, Flutter/React Native/native implementation, backend and account model, device onboarding, species catalogue, photo/advice provider, photo retention, costs and usage limits. Plant-care defaults must be reviewed and calibrated for the actual pot rather than copied blindly from a species name.

[Architecture](ARCHITECTURE.en.md) · [Watering policy](WATERING_CONTROL.en.md) · [Concept](CONCEPT.en.md)
