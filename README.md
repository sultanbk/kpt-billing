# KPT Billing — Krishnapriya Textiles Billing & Inventory Management System

> **A complete offline-first desktop billing application built for textile retail shops.**

Developed by **[Sultan Kabadi](https://sultanbk.com)**

---

## Overview

KPT Billing is a full-featured Point of Sale (POS) and inventory management system designed specifically for **Krishnapriya Textiles**, a textile retail business in Karnataka, India. The application runs as a native desktop app with complete offline capabilities — no internet connection required for day-to-day operations.

Built with modern technologies (Electron + React + TypeScript + SQLite), it provides a fast, reliable, and professional billing experience with GST compliance, credit management, thermal printing, PDF invoicing, and comprehensive reporting — all in a single installable application.

---

## Key Highlights

- **Offline-First** — All data stored locally in SQLite. No cloud dependency for daily operations.
- **GST Compliant** — Full CGST/SGST support, HSN codes for textiles, GSTR-1 ready reports.
- **Multi-Payment** — Cash, UPI, Card, Credit, and Mixed (split) payment modes.
- **Thermal Printing** — Direct ESC/POS printing to 80mm thermal printers (TVS RP 3000 Lite compatible).
- **PDF Invoicing** — Professional A4 invoices with GST breakup, amount in words, and digital authorization.
- **Credit Management** — Full credit lifecycle: issue credit, track aging (30/60/90+ days), record payments, risk scoring.
- **Barcode Support** — Scan barcodes directly into billing and purchase entry screens.
- **Keyboard-Driven** — Extensive keyboard shortcuts for fast billing without mouse dependency.
- **PIN Security** — Role-based PIN authentication protects sensitive pages.
- **Backup & Restore** — Local SQL dump backups + Google Drive cloud sync.
- **Excel Export** — Export bills, stock, customers, and full data to Excel spreadsheets.
- **WhatsApp Integration** — Send bill receipts, credit reminders, and payment confirmations via WhatsApp.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Desktop Runtime** | Electron 39 |
| **Frontend** | React 19 + TypeScript |
| **Styling** | Tailwind CSS 4 + Radix UI + shadcn/ui |
| **State Management** | Zustand 5 + Immer |
| **Routing** | React Router 7 (HashRouter) |
| **Database** | better-sqlite3 (SQLite) |
| **ORM / Migrations** | Drizzle ORM (schema definitions) |
| **PDF Generation** | HTML → PDF via BrowserWindow.printToPDF() |
| **Thermal Printing** | node-thermal-printer (ESC/POS) |
| **Barcode Generation** | bwip-js |
| **Excel Export** | xlsx + papaparse |
| **Build Tool** | electron-vite 5 + Vite |
| **Icons** | Lucide React |
| **Toasts** | Sonner |

---

## Application Structure

```
kpt-billing/
├── src/
│   ├── main/                    # Electron main process
│   │   ├── database/
│   │   │   ├── connection.ts    # SQLite connection + migrations
│   │   │   └── repositories/    # 10 data access modules
│   │   ├── ipc/                 # IPC handlers (100+ channels)
│   │   ├── services/            # PDF, printing, backup, export services
│   │   └── index.ts             # Main process entry
│   ├── renderer/                # React frontend
│   │   └── src/
│   │       ├── pages/           # 10 page components
│   │       ├── components/      # UI components + layout
│   │       ├── stores/          # Zustand stores
│   │       ├── hooks/           # Custom hooks
│   │       └── lib/             # Utilities
│   ├── shared/                  # Shared types & constants
│   └── preload/                 # Preload bridge (API exposure)
├── docs/                        # Documentation
├── resources/                   # App icons & assets
└── package.json
```

---

## Pages & Modules

| Page | Route | Description | Protected |
|------|-------|-------------|-----------|
| **Billing** | `/` | Main POS — product search, cart, payments, receipts | No |
| **Dashboard** | `/dashboard` | Real-time sales stats, charts, alerts | Yes |
| **Products** | `/products` | Product catalog, stock management, pricing | Yes |
| **Purchases** | `/purchases` | Stock-in from suppliers, purchase orders | Yes |
| **Customers** | `/customers` | Customer management, credit, bill history | Yes |
| **Reports** | `/reports` | Daily/Weekly/Monthly/Yearly, GST, P&L | Yes |
| **Customer Analytics** | `/customer-analytics` | Revenue ranking, frequency, credit risk | Yes |
| **Credit Aging** | `/credit-aging` | 30/60/90+ day overdue analysis | Yes |
| **Data Export** | `/data-export` | Excel export for all data types | Yes |
| **Settings** | `/settings` | Shop config, printers, backup, security, shortcuts | Yes |

---

## Database

16 SQLite tables with 32 indexes:

`settings`, `categories`, `products`, `customers`, `bills`, `bill_items`, `stock_ledger`, `users`, `audit_log`, `held_bills`, `suppliers`, `purchases`, `purchase_items`, `credit_payments`, `expenses`, `estimates`, `estimate_items`, `price_history`

See [docs/DATABASE.md](docs/DATABASE.md) for full schema documentation.

---

## Quick Start

### Prerequisites

- **Node.js** 18+ and **npm** 9+
- **Windows** 10/11 (primary target), macOS, or Linux

### Installation

```bash
# Clone the repository
git clone https://github.com/sultankabadi/kpt-billing.git
cd kpt-billing

# Install dependencies
npm install

# Start development server
npm run dev
```

### Build for Production

```bash
# Windows
npm run build:win

# macOS
npm run build:mac

# Linux
npm run build:linux
```

### Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start Electron in development mode with hot reload |
| `npm run build` | Build frontend and main process |
| `npm run build:win` | Package for Windows (.exe installer) |
| `npm run build:mac` | Package for macOS (.dmg) |
| `npm run build:linux` | Package for Linux (.AppImage) |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | Run TypeScript type checking |
| `npm run format` | Format code with Prettier |

---

## Default Credentials

| Field | Value |
|-------|-------|
| **User** | Puneet (Owner) |
| **PIN** | 1234 |

> Change the PIN immediately after first login via **Settings → Security**.

---

## Documentation

Detailed documentation for each module is available in the `docs/` folder:

| Document | Description |
|----------|-------------|
| [FEATURES.md](docs/FEATURES.md) | Complete feature list and overview |
| [BILLING.md](docs/BILLING.md) | Billing & POS system documentation |
| [INVENTORY.md](docs/INVENTORY.md) | Products, stock, purchases & suppliers |
| [REPORTS.md](docs/REPORTS.md) | All report types and analytics |
| [CUSTOMERS.md](docs/CUSTOMERS.md) | Customer management & credit system |
| [BACKUP.md](docs/BACKUP.md) | Backup, restore & cloud sync |
| [SECURITY.md](docs/SECURITY.md) | PIN authentication & access control |
| [SHORTCUTS.md](docs/SHORTCUTS.md) | Keyboard shortcuts reference |
| [SETTINGS.md](docs/SETTINGS.md) | All configuration options |
| [DATABASE.md](docs/DATABASE.md) | Database schema & architecture |
| [API.md](docs/API.md) | IPC channels & API reference |

---

## Business Details (Default Configuration)

| Field | Value |
|-------|-------|
| **Shop Name** | KRISHNAPRIYA TEXTILES |
| **Address** | Shidling Complex, Opposite Bus Stand, Hubli Road, Shirahatti 582120 |
| **State** | Karnataka (State Code: 29) |
| **Bill Prefix** | KPT/{FY}/ |
| **Financial Year** | April – March (Indian FY) |
| **Default GST Rates** | 0%, 5%, 12%, 18%, 28% |
| **Default Categories** | Saree, Blouse Piece, Dress Material, Dupatta, Fabric, Readymade, Accessories, Other |

---

## License

This is a proprietary application developed for Krishnapriya Textiles.

---

## Developer

**Sultan Kabadi**
- Website: [sultanbk.com](https://sultanbk.com)
- Application: KPT Billing v1.0.0

---

*Built with ❤️ for Krishnapriya Textiles*
