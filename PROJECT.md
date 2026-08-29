# Project: AlurWaktu (Waktu Solat Expressive) Overhaul

## Architecture
- **Framework**: SvelteKit 2 + Svelte 5 Runes (`$state`, `$derived`, `$props`, `$effect`, snippets).
- **Styling**: Tailwind CSS v4 (`@tailwindcss/vite`) + MD3 Expressive Design Tokens mapped in `@theme`.
- **UI System**: 100% Native Svelte 5 UI Primitives in `src/lib/components/ui/` replacing all `@material/web` custom elements.
- **Audio Architecture**: Centralized Web Audio API synthesizer service in `src/lib/audio.ts` for real-time offline sound synthesis (Chime, Soft Bell, Sufi Gong, Digital Beep, Tactile Click).
- **Motion & Transitions**: Svelte 5 transitions (`m3Fly`, `m3Fade`, `m3Slide`, `m3Scale`), Spring physics (`svelte/motion`), and native View Transitions API (`document.startViewTransition`) with reduced-motion compliance.
- **Data & Geolocation**: JAKIM 60+ zones data, Nominatim / BigDataCloud reverse geocode proxy (`/api/geocode`), with offline nearest zone calculation fallback.
- **State Management**: Svelte 5 reactive singletons in `src/state/*.svelte.ts` backed by `StorageManager` (LocalStorage + IndexedDB).

---

## Feature Inventory
Every feature from the Survey phase is mapped to an assigned milestone:

| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Native Svelte 5 UI Primitives | Re-architect Button, IconButton, FilterChip, Switch, Slider, SegmentedButton, TextField, Dialog, Tabs, Ripple | M1 | Survey 1 (R1) |
| 2 | Tailwind v4 MD3 Color Theme | Register MD3 semantic colors in `src/index.css` `@theme` block for full utility support | M1 | Survey 1 (R1) |
| 3 | Svelte Transition Zero-Duration Fix | Remove `isNativeSupported` zero-duration check in `src/lib/transitions.ts` & export `scale` | M1 | Survey 1, 2 (R3) |
| 4 | Build & Config Pipeline Fix | Add `svelte-kit sync` to `npm run build` and fix path aliases in `tsconfig.json` & `svelte.config.js` | M1 | Survey 3 (Build) |
| 5 | Centralized Web Audio Synthesis | Singleton `AudioSynthesizer` in `src/lib/audio.ts` supporting chime, soft-chime, ambient-gong, beep, tick + volume control | M2 | Survey 2 (R2) |
| 6 | Flawless 4-Step Onboarding Flow | Rebuilt `OnboardingFlow.svelte`: welcome, GPS geocoding + offline nearest zone, notifications, sound previews, StorageManager save | M2 | Survey 2 (R2) |
| 7 | View Transitions API Fixes | Eliminate duplicate `calendar-transition` name conflict and fix routed modal exit snapshot drops | M3 | Survey 2 (R3) |
| 8 | Dashboard & Schedule Glass Modernization | Modernize `PrayerSchedule.svelte`, `ZoneSelector.svelte`, `ThemeControl.svelte`, `ClockPanel.svelte` with native primitives | M3 | Survey 1, 3 (R3, R4) |
| 9 | Settings Center Overhaul | Modernize `SettingsModal.svelte` & `/settings` with instant keyword filter, Mazhab selector (Shafi'i/Hanafi), prayer offsets, audio controls | M4 | Survey 3 (R4) |
| 10 | Mosque TV Mode Modernization | High-visibility clock, customizable Iqamah countdown, hadith ticker, ambient screensaver, native UI primitives | M4 | Survey 3 (R4) |
| 11 | Calendar & Map/Qibla Polish | Polish `FullCalendar.svelte`, `MapModal.svelte`, `SelectedDayModal.svelte`, `AzanAlert.svelte`, `SolatMode.svelte` | M4 | Survey 3 (R4) |
| 12 | Cleanup `@material/web` Dependencies | Remove `@material/web` from `package.json` & `custom-elements.d.ts` | M4 | Survey 1 (R1) |
| 13 | Playwright Test Suite Fixes | Fix `tests/scratch_check.spec.ts` port and `tests/pwa-offline.spec.ts` R4-TC42 offline timing | M5 | Survey 3 (E2E) |
| 14 | Zero-Defect Full Verification | Verify `npm run lint` (0 errors), `npm run build` (clean bundle), `npm run test` (100%), `npx playwright test` (100%) | M5 | Survey 3 (Acceptance) |

---

## Milestones

| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Native Svelte 5 & Tailwind v4 UI Primitives Library + Foundation Fixes | Create `src/lib/components/ui/` primitives (`Button`, `IconButton`, `FilterChip`, `Switch`, `Slider`, `SegmentedButton`, `TextField`, `Dialog`, `Tabs`, `index.ts`), `src/lib/actions/ripple.ts`, update `src/index.css` `@theme`, fix `src/lib/transitions.ts`, update build script & aliases | none | DONE |
| M2 | Centralized Audio Synthesis & Flawless Onboarding Flow | Create `src/lib/audio.ts` (Web Audio API synthesis with volume control & presets), overhaul `OnboardingFlow.svelte` (native UI primitives, GPS geocoding + offline nearest zone, sound preview, storage save) | M1 | DONE |
| M3 | Fluid Motion, Glass Aesthetic & Core Dashboard Modernization | Fix View Transitions duplicate names in `+page.svelte` and modals, modernize `PrayerSchedule.svelte`, `ZoneSelector.svelte`, `ThemeControl.svelte`, `ClockPanel.svelte` (fix scale import, elevation, ripple), `MapModal.svelte`, `FullScreenToggle.svelte` | M1, M2 | DONE |
| M4 | Screen Polish (Settings Center, Mosque TV Mode, Calendar/Qibla) & Dep Cleanup | Modernize `SettingsModal.svelte` (search, mazhab, offsets, sound), Mosque TV Mode (`TvModeView.svelte`, `MosqueTvSettings*.svelte`), `FullCalendar.svelte`, `SelectedDayModal.svelte`, `AzanAlert.svelte`, `SolatMode.svelte`, remove `@material/web` dependency & clean `custom-elements.d.ts` | M1, M2, M3 | DONE |
| M5 | Test Hardening, Playwright Fixes & Final Verification | Fix Playwright tests (`scratch_check.spec.ts`, `pwa-offline.spec.ts`), verify lint (0 errors), build clean, 100% Vitest & Playwright test pass | M1, M2, M3, M4 | DONE |

---

## Interface Contracts

### 1. UI Primitives (`src/lib/components/ui/index.ts`)
- `Button`: `variant: 'filled' | 'tonal' | 'outlined' | 'text' | 'elevated'`, `size: 'sm' | 'md' | 'lg' | 'xl'`, `disabled: boolean`, `onclick: (e: MouseEvent) => void`, `children: Snippet`, `leadingIcon: Snippet`, `trailingIcon: Snippet`.
- `IconButton`: `variant: 'standard' | 'tonal' | 'filled' | 'outlined'`, `size: 'sm' | 'md' | 'lg' | 'xl'`, `ariaLabel: string`, `title: string`, `onclick: (e: MouseEvent) => void`.
- `FilterChip`: `selected: boolean`, `label: string`, `disabled: boolean`, `onclick: () => void`, `leadingIcon: Snippet`.
- `Switch`: `checked: boolean` (bindable), `disabled: boolean`, `onchange: (checked: boolean) => void`.
- `Slider`: `value: number` (bindable), `min: number`, `max: number`, `step: number`, `oninput / onchange: (val: number) => void`.
- `SegmentedButton`: `options: Array<{ id: string; label: string; icon?: any }>`, `value: string` (bindable), `onchange: (id: string) => void`.
- `TextField`: `value: string` (bindable), `placeholder: string`, `label: string`, `error: string`, `clearable: boolean`, `oninput / onchange: (e: Event) => void`.
- `Dialog`: `open: boolean` (bindable), `title: string`, `onClose: () => void`, `children: Snippet`, `header: Snippet`, `footer: Snippet`.
- `Tabs`: `tabs: Array<{ id: string; label: string; icon?: any }>`, `activeTab: string` (bindable), `onchange: (id: string) => void`.

### 2. Audio Service (`src/lib/audio.ts`)
- `export type SoundPreset = 'chime' | 'soft-chime' | 'ambient-gong' | 'beep' | 'tick' | 'voice';`
- `audioService.play(preset: SoundPreset, volume?: number): Promise<void>`
- `audioService.setVolume(vol: number): void`
- `audioService.initOnUserGesture(): Promise<void>`

### 3. Geocoding & Offline Location
- `fetchReverseGeocode(lat: number, lng: number): Promise<{ osm: any; bdc: any }>`
- `matchZoneFromGeocode(data: any): string | null`
- `findNearestZone(lat: number, lng: number): string` (Offline Haversine fallback using `ZONE_COORDINATES`)

---

## Code Layout
- `src/lib/components/ui/` — Native Svelte 5 UI primitives
- `src/lib/actions/` — Svelte actions (`ripple.ts`)
- `src/lib/audio.ts` — Centralized Web Audio API sound synthesis service
- `src/lib/transitions.ts` — Expressive M3 transition functions (`m3Fly`, `m3Fade`, `m3Slide`, `m3Scale`, `scale`)
- `src/lib/geocoding.ts` — Reverse geocode parsing & offline nearest zone matcher
- `src/components/` — Application components & feature views
- `src/routes/` — SvelteKit application routes (`+page.svelte`, `calendar/`, `settings/`, `tv/`, `map/`, `api/`)
- `src/state/` — Svelte 5 reactive singletons
- `tests/` — Playwright E2E and Vitest unit test suites
