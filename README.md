# KPT Billing

KPT Billing is an offline-first desktop billing, inventory, purchase, credit, reporting, printing, and backup system for Krishnapriya Textiles.

Built with Electron, React, TypeScript, and SQLite, it is designed for fast shop-counter billing on Windows while keeping business data local and usable without internet access.

## Highlights

- Offline SQLite storage
- GST-ready billing with CGST and SGST
- Cash, UPI, card, credit, and mixed payments
- Product inventory, stock ledger, suppliers, and purchases
- Customer credit, credit aging, and payment tracking
- Thermal receipt printing and PDF reports
- Barcode label printing and scanner-friendly billing
- Local backups and optional cloud backup workflow
- PIN-protected owner pages
- Sarva One licence activation, plan feature gates, and plan usage limits

## Tech Stack

| Layer      | Technology                                |
| ---------- | ----------------------------------------- |
| Desktop    | Electron, electron-vite                   |
| UI         | React, TypeScript, Tailwind CSS, Radix UI |
| State      | Zustand                                   |
| Database   | SQLite through better-sqlite3             |
| Validation | Zod                                       |
| Testing    | Vitest, React Testing Library, Playwright |
| Build      | Vite, electron-builder                    |

## Project Structure

```text
kpt-billing/
  src/
    main/       Electron main process, IPC, database, services
    preload/    Typed window.api bridge
    renderer/   React application
    shared/     Shared types, constants, and format helpers
  docs/         User, owner, testing, API, and architecture docs
  e2e/          Playwright tests
  resources/    Runtime assets
  build/        Packaging assets
```

For AI assistants and contributors, start with:

- [AGENTS.md](AGENTS.md)
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md)
- [docs/TESTING.md](docs/TESTING.md)

## Getting Started

```bash
npm install
npm run dev
```

## Quality Commands

```bash
npm run typecheck
npm run lint
npm run test
npm run build
```

## Packaging

```bash
npm run build:win
```

Additional packaging scripts are available for macOS and Linux, but Windows is the primary target.

## Default Login

The default owner PIN for a new installation is `1234`. Change it from Settings after first launch.

## Documentation

- [Owner Guide](docs/OWNER_GUIDE.md)
- [Cashier and Customization Guide](docs/CASHIER_AND_CUSTOMIZATION_GUIDE.md)
- [Billing](docs/BILLING.md)
- [Inventory](docs/INVENTORY.md)
- [Customers](docs/CUSTOMERS.md)
- [Reports](docs/REPORTS.md)
- [Settings](docs/SETTINGS.md)
- [Licence](docs/LICENCE.md)
- [Security](docs/SECURITY.md)
- [Database](docs/DATABASE.md)
- [API](docs/API.md)
- [Testing](docs/TESTING.md)
