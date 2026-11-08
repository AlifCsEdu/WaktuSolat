# AlurWaktu M3 Expressive — Test Infrastructure & Quality Assurance Specification

**Document Version**: 2.0.0  
**Target Milestone**: M1–M5 Full Verification Track  
**Architecture Tier**: Google Material 3 Expressive (Pixel Flagship Tier)  
**Standard**: 4-Tier Test Verification Methodology  
**Working Directory**: `c:\Users\alif325\Documents\WIndsurf projeks\waktu-solat-expressive`  

---

## 1. Executive Summary & Verification Philosophy

AlurWaktu adheres to a zero-compromise quality assurance architecture built to ensure reliability, offline resilience, and fluid 60fps performance across web, mobile, and mosque kiosk environments.

The testing infrastructure operates on two distinct, complementary test runners:
1. **Vitest Unit & Integration Suite**: High-speed Node.js test harness exercising pure domain logic, astronomical calculations, Web Audio synthesizer tone generators, security sanitization, and state derivation.
2. **Playwright End-to-End (E2E) Browser Suite**: Headless and headed Chromium browser automation verifying the Service Worker cache lifecycle, IndexedDB storage engine, View Transitions API, reactive layout viewports, and standalone SvelteKit route transitions.

### Core Testing Invariants
- **Progressive Testability**: Tests depend strictly on completed milestone features and stable platform primitives.
- **Strict Isolation & Concurrency Control**: Playwright runs single-worker serialized execution (`workers: 1`) to eliminate database write contention in IndexedDB and Service Worker cache races.
- **Deterministic Oracle Derivation**: Astronomical prayer time calculations are verified against official JAKIM reference models, Adhan astronomical formulas, and exact ISO time schedules.
- **Zero Implementation Tampering**: Tests evaluate external contract interfaces, visual layout constraints, and runtime side effects without modifying production code.

---

## 2. The 4-Tier Testing Methodology

```
┌────────────────────────────────────────────────────────────────────────┐
│               TIER 4: Real-World Scenarios (End-to-End)                │
│  - Airplane mode commutation, 24/7 Mosque Kiosk, Zero-onboarding launch │
├────────────────────────────────────────────────────────────────────────┤
│            TIER 3: Cross-Feature Integration Combinations              │
│  - Prayer theme transitions during navigation, Offline zone switches   │
├────────────────────────────────────────────────────────────────────────┤
│               TIER 2: Boundary, Edge & Stress Conditions               │
│  - Leap second rollovers, quota pressure, 320px vs 2560px viewports    │
├────────────────────────────────────────────────────────────────────────┤
│                 TIER 1: Primary Feature Coverage                       │
│  - 20 Features from PROJECT.md, M3 Tokens, Countdown Ring, Routes      │
└────────────────────────────────────────────────────────────────────────┘
```

---

### Tier 1: Feature Coverage (Primary Capabilities)
Exhaustive verification of each standalone feature across M1–M4.

