# Pre-Event Checklist: Manifest 2026

**Date**: January 31, 2026
**Event**: Manifest Vegas 2026 (Feb 10-12)
**Status**: Critical Preparation Phase

## 1. 🟢 Event Configuration & Data Verification
Ensure the "Manifest 2026" event is correctly seeded and active.

- [ ] **Event Existence**: Verify "Manifest Vegas 2026" is present in the `Events` list/database.
- [ ] **Attendee Data**: Confirm import of attendee list (Target Accounts & People) is complete.
    - *Check*: Search for a known Manifest company (e.g., "Maersk", "GXO") in `Target Accounts`.
- [ ] **Meetings Data**: Verify seeded meetings appear in the "Meetings" dashboard.
- [ ] **Active Event**: Set "Manifest 2026" as the **Active Event** for the War Room user account.

## 2. 📺 War Room Screen Checks
Verify the application display on War Room monitors (Large Format Displays).

- [ ] **Resolution**: Ensure dashboards render correctly at 4K/1080p without horizontal scrolling.
- [ ] **Fullscreen Toggle**:
    - [ ] Verify browser Fullscreen mode (F11 / Cmd+Ctrl+F).
    - [ ] Verify dedicated UI Fullscreen button (if available) maximizes the content area.
- [ ] **Readability**: Ensure font sizes for "Metrics" and "Alerts" are legible from 10 feet away.
- [ ] **Auto-Refresh**: Confirm that the "Live Feed" or "Activity" dashboard updates automatically without manual reload.

## 3. 🔌 Offline Mode & Reliability
Verify system behavior under poor network conditions (Simulating Convention Center Wi-Fi).

- [ ] **PWA Installation**: Verify the "Install App" prompt appears and the app installs on mobile/tablet devices.
- [ ] **Offline Access**:
    - [ ] Load the "Manifest Dashboard".
    - [ ] Disconnect Network (Airplane Mode).
    - [ ] Verify that the dashboard is still viewable (Cached).
- [ ] **Reconnection**:
    - [ ] Perform an action while offline (e.g., draft a note).
    - [ ] Reconnect network.
    - [ ] Verify graceful recovery or sync indication (if applicable) or proper error handling.

## 4. 🚨 Emergency Contacts & Support
**Escalation Path for System Critical Issues**

| Role | Name | Phone | Email |
|------|------|-------|-------|
| **Lead Engineer** | [Insert Name] | [Phone] | [Email] |
| **DevOps On-Call** | [Insert Name] | [Phone] | [Email] |
| **Event Lead** | [Insert Name] | [Phone] | [Email] |

- [ ] **Access Verification**: Ensure all War Room staff have these numbers saved.
- [ ] **Support Channel**: Verify access to the dedicated Slack/Teams `#war-room-manifest` channel.
