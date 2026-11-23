# Board Tablet Battery and Connectivity Health — Director Epic

Updated 2026-11-23. **Status: browser-local proof of concept implemented; production cross-device device-health reporting is NOT deployed.**

## Director need
For larger tournaments (regional, state, open, national), a director may supervise many live boards. Their Board Command Center should show a **passive battery indicator**, not an alert requiring action. Example displays:
- Board 1 — 82% · Charging
- Board 2 — 18% · Low battery — prepare a charger or spare
- Board 3 — Battery unavailable — tablet browser does not expose percentage
- Board 4 — Battery status stale — last check-in 5 minutes ago

## Browser support and limitations
The Battery Status API (\`navigator.getBattery()\`) is limited-availability and requires a secure origin and appropriate permission policy. Chrome on Android commonly exposes battery level and charging; **Safari on iPadOS/iOS does not support it**. Browser/device restrictions may also prevent access on other platforms. Never infer or fabricate battery percentage. If unavailable, state **Battery unavailable**; if stale, display stale separately rather than a percentage that appears current.

For reliable iPads, investigate an opt-in native kiosk wrapper, managed-device/MDM integration, or an authorized companion app to report power state. Validate on real iPad models before promising this.

References: https://developer.mozilla.org/en-US/docs/Web/API/Navigator/getBattery ; https://caniuse.com/battery-status

## Browser-local proof of concept
- \`src/board-battery.js\` reads battery level and charging when supported, with event listeners for \`levelchange\` and \`chargingchange\`.
- The board tablet writes a browser-local heartbeat every 60 seconds to a separate \`ucl-demo-board-battery-v1\` key (no credentials or PII), keyed by station ID.
- Board Command Center displays **critical below 10%**, **low below 25%**, charging/healthy, unavailable, never checked in, and stale after 3 minutes.
- The reporter is started only while viewing a tablet screen and stopped when navigating away.
- The browser-local prototype updates other tabs in the **same browser profile** through localStorage storage events. It cannot share device health with a director's separate laptop or a physical tablet without a backend.
- Optional battery reporting must **never block a scoring round**, and no push alerts are implemented.

## Secure production design (future)
- A private, protected device-health table/read model keyed by opaque paired device ID, organization ID, event ID and board ID.
- Fields: \`battery_percent\` nullable 0–100, \`charging\` nullable, \`battery_supported\`, \`last_seen_at\` stamped by the server, pairing version, and connection status.
- Only a paired board session can update its own telemetry via a rate-limited authenticated server endpoint. Event directors/admins can read scoped health statuses. Spectators cannot see device health.
- Report roughly every 30–60 seconds, and deliver efficient updates privately to authorized event directors. Distinguish battery low, battery unknown, offline/stale, charging, and board availability.
- Allow a tablet to be replaced/re-paired without losing saved rounds, and revoke the previous tablet credential. Avoid device fingerprinting or location history; retain telemetry briefly.
- An absent heartbeat does **not** definitively mean a device has no battery: network outage, background throttling and permission denial can also interrupt reports.

## Acceptance tests
- Supported Chrome/Android device at 19% shows low; charging changes propagate to the same browser-profile director dashboard.
- Unsupported iPad Safari shows battery unavailable and scoring still works.
- Stale reports after three minutes are differentiated from confirmed fresh battery levels.
- No notifications are sent for passive low-battery visibility.
- Backend phase: independent director laptop sees a paired tablet's server-confirmed status; revoked tablet cannot post updates to the old board.
- Device swap retains score history, allows a director to stage a power pack/backup tablet, and keeps spectators separate from health endpoints.

## Future event types
The organization may classify hosted events as **local, regional, state championship, open, or national**, independently of scoring format, bracket size and device telemetry. This is a later event metadata/UI milestone.

**Next blocker:** new UCL-owned Supabase staging organization/project, paired-device sessions, trusted heartbeats and a private director subscription.
