# Project: AlurWaktu (Waktu Solat Expressive) M3 Redesign & Remediation

## Architecture
- **Framework**: SvelteKit 2 + Svelte 5 Runes (`$state`, `$derived`, `$props`, `$effect`, `untrack`, snippets).
- **Styling**: Tailwind CSS v4 (`@tailwindcss/vite`) + MD3 Expressive Design Tokens in `@theme` and `m3e-layout.css`.
- **UI System**: Native Svelte 5 UI Primitives in `src/lib/components/ui/` (`Button`, `IconButton`, `FilterChip`, `Switch`, etc.).
- **Audio Architecture**: Centralized Web Audio API synthesizer service in `src/lib/audio.ts`.
- **Motion & Transitions**: Svelte 5 transitions (`m3Fly`, `m3Fade`, `m3Slide`, `m3Scale`), Spring physics, and View Transitions API (`calendar-transition`, `map-transition`).
- **State Management**: Svelte 5 reactive singletons in `src/state/*.svelte.ts` backed by `StorageManager`.

---

## Feature Inventory
Every feature from the Survey phase is mapped to an assigned milestone:

| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Floating 56px App Bar Container | Constrain global top nav in `+page.svelte` to 56px pill (`h-14`, `rounded-full`, `flex-nowrap`), eliminate secondary nested pill wrapper | M1 | Survey 1 (R1) |
| 2 | Refined 44px Location Chip | Standardize Location Chip in `ZoneSelector.svelte` to 44px height (`h-11`, `rounded-full`), refined typography, subtle M3 state layers | M1 | Survey 1 (R1) |
| 3 | Symmetrical 44px Tonal Action Buttons | Standardize Map, Calendar, Mosque TV, Theme, and Fullscreen buttons to 44px tonal circles (`w-11 h-11`, 20px icons, stroke 2.2) | M1 | Survey 1 (R1) |
| 4 | Calendar Portal Z-Index Remediation | Elevate `SelectedDayModal.svelte` to `z-[9100]` and `selectedPrayer` in `FullCalendar.svelte` to `z-[9200]` over `FullCalendar` (`z-[9000]`) | M2 | Survey 2 (R2) |
| 5 | Calendar Grid M3 Expressive Polish | Replace neo-brutalist cassette with M3 Expressive pill nav, semantic `<button>` day cells with ripple, mobile Hijri markers, today pill chip | M2 | Survey 2 (R2) |
| 6 | Dynamic Adaptive Prayer Card Sizing | Remove `shrink-0` from prayer cards in `PrayerSchedule.svelte`, set `min-h-0 flex-1 shrink` on `lg:` to fit vertical viewport | M3 | Survey 1 (R3) |
| 7 | Proportional Typography & Padding Scaling | Scale card typography and vertical padding proportionally on desktop, reduce `<main>` vertical padding, set desktop `overflow-hidden` | M3 | Survey 1 (R3) |
| 8 | Mosque TV Reactive Loop Fix | Fix synchronous read/write `$effect` loop in `MosqueTvSettingsReminders.svelte` and `MosqueTvSettingsWidget.svelte` using `untrack()` | M4 | Survey 3 (R4) |
| 9 | Reliable Settings Exit Triggers | Add `Escape` keydown handler in `SettingsModal.svelte` and backdrop click handler in `src/routes/settings/+page.svelte` | M4 | Survey 3 (R4) |
| 10 | Location Toast Instant Dismissal | Clear `autoUpdatedZone` and `autoUpdatedLocationName` in `locationState.dismissPrompt()`, cancel timer, ensure (X) dismisses immediately | M4 | Survey 3 (R5) |
| 11 | Test Suite Verification & Hardening | Run Vitest unit tests, Playwright E2E suites, verify 0 lint errors and clean production build | M5 | Acceptance Criteria |

---

## Milestones

| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Top Navigation Bar M3 Expressive Overhaul | Unified 56px app bar pill, 44px location chip, 44px tonal circular action buttons, eliminate nested pill wrapper (`+page.svelte`, `ZoneSelector.svelte`, `ThemeControl.svelte`, `FullScreenToggle.svelte`) | none | DONE |
| M2 | Calendar Grid Polish & Selected Day Modal Z-Index Fix | Elevate `SelectedDayModal` to `z-[9100]` and `selectedPrayer` to `z-[9200]`, M3 Expressive pill month nav, semantic day cell buttons, mobile Hijri display (`FullCalendar.svelte`, `SelectedDayModal.svelte`, `CalendarGridView.svelte`) | none | DONE |
| M3 | Prayer Schedule Dynamic Responsive Viewport Sizing | Dynamic flex distribution for prayer cards (`min-h-0 flex-1 shrink`), proportional typography and padding, vertical padding reduction, 0 scrollbars on desktop (`PrayerSchedule.svelte`, `+page.svelte`, `m3e-layout.css`) | M1 | DONE |
| M4 | Settings Stability, Mosque TV Loop Fix & Location Toast Dismissal | Eliminate reactive loops in `MosqueTvSettingsReminders.svelte` & `MosqueTvSettingsWidget.svelte`, add Escape/backdrop exit triggers to Settings, fix `dismissPrompt()` in `location.svelte.ts` & `LocationToast.svelte` | none | DONE |
| M5 | End-to-End Test Suite Hardening & Final Verification | Full verification & audit remediation: test harness state isolation (`test.afterEach`, `try/catch` on `localStorage`, TC52 SW controller guard), adaptive low-height desktop media queries (`min-height: 600px`), mobile header density (< 360px). Verified: `npm run lint` (0 errors), `npm run build` (clean), `npm run test` (68/68), `npx playwright test` (63/63) | M1, M2, M3, M4 | DONE |

---

## Code Layout & Write Boundaries

- **M1 Owner**: `src/routes/+page.svelte` (header section), `src/components/ZoneSelector.svelte`, `src/components/ThemeControl.svelte`, `src/components/FullScreenToggle.svelte`.
- **M2 Owner**: `src/components/FullCalendar.svelte`, `src/components/calendar/SelectedDayModal.svelte`, `src/components/calendar/CalendarGridView.svelte`.
- **M3 Owner**: `src/components/PrayerSchedule.svelte`, `src/routes/+page.svelte` (main container sizing), `src/lib/m3e-layout.css`.
- **M4 Owner**: `src/components/MosqueTvSettingsReminders.svelte`, `src/components/MosqueTvSettingsWidget.svelte`, `src/components/SettingsModal.svelte`, `src/routes/settings/+page.svelte`, `src/state/location.svelte.ts`, `src/components/LocationToast.svelte`.
- **M5 Owner**: `tests/`, test verification and reports.
