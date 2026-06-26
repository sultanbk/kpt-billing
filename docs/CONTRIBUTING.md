# Contributing

## Setup

Install dependencies and start the app:

```bash
npm install
npm run dev
```

The primary production target is Windows desktop, but most development commands also run on macOS and Linux.

## Quality Gate

Before handing off changes, run:

```bash
npm run typecheck
npm run lint
npm run test
```

For release or packaging changes, also run:

```bash
npm run build
```

## Development Rules

- Keep Electron main, preload, renderer, and shared code boundaries clean.
- Validate every IPC input in the main process.
- Prefer existing repository and service patterns over new abstractions.
- Add tests for financial totals, stock changes, PIN behavior, IPC validation, and migration-sensitive data.
- Do not commit generated caches or build artifacts.
- Keep large refactors separate from production bug fixes when possible.

## Refactor Guidance

Large files should be split only after the quality gate is green. Preserve routes, exports, IPC channels, and data shapes while moving code. Good first candidates are:

- `src/renderer/src/pages/settings/SettingsPage.tsx`
- `src/renderer/src/pages/reports/ReportsPage.tsx`
- `src/renderer/src/components/billing/EditBillDialog.tsx`
- `src/main/database/repositories/bill.repo.ts`
- printer and label services under `src/main/services`

## AI Assistant Notes

Future AI agents should read `AGENTS.md` first, then this file, then `docs/ARCHITECTURE.md`. Do not infer architecture from one file alone; this app has already moved several pages into feature folders.
