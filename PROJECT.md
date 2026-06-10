# Project: Waktu Solat Expressive PWA

## Architecture
- **App Shell**: SvelteKit single-page application structure.
- **Service Worker**: Cache-first routing for static assets (SvelteKit build artifacts, fonts, SVG/icons, CSS).
- **Client Storage**:
  - **IndexedDB**: Local database holding year-round (365 days) prayer time schedule for user's favorited/selected zone.
  - **LocalStorage**: User settings (default zone, notification toggles, offsets).
- **Background Processes**:
  - Service Worker background sync or message timers to trigger local push notifications for prayer reminders even when tab/app is closed.

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|---|---|---|---|
| 1 | E2E Test Suite | E2E Testing Track (harness, Tiers 1-4 tests, TEST_READY.md) | none | PLANNED |
| 2 | PWA & Service Worker | R1: Web App Manifest, Cache-First static assets, update handling | none | PLANNED |
| 3 | IndexedDB Cache & Offline | R2: IndexedDB schema, year-round download, offline state sync & badge | M2 | PLANNED |
| 4 | Notifications & Alerts | R3: Background alerts trigger, Settings toggles & offsets, SW scheduling | M2, M3 | PLANNED |
| 5 | Sync UI & Cache Settings | R4: Status panel, Force Re-sync with animations, offline visual tests | M3, M4 | PLANNED |
| 6 | E2E Integration Pass | Final E2E verify (Tiers 1-4), adversarial test hardening (Tier 5) | M1, M5 | PLANNED |

## Interface Contracts
### Client ↔ Service Worker Messages
- `{ type: 'SKIP_WAITING' }`: Instructs SW to activate immediately.
- `{ type: 'SCHEDULE_NOTIFICATIONS', prayerTimes: [...] }`: Updates SW with local prayer times schedule for triggering notifications.
- `{ type: 'UPDATE_ALERT_SETTINGS', settings: {...} }`: Syncs user toggles/offsets to the SW.

### Database Schema (IndexedDB)
- **Database Name**: `waktu-solat-db`
- **Store Name**: `prayer-times`
- **Key Path**: `id` (combination of `zone_date` like `WLY01_2026-06-10`)
- **Indexes**: `zone`, `date`
