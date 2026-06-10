# Playwright E2E Test Suite Infrastructure & Design

This document details the configuration, feature inventory, equivalence class partitions, and the 55 end-to-end test cases configured to verify the Offline-First PWA features of the Waktu Solat Expressive app.

---

## 1. Test Runner Command & Configuration

### A. Execution Commands
To run the full suite of E2E tests:
```bash
# Build the application
npm run build

# Run Playwright tests
npx playwright test
```

For UI mode testing or specific specifications:
```bash
# Run tests in UI mode
npx playwright test --ui

# Run only PWA offline tests
npx playwright test tests/pwa-offline.spec.ts
```

### B. Playwright Configuration (`playwright.config.ts`)
The configuration is optimized to prevent IndexedDB lock conflicts by disabling parallel workers (`workers: 1`) and allowing script execution in the browser context via `bypassCSP: true`. It also establishes default permissions for notifications and geolocation, and registers a `webServer` block to build and run the SvelteKit application locally.

---

## 2. Feature Inventory & Equivalence Class Partitions

### R1: PWA Asset Cache & Offline Load
*Verifies that the application can install, boot, load static assets, and function visually without any active network connection.*

- **Network State**:
  - P1.1: Online (Normal)
  - P1.2: Complete Offline
  - P1.3: Flaky / Slow (latency and timeout simulation)
- **Asset Categories**:
  - P1.4: App Shell Core (`/`, `manifest`)
  - P1.5: Static Assets (`/assets/*.js`, `/audio/*.mp3`)
  - P1.6: Same-Origin GeoJSON files
- **Service Worker Lifecycle**:
  - P1.7: Unregistered
  - P1.8: Activated & Running
  - P1.9: Old Cache Purging

### R2: IndexedDB Offline Prayer Times Calendar
*Verifies database reading, writing, decompression, range configuration, and calendar lookup when disconnected.*

- **Cache State**:
  - P2.1: Cold Storage (No cache for zone)
  - P2.2: Warm Storage (Valid range cache)
  - P2.3: Multi-Zone Storage (Different active zones)
- **Compression Mode**:
  - P2.4: Compressed tuple arrays (`[date, hijri, ...]`)
  - P2.5: Legacy object array records (backwards-compat)
- **Duration Range**:
  - P2.6: Week-only scope
  - P2.7: Month-only scope
  - P2.8: Year-only scope
- **Database Access**:
  - P2.9: Read/Write success
  - P2.10: Restricted space / QuotaExceededError

### R3: Background Notification Switches and Scheduling
*Verifies that background notifications trigger at the correct time, play selected audio volumes, and respect preferences.*

- **Notification Permission**:
  - P3.1: Granted
  - P3.2: Denied
  - P3.3: Default (Displays Pre-Prompt)
- **Switch Toggles**:
  - P3.4: Single prayer active
  - P3.5: Multi-prayer active
  - P3.6: Quick Action All Muted / All Enabled
- **Clock Conditions**:
  - P3.7: Current time < prayer time
  - P3.8: Current time = prayer time (Trigger)
  - P3.9: Current time = pre-alert offset
- **Alert Feedback**:
  - P3.10: Synthetic tones (beep, chime)
  - P3.11: Audio file (azan1, azan2)
  - P3.12: Speech Synthesis (text-to-speech)
  - P3.13: Visual overlay alert (dramatic, standard, none)

### R4: Synchronization Status & Manual Force Re-Sync
*Verifies that the application signals offline state, notifies users when going online, and syncs data either automatically or manually.*

- **Network Transition**:
  - P4.1: Online to Offline
  - P4.2: Offline to Online (Auto-Sync ON)
  - P4.3: Offline to Online (Auto-Sync OFF)
- **Trigger Origin**:
  - P4.4: Auto reconnect background trigger
  - P4.5: Toast manual button ("Sync Now")
  - P4.6: Settings manual button ("Save Offline")
