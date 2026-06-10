# Original User Request

## Initial Request — 2026-06-10T09:06:13Z

Audit the Svelte 5 codebase for any remaining React/Vite migration leftovers, clean up unused backup files and dependencies, perform deep Svelte 5 performance and structure audits, and ensure all components conform to best practices.

Working directory: c:\Users\alif325\Documents\WIndsurf projeks\waktu-solat-expressive
Integrity mode: development

## Requirements

### R1. Remove Unused React/Vite Migration Leftovers
- Delete all unused legacy files (e.g., `.tsx.old`, `.tsx.bak` files) in `src/components/`.
- Remove the unused `motion` dependency from `package.json` and delete the unused `src/lib/motion.ts` file.
- Clean up unused manual chunks for `framer-motion` and `react-leaflet` in `vite.config.ts`.

### R2. Perform Svelte 5 Performance and Rune Optimizations
- Audit Svelte components for unnecessary `$effect` blocks and replace them with `$derived` or `$derived.by` runes where applicable to minimize DOM churn.
- Ensure all reactive state updates are handled correctly (e.g. re-assigning plain object properties or using reactive proxies correctly, avoiding the function-state initialization bug).
- Audit all Svelte 5 components to ensure they do not trigger excessive re-renders or layout thrashing.

### R3. Audit Code Quality and Accessibility
- Audit component accessibility (A11y) issues where possible and clean up compiler warnings.
- Clean up console.log, console.warn, and console.error debuggers in production builds.

## Acceptance Criteria

### Project Cleanliness
- [ ] No `.tsx.old` or `.tsx.bak` files remain in the `src/` directory.
- [ ] No references to `framer-motion` or `react-leaflet` exist in `vite.config.ts`.
- [ ] `package.json` contains no unused dependencies (specifically `motion`).

### Correctness and Build
- [ ] `npm run lint` completes with zero errors.
- [ ] `npm run build` completes successfully.
- [ ] `npx playwright test` completes successfully.

## Follow-up — 2026-06-10T09:32:32Z

Migrate the Waktu Solat Expressive codebase from a Vite + Svelte SPA client + Express backend server into a unified SvelteKit application configured for Cloudflare Pages. Expose key sections as standalone routes (/calendar, /map, /settings) using SvelteKit's file-based routing.

Working directory: c:\Users\alif325\Documents\WIndsurf projeks\waktu-solat-expressive
Integrity mode: development

## Requirements

### R1. Scaffold SvelteKit & Cloudflare Configuration
- Initialize SvelteKit in the project directory using `@sveltejs/adapter-cloudflare` to optimize deployment on Cloudflare Pages.
- Configure `svelte.config.js`, `vite.config.ts`, `src/app.html`, and `src/routes/+layout.svelte` (or `+layout.ts`).
- Set up `export const ssr = false;` in the root layout to avoid hydration issues with custom material-web elements and client-side localStorage variables.

### R2. Port Backend API Routes
- Convert all Express routes in `server.ts` to SvelteKit server endpoints (`+server.ts`):
  - `/api/health` -> `src/routes/api/health/+server.ts`
  - `/api/geocode` -> `src/routes/api/geocode/+server.ts`
  - `/api/solat/[zone]` -> `src/routes/api/solat/[zone]/+server.ts`
- Retain the Nominatim caching, Jakim e-Solat proxy fallbacks, and local `adhan` fallback calculation logic.

### R3. Port Frontend Components and Layout
- Migrate the core single-page app layout from `src/App.svelte` and `src/main.ts` into `src/routes/+page.svelte` and `src/routes/+layout.svelte`.
- Ensure all styling, assets, custom M3 transitions, and localization mappings are fully operational.

### R4. Implement Sub-routes for Modal Views
- Create dedicated SvelteKit sub-routes for key overlay views:
  - `/calendar` -> `src/routes/calendar/+page.svelte` (standalone view of FullCalendar)
  - `/map` -> `src/routes/map/+page.svelte` (standalone view of MapModal)
  - `/settings` -> `src/routes/settings/+page.svelte` (standalone view of SettingsModal)
- Ensure navigating directly to these URLs renders a polished, standalone screen inheriting the glassmorphic aesthetics.

## Acceptance Criteria

### Scaffold and Build
- [ ] No Express server dependency (`express`, `@types/express`) remains in `package.json`.
- [ ] Running `npm run build` succeeds and outputs a Cloudflare Pages compatible build.
- [ ] Running `npm run lint` completes with zero errors.

### Route Functionality
- [ ] API routes (`/api/health`, `/api/geocode`, `/api/solat/[zone]`) work exactly as before.
- [ ] Navigating to `/calendar`, `/map`, and `/settings` displays the respective views standalone.
- [ ] Core visual dashboard renders correctly at `/`.

### Correctness
- [ ] All Vitest tests in `tests/` pass successfully.


## Follow-up — 2026-06-10T17:55:09+08:00

Implement dynamic zone dashboards (`/zone/[zone]`) in the Waktu Solat Expressive SvelteKit app, featuring custom SEO metadata, static fallbacks, and server-generated open-graph (OG) preview images.

Working directory: c:\Users\alif325\Documents\WIndsurf projeks\waktu-solat-expressive
Integrity mode: development

## Requirements

### R1. Dynamic Zone Routes (`/zone/[zone]`)
- Build a server-load function (`+page.server.ts` or `+page.ts` with load) for `/zone/[zone]` to fetch prayer times for the requested zone.
- Serve dynamic SEO metadata tags in `<head>`, including `title`, `description`, and open-graph properties (`og:title`, `og:description`, `og:image`).
- Return a beautiful static HTML/CSS fallback showing the current day's prayer times for SEO crawlers.
- Ensure client-side hydration mounts the main glassmorphic application, pre-selecting the URL zone and updating the state seamlessly.

### R2. Server-Generated Open Graph (OG) Images
- Create a route or endpoint (e.g., `/api/og/[zone]` or `/zone/[zone]/og.svg`) that dynamically generates a beautiful SVG image representing the prayer times dashboard.
- The image must feature rich aesthetics, harmonious color palettes matching the app themes, and clear typography.
- Serve with correct HTTP headers (`Content-Type: image/svg+xml`) and cache-control headers for optimal CDN/edge performance on Cloudflare.

### R3. User Preferences Synchronization
- Provide a clear, non-intrusive action on the client (e.g., "Set as default zone") that updates the user's saved zone in local storage when visited.

## Acceptance Criteria

### SSR & SEO Correctness
- [ ] Curators/bots requesting `/zone/WLY01` receive complete `<meta>` tag headers containing zone details and the dynamic OG image URL.
- [ ] Requesting `/zone/WLY01` with JavaScript disabled renders a clean static card displaying the prayer times.
- [ ] No hydrate/hydration mismatches occur on mounting.

### OG Image Functionality
- [ ] Accessing the dynamic OG image endpoint (e.g., `/api/og/WLY01`) returns valid SVG containing the current date, zone name, and prayer times.
- [ ] SVG response contains the header `Content-Type: image/svg+xml`.

### Navigation & State
- [ ] Navigating to `/zone/JHR02` displays the app dashboard showing Johor Bahru prayer times.
- [ ] Clicking "Set as default" updates the user's localStorage value to Johor Bahru.
