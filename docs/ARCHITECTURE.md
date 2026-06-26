# KPT Billing Architecture

## Overview

KPT Billing is an offline-first Electron desktop app for textile shop billing, inventory, purchases, credit, reports, printing, and backups. The app is split into four runtime boundaries:

- Electron main process in `src/main`
- Preload bridge in `src/preload`
- React renderer in `src/renderer/src`
- Shared types and constants in `src/shared`

## Data Flow

1. React pages call renderer services from `src/renderer/src/services`.
2. Renderer services call typed methods on `window.api`.
3. `src/preload/index.ts` maps `window.api` methods to stable IPC channel names.
4. IPC handlers in `src/main/ipc` validate inputs with Zod before calling repositories or services.
5. Repositories in `src/main/database/repositories` read and write SQLite through `better-sqlite3`.
6. Services handle workflows such as printing, PDF generation, backups, purchase totals, and stock updates.

## Main Process

The main process owns trusted operations:

- SQLite connection, migrations, and default seed data
- IPC handler registration
- local files, backups, reports, and exports
- native printer and PDF functionality
- audit logging and PIN verification

Keep main-process business rules close to the relevant repository or service. For example, billing stock deductions belong in `bill.repo.ts`, while purchase stock-in behavior belongs in purchase services.

## Renderer

The renderer owns UI state and user workflows:

- pages under `src/renderer/src/pages`
- reusable layout and UI components under `components`
- Zustand stores under `stores`
- data wrappers under `services`
- feature hooks under `hooks`

Renderer components should not import Electron, filesystem, or database modules.

## Preload API

`src/preload/index.ts` is the API surface between renderer and main. Keep it boring and stable:

- one `window.api` group per domain
- typed method parameters and return values where shared types exist
- stable IPC channel strings
- no business logic beyond event subscription cleanup

When adding a channel, update `src/preload/index.d.ts`, the relevant renderer service, IPC validation, and docs.

## Database

SQLite is the source of truth. Migrations are managed in `src/main/database/connection.ts`; Drizzle schema definitions in `schema.ts` are documentation/type support and must not drift from the raw SQL migration tables.

Important database invariants:

- bill numbers are financial-year scoped
- product SKU generation must avoid collisions after deletes/imports
- customer IDs are numeric or null across shared types, renderer store, IPC validation, and SQL
- stock cannot go negative unless `allowNegativeStock` is explicitly set to `true`
- PIN hashes use salted scrypt format, with legacy SHA-256 migration on successful verification

## Testing Layers

- Main process tests run through `scripts/test-main.js` so native modules use Electron's runtime.
- Renderer tests use Vitest and JSDOM with mocked `window.api`.
- E2E tests live under `e2e` and launch the app through Playwright.

Use repository tests for financial and stock correctness, renderer store tests for cart behavior, and IPC tests for validation/security boundaries.