- **Sync Feedback**:
  - P4.7: Loading (spinner showing)
  - P4.8: Sync Success (green toast, updated timestamp)
  - P4.9: Sync Failure (error toast, offline fallback preserved)

---

## 3. Detailed List of 55 Planned Test Cases

### Tier 1: Feature Coverage (24 Test Cases)

#### R1: PWA Asset Cache & Offline Load
1. **R1-TC1: Service Worker Registration**: Verify that visiting the site online successfully registers the service worker.
2. **R1-TC2: App Shell Offline Boot**: Verify the app loads and renders correctly when completely offline on reload.
3. **R1-TC3: Cache-First Static Assets**: Verify static assets (Vite assets, icons, fonts) are loaded from Cache-First strategy.
4. **R1-TC4: Network-First GeoJSON Loading**: Verify the Malaysia zone map GeoJSON loads from network first, caching it for offline fallback.
5. **R1-TC5: API Cache Bypass**: Verify API requests bypass the service worker static cache.
6. **R1-TC6: SW Activation Purge**: Verify that activating a new service worker deletes older caches.

#### R2: IndexedDB Offline Prayer Times Calendar
7. **R2-TC7: Offline Data Write on Fetch Success**: Verify that successful API fetches auto-cache prayer times into IndexedDB.
8. **R2-TC8: Offline Data Read on Network Loss**: Verify that when offline, prayer schedule details are populated from IndexedDB.
9. **R2-TC9: Database Compression Verification**: Verify prayer times stored in IndexedDB are stored in the compressed tuple array format.
10. **R2-TC10: Database Backwards-Compatibility Decompression**: Verify legacy object arrays inside IndexedDB are correctly parsed.
11. **R2-TC11: Settings Cache Manual Download**: Verify users can download offline cache manually via Settings.
12. **R2-TC12: Settings Cache Manual Clear**: Verify users can purge offline cache from the database.

#### R3: Background Notification Switches & Scheduling
13. **R3-TC13: Notification Permission Pre-Prompt UI**: Verify pre-prompt is displayed when notifications are default.
14. **R3-TC14: Notification Toggle Storage**: Verify toggling alerts writes state to localStorage.
15. **R3-TC15: Quick Toggle Actions**: Verify "Enable All" and "Mute All" toggle all switches simultaneously.
16. **R3-TC16: Standard Prayer Alert Trigger**: Verify notification triggers at the exact prayer hour.
17. **R3-TC17: Pre-Alert Offset Trigger**: Verify notifications trigger at pre-alert offsets (e.g., 5 mins before).
18. **R3-TC18: Background Volume Adjustments**: Verify volume slider changes output level in settings.

#### R4: Synchronization Status & Manual Force Re-Sync
19. **R4-TC19: Online Reconnection Detection (Toast)**: Verify that going online displays the connection sync toast.
20. **R4-TC20: Auto-Sync on Reconnect**: Verify background synchronization triggers automatically if configured.
21. **R4-TC21: Manual Force Re-Sync (Toast Trigger)**: Verify manual trigger of sync updates local databases.
22. **R4-TC22: Sync Success Feedback UI**: Verify successful sync automatically hides the toast.
23. **R4-TC23: Sync Error Handling & UI Feedback**: Verify UI state when synchronization fails.
24. **R4-TC24: Caching Status Verification (Settings)**: Verify Settings displays the correct cache state and duration values.

### Tier 2: Boundary & Corner Cases (20 Test Cases)

#### R1: PWA Asset Cache & Offline Load
25. **R1-TC25: Flaky Network Fallback**: Verify asset loading during highly unstable connections.
26. **R1-TC26: Large GeoJSON File Corruption**: Verify app behavior if GeoJSON file fails during download or is partially cached.
27. **R1-TC27: Offline Reload of Settings Route directly**: Verify visiting `/settings` route directly while offline handles hydration.
28. **R1-TC28: Storage Quota Limit on Cache Put**: Verify PWA handles full cache partitions without crashes.
29. **R1-TC29: Non-GET Requests Bypass**: Verify non-GET requests are not intercepted by SW cache.

