# KPT Billing — IPC API Reference

> Complete reference of all Inter-Process Communication channels between the Electron main process and renderers.

Developed by **[Sultan Kabadi](https://sultanbk.com)**

---

## Overview

KPT Billing uses Electron's `ipcMain.handle` / `ipcRenderer.invoke` pattern for all main-renderer communication. All channels are exposed through a type-safe preload bridge (`window.api`).

**Architecture:**

```
┌──────────────────┐     contextBridge      ┌────────────────────┐     ipcMain.handle     ┌─────────────────┐
│  React Renderer  │ ───────────────────▶   │  Preload (bridge)  │ ──────────────────▶    │  Main Process   │
│  window.api.*    │ ◀─────────────────     │  ipcRenderer.invoke│ ◀──────────────────    │  Repositories   │
└──────────────────┘     return values      └────────────────────┘     return values      └─────────────────┘
```

---

## Products API

**Namespace:** `window.api.products`

| Channel                      | Parameters                                | Returns                               | Description                            |
| ---------------------------- | ----------------------------------------- | ------------------------------------- | -------------------------------------- |
| `products:search`            | `term: string`                            | `Product[]`                           | Search products by name/SKU/barcode    |
| `products:getAll`            | `filters?: object`                        | `Product[]`                           | Get all products with optional filters |
| `products:getById`           | `id: number`                              | `Product`                             | Get single product by ID               |
| `products:getByBarcode`      | `barcode: string`                         | `Product`                             | Lookup product by barcode              |
| `products:create`            | `data: ProductInput`                      | `Product`                             | Create new product                     |
| `products:update`            | `id: number, data: Partial<ProductInput>` | `Product`                             | Update product                         |
| `products:delete`            | `id: number`                              | `boolean`                             | Delete product                         |
| `products:import`            | `rows: object[]`                          | `{ success: number, errors: number }` | Bulk import products                   |
| `products:getLowStock`       | —                                         | `Product[]`                           | Products below low stock threshold     |
| `products:getOutOfStock`     | —                                         | `Product[]`                           | Products with zero stock               |
| `products:getStockValuation` | —                                         | `{ totalItems, totalValue }`          | Stock valuation summary                |
| `products:adjustStock`       | `productId, qty, type, notes?`            | `boolean`                             | Manual stock adjustment                |
| `products:getStockLedger`    | `productId: number, limit?: number`       | `StockEntry[]`                        | Stock movement history                 |
| `products:getPriceHistory`   | `productId: number, limit?: number`       | `PriceEntry[]`                        | Price change history                   |
| `products:bulkStockUpdate`   | `items: { sku?, barcode?, stock }[]`      | `{ success, errors }`                 | Bulk stock update                      |

---

## Suppliers API

**Namespace:** `window.api.suppliers`

| Channel               | Parameters                  | Returns      | Description              |
| --------------------- | --------------------------- | ------------ | ------------------------ |
| `suppliers:getAll`    | `activeOnly?: boolean`      | `Supplier[]` | List all suppliers       |
| `suppliers:getById`   | `id: number`                | `Supplier`   | Get supplier by ID       |
| `suppliers:search`    | `term: string`              | `Supplier[]` | Search suppliers         |
| `suppliers:create`    | `data: SupplierInput`       | `Supplier`   | Create supplier          |
| `suppliers:update`    | `id: number, data: Partial` | `Supplier`   | Update supplier          |
| `suppliers:delete`    | `id: number`                | `boolean`    | Delete supplier          |
| `suppliers:getCities` | —                           | `string[]`   | Distinct supplier cities |

---

## Purchases API

**Namespace:** `window.api.purchases`

| Channel                   | Parameters            | Returns           | Description                         |
| ------------------------- | --------------------- | ----------------- | ----------------------------------- |
| `purchases:getNextNumber` | —                     | `string`          | Next auto-generated purchase number |
| `purchases:create`        | `data: PurchaseInput` | `Purchase`        | Create purchase + update stock      |
| `purchases:getById`       | `id: number`          | `Purchase`        | Get purchase with items             |
| `purchases:getAll`        | `filters?: object`    | `Purchase[]`      | List purchases with filters         |
| `purchases:getRecent`     | `limit?: number`      | `Purchase[]`      | Recent purchases                    |
| `purchases:getSummary`    | `dateFrom, dateTo`    | `PurchaseSummary` | Purchase summary for date range     |
| `purchases:delete`        | `id: number`          | `boolean`         | Delete purchase + reverse stock     |

---

## Categories API

**Namespace:** `window.api.categories`

| Channel             | Parameters                        | Returns      | Description         |
| ------------------- | --------------------------------- | ------------ | ------------------- |
| `categories:getAll` | —                                 | `Category[]` | List all categories |
| `categories:create` | `name: string, parentId?: number` | `Category`   | Create category     |
| `categories:update` | `id: number, name: string`        | `Category`   | Rename category     |
| `categories:delete` | `id: number`                      | `boolean`    | Delete category     |

---

## Billing API

**Namespace:** `window.api.billing`

| Channel                      | Parameters           | Returns             | Description                                |
| ---------------------------- | -------------------- | ------------------- | ------------------------------------------ |
| `billing:getNextBillNumber`  | —                    | `string`            | Next bill number (e.g., KPT/25-26/0148)    |
| `billing:createBill`         | `data: BillInput`    | `Bill`              | Create bill + stock deduction + auto-print |
| `billing:getById`            | `id: number`         | `Bill`              | Get bill with items                        |
| `billing:getByBillNo`        | `billNo: string`     | `Bill`              | Lookup by bill number                      |
| `billing:getRecentBills`     | `limit?: number`     | `Bill[]`            | Recent bills                               |
| `billing:getBillsByDate`     | `date: string`       | `Bill[]`            | Bills for a specific date                  |
| `billing:getDailySummary`    | `date: string`       | `DailySummary`      | Daily sales summary                        |
| `billing:getWeekSummary`     | —                    | `object`            | Current week summary                       |
| `billing:getMonthSummary`    | —                    | `object`            | Current month summary                      |
| `billing:getTopSellingToday` | `date, limit?`       | `TopProduct[]`      | Top selling products today                 |
| `billing:getAllBills`        | `filters?: object`   | `Bill[]`            | All bills with filtering                   |
| `billing:quickSearch`        | `term: string`       | `Bill[]`            | Search bills by number/name/phone          |
| `billing:printReceipt`       | `billId: number`     | `boolean`           | Print receipt (thermal or PDF)             |
| `billing:generatePdfReceipt` | `billId: number`     | `{ success, path }` | Generate PDF receipt                       |
| `billing:getReceiptsDir`     | —                    | `string`            | Receipts storage directory                 |
| `billing:returnBill`         | `billId, reason?`    | `Bill`              | Mark bill as returned + restore stock      |
| `billing:cancelBill`         | `billId, reason?`    | `Bill`              | Cancel bill + restore stock                |
| `billing:getBillsByCustomer` | `customerId, limit?` | `Bill[]`            | Customer's bill history                    |
| `billing:holdBill`           | `id: string, data`   | `boolean`           | Hold bill for later                        |
| `billing:getHeldBills`       | —                    | `HeldBill[]`        | List all held bills                        |
| `billing:recallHeldBill`     | `id: string`         | `HeldBill`          | Recall held bill                           |
| `billing:deleteHeldBill`     | `id: string`         | `boolean`           | Delete held bill                           |
| `billing:getWeeklySummary`   | `endDate?: string`   | `WeekSummary`       | Weekly summary                             |
| `billing:getMonthlySummary`  | `yearMonth?: string` | `MonthSummary`      | Monthly summary                            |
| `billing:getYearlySummary`   | `year?: number`      | `YearSummary`       | Yearly summary                             |
| `billing:getPeriodSummary`   | `dateFrom, dateTo`   | `PeriodSummary`     | Custom period summary                      |

---

## Customers API

**Namespace:** `window.api.customers`

| Channel                           | Parameters                  | Returns             | Description                       |
| --------------------------------- | --------------------------- | ------------------- | --------------------------------- |
| `customers:search`                | `term: string`              | `Customer[]`        | Search by name/phone              |
| `customers:getAll`                | —                           | `Customer[]`        | List all customers                |
| `customers:getById`               | `id: number`                | `Customer`          | Get customer by ID                |
| `customers:create`                | `data: CustomerInput`       | `Customer`          | Create customer                   |
| `customers:update`                | `id: number, data: Partial` | `Customer`          | Update customer                   |
| `customers:getWithCredit`         | —                           | `Customer[]`        | Customers with outstanding credit |
| `customers:getTotalCredit`        | —                           | `number`            | Total outstanding credits         |
| `customers:getTopByRevenue`       | `limit?: number`            | `CustomerRevenue[]` | Top customers by revenue          |
| `customers:getFrequency`          | —                           | `FrequencyData[]`   | Purchase frequency analysis       |
| `customers:getCreditRisk`         | —                           | `RiskData[]`        | Credit risk assessment            |
| `customers:getCreditAging`        | —                           | `AgingData[]`       | Credit aging breakdown            |
| `customers:getCreditAgingSummary` | —                           | `AgingSummary`      | Aging bucket totals               |

---

## Credit Payments API

**Namespace:** `window.api.credit`

| Channel                       | Parameters           | Returns             | Description               |
| ----------------------------- | -------------------- | ------------------- | ------------------------- |
| `credit:recordPayment`        | `data: PaymentInput` | `Payment`           | Record credit payment     |
| `credit:getById`              | `id: number`         | `Payment`           | Get payment by ID         |
| `credit:getByCustomer`        | `customerId, limit?` | `Payment[]`         | Customer's payments       |
| `credit:getAll`               | `filters?: object`   | `Payment[]`         | All payments with filters |
| `credit:getLedger`            | `customerId: number` | `LedgerEntry[]`     | Full credit ledger        |
| `credit:getCollectionSummary` | `dateFrom, dateTo`   | `CollectionSummary` | Collections summary       |
| `credit:deletePayment`        | `id: number`         | `boolean`           | Delete/reverse a payment  |

---

## Settings API

**Namespace:** `window.api.settings`

| Channel            | Parameters                         | Returns                  | Description           |
| ------------------ | ---------------------------------- | ------------------------ | --------------------- |
| `settings:get`     | `key: string`                      | `string`                 | Get single setting    |
| `settings:set`     | `key: string, value: string`       | `boolean`                | Set single setting    |
| `settings:getAll`  | —                                  | `Record<string, string>` | Get all settings      |
| `settings:setMany` | `settings: Record<string, string>` | `boolean`                | Batch update settings |

---

## Licence API

**Namespace:** `window.license` and `window.api.license`

| Channel                      | Parameters                    | Returns            | Description                                |
| ---------------------------- | ----------------------------- | ------------------ | ------------------------------------------ |
| `license:get-state`          | -                             | `LicenseState`     | Current licence status, plan, and features |
| `license:activate`           | `key: string`                 | `ActivationResult` | Activate a `SARVA-XXXX-XXXX-XXXX-XXXX` key |
| `license:is-feature-enabled` | `feature: keyof FeatureFlags` | `boolean`          | Check whether a feature is enabled         |
| `license:check-limit`        | `limitKey, currentCount`      | `boolean`          | Check a numeric plan limit                 |

Inputs are validated in `src/main/ipc/validation.ts`. See [LICENCE.md](LICENCE.md) for status,
feature flag, and UI gating details.

---

## Backup API

**Namespace:** `window.api.backup`

| Channel               | Parameters            | Returns             | Description                             |
| --------------------- | --------------------- | ------------------- | --------------------------------------- |
| `backup:create`       | `customPath?: string` | `{ success, path }` | Create SQL dump backup                  |
| `backup:list`         | —                     | `BackupFile[]`      | List existing backups                   |
| `backup:clean`        | `retention?: number`  | `number`            | Clean old backups, return count deleted |
| `backup:getDir`       | —                     | `string`            | Get backup directory                    |
| `backup:selectFolder` | —                     | `string`            | Open folder picker dialog               |
| `backup:restore`      | —                     | `boolean`           | Restore from selected file              |

---

## Cloud Backup API (Google Drive)

**Namespace:** `window.api.cloud`

| Channel                | Parameters               | Returns                      | Description                  |
| ---------------------- | ------------------------ | ---------------------------- | ---------------------------- |
| `cloud:getStatus`      | —                        | `{ connected, email? }`      | Connection status            |
| `cloud:saveConfig`     | `clientId, clientSecret` | `boolean`                    | Save OAuth2 credentials      |
| `cloud:getConfig`      | —                        | `{ clientId, clientSecret }` | Get OAuth2 config            |
| `cloud:authenticate`   | —                        | `boolean`                    | Start OAuth2 flow            |
| `cloud:disconnect`     | —                        | `boolean`                    | Disconnect and revoke tokens |
| `cloud:backup`         | —                        | `{ success, fileId }`        | Upload backup to Drive       |
| `cloud:listBackups`    | —                        | `DriveFile[]`                | List backups on Drive        |
| `cloud:downloadBackup` | `fileId, fileName`       | `{ success, path }`          | Download backup              |

---

## Printer API

**Namespace:** `window.api.printer`

| Channel                | Parameters       | Returns    | Description          |
| ---------------------- | ---------------- | ---------- | -------------------- |
| `printer:getAvailable` | —                | `string[]` | List system printers |
| `printer:setReceipt`   | `name: string`   | `boolean`  | Set receipt printer  |
| `printer:testPrint`    | —                | `boolean`  | Print test page      |
| `printer:printReceipt` | `billId: number` | `boolean`  | Print bill receipt   |

---

## Dialog API

**Namespace:** `window.api.dialog`

| Channel             | Parameters           | Returns   | Description                  |
| ------------------- | -------------------- | --------- | ---------------------------- |
| `dialog:openFile`   | `options?: object`   | `string`  | Open file picker             |
| `dialog:openFolder` | `folderPath: string` | `boolean` | Open folder in file explorer |

---

## Export API

**Namespace:** `window.api.export`

| Channel                 | Parameters         | Returns             | Description                      |
| ----------------------- | ------------------ | ------------------- | -------------------------------- |
| `export:dailyReport`    | `date: string`     | `{ success, path }` | Export daily report (Excel)      |
| `export:billHistory`    | `dateFrom, dateTo` | `{ success, path }` | Export bill history (Excel)      |
| `export:stockReport`    | —                  | `{ success, path }` | Export stock report (Excel)      |
| `export:customerReport` | —                  | `{ success, path }` | Export customer data (Excel)     |
| `export:fullData`       | —                  | `{ success, path }` | Export all data (Excel workbook) |

---

## Report PDF API

**Namespace:** `window.api.report`

| Channel                     | Parameters           | Returns             | Description                  |
| --------------------------- | -------------------- | ------------------- | ---------------------------- |
| `report:generateDailyPdf`   | `date: string`       | `{ success, path }` | Daily report PDF             |
| `report:generateWeeklyPdf`  | `endDate?: string`   | `{ success, path }` | Weekly report PDF            |
| `report:generateMonthlyPdf` | `yearMonth?: string` | `{ success, path }` | Monthly report PDF           |
| `report:generateYearlyPdf`  | `year?: number`      | `{ success, path }` | Yearly report PDF            |
| `report:openFile`           | `filePath: string`   | `boolean`           | Open file with system viewer |
| `report:getReportsDir`      | —                    | `string`            | Reports directory path       |

---

## Expenses API

**Namespace:** `window.api.expenses`

| Channel                  | Parameters                  | Returns          | Description                |
| ------------------------ | --------------------------- | ---------------- | -------------------------- |
| `expenses:create`        | `data: ExpenseInput`        | `Expense`        | Create expense             |
| `expenses:getAll`        | `filters?: object`          | `Expense[]`      | List expenses with filters |
| `expenses:getByDate`     | `date: string`              | `Expense[]`      | Expenses for a date        |
| `expenses:update`        | `id: number, data: Partial` | `Expense`        | Update expense             |
| `expenses:delete`        | `id: number`                | `boolean`        | Delete expense             |
| `expenses:getCategories` | —                           | `string[]`       | Expense category list      |
| `expenses:getSummary`    | `dateFrom, dateTo`          | `ExpenseSummary` | Expense summary            |

---

## Advanced Reports API

**Namespace:** `window.api.reports`

| Channel                    | Parameters         | Returns         | Description                              |
| -------------------------- | ------------------ | --------------- | ---------------------------------------- |
| `reports:getGstReport`     | `dateFrom, dateTo` | `GstReport`     | GST report (HSN-wise, rate-wise, GSTR-1) |
| `reports:getProfitLoss`    | `dateFrom, dateTo` | `ProfitLoss`    | Profit & loss statement                  |
| `reports:getDashboardData` | `date: string`     | `DashboardData` | Aggregated dashboard data                |

---

## WhatsApp API

**Namespace:** `window.api.whatsapp`

| Channel                            | Parameters                                 | Returns   | Description                             |
| ---------------------------------- | ------------------------------------------ | --------- | --------------------------------------- |
| `whatsapp:sendBillReceipt`         | `billId, phone`                            | `boolean` | Open WhatsApp with bill receipt         |
| `whatsapp:sendCreditReminder`      | `phone, name, balance`                     | `boolean` | Open WhatsApp with credit reminder      |
| `whatsapp:sendPaymentConfirmation` | `phone, name, amount, balance, mode, date` | `boolean` | Open WhatsApp with payment confirmation |

---

## Auth API

**Namespace:** `window.api.auth`

| Channel          | Parameters           | Returns        | Description                |
| ---------------- | -------------------- | -------------- | -------------------------- |
| `auth:verifyPin` | `pin: string`        | `User \| null` | Verify PIN and return user |
| `auth:changePin` | `currentPin, newPin` | `boolean`      | Change user PIN            |

---

## Error Handling

All IPC channels follow this pattern:

- **Success:** Returns the requested data
- **Failure:** Throws an error that is caught in the renderer as a rejected promise
- Errors are logged via `electron-log` in the main process

```typescript
// Renderer usage
try {
  const bill = await window.api.billing.createBill(data)
  // Success
} catch (error) {
  // Handle error
  toast.error('Failed to create bill')
}
```

---

## Total Channel Count

| Module           | Channels |
| ---------------- | -------- |
| Products         | 15       |
| Suppliers        | 7        |
| Purchases        | 7        |
| Categories       | 4        |
| Billing          | 25       |
| Customers        | 12       |
| Credit           | 7        |
| Settings         | 4        |
| Backup           | 6        |
| Cloud            | 8        |
| Printer          | 4        |
| Dialog           | 2        |
| Export           | 5        |
| Report PDF       | 6        |
| Expenses         | 7        |
| Advanced Reports | 3        |
| WhatsApp         | 3        |
| Auth             | 2        |
| Licence          | 4        |
| **Total**        | **131**  |

---

_Developed by [Sultan Kabadi](https://sultanbk.com) — KPT Billing v1.0.0_
