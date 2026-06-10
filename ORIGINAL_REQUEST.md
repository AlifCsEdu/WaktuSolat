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