#### R2: IndexedDB Offline Prayer Times Calendar
30. **R2-TC30: Empty Cache Calendar Navigation**: Verify calendar behavior when navigating dates with no offline database entry.
31. **R2-TC31: Invalid Zone IndexedDB Query**: Verify IndexedDB gracefully handles invalid zone requests.
32. **R2-TC32: Year-End Range Transition**: Verify year-range offline caching on December 31st.
33. **R2-TC33: IndexedDB Access Blocked (Private Browsing)**: Verify database fallback when browser blocks IndexedDB (e.g. strict incognito modes).
34. **R2-TC34: Overwriting Stale Cache Records**: Verify database updates when caching new range over an existing range.

#### R3: Background Notification Switches & Scheduling
35. **R3-TC35: Notification Dismissed or Blocked Permisssions**: Verify UI behavior if user blocks notifications during pre-prompt.
36. **R3-TC36: Audio Track Load Failure**: Verify notification sound fails gracefully if audio files are missing.
37. **R3-TC37: Multi-Prayer Coincidence (Same Minute Times)**: Verify behavior if two alerts occur at the same minute.
38. **R3-TC38: Minimized Tab Activity Retention**: Verify notifications trigger when the tab is running in the background.
39. **R3-TC39: Negative Adjustments / Offsets**: Verify calculations and notifications when minute offset makes a prayer time transition past midnight.

#### R4: Synchronization Status & Manual Force Re-Sync
40. **R4-TC40: Multiple Online Transitions (Debouncing)**: Verify that toggling connection online/offline rapidly does not queue multiple sync tasks.
41. **R4-TC41: Sync Action while Offline**: Verify that manual sync requests are rejected while offline.
42. **R4-TC42: Interrupted Sync Network Drop**: Verify sync state if connection drops mid-request.
43. **R4-TC43: Large Year Payload Parse Limits**: Verify sync handles large payloads (yearly calendar contains 365 rows of arrays).
44. **R4-TC44: Partial Success Cache Cleanup**: Verify database state if local storage updates succeed but IndexedDB fails during sync.

### Tier 3: Cross-Feature Combinations (5 Test Cases)
45. **TC45: Offline Navigation & Cache Storage Refresh**: Verify offline app navigation combined with settings management.
46. **TC46: Offline Settings Offsets & Alert Recalculation**: Verify that modifying offsets offline recalculates and schedules notifications using offline database.
47. **TC47: Interrupted Sync Auto-Recovery & Notification**: Verify system recovery after connection loss during an active sync task while notifications are scheduled.
48. **TC48: Multi-Zone Cache Selection, Switching, and Notifications**: Verify changing zones offline updates calendar and schedules.
49. **TC49: Incognito Storage Blocked, Calculated Offsets, and Mock Alerts**: Verify system behavior when IndexedDB is blocked, offline mode is forced, offsets are applied, and alerts trigger.

### Tier 4: Real-World Application Scenarios (6 Test Cases)
50. **TC50: The Incognito Sandbox Mode**: Verify total system operation under strict user privacy restrictions.
51. **TC51: Mosque TV Mode Running Offline for 7 Days**: Verify TV Mode display reliability and clock updates during prolonged offline setups.
52. **TC52: Ramadan Hijri Calendar Transition Offline**: Verify offline calendar searches and calculations across month transitions.
53. **TC53: First-time Onboarding, Permission Denial, and Recovery**: Verify first-time installation flow, permission rejection, and manual recovery.
54. **TC54: Auto-Update Zone Re-Sync on Travel**: Verify zone updates when geographical coordinates shift while offline.
55. **TC55: Factory Reset and Purge Lifecycle**: Verify factory reset fully restores app to fresh install state.