| Feature ID | Feature Name | Test File(s) | Key Assertions & Observables |
|---|---|---|---|
| **F-01** | Atmospheric Prayer Color Spectrum | `tests/theme.test.ts` | Validates `PRAYER_COLORS` contains 7 prayer phases with valid hex values (`#6750A4`, `#D97706`, `#0284C7`, `#BF3626`, `#1E1B4B`). |
| **F-02** | Default Dynamic Theme & Dark Mode | `tests/theme.test.ts` | Validates `DEFAULT_GENERAL_SETTINGS` defaults, dark mode toggling, and Material 3 CSS variable generation. |
| **F-03** | M3 Typography & Squircle Tokens | `tests/m3-expressive.spec.ts` | Validates `.md3-*` font metrics, `--radius-*` tokens, and `--app-radius-scale`. |
| **F-04** | Symmetrical 56px Top Floating App Bar | `tests/m3-expressive.spec.ts` | Confirms header container rendered at 56px (`h-14`), 44px circular action buttons (`w-11 h-11`), stroke 2.2. |
| **F-05** | Hero Prayer Focal Card | `tests/m3-expressive.spec.ts` | Centerpiece focal card with next prayer title, time remaining countdown, progress track, and radiant glow. |
| **F-06** | Adaptive Bento Dashboard Grid | `tests/m3-expressive.spec.ts` | Fluid multi-column squircle grid replacing rigid columns; responsive flex/grid wrappers. |
| **F-07** | Sticky Mini-Countdown on Mobile | `tests/m3-expressive.spec.ts` | Persistent mobile countdown pinning when hero card scrolls out of viewport. |
| **F-08** | Inline Expandable Sunnah Times | `tests/m3-expressive.spec.ts` | Accordion/filter chips (`all`, `fardu`, `sunnah`) in prayer schedule revealing Tahajjud, Dhuha, Imsak, Syuruk. |
| **F-09** | Standalone Calendar Page (`/calendar`) | `tests/m3-expressive.spec.ts`, `tests/transitions.spec.ts` | Direct route loading, HTTP 200, absence of teleport portal bugs, and M3 sheet day view. |
| **F-10** | Standalone Settings Center (`/settings`) | `tests/m3-expressive.spec.ts`, `tests/pwa-offline.spec.ts` | Direct route loading, tab switching, search filtering, and state persistence. |
| **F-11** | Standalone Mosque TV Mode (`/tv`) | `tests/tv-mode.spec.ts`, `tests/m3-expressive.spec.ts` | Direct `/tv` route, large digital clock, Iqamah countdown, ticker, and screensaver modes. |
| **F-12** | Standalone Zone Map Page (`/map`) | `tests/m3-expressive.spec.ts` | Direct `/map` route, interactive JAKIM zone picker, and coordinate geocoding. |
| **F-13** | Native View Transitions API Integration | `tests/transitions.spec.ts`, `tests/m3-expressive.spec.ts` | Smooth 60fps morphing with `view-transition-name` attributes and `prefers-reduced-motion` safety. |
| **F-14** | Instant Launch & Zero Onboarding Blocker | `tests/m3-expressive.spec.ts` | Verifies clean-profile launch lands directly on interactive dashboard without blocking multi-step modals. |
| **F-15** | Silent Automatic GPS Zone Detection | `tests/geocoding.test.ts`, `tests/pwa-offline.spec.ts` | Default auto location mode and silent Malaysian default coordinate lookup (`WLY01`/`SGR01`). |
| **F-16** | Offline GPS Centroid Fallback | `tests/geocoding.test.ts` | Haversine distance nearest-zone centroid lookup without network connection. |
| **F-17** | Calendar Offline IndexedDB Fallback | `tests/pwa-offline.spec.ts` | Reading cached monthly prayer schedule from `prayer-times` store when network is disconnected. |
| **F-18** | Web Audio API Harmonic Synthesizers | `tests/audio.test.ts` | Oscillator frequencies, sub-harmonic chords, gesture unlocking, and volume normalization. |
| **F-19** | Production Build & Lint Validation | Continuous runner | `npm run lint` (`tsc --noEmit`) and `npm run build` pass with 0 errors. |
| **F-20** | E2E & Unit Test Hardening | Test runner aggregate | 100% pass across all Vitest unit tests and Playwright E2E suites. |

---

### Tier 2: Boundary, Edge & Corner Cases
Validation of system stability under adverse conditions, extreme dimensions, and hostile inputs.

1. **Storage & Quota Stress**:
   - Corrupted IndexedDB payloads: Graceful fallback to default values without app crashes.
   - Legacy schema compatibility: Decompressing both uncompressed legacy objects and compact tuple arrays.
   - Cleared local storage: Seamless re-initialization of `appSettings` and `locationState`.
2. **Viewport Boundaries**:
   - Ultra-narrow mobile (`320px` and `375px`): Eliminates horizontal scrolling; top bar and cards adjust smoothly.
   - High-density tablet fold (`768px` and `1024px`): Balanced two-column bento transition.
   - Ultra-wide 4K (`2560px` and `3840px`): Container clamped to max-width with balanced whitespace.
3. **Temporal & Clock Edge Conditions**:
   - Leap second and midnight date rollovers (`23:59:59` -> `00:00:00`): Schedule recalculates without refresh.
   - Ramadan seasonal timings: Suhoor and Imsak offsets properly adjusted.
4. **Motion & Accessibility Boundary**:
   - `prefers-reduced-motion: reduce`: View Transitions API and CSS animations cleanly degrade to instantaneous switches.

---

### Tier 3: Cross-Feature Integration Combinations
Verification of interdependent systems interacting concurrently.

1. **Theme Shifting During Standalone Page Navigation**:
   - Changing solar prayer phase dynamically updates the primary color scheme across `/calendar`, `/settings`, and `/tv`.
2. **Offline Zone Switching**:
   - Switching JAKIM zone while completely offline resolves cached prayer times from IndexedDB or triggers offline sync notice.
