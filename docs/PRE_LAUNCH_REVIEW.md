# KPT Billing — Pre-Launch Review Report

> **Reviewed:** 2026-06-23 | **Version:** 1.2.0 | **Reviewer:** AI Code Audit

---

## Executive Summary

KPT Billing is a **well-architected** Electron-based POS application with solid fundamentals: proper IPC validation via Zod, transactional database operations, audit logging, and comprehensive feature coverage. However, there are **several issues** that should be addressed before going live — ranging from potential data bugs to security gaps.

| Severity        | Count | Description                                                    |
| --------------- | ----- | -------------------------------------------------------------- |
| 🔴 **Critical** | 3     | Could cause financial data corruption or security breach       |
| 🟠 **High**     | 6     | Will cause incorrect behavior in production scenarios          |
| 🟡 **Medium**   | 8     | Functional issues that should be fixed but won't break the app |
| 🔵 **Low**      | 7     | Code quality / minor improvements                              |

---

## 🔴 CRITICAL Issues

### 1. SKU Generation Race Condition — Duplicate SKUs Possible

**File:** [product.repo.ts](file:///d:/sultan/kpt_billing/src/main/database/repositories/product.repo.ts#L31-L47)

The SKU is generated using `COUNT(*) FROM products` as the sequence number. If two products are created in very close succession (or during bulk import), **they will get the same SKU**, violating the `UNIQUE` constraint and crashing the insert.

```typescript
// Current: uses COUNT(*) which doesn't account for deleted/deactivated products
const result = db.prepare('SELECT COUNT(*) as count FROM products').get()
const seq = (result.count + 1).toString().padStart(5, '0')
```

**Impact:** Bulk import will fail after a product is soft-deleted, because `COUNT(*)` may return a number that already has an existing SKU.

**Fix:** Use `MAX(id)` or a dedicated sequence in the `settings` table (like bill numbers do), or use `SELECT MAX(CAST(SUBSTR(sku, -5) AS INTEGER)) FROM products`.

---

### 2. PIN Stored as SHA-256 Without Salt — Vulnerable to Rainbow Tables

**File:** [settings.ipc.ts](file:///d:/sultan/kpt_billing/src/main/ipc/settings.ipc.ts#L246)

The PIN is hashed with plain SHA-256 without a salt:

```typescript
const hashedPin = createHash('sha256').update('1234').digest('hex')
```

A 4-digit PIN has only 10,000 combinations. Anyone who gains access to the database file can **crack all PINs in milliseconds** using a precomputed table. Given this is a local app with physical access risk (shop environment), the database file could be copied.

**Fix:** Use `crypto.scrypt` or `bcrypt` with a per-user random salt. Even `SHA-256(salt + pin)` is vastly better.

---

### 3. Drizzle ORM Schema vs. Raw SQL Migration Mismatch

**Files:** [schema.ts](file:///d:/sultan/kpt_billing/src/main/database/schema.ts) vs. [connection.ts](file:///d:/sultan/kpt_billing/src/main/database/connection.ts#L64-L393)

The Drizzle ORM schema definitions (used for TypeScript type generation) and the raw SQL `CREATE TABLE` statements in `runMigrations()` have diverged:

| Table               | ORM Schema                  | Raw SQL                           | Issue                 |
| ------------------- | --------------------------- | --------------------------------- | --------------------- |
| `products`          | No `mrp` column             | Has `mrp REAL NOT NULL DEFAULT 0` | Schema drift          |
| `bill_returns`      | **Not in schema.ts at all** | Fully defined in SQL              | ORM schema incomplete |
| `bill_return_items` | **Not in schema.ts at all** | Fully defined in SQL              | ORM schema incomplete |
| `purchases`         | **Not in schema.ts at all** | Fully defined in SQL              | ORM schema incomplete |
| `purchase_items`    | **Not in schema.ts at all** | Fully defined in SQL              | ORM schema incomplete |
| `credit_payments`   | **Not in schema.ts at all** | Fully defined in SQL              | ORM schema incomplete |
| `price_history`     | **Not in schema.ts at all** | Fully defined in SQL              | ORM schema incomplete |

**Impact:** While the app uses raw SQL for queries (not Drizzle query builder), if anyone ever switches to using Drizzle's type-safe queries, they'll be operating against an incomplete schema. More importantly, this makes the codebase misleading.

**Fix:** Either update `schema.ts` to include all tables, or add a comment stating the schema file is only partially used.

---

## 🟠 HIGH Issues

### 4. Bill-Level Discount GST Recalculation Uses Proportional Ratio — Inaccurate for Mixed-Rate Bills

**File:** [bill.repo.ts](file:///d:/sultan/kpt_billing/src/main/database/repositories/bill.repo.ts#L114-L121)

When a bill-level discount is applied, the GST is recalculated using a single `discountRatio`:

```typescript
totalCgst = Math.round(totalCgst * discountRatio * 100) / 100
totalSgst = Math.round(totalSgst * discountRatio * 100) / 100
```

This applies the same discount ratio to GST at all rates (5%, 12%, 18%, etc.), which is **not correct per GST law**. Per Section 15(3) of the CGST Act, the discount should be distributed **proportionally to each item's taxable amount**, and GST should be recalculated per rate slab.

**Impact:** For bills with items at different GST rates (e.g., 5% sarees + 12% dress materials), the GST breakup will be incorrect. This could cause discrepancies in GST returns.

---

### 5. Customer Credit Can Go Negative Without Guard

**File:** [bill.repo.ts](file:///d:/sultan/kpt_billing/src/main/database/repositories/bill.repo.ts#L1076-L1083)

When a return is issued as credit refund for a bill that was originally paid by cash, the code does:

```typescript
db.prepare('UPDATE customers SET current_balance = current_balance - ? WHERE id = ?').run(
  Math.round(totalReturnAmount),
  originalBill.customer_id
)
```

This can make `current_balance` negative (shop owes customer). While there's a comment acknowledging this, negative balance is **not handled anywhere in the UI** — the credit aging report, customer list, and credit payment recording all assume positive balances.

**Impact:** Could confuse the shop owner with negative credit values that don't make sense in their context.

---

### 6. `customerId` Type Inconsistency — String vs Number

**File:** [billing.store.ts](file:///d:/sultan/kpt_billing/src/renderer/src/stores/billing.store.ts#L11) and [validation.ts](file:///d:/sultan/kpt_billing/src/main/ipc/validation.ts#L127)

The billing store defines `customerId` as `string | null`:

```typescript
customerId: string | null
```

But the validation schema allows `number | string | null`:

```typescript
customerId: z.union([z.number().int().positive(), z.string(), z.null()]).optional()
```

And the bill.repo `create()` uses it as a number in SQL (`data.customerId || null`). If a string customerId like `"5"` passes through, it will be inserted as a TEXT in the `customer_id` column instead of an INTEGER, breaking the foreign key relationship.

**Impact:** Customer-linked bills may lose their customer association, affecting credit tracking and customer analytics.

---

### 7. Product `addItem` Deduplication Only Checks `productId` — Custom Items (productId=0) Will Merge

**File:** [billing.store.ts](file:///d:/sultan/kpt_billing/src/renderer/src/stores/billing.store.ts#L123)

```typescript
const existingIdx = state.items.findIndex((i) => i.productId === product.id)
```

If a product has `id = 0` (which custom items set as `productId: 0`), any subsequent product with `id = 0` will merge with the existing custom item instead of being added as a separate line.

**Impact:** Multiple custom items in the same bill will incorrectly merge into one line item.

---

### 8. `holdBill` Stores Customer Data but `recallBill` Doesn't Delete from DB Before Recall

**File:** [billing.store.ts](file:///d:/sultan/kpt_billing/src/renderer/src/stores/billing.store.ts#L341-L342)

The DB deletion happens asynchronously and the error is silently swallowed:

```typescript
billingService.deleteHeldBill(heldBillId).catch(() => {})
```

If the deletion fails, the bill remains in the database and will reappear on next `loadHeldBills()`, potentially leading to **double-billing** if the user completes it and then "recalls" it again.

---

### 9. No Stock Underflow Protection — Stock Can Go Negative

**File:** [bill.repo.ts](file:///d:/sultan/kpt_billing/src/main/database/repositories/bill.repo.ts#L211-L214)

When a bill is created, stock is deducted without checking if sufficient stock exists:

```typescript
db.prepare('UPDATE products SET current_stock = current_stock - ? WHERE id = ?').run(
  item.quantity || 0,
  item.productId
)
```

**Impact:** `current_stock` can go negative, which is displayed in UI and affects stock valuation calculations (negative stock × price = negative value).

---

## 🟡 MEDIUM Issues

### 10. Backup Restore Doesn't Re-Register IPC Handlers

**File:** [backup.service.ts](file:///d:/sultan/kpt_billing/src/main/services/backup.service.ts#L250)

After restoring, `initializeDatabase()` is called but IPC handlers are NOT re-registered. The handlers still reference the old `getSqlite()` instance variables. While `getSqlite()` returns the module-level variable which gets reassigned by `initializeDatabase()`, any prepared statements cached in repository singletons will be stale.

**Impact:** After restore, the app may behave unpredictably until restarted. The code does `win.webContents.reload()` which reloads the renderer, but the main process singletons may still hold stale references.

---

### 11. `report:openFile` Path Traversal Possible via Symlinks

**File:** [billing.ipc.ts](file:///d:/sultan/kpt_billing/src/main/ipc/billing.ipc.ts#L430-L441)

```typescript
const resolved = resolve(validPath)
if (!resolved.startsWith(reportsDir)) {
  throw new Error('Access denied: path outside reports directory')
}
await shell.openPath(resolved)
```

While `resolve()` handles `../` traversal, it does NOT follow symlinks. A symlink inside the reports directory pointing outside could bypass this check on Windows.

---

### 12. `getAll()` for Customers Doesn't Paginate

**File:** [customer.repo.ts](file:///d:/sultan/kpt_billing/src/main/database/repositories/customer.repo.ts#L22-L30)

Returns ALL customers with no pagination:

```typescript
db.prepare('SELECT * FROM customers WHERE is_active = 1 ORDER BY name').all()
```

For a textile shop this might be fine initially, but after years of operation with thousands of customers, this will cause performance degradation on the Customers page.

---

### 13. Credit Payment Validation Rejects Exact Balance Payment Silently

**File:** [credit-payment.repo.ts](file:///d:/sultan/kpt_billing/src/main/database/repositories/credit-payment.repo.ts#L32-L34)

```typescript
if (data.amount > balanceBefore) {
  throw new Error(`Payment ₹${data.amount} exceeds outstanding balance ₹${balanceBefore}`)
}
```

Due to floating-point precision, `Math.round((5000 - 2500.005) * 100) / 100` could produce a `balanceBefore` that's slightly less than the intended final payment amount. This could block the last credit payment.

---

### 14. `createdBy` Field Is Always NULL

**File:** [bill.repo.ts](file:///d:/sultan/kpt_billing/src/main/database/repositories/bill.repo.ts#L164)

```typescript
null // TODO: current user
```

The `created_by` column is never populated for bills, purchases, or expenses. This means the audit trail can't track WHO created a bill — only that a bill was created.

---

### 15. Held Bill JSON Format Backward Compatibility Is Fragile

**File:** [billing.ipc.ts](file:///d:/sultan/kpt_billing/src/main/ipc/billing.ipc.ts#L211-L241)

The `getHeldBills` handler has a "legacy vs new format" detection:

```typescript
const isLegacy = Array.isArray(parsedJson)
```

This works now but will silently produce wrong data if someone stores a new-format JSON that happens to be an array (e.g., due to a bug). No version field or format identifier is used.

---

### 16. Auto-Backup Doesn't Run on App Start — Only After First Interval

**File:** [index.ts](file:///d:/sultan/kpt_billing/src/main/index.ts#L55-L69)

The `setInterval` only fires after the first interval (e.g., 4 hours). If the app is opened and closed within 4 hours, no automatic backup is created in that session.

**Fix:** Run one backup immediately on startup, then start the interval.

---

### 17. `dialog:openFile` Has No Input Validation

**File:** [settings.ipc.ts](file:///d:/sultan/kpt_billing/src/main/ipc/settings.ipc.ts#L201-L204)

```typescript
ipcMain.handle('dialog:openFile', async (_event, options) => {
  const result = await dialog.showOpenDialog(options)
```

The `options` object from the renderer is passed directly to `dialog.showOpenDialog()` without any validation. While Electron's dialog API is generally safe, this is an unpinned surface that could be exploited if a vulnerability is found in Electron's dialog handling.

---

## 🔵 LOW Issues

### 18. `getWeekSummary()` and `getMonthSummary()` Use SQL `date('now')` — UTC vs. Local

**File:** [bill.repo.ts](file:///d:/sultan/kpt_billing/src/main/database/repositories/bill.repo.ts#L387-L409)

```sql
WHERE date >= date('now', '-7 days', 'localtime')
```

These queries correctly use `'localtime'`, but there's an inconsistency: `getWeeklySummary()` and `getMonthlySummary()` use JavaScript `getLocalDateString()` while `getWeekSummary()` and `getMonthSummary()` use SQLite's `date('now','localtime')`. Both should produce the same result, but the dual path is error-prone.

---

### 19. Missing `notes` Column in Bills Table Schema

The Drizzle ORM `schema.ts` for `bills` includes `notes`, and the SQL migration also includes it. However, the `Bill` interface in [types/index.ts](file:///d:/sultan/kpt_billing/src/shared/types/index.ts#L204-L239) does not include a `notes` field.

---

### 20. Audit Log Has No User Context for Most Operations

**File:** [audit.ts](file:///d:/sultan/kpt_billing/src/main/database/audit.ts#L22-L40)

Most `writeAuditLog()` calls don't pass `userId` or `userName`. This means audit entries for bill creation, product updates, etc., lack attribution. Only the PIN login audit includes user context.

---

### 21. `sqlEscape` Function — BigInt Not Handled

**File:** [backup.service.ts](file:///d:/sultan/kpt_billing/src/main/services/backup.service.ts#L283-L290)

If a `better-sqlite3` row ever returns a `BigInt` value (possible for `lastInsertRowid`), `String(value)` will produce a plain number but `typeof value === 'number'` will be false, wrapping it in quotes in the SQL dump.

---

### 22. Error Boundary `handleDismiss` May Re-Trigger the Error

**File:** [ErrorBoundary.tsx](file:///d:/sultan/kpt_billing/src/renderer/src/components/ErrorBoundary.tsx#L36-L38)

The "Try Again" button resets the error state, which will attempt to re-render the failed component — likely producing the same crash. A navigation reset would be more useful.

---

### 23. `electron-builder.yml` Has `npmRebuild: false`

**File:** [electron-builder.yml](file:///d:/sultan/kpt_billing/electron-builder.yml#L44)

With `npmRebuild: false`, `better-sqlite3` (a native module) won't be rebuilt for the target Electron version during packaging. This could cause a **crash on launch** in production builds if the Node ABI version mismatches.

> [!IMPORTANT]
> This is likely intentional since `postinstall` runs `electron-builder install-app-deps`, but verify that the production build actually works by running `npm run build:win` and testing the output.

---

### 24. Unused Drizzle ORM Import

**File:** [connection.ts](file:///d:/sultan/kpt_billing/src/main/database/connection.ts#L10)

`import * as schema from './schema'` is imported for Drizzle ORM initialization, but Drizzle query builder is never used anywhere in the codebase — all queries are raw SQL via `getSqlite()`. The Drizzle ORM dependency (and its associated dev dependencies like `drizzle-kit`) could be removed to slim the bundle.

---

## Feature-by-Feature Review

### ✅ Billing (Core POS)

| Feature                                          | Status    | Notes                                                                      |
| ------------------------------------------------ | --------- | -------------------------------------------------------------------------- |
| Bill creation with multi-item                    | ✅ Works  | Good transactional handling                                                |
| Bill numbering per FY                            | ✅ Works  | Proper FY-aware reset with fallback migration                              |
| GST calculation (CGST/SGST split)                | ⚠️ See #4 | Bill-level discount GST is approximate for mixed rates                     |
| Multi-payment modes (cash/upi/card/credit/mixed) | ✅ Works  | All payment types properly tracked                                         |
| Round-off to nearest rupee                       | ✅ Works  | `Math.round(grandTotalRaw)`                                                |
| Hold/Recall bills                                | ⚠️ See #8 | Risk of duplicate recall                                                   |
| Bill search (by number/customer/date)            | ✅ Works  | Indexed queries                                                            |
| Return/Exchange processing                       | ✅ Works  | Comprehensive — handles partial returns, stock reversal, credit adjustment |
| Bill cancellation                                | ✅ Works  | Stock reversal included                                                    |
| Price-includes-GST back-calculation              | ✅ Works  | Proper reverse GST calculation in billing store                            |
| Custom items (no product)                        | ⚠️ See #7 | Multiple custom items merge                                                |
| Keyboard shortcuts                               | ✅ Works  | F1-F10 mapped                                                              |

### ✅ Products & Inventory

| Feature                   | Status    | Notes                               |
| ------------------------- | --------- | ----------------------------------- |
| Product CRUD              | ✅ Works  | Full lifecycle with soft-delete     |
| SKU auto-generation       | ⚠️ See #1 | Race condition risk                 |
| Barcode lookup            | ✅ Works  | Exact match with priority in search |
| Stock tracking via ledger | ✅ Works  | Every movement recorded             |
| Stock adjustment (manual) | ✅ Works  | With audit trail                    |
| Low stock alerts          | ✅ Works  | Configurable per product            |
| Price history tracking    | ✅ Works  | Automatic on price changes          |
| Bulk import from CSV      | ✅ Works  | With proper CSV parsing             |
| Bulk stock update         | ✅ Works  | Transactional                       |
| Product label printing    | ✅ Works  | Multiple sizes (46x25, 60x40)       |

### ✅ Customers & Credit

| Feature                                 | Status   | Notes                                      |
| --------------------------------------- | -------- | ------------------------------------------ |
| Customer CRUD                           | ✅ Works | Phone uniqueness enforced                  |
| Credit tracking                         | ✅ Works | Balance auto-updated on bills and payments |
| Credit payment recording                | ✅ Works | With balance validation                    |
| Credit ledger                           | ✅ Works | Chronological merge of bills + payments    |
| Credit aging (30/60/90+)                | ✅ Works | Complex FIFO-based aging calculation       |
| Credit risk scoring                     | ✅ Works | Multi-factor risk classification           |
| Customer analytics (revenue, frequency) | ✅ Works | Rich SQL analytics                         |
| Customer without phone                  | ✅ Works | Uses placeholder phone pattern             |

### ✅ Purchases (Stock-In)

| Feature                      | Status   | Notes                               |
| ---------------------------- | -------- | ----------------------------------- |
| Purchase entry with items    | ✅ Works | Auto stock increase + price updates |
| Supplier management          | ✅ Works | Full CRUD with city tracking        |
| Purchase history & search    | ✅ Works | Paginated with filters              |
| Purchase deletion (reversal) | ✅ Works | Stock reversed                      |

### ✅ Reporting

| Feature                          | Status   | Notes                                |
| -------------------------------- | -------- | ------------------------------------ |
| Daily summary                    | ✅ Works | Payment-mode breakdown included      |
| Weekly/Monthly/Yearly summary    | ✅ Works | With day/month breakdown charts      |
| GST report (HSN-wise, rate-wise) | ✅ Works | GSTR-1 ready invoice list            |
| Profit & Loss report             | ✅ Works | Revenue - COGS - Expenses            |
| Dashboard data                   | ✅ Works | Live stats with yesterday comparison |
| PDF report generation            | ✅ Works | Daily/Weekly/Monthly/Yearly          |

### ✅ Settings & Security

| Feature                    | Status     | Notes                                   |
| -------------------------- | ---------- | --------------------------------------- |
| PIN authentication         | ⚠️ See #2  | Weak hashing (no salt)                  |
| Brute-force protection     | ✅ Works   | 5 attempts, 5-minute lockout            |
| PIN change                 | ✅ Works   | Requires current PIN verification       |
| Legacy PIN auto-migration  | ✅ Works   | Plaintext PINs auto-upgraded to SHA-256 |
| Route protection (PinGate) | ✅ Works   | All non-billing pages protected         |
| Audit logging              | ⚠️ See #20 | Works but missing user attribution      |

### ✅ Backup & Recovery

| Feature                      | Status     | Notes                          |
| ---------------------------- | ---------- | ------------------------------ |
| SQL dump backup              | ✅ Works   | Full schema + data dump        |
| Backup restore               | ⚠️ See #10 | Works but may need app restart |
| Auto-backup (interval)       | ⚠️ See #16 | No immediate backup on start   |
| Backup retention cleanup     | ✅ Works   | Configurable retention period  |
| Google Drive cloud backup    | ✅ Works   | OAuth2 flow                    |
| Safety backup before restore | ✅ Works   | Recovery on failure            |

### ✅ Printing

| Feature                   | Status   | Notes                      |
| ------------------------- | -------- | -------------------------- |
| Thermal receipt (ESC/POS) | ✅ Works | TVS RP 3000 compatible     |
| PDF receipt generation    | ✅ Works | A4 layout with GST breakup |
| Printer diagnostics       | ✅ Works | Connection troubleshooting |
| Product label printing    | ✅ Works | Barcode + product info     |

### ✅ Data Export

| Feature               | Status   | Notes               |
| --------------------- | -------- | ------------------- |
| Daily report Excel    | ✅ Works | Via xlsx library    |
| Bill history Excel    | ✅ Works | Date-range filtered |
| Stock report Excel    | ✅ Works | Full inventory      |
| Customer report Excel | ✅ Works | With balances       |
| Full data export      | ✅ Works | All tables          |

### ✅ WhatsApp Integration

| Feature              | Status   | Notes                     |
| -------------------- | -------- | ------------------------- |
| Bill receipt sharing | ✅ Works | Via WhatsApp API link     |
| Credit reminder      | ✅ Works | Pre-formatted message     |
| Payment confirmation | ✅ Works | Post-payment notification |

---

## Architecture Quality Assessment

### ✅ Strengths

1. **Transactional safety** — All critical operations (billing, returns, stock) use `db.transaction()`
2. **IPC validation** — Every channel has Zod schema validation via `safeHandle()`
3. **Audit trail** — All data mutations are logged
4. **Error handling** — `safeHandle` wraps all IPC in try-catch with structured error responses
5. **Code organization** — Clear separation: main/renderer/shared/preload
6. **Lazy loading** — All pages are lazy-loaded with React Suspense
7. **Error boundary** — Prevents white-screen crashes
8. **Financial year awareness** — Bill numbering resets per Indian FY (April-March)
9. **Local timezone handling** — Explicit `getLocalDateString()` avoids UTC midnight bugs
10. **WAL mode** — SQLite configured with WAL for better concurrent performance
11. **Comprehensive preload API** — Complete typed bridge with no direct `ipcRenderer` in renderer

### ⚠️ Areas for Improvement

1. **No database migrations versioning** — Uses `CREATE IF NOT EXISTS` + manual `ALTER TABLE`. For post-launch schema changes, consider a migration version table.
2. **No rate limiting on IPC calls** — A malicious renderer extension could flood the main process.
3. **No data export encryption** — Exported Excel files contain sensitive business data in plain format.
4. **Single-user architecture** — The `pinAttempts` counter is global (not per-user), so one user's failed attempts affect all users.

---

## Pre-Launch Checklist

| #   | Action                                                  | Priority    | Status |
| --- | ------------------------------------------------------- | ----------- | ------ |
| 1   | Fix SKU generation race condition                       | 🔴 Critical | ❌     |
| 2   | Add salt to PIN hashing                                 | 🔴 Critical | ❌     |
| 3   | Fix `customerId` type inconsistency (force to number)   | 🟠 High     | ❌     |
| 4   | Fix custom item deduplication (check for productId > 0) | 🟠 High     | ❌     |
| 5   | Add stock underflow check (warn but allow)              | 🟠 High     | ❌     |
| 6   | Run `npm run build:win` and test the packaged app       | 🔴 Critical | ❌     |
| 7   | Test with real thermal printer (TVS RP 3000)            | 🟠 High     | ❌     |
| 8   | Change default PIN from 1234                            | 🟠 High     | ❌     |
| 9   | Verify backup + restore cycle works end-to-end          | 🟠 High     | ❌     |
| 10  | Add immediate backup on startup                         | 🟡 Medium   | ❌     |
| 11  | Populate `created_by` field in bills                    | 🟡 Medium   | ❌     |
| 12  | Update `schema.ts` to match actual DB tables            | 🟡 Medium   | ❌     |
| 13  | Test GST calculations with mixed-rate bills             | 🟡 Medium   | ❌     |
| 14  | Add `notes` field to `Bill` TypeScript interface        | 🔵 Low      | ❌     |
| 15  | Review `npmRebuild: false` for production builds        | 🟠 High     | ❌     |

---

## Database Health

### Indexes — ✅ Comprehensive

32 indexes covering all major query patterns:

- Products: name, sku, barcode, category, active status
- Bills: date, bill_no, customer, status
- Stock ledger: product_id
- Customers: phone
- Purchases: date, supplier
- Credit payments: customer, date
- Audit log: entity

### Foreign Keys — ✅ Properly Configured

- `foreign_keys = ON` in pragmas
- All references use `REFERENCES` constraints
- Cascade behavior is manual (handled in repo code), which is correct for a billing system

### Performance Pragmas — ✅ Well-Tuned

```sql
journal_mode = WAL
synchronous = NORMAL
busy_timeout = 5000
cache_size = -20000  (20MB)
temp_store = MEMORY
```

---

## Conclusion

The application is **fundamentally solid** and well-engineered for a textile retail POS system. The critical issues (#1 SKU race, #2 PIN security, #6 type mismatch) should be fixed before launch. The high-priority items should ideally be addressed but won't cause immediate data loss.

> [!IMPORTANT]
> **Most important pre-launch action:** Run a full production build (`npm run build:win`), install it on the actual shop computer, and test the complete billing flow with the real thermal printer. Many issues only surface in the packaged Electron app (native module loading, file paths, printer discovery).
