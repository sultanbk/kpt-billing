# KPT Billing Agent Guide

This file is the first stop for AI coding assistants working in this repository.

## Project Map

- `src/main`: Electron main process, SQLite access, repositories, IPC handlers, printing, PDF, backup, and export services.
- `src/preload`: Typed `window.api` bridge exposed to the renderer. Keep channel names stable.
- `src/renderer/src`: React UI, routes, feature pages, layout components, stores, hooks, and renderer service wrappers.
- `src/shared`: Shared constants, formatters, and TypeScript types used by both main and renderer code.
- `docs`: User, owner, testing, API, architecture, and feature documentation.
- `e2e`: Playwright smoke tests.

## Commands

- `npm run typecheck`: TypeScript checks for main/preload/shared and renderer/shared.
- `npm run lint`: ESLint and Prettier checks.
- `npm run test`: Main process tests through Electron plus renderer Vitest tests.
- `npm run build`: Typecheck and production Electron/Vite build.
- `npm run dev`: Start the Electron development app.

## Boundaries

- Renderer code must call main-process behavior through `window.api` service wrappers.
- Main IPC handlers must validate untrusted input with Zod schemas from `src/main/ipc/validation.ts`.
- Database writes belong in repositories or focused services, not directly in React components.
- Shared types belong in `src/shared/types/index.ts` only when both main and renderer need them.
- Keep IPC channel names backwards compatible unless the renderer, preload types, tests, and docs are updated together.

## Quality Rules

- Before finishing production changes, run `npm run typecheck`, `npm run lint`, and `npm run test`.
- For build-impacting changes, also run `npm run build`.
- Add focused tests for financial totals, stock movement, PIN/security behavior, IPC validation, and persisted data shape.
- Avoid broad refactors while quality gates are red.
- Do not silence TypeScript or ESLint unless the rule is intentionally project-scoped in `eslint.config.mjs`.

## Files To Avoid Editing Casually

- `node_modules`, `dist`, `out`, `test-results`, `.eslintcache`, `*.tsbuildinfo`
- generated timestamp configs like `electron.vite.config.*.mjs`
- build icons under `build/tmp-icons`

## Current Architecture Direction

- Keep the app offline-first and local SQLite based.
- Prefer small feature folders in the renderer, for example `pages/billing`, `pages/products`, and `pages/settings`.
- Prefer typed renderer services over direct `window.api` use inside components.
- Keep production safety fixes ahead of large file-splitting work.