3. **Active Countdown During Mosque Mode Audition**:
   - High-frequency countdown clock ticks in parallel with Web Audio oscillator chime playback without audio stutter or frame drops.
4. **Overlay Queue Prioritization**:
   - Verification that higher priority notifications (`azan-alert` at priority 80) supersede lower priority banners (`location-toast` at priority 30).

---

### Tier 4: Real-World User Scenarios
End-to-end simulations mirroring actual user journeys.

1. **The Commuter (Offline Airplane Mode Simulation)**:
   - User launches application with pre-cached schedules.
   - App is taken offline via Playwright CDP network disconnection.
   - User reviews prayer schedule and opens `/calendar`.
   - Device reconnects: App automatically triggers background silent sync without page reload.
2. **The Mosque Kiosk Display (Unattended 24/7 Run)**:
   - Application launched in Mosque TV mode (`/tv`).
   - Custom reminders and ticker texts rotate across configurable intervals.
   - Iqamah countdown reaches zero, triggering synthesized chime alert.
3. **The Multi-State Traveler**:
   - User travels from Kuala Lumpur (`WLY01`) to Johor Bahru (`JHR01`).
   - Coordinates update: Zone promptly adjusts, schedule reflects new solar coordinates.

---

## 3. Test Suite Inventory

### Vitest Unit Suites (`tests/**/*.test.ts`)
| File | Tests | Focus Area |
|---|---|---|
| `tests/theme.test.ts` | 8 | Material 3 colors, `PRAYER_COLORS`, CSS variable injection, dynamic schemes. |
| `tests/audio.test.ts` | 12 | Web Audio API synthesizer, frequencies, chords, volume normalization. |
| `tests/geocoding.test.ts` | 12 | Geocoding parsing, Haversine formulas, centroid lookup. |
| `tests/api.test.ts` | 13 | API endpoint validation, zone parameters, Adhan fallback calculations. |
| `tests/StorageManager.test.ts` | 6 | LocalStorage wrapper, defaults, migration helpers. |
| `tests/security.test.ts` | 5 | Input sanitization, XSS mitigation, parameter escaping. |
| `tests/zone.test.ts` | 5 | JAKIM zone code normalization and state mapping. |
| `tests/ui-primitives.test.ts` | 7 | M3 UI components, ripple effects, custom transitions. |
| `tests/m4-screens.test.ts` | 3 | Settings state modifiers, mosque state computations. |
| `tests/og.test.ts` | 5 | Dynamic OpenGraph image generation and HTTP error handling. |
| **Total Vitest** | **76 tests** | **10 files — 100% Pass** |

### Playwright E2E Suites (`tests/**/*.spec.ts`)
| File | Tests | Focus Area |
|---|---|---|
| `tests/pwa-offline.spec.ts` | 55 | Service Worker, offline IndexedDB CRUD, network recovery, settings. |
| `tests/m3-expressive.spec.ts` | 10 | M3 Expressive top bar, hero card, bento grid, standalone routes, responsive. |
| `tests/transitions.spec.ts` | 3 | View Transitions, reduced-motion compliance, overlay queue priorities. |
| `tests/tv-mode.spec.ts` | 4 | Mosque TV layouts, countdown targets, typography, custom reminders. |
| `tests/visual-regression.spec.ts` | 1 | Pixel-fidelity full-page visual regression artifacts. |
| **Total Playwright** | **73 tests** | **5 spec files** |

---

## 4. Execution Guide

### Running Unit Tests
```bash
# Execute full Vitest suite in single run
npm run test

# Run specific test file
npx vitest run tests/theme.test.ts
```

### Running E2E Playwright Tests
```bash
# Execute all Playwright E2E specs
npx playwright test

# Execute specific suite
npx playwright test tests/m3-expressive.spec.ts
npx playwright test tests/pwa-offline.spec.ts
npx playwright test tests/tv-mode.spec.ts
npx playwright test tests/transitions.spec.ts
```

### Static Analysis & Production Build
```bash
# Verify TypeScript strict typings
npm run lint

# Compile production bundle
npm run build
```

---

## 5. Environment & Infrastructure Requirements
- **Node.js**: v20+ / v22+
- **Playwright Configuration**:
  - `baseURL`: `http://127.0.0.1:3001`
  - `workers`: `1` (strict serialization for storage safety)
  - `webServer`: Automatically boots production preview build on port 3001.
  - Permissions: `geolocation`, `notifications` pre-granted in test context.
