# Project Structure Cleanup Plan

## Problem Summary

After auditing the full codebase, I found **3 categories** of structural issues:

| Category                  | Impact                             | Examples                                                          |
| ------------------------- | ---------------------------------- | ----------------------------------------------------------------- |
| **Root clutter**          | Confusion for contributors         | Stray PDFs, debug images, 736KB eslint cache, duplicate gitignore |
| **Monolith files**        | Hard to navigate, maintain, review | 6 page files over 40KB each, IPC handler with 68 endpoints        |
| **Minor inconsistencies** | Paper cuts                         | Empty dirs, duplicate service names, mixed test placement         |

### File Size Heat Map (non-test `.ts`/`.tsx` files)

| File                                                                                                        | Size      | Concern                                                     |
| ----------------------------------------------------------------------------------------------------------- | --------- | ----------------------------------------------------------- |
| [ReportsPage.tsx](file:///d:/sultan/kpt_billing/src/renderer/src/pages/ReportsPage.tsx)                     | **94 KB** | 🔴 Entire reporting UI in one file                          |
| [BillingPage.tsx](file:///d:/sultan/kpt_billing/src/renderer/src/pages/BillingPage.tsx)                     | **79 KB** | 🔴 Cart + PaymentDialog + BulkBill + HeldBills + DaySummary |
| [EditBillDialog.tsx](file:///d:/sultan/kpt_billing/src/renderer/src/components/billing/EditBillDialog.tsx)  | **69 KB** | 🔴 Return/exchange in one component                         |
| [SettingsPage.tsx](file:///d:/sultan/kpt_billing/src/renderer/src/pages/SettingsPage.tsx)                   | **66 KB** | 🔴 8+ settings tabs in one file                             |
| [CustomersPage.tsx](file:///d:/sultan/kpt_billing/src/renderer/src/pages/CustomersPage.tsx)                 | **53 KB** | 🟠 Customer list + forms + credit ledger                    |
| [bill.repo.ts](file:///d:/sultan/kpt_billing/src/main/database/repositories/bill.repo.ts)                   | **49 KB** | 🟠 Bill CRUD + returns + summaries + reporting              |
| [ProductsPage.tsx](file:///d:/sultan/kpt_billing/src/renderer/src/pages/ProductsPage.tsx)                   | **47 KB** | 🟠 Product list + forms + import                            |
| [PurchasesPage.tsx](file:///d:/sultan/kpt_billing/src/renderer/src/pages/PurchasesPage.tsx)                 | **39 KB** | 🟡 Moderate, but self-contained                             |
| [QuickBillSearch.tsx](file:///d:/sultan/kpt_billing/src/renderer/src/components/layout/QuickBillSearch.tsx) | **37 KB** | 🟡 Complex but single-purpose                               |
| [billing.ipc.ts](file:///d:/sultan/kpt_billing/src/main/ipc/billing.ipc.ts)                                 | **19 KB** | 🟠 68 IPC handlers for 7 different domains                  |
| [settings.ipc.ts](file:///d:/sultan/kpt_billing/src/main/ipc/settings.ipc.ts)                               | **13 KB** | 🟡 27 handlers for 4 domains                                |

---

## Phased Approach

> [!IMPORTANT]
> Each phase is **independently deployable** — you can approve any subset. Phase 1 is zero-risk cleanup. Phase 2-3 are structural refactors with higher impact.

---

## Phase 1: Root Cleanup (Zero-Risk)

Remove stray files and fix `.gitignore`. No code changes.

### [DELETE] Stray files in project root

| File                                    | Reason                                       |
| --------------------------------------- | -------------------------------------------- |
| `Label_KPT-SAR-00011_1782155140339.pdf` | Test output accidentally committed           |
| `barcode.jpeg` (84 KB)                  | Debug/test image                             |
| `_gitignore`                            | Duplicate of `.gitignore`                    |
| `eslint-output.json` (736 KB)           | Cached lint output — should never be tracked |
| `usb` (138 bytes)                       | Unknown debug artifact                       |

### [MODIFY] [.gitignore](file:///d:/sultan/kpt_billing/.gitignore)

Add entries to prevent future clutter:

```gitignore
# Build & cache
node_modules
dist
out
*.tsbuildinfo
eslint-output.json

# OS
.DS_Store
Thumbs.db

# Test artifacts
test-results
*.log*

# Stray files
*.pdf
```

### [MOVE] `pre_launch_review.md` → `docs/PRE_LAUNCH_REVIEW.md`

This is documentation, not a config file — belongs in `docs/`.

### [DELETE] Empty directories

- `src/renderer/src/components/icons/` — empty, unused
- `src/renderer/src/types/` — empty (types live in `src/shared/types/`)
- `image/` — empty directory in root

---

## Phase 2: Split Frontend Monoliths

Break the 6 largest page files into focused sub-components. Each page gets its own directory with an `index.tsx` barrel export.

### [REFACTOR] BillingPage (79 KB → ~6 files)

```
pages/billing/
├── index.tsx              # Re-exports BillingPage
├── BillingPage.tsx        # Main layout + cart logic (~25 KB)
├── CartTable.tsx          # Cart rows + item editing (~10 KB)
├── CartSummary.tsx        # Subtotal/GST/discount panel (~5 KB)
├── PaymentDialog.tsx      # Payment form + success screen (~20 KB)
├── DaySummaryDialog.tsx   # Ctrl+D day summary (~8 KB)
└── HeldBillsDialog.tsx    # Hold/recall bills (~6 KB)
```

Currently `BillingPage.tsx` contains `CartRow`, `PaymentDialog`, `BulkBillDialog` reference, `HeldBillsDialog`, `DaySummaryDialog`, and `EditBillDialog` reference — all defined inline. Each becomes its own file.

---

### [REFACTOR] SettingsPage (66 KB → ~9 files)

```
pages/settings/
├── index.tsx              # Re-exports SettingsPage
├── SettingsPage.tsx       # Tab container + layout (~5 KB)
├── ShopInfoTab.tsx        # Shop name, address, GST (~8 KB)
├── BillingTab.tsx         # Bill prefix, payment defaults (~6 KB)
├── PrinterTab.tsx         # Printer selection, diagnostics (~8 KB)
├── BackupTab.tsx          # Local + cloud backup (~10 KB)
├── SecurityTab.tsx        # PIN change, users (~6 KB)
├── AppearanceTab.tsx      # Theme, font size (~4 KB)
└── BarcodeTab.tsx         # Label settings (~5 KB)
```

---

### [REFACTOR] ReportsPage (94 KB → ~7 files)

```
pages/reports/
├── index.tsx              # Re-exports ReportsPage
├── ReportsPage.tsx        # Tab container (~5 KB)
├── DailyReport.tsx        # Daily summary + bill list (~15 KB)
├── WeeklyReport.tsx       # Weekly chart + breakdown (~12 KB)
├── MonthlyReport.tsx      # Monthly chart + breakdown (~12 KB)
├── YearlyReport.tsx       # Yearly chart + breakdown (~12 KB)
├── GstReport.tsx          # GST/HSN report (~15 KB)
└── ProfitLossReport.tsx   # P&L statement (~10 KB)
```

---

### [REFACTOR] CustomersPage (53 KB → ~5 files)

```
pages/customers/
├── index.tsx
├── CustomersPage.tsx      # List + search (~15 KB)
├── CustomerForm.tsx       # Add/edit dialog (~10 KB)
├── CustomerDetail.tsx     # Detail view + bill history (~15 KB)
└── CreditLedger.tsx       # Credit ledger panel (~10 KB)
```

---

### [REFACTOR] ProductsPage (47 KB → ~5 files)

```
pages/products/
├── index.tsx
├── ProductsPage.tsx       # List + filters (~12 KB)
├── ProductForm.tsx        # Add/edit dialog (~15 KB)
├── ProductDetail.tsx      # Detail view + stock history (~10 KB)
└── ImportDialog.tsx       # CSV import dialog (~8 KB)
```

---

### [REFACTOR] PurchasesPage (39 KB → ~4 files)

```
pages/purchases/
├── index.tsx
├── PurchasesPage.tsx      # List + search (~10 KB)
├── PurchaseForm.tsx       # Create purchase form (~18 KB)
└── PurchaseDetail.tsx     # View purchase detail (~8 KB)
```

---

## Phase 3: Split Backend Monoliths

### [REFACTOR] billing.ipc.ts (19 KB, 68 handlers → 5 files)

Currently `billing.ipc.ts` is a catch-all for 7 different domains. Split by entity:

```
ipc/
├── billing.ipc.ts         # Bill CRUD, print, hold/recall (18 handlers)
├── customer.ipc.ts        # Customer CRUD + analytics (12 handlers)
├── credit.ipc.ts          # Credit payments + ledger (7 handlers)
├── expense.ipc.ts         # Expenses CRUD + summary (7 handlers)
├── report.ipc.ts          # Report PDF + GST + P&L + dashboard (10 handlers)
├── whatsapp.ipc.ts        # WhatsApp 3 handlers
├── product.ipc.ts         # (already separate — no change)
├── settings.ipc.ts        # (keep as-is — 27 handlers but all related)
├── supplier-purchase.ipc.ts # (already separate — no change)
└── export.ipc.ts          # (already separate — no change)
```

Update [index.ts](file:///d:/sultan/kpt_billing/src/main/index.ts) to register the new IPC modules.

---

### [REFACTOR] bill.repo.ts (49 KB → 3 files)

```
repositories/
├── bill.repo.ts           # Bill CRUD: create, getById, getAll, cancel, return (~20 KB)
├── bill-return.repo.ts    # processReturn, getReturnHistory, getReturnedQtyMap (~12 KB)
├── bill-summary.repo.ts   # getDailySummary, getPeriodSummary, weekly/monthly/yearly (~15 KB)
```

---

## Phase 4: Minor Cleanups

### Duplicate renderer services

- [report.service.ts](file:///d:/sultan/kpt_billing/src/renderer/src/services/report.service.ts) AND [reports.service.ts](file:///d:/sultan/kpt_billing/src/renderer/src/services/reports.service.ts) both exist — merge into `reports.service.ts`

### Test file placement — standardize on **colocation**

Currently mixed: some tests in `__tests__/`, some colocated. The project already leans colocated (most `.test.ts` files sit next to their source). Standardize:

- Move `src/main/database/utils.test.ts` → already colocated ✅
- Move `src/main/database/__tests__/db-test-helper.ts` → keep as shared test utility ✅
- Remove empty `src/renderer/src/__tests__/` (only has `setup.ts` which is a vitest setup file — move to project root or `test/`)

### Unused assets

- `src/renderer/src/assets/electron.svg` — the default electron-vite scaffold logo, check if actually used

---

## Open Questions

> [!IMPORTANT]
> **Scope question:** Do you want all 4 phases, or just specific ones? Phase 1 is a 5-minute cleanup. Phase 2 is the biggest effort (~2-3 hours). Phase 3 is medium (~1 hour). Phase 4 is small (~15 min).

> [!NOTE]
> **Page split approach:** When splitting pages, each sub-component will import shared state/services the same way the monolith did. The `index.tsx` barrel export means **no changes needed in `App.tsx` routing** — it's a transparent refactor.

---

## Verification Plan

### Automated Tests

```bash
npm run typecheck   # Both node + web configs
npm run test        # All 137 unit tests
```

### Manual Verification

- Verify each page loads correctly after split
- Verify IPC handlers still respond (test a bill creation, customer search, report generation)
- Verify `npm run build:win` still produces a working build
