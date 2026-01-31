# War Room Feature Walkthrough

**Objective**: Verify the "Command Center" UI works for the ops team on the trade show floor.

## Phase 1: Access & Display
1.  **Navigate**: Go to [`/dashboard/event-day`](/dashboard/event-day).
2.  **Check Data**: Ensure "Today's Meetings" shows real data (or seed data).
    *   *Note: If empty, run `npm run seed:manifest` locally or verify DB.*
3.  **Fullscreen Mode**:
    *   Locate the **"War Room"** toggle (Monitor Icon) in the top-right header.
    *   **Action**: Click it.
    *   **Verify**: Browser goes full screen, navigation sidebar disappears, focus is on metrics.
    *   **Exit**: Press `Esc` or click the toggle again.

## Phase 2: Operations Test (Check-in)
1.  **Find a Meeting**: Look for a meeting card with status `SCHEDULED`.
2.  **Simulate Check-in**:
    *   **Action**: Click the "Check In" button on the meeting card.
    *   **Observe**:
        *   Meeting status changes to `COMPLETED`.
        *   "Completed" counter in the stats row increments by 1.
        *   Toast notification appears (if implemented).

## Phase 3: Live Updates
*(Requires two simultaneous tabs/users)*
1.  Open the dashboard in a second window (incognito).
2.  Perform a check-in on Window A.
3.  **Verify**: Window B updates automatically (within 30 seconds) reflecting the change.
