# KPT Billing — Comprehensive Manual Testing Feature Inventory

> **Purpose:** Exhaustive feature inventory for writing manual test cases.  
> **App:** KPT Billing (Electron + React + SQLite)  
> **Generated from:** Full source code analysis of all pages, components, stores, IPC channels, and types.

---

## Table of Contents

1. [Security & Authentication](#1-security--authentication)
2. [Navigation & Layout](#2-navigation--layout)
3. [Billing Page (POS)](#3-billing-page-pos)
4. [Quick Bill Search (Ctrl+K)](#4-quick-bill-search-ctrlk)
5. [Return & Exchange](#5-return--exchange)
6. [Bulk Billing](#6-bulk-billing)
7. [Dashboard](#7-dashboard)
8. [Products / Inventory](#8-products--inventory)
9. [Purchases](#9-purchases)
10. [Customers](#10-customers)
11. [Reports](#11-reports)
12. [Customer Analytics](#12-customer-analytics)
13. [Credit Aging](#13-credit-aging)
14. [Data Export](#14-data-export)
15. [Settings](#15-settings)
16. [Keyboard Shortcuts (Global)](#16-keyboard-shortcuts-global)

---

## 1. Security & Authentication

### 1.1 Lock Screen

| Attribute     | Detail                                                                       |
| ------------- | ---------------------------------------------------------------------------- |
| **Component** | `src/renderer/src/components/layout/LockScreen.tsx`                          |
| **Store**     | `src/renderer/src/stores/auth.store.ts` — `isUnlocked`, `unlock()`, `lock()` |
| **IPC**       | `auth:verifyPin`                                                             |
| **Shortcut**  | `Alt+L` or `Ctrl+L` to lock                                                  |

**Features to test:**

- Full-screen overlay appears when locked, showing a real-time clock
- 4-digit PIN input (numeric-only, auto-submits or submit via Enter)
- Incorrect PIN shows error toast, clears input
- Correct PIN unlocks, overlay disappears
- `Alt+L` / `Ctrl+L` from any page triggers lock
- After auto-lock timeout (if configured), screen locks automatically

### 1.2 PIN Gate (Protected Routes)

| Attribute     | Detail                                           |
| ------------- | ------------------------------------------------ |
| **Component** | `src/renderer/src/components/layout/PinGate.tsx` |
| **IPC**       | `auth:verifyPin`                                 |

**Features to test:**

- All routes except `/` (Billing) are wrapped in `<PinGate>`
- If `auth.store.isUnlocked === false`, shows PIN prompt instead of page content
- After verifying PIN, the wrapped page renders
- Protected pages: Dashboard, Products, Purchases, Customers, Reports, Customer Analytics, Credit Aging, Data Export, Settings

### 1.3 Change PIN

| Attribute     | Detail                                                   |
| ------------- | -------------------------------------------------------- |
| **Component** | `src/renderer/src/pages/SettingsPage.tsx` (Security tab) |
| **IPC**       | `auth:changePin`                                         |

**Features to test:**

- Three fields: Current PIN, New PIN (min 4 digits), Confirm New PIN
- Numeric-only input enforcement (non-digit characters stripped)
- Max length 8 characters per field
- Validation: new PIN must match confirm PIN
- Validation: current PIN must be correct
- Success toast on change, error toast on wrong current PIN

---

## 2. Navigation & Layout

### 2.1 Sidebar

| Attribute     | Detail                                                          |
| ------------- | --------------------------------------------------------------- |
| **Component** | `src/renderer/src/components/layout/Sidebar.tsx`                |
| **Router**    | `src/renderer/src/App.tsx` — HashRouter with lazy-loaded routes |

**Navigation structure:**
| Section | Item | Route | Shortcut |
|---------|------|-------|----------|
| — | Billing | `/` (index) | F2 |
| — | Dashboard | `/dashboard` | F1 |
| Inventory | Products | `/products` | F3 |
| Inventory | Purchases | `/purchases` | F4 |
| Inventory | Customers | `/customers` | F5 |
| Insights | Reports | `/reports` | F7 |
| Insights | Customer Analytics | `/customer-analytics` | — |
| Insights | Credit Aging | `/credit-aging` | — |
| Insights | Data Export | `/data-export` | — |
| — | Settings | `/settings` | F10 |

**Features to test:**

- Each sidebar link navigates to the correct page
- Active page is visually highlighted
- Lock icon shown for protected pages when locked
- "Search bills... Ctrl+K" button in sidebar opens QuickBillSearch
- Sidebar is always visible (app shell with `<Outlet>` for content)
- Lazy loading: first visit to a page shows "Loading..." fallback

### 2.2 Shortcuts Help Dialog

| Attribute     | Detail                                                 |
| ------------- | ------------------------------------------------------ |
| **Component** | `src/renderer/src/components/layout/ShortcutsHelp.tsx` |
| **Shortcut**  | `F12`                                                  |

**Features to test:**

- F12 toggles the shortcuts help dialog open/closed
- Dialog shows 4 sections: Navigation, Billing, Quick Actions, Quick Bill Search
- ESC or clicking outside closes it
- Lists all active shortcuts including customized ones

### 2.3 Error Boundary

| Attribute     | Detail                                          |
| ------------- | ----------------------------------------------- |
| **Component** | `src/renderer/src/components/ErrorBoundary.tsx` |

**Features to test:**

- If a page throws a render error, error boundary catches it and shows fallback UI
- App doesn't crash entirely

---

## 3. Billing Page (POS)

| Attribute     | Detail                                                       |
| ------------- | ------------------------------------------------------------ |
| **Component** | `src/renderer/src/pages/BillingPage.tsx` (1926 lines)        |
| **Store**     | `src/renderer/src/stores/billing.store.ts` (Zustand + Immer) |
| **Route**     | `/` (index, no PIN required)                                 |

### 3.1 Product Search & Adding Items

| IPC                         | Purpose                         |
| --------------------------- | ------------------------------- |
| `products:search`           | Search products by name/SKU     |
| `products:getByBarcode`     | Barcode scan lookup             |
| `billing:getNextBillNumber` | Get next sequential bill number |

**Features to test:**

- Search input auto-focused on page load and on `Esc` press
- Type to search by product name or SKU — results shown in dropdown
- Selecting a product adds it to cart with qty=1
- If product already in cart, quantity increments by 1
- Barcode scanner input: rapid character entry followed by Enter triggers barcode lookup
- Barcode match adds product to cart; no match shows error toast
- Search results show: product name, SKU, stock count, selling price
- Out-of-stock items shown but greyed/disabled or show warning

### 3.2 Cart Management

| Store Action         | Purpose                                 |
| -------------------- | --------------------------------------- |
| `addItem`            | Add product to cart                     |
| `addCustomItem`      | Add "Other" item with custom name/price |
| `updateItemQuantity` | Change qty                              |
| `updateItemPrice`    | Override price                          |
| `updateItemName`     | Rename custom item                      |
| `updateItemDiscount` | Per-item discount                       |
| `removeItem`         | Remove from cart                        |
| `clearCart`          | Empty cart (F9)                         |
| `recalculate`        | Recompute totals                        |

**Features to test:**

- Cart table shows: S.No, Product Name, SKU, Qty, Price, Discount, GST%, Total
- Inline qty adjustment: +/− buttons, direct input
- Inline price override field
- Inline per-item discount (₹ amount)
- Remove item button (× icon)
- Custom/Other item: shortcut `Alt+O` (configurable) opens dialog for name + price entry
- Cart totals auto-recalculate: subtotal, total discount, taxable amount, GST (CGST+SGST), round-off, grand total
- F9 clears the entire cart with confirmation
- Empty cart shows placeholder message

### 3.3 Customer Section

| IPC                | Purpose                   |
| ------------------ | ------------------------- |
| `customers:search` | Search existing customers |
| `customers:create` | Quick-add new customer    |

**Features to test:**

- Customer search by name or phone number
- Selecting a customer attaches them to the bill
- Quick-add customer: `Alt+N` (configurable) opens inline form with name + phone
- Customer shown in bill header area with name and phone
- Remove customer button (clear selection)
- Customer is optional by default (configurable via settings `requireCustomerOnBill`)

### 3.4 Payment & Bill Creation

| IPC                          | Purpose               |
| ---------------------------- | --------------------- |
| `billing:createBill`         | Save bill to database |
| `printer:printReceipt`       | Thermal print         |
| `billing:generatePdfReceipt` | PDF generation        |
| `whatsapp:sendBillReceipt`   | WhatsApp send         |

**Features to test:**

- F11 or "Pay & Print" button opens payment dialog
- Payment modes: Cash, UPI, Card, Credit, Multi-mode
- Cash mode: shows amount tendered input and calculates change
- UPI mode: optional UPI reference number field
- Card mode: standard flow
- Credit mode: requires a customer to be attached (shows error if no customer)
- Multi-mode: split payment across Cash + UPI + Card + Credit
- Discount: overall bill discount (flat ₹ or percentage)
- Salesman field (if enabled in settings)
- After payment: bill saved, bill number assigned
- Auto-print to thermal printer if `autoPrint` setting is enabled
- Post-payment dialog: Print Receipt, Download PDF, Send WhatsApp, New Bill buttons
- "New Bill" or `Ctrl+N` starts a fresh bill

### 3.5 Hold & Recall Bills

| IPC                      | Purpose                        |
| ------------------------ | ------------------------------ |
| `billing:holdBill`       | Save current cart as held bill |
| `billing:getHeldBills`   | List held bills                |
| `billing:recallHeldBill` | Restore held bill to cart      |
| `billing:deleteHeldBill` | Delete a held bill             |

| Store Action     | Purpose                 |
| ---------------- | ----------------------- |
| `holdBill`       | Persist to DB via IPC   |
| `recallBill`     | Restore from DB via IPC |
| `loadHeldBills`  | Fetch held bills list   |
| `deleteHeldBill` | Remove held bill        |

**Features to test:**

- F6 holds current cart (saves items + customer to database)
- Held bill gets a label (auto-generated or custom)
- F8 opens recall dialog showing all held bills
- Selecting a held bill restores all items + customer to cart
- Current cart is replaced (with warning if non-empty)
- Delete held bill from recall list
- Multiple bills can be held simultaneously
- Held bills persist across app restarts (stored in DB)

### 3.6 Day Summary Popup

| IPC                          | Purpose               |
| ---------------------------- | --------------------- |
| `billing:getDailySummary`    | Today's summary stats |
| `billing:getTopSellingToday` | Top products today    |

**Features to test:**

- `Ctrl+D` opens day summary popup
- Shows: total sales, bill count, cash/UPI/card/credit breakdown
- Shows top selling products for the day
- Close with ESC or click outside

### 3.7 Tax Handling

**Features to test:**

- GST calculation: inclusive vs exclusive (configurable in settings `defaultTaxType`)
- CGST and SGST split equally (e.g., 12% GST → 6% CGST + 6% SGST)
- Per-product GST rates (0%, 5%, 12%, 18%, 28%)
- Round-off to nearest rupee (configurable mode: round/ceil/floor/none)
- Tax breakup visible in cart footer

---

## 4. Quick Bill Search (Ctrl+K)

| Attribute     | Detail                                                                                                                                                   |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Component** | `src/renderer/src/components/layout/QuickBillSearch.tsx` (854 lines)                                                                                     |
| **Shortcut**  | `Ctrl+K`                                                                                                                                                 |
| **IPC**       | `billing:getRecentBills`, `billing:quickSearch`, `billing:getByBillNo`, `printer:printReceipt`, `billing:generatePdfReceipt`, `whatsapp:sendBillReceipt` |

### 4.1 List Mode (Default)

**Features to test:**

- Opens with recent 15 bills pre-loaded (no typing needed)
- Search field: type to filter by bill number, customer name, or phone
- Results update as you type (debounced)
- ↑↓ arrow keys navigate between bills
- Each bill shows: bill number, date, customer name, amount, status badge
- Enter or → opens Actions mode for the selected bill
- ESC closes the entire dialog

### 4.2 Actions Mode

**Features to test:**

- Shows 5 action options for the selected bill
- Single-key shortcuts:

| Key | Action                | IPC                          |
| --- | --------------------- | ---------------------------- |
| V   | View full bill detail | `billing:getByBillNo`        |
| P   | Print thermal receipt | `printer:printReceipt`       |
| D   | Download PDF          | `billing:generatePdfReceipt` |
| W   | Send via WhatsApp     | `whatsapp:sendBillReceipt`   |
| R   | Return / Exchange     | Opens EditBillDialog         |

- ← or ESC goes back to List mode
- ↑↓ to navigate actions, Enter to execute highlighted action
- WhatsApp only enabled if customer has phone number

### 4.3 View Mode

**Features to test:**

- Full bill detail: header (number, date, time, status), customer info, items table
- Items table columns: Product, SKU, Qty, Price, GST%, Total
- Returned items shown with strike-through and "(X returned)" annotation
- Totals section: subtotal, discount, taxable, CGST, SGST, round-off, grand total
- Return history section (if any): type badge, amounts, date, linked bills
- Inline action buttons: Print (P), PDF (D), WhatsApp (W)
- ← or ESC or Backspace goes back to Actions mode

---

## 5. Return & Exchange

| Attribute     | Detail                                                                                                                                           |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Component** | `src/renderer/src/components/billing/EditBillDialog.tsx` (1550 lines)                                                                            |
| **IPC**       | `billing:getByBillNo`, `billing:processReturn`, `billing:getReturnedQtyMap`, `billing:getReturnHistory`, `products:search`, `billing:createBill` |

### 5.1 Step 1 — Search Bill

**Features to test:**

- Search by bill number
- Bill found: shows bill summary (number, date, customer, amount)
- Bill not found: shows error
- Proceed to Edit step

### 5.2 Step 2 — Edit (Select Return Items)

**Features to test:**

- List of bill items with checkboxes
- Per-item quantity selector (1 to original qty minus already-returned qty)
- Already fully-returned items are disabled
- Two modes selectable: **Return** or **Exchange**
- **Return mode:** choose refund method — Cash / Credit to account / Adjust
- **Exchange mode:** additional section to add replacement items
  - Search products for exchange items
  - Add "Other" custom items for exchange
  - Net amount calculated (exchange total − return credit)
- At least one item must be selected to proceed

### 5.3 Step 3 — Confirm

**Features to test:**

- Summary of items being returned with quantities and amounts
- Return amount (proportional to items being returned, including GST)
- For exchange: shows exchange items, net amount (pay or refund difference)
- Refund method displayed
- Confirm button processes the return

### 5.4 Step 4 — Done

**Features to test:**

- Success message with return/exchange details
- Buttons: Print Return Receipt, Send WhatsApp, Close
- For exchange: link to the new exchange bill
- Stock automatically restored for returned items
- Original bill recalculated (amounts adjusted for remaining items)
- Return history recorded in database

---

## 6. Bulk Billing

| Attribute     | Detail                                                                                                                                 |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| **Component** | `src/renderer/src/components/billing/BulkBillDialog.tsx` (900 lines)                                                                   |
| **IPC**       | `customers:search`, `customers:create`, `billing:createBill` (called per customer), `printer:printReceipt`, `whatsapp:sendBillReceipt` |

### 6.1 Step 1 — Select Customers

**Features to test:**

- Search and select multiple customers
- Inline quick-add customer (name + phone) without leaving dialog
- Selected customers shown as chips/tags
- Remove individual customers from selection
- Minimum 1 customer required to proceed

### 6.2 Step 2 — Review

**Features to test:**

- Shows the bill items (from current cart) applied to each customer
- Per-customer payment mode selector (Cash / UPI / Card / Credit)
- Per-customer UPI reference field (if UPI selected)
- Total amount shown per customer
- Grand total across all customers displayed

### 6.3 Step 3 — Processing

**Features to test:**

- Bills created sequentially, one per customer
- Progress indicator (X of Y completed)
- Each bill gets its own bill number
- Errors for individual bills don't stop the batch
- Failed bills shown with error message

### 6.4 Step 4 — Done

**Features to test:**

- Summary: X bills created successfully, Y failed
- "Print All" button: prints all receipts sequentially
- "WhatsApp All" button: opens WhatsApp for each customer with phone
- Individual print/WhatsApp per bill
- Close returns to billing page with cleared cart

---

## 7. Dashboard

| Attribute     | Detail                                                                                                                                |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| **Component** | `src/renderer/src/pages/DashboardPage.tsx` (600 lines)                                                                                |
| **Route**     | `/dashboard` (PIN protected)                                                                                                          |
| **IPC**       | `reports:getDashboardData`, `billing:getDailySummary`, `billing:getTopSellingToday`, `products:getLowStock`, `billing:getRecentBills` |
| **Shortcut**  | F1                                                                                                                                    |

### 7.1 Primary Stats Cards (4)

| Card            | Data                            | Detail                              |
| --------------- | ------------------------------- | ----------------------------------- |
| Today's Sales   | Total amount                    | Bill count, % change vs yesterday   |
| Cash In Hand    | Cash collected                  | UPI and Card sub-totals             |
| Pending Credits | Outstanding credit total        | Customer count, today's collections |
| Stock Alerts    | Low stock + out of stock counts | Click navigates to Products page    |

### 7.2 Secondary Stats Cards (4)

| Card             | Data                      |
| ---------------- | ------------------------- |
| Week Sales       | Last 7 days total         |
| Month Sales      | Current month total       |
| Avg Bill Value   | Today's average           |
| Today's Expenses | Expense total, net income |

### 7.3 Additional Sections

**Features to test:**

- **Payment Breakdown**: Visual bar/chart with per-mode (Cash/UPI/Card/Credit) amounts, counts, percentages
- **Recent Bills**: Last 10 bills table — bill no, time, customer, payment mode, amount; click navigates or shows detail
- **Top Selling Today**: Ranked product list by revenue with quantity sold
- **Low Stock Alerts**: Products below threshold — stock count badges; click navigates to Products
- **Credit Sales Today**: Credit issued vs collections received
- **Auto-refresh**: Data refreshes every 60 seconds
- **Manual refresh**: Pull-to-refresh or refresh button

---

## 8. Products / Inventory

| Attribute     | Detail                                                |
| ------------- | ----------------------------------------------------- |
| **Component** | `src/renderer/src/pages/ProductsPage.tsx` (817 lines) |
| **Route**     | `/products` (PIN protected)                           |
| **Shortcut**  | F3                                                    |

### 8.1 Product List & Search

| IPC                 | Purpose                    |
| ------------------- | -------------------------- |
| `products:getAll`   | Paginated product list     |
| `products:search`   | Search by name/SKU/barcode |
| `categories:getAll` | Category filter options    |

**Features to test:**

- Paginated product table with columns: Name, SKU, Barcode, Category, Stock, Selling Price, Purchase Price, GST%
- Search bar: search by name, SKU, or barcode
- Category filter dropdown
- Pagination controls (page size, prev/next)
- Sort by column headers
- Stock status indicators (normal, low stock, out of stock)

### 8.2 Create Product

| IPC                 | Purpose            |
| ------------------- | ------------------ |
| `products:create`   | Create new product |
| `categories:getAll` | Load categories    |

**Features to test:**

- Add Product dialog/form
- Fields: Name\*, SKU (auto-generated or manual), Barcode, Category, HSN Code
- Pricing: Selling Price\*, Purchase Price, Wholesale Price, MRP
- Tax: GST Rate (0/5/12/18/28%)
- Stock: Opening Stock, Low Stock Threshold
- Unit: pieces, meters, kg, etc.
- Validation: required fields, numeric values, unique SKU
- Success toast on creation

### 8.3 Edit Product

| IPC               | Purpose        |
| ----------------- | -------------- |
| `products:update` | Update product |

**Features to test:**

- Edit opens pre-filled form
- All fields editable
- Price change recorded in price history
- Save updates product, success toast

### 8.4 Delete Product

| IPC               | Purpose        |
| ----------------- | -------------- |
| `products:delete` | Delete product |

**Features to test:**

- Delete confirmation dialog
- Cannot delete if product has associated bills (or shows warning)
- Success toast on deletion

### 8.5 Stock Adjustment

| IPC                       | Purpose                 |
| ------------------------- | ----------------------- |
| `products:adjustStock`    | Manual stock adjustment |
| `products:getStockLedger` | Stock movement history  |

**Features to test:**

- Stock adjustment dialog: select reason (Purchase, Damage, Correction, Opening Stock, Other)
- Enter quantity (+/−) and optional notes
- Stock updated in database
- Stock ledger entry created with reference
- Stock ledger viewable per product

### 8.6 Price History

| Attribute     | Detail                                                        |
| ------------- | ------------------------------------------------------------- |
| **Component** | `src/renderer/src/components/products/PriceHistoryDialog.tsx` |
| **IPC**       | `products:getPriceHistory`                                    |

**Features to test:**

- Shows chronological price changes for a product
- Each entry: date, old price → new price, who changed it
- Tracks selling price, purchase price, wholesale price separately
- Trend indicators (up/down arrows)

### 8.7 Import Products (CSV)

| IPC               | Purpose              |
| ----------------- | -------------------- |
| `products:import` | Bulk import from CSV |
| `dialog:openFile` | File picker          |

**Features to test:**

- Import button opens file picker (CSV filter)
- CSV parsed: expected columns (Name, SKU, Price, Stock, Category, etc.)
- Preview of rows to import
- Validation errors shown per row
- Import creates products in bulk
- Success/failure count shown

### 8.8 Bulk Stock Update (CSV)

| Attribute     | Detail                                                                       |
| ------------- | ---------------------------------------------------------------------------- |
| **Component** | `src/renderer/src/components/products/BulkStockUpdateDialog.tsx` (312 lines) |
| **IPC**       | `products:bulkStockUpdate`, `dialog:openFile`                                |

**Features to test:**

- Upload CSV with SKU/Barcode and Stock columns
- Preview of parsed rows with matched products
- Unmatched SKUs shown as errors
- Confirm updates stock for all matched products
- Success count and error details displayed

### 8.9 Export Stock Report

| IPC                  | Purpose         |
| -------------------- | --------------- |
| `export:stockReport` | Export to Excel |

**Features to test:**

- Exports current stock data to Excel (.xlsx)
- File save dialog
- All products with stock quantities, values

### 8.10 Category Management

| IPC                 | Purpose         |
| ------------------- | --------------- |
| `categories:getAll` | List categories |
| `categories:create` | Create category |
| `categories:update` | Update category |
| `categories:delete` | Delete category |

**Features to test:**

- Category CRUD within Products page
- Create new category (name)
- Edit category name
- Delete category (check if products use it)
- Categories used as filter in product list

### 8.11 Stock Valuation

| IPC                          | Purpose           |
| ---------------------------- | ----------------- |
| `products:getStockValuation` | Total stock value |

**Features to test:**

- Displays total stock valuation (cost price × quantity for all products)
- Broken down by category if available

---

## 9. Purchases

| Attribute     | Detail                                                  |
| ------------- | ------------------------------------------------------- |
| **Component** | `src/renderer/src/pages/PurchasesPage.tsx` (1155 lines) |
| **Route**     | `/purchases` (PIN protected)                            |
| **Shortcut**  | F4                                                      |

### 9.1 New Purchase Entry

| IPC                       | Purpose              |
| ------------------------- | -------------------- |
| `purchases:getNextNumber` | Next purchase number |
| `purchases:create`        | Save purchase        |
| `suppliers:search`        | Search suppliers     |
| `suppliers:create`        | Quick-add supplier   |
| `products:search`         | Search products      |
| `products:getByBarcode`   | Barcode lookup       |

**Features to test:**

- Purchase number auto-generated
- Date field (defaults to today)
- Supplier selection via search
- Quick-add supplier inline (name, phone, city, GSTIN)
- Add items:
  - Search product by name/SKU
  - Barcode scanner input
  - Manual item entry (name, qty, rate)
- Line item fields: Product, Qty, Rate, GST%, Amount
- Edit line items inline (change qty, rate, GST%)
- Remove line items
- Payment status: Paid / Unpaid / Partial
- Invoice number field (supplier's invoice)
- Notes field
- Totals: subtotal, GST, grand total
- Save purchase — updates product stock automatically
- Success toast

### 9.2 Purchase History

| IPC                                        | Purpose              |
| ------------------------------------------ | -------------------- |
| `purchases:getAll` / `purchases:getRecent` | List purchases       |
| `purchases:getById`                        | View purchase detail |
| `purchases:delete`                         | Delete purchase      |

**Features to test:**

- Tab: Purchase History showing all purchases
- Search/filter purchases
- View purchase detail (items, supplier, amounts)
- Delete purchase (with confirmation)
- Deleting a purchase reverses stock changes

### 9.3 Supplier Management

| IPC                   | Purpose           |
| --------------------- | ----------------- |
| `suppliers:getAll`    | List suppliers    |
| `suppliers:search`    | Search suppliers  |
| `suppliers:create`    | Create supplier   |
| `suppliers:update`    | Update supplier   |
| `suppliers:delete`    | Delete supplier   |
| `suppliers:getCities` | Get unique cities |

**Features to test:**

- Supplier CRUD within Purchases page
- Fields: Name\*, Phone, City, GSTIN, Address
- Search suppliers by name or phone
- Filter by city
- Edit supplier details
- Delete supplier (check for linked purchases)

---

## 10. Customers

| Attribute     | Detail                                                  |
| ------------- | ------------------------------------------------------- |
| **Component** | `src/renderer/src/pages/CustomersPage.tsx` (1290 lines) |
| **Route**     | `/customers` (PIN protected)                            |
| **Shortcut**  | F5                                                      |

### 10.1 Customer List & Stats

| IPC                        | Purpose                           |
| -------------------------- | --------------------------------- |
| `customers:getAll`         | List all customers                |
| `customers:search`         | Search by name/phone              |
| `customers:getWithCredit`  | Customers with outstanding credit |
| `customers:getTotalCredit` | Aggregate credit stats            |

**Features to test:**

- Stats cards: Total Customers, Credit Outstanding, Credit Accounts count
- Customer table: Name, Phone, Type (Regular/Wholesale), Outstanding Credit, Total Purchases
- Search by name or phone number
- Filter by type (All / Regular / Wholesale / Credit)
- Pagination

### 10.2 Create Customer

| IPC                | Purpose         |
| ------------------ | --------------- |
| `customers:create` | Create customer |

**Features to test:**

- Add Customer dialog
- Fields: Name*, Phone*, Type (Regular/Wholesale), Address, GSTIN, Email
- Phone number validation
- Duplicate phone prevention
- Success toast

### 10.3 Edit Customer

| IPC                | Purpose         |
| ------------------ | --------------- |
| `customers:update` | Update customer |

**Features to test:**

- Edit pre-filled form
- All fields editable
- Save updates customer

### 10.4 Customer Detail Dialog

| IPC                          | Purpose          |
| ---------------------------- | ---------------- |
| `customers:getById`          | Customer details |
| `billing:getBillsByCustomer` | Customer's bills |
| `credit:getLedger`           | Credit ledger    |
| `credit:getByCustomer`       | Credit payments  |

**Features to test:**

- Click customer row opens detail dialog
- **Bills Tab**: All bills for this customer — bill no, date, amount, payment mode, status
- **Credit Ledger Tab**: Chronological credit transactions (purchases on credit, payments made) with running balance
- **Payments Tab**: All credit payments made by this customer

### 10.5 Record Credit Payment

| IPC                                | Purpose                        |
| ---------------------------------- | ------------------------------ |
| `credit:recordPayment`             | Record payment                 |
| `whatsapp:sendPaymentConfirmation` | Send confirmation via WhatsApp |

**Features to test:**

- "Collect Payment" button (when customer has outstanding credit)
- Payment dialog: Amount, Payment Mode (Cash/UPI/Card), Reference, Notes
- Amount validation (cannot exceed outstanding balance)
- After recording: credit balance updated, ledger entry created
- Optional: Send WhatsApp payment confirmation to customer
- Success toast with new balance

### 10.6 Delete Credit Payment

| IPC                    | Purpose                 |
| ---------------------- | ----------------------- |
| `credit:deletePayment` | Delete a payment record |

**Features to test:**

- Delete payment from payment list (with confirmation)
- Reverses the credit balance change
- Audit trail updated

### 10.7 WhatsApp Credit Reminder

| IPC                           | Purpose       |
| ----------------------------- | ------------- |
| `whatsapp:sendCreditReminder` | Send reminder |

**Features to test:**

- Send credit reminder button (from customer detail or credit aging)
- Opens WhatsApp (wa.me) with pre-formatted message including customer name, outstanding amount
- Only available if customer has phone number

---

## 11. Reports

| Attribute     | Detail                                                |
| ------------- | ----------------------------------------------------- |
| **Component** | `src/renderer/src/pages/ReportsPage.tsx` (2239 lines) |
| **Route**     | `/reports` (PIN protected)                            |
| **Shortcut**  | F7                                                    |

### 11.1 Daily Report Tab

| IPC                          | Purpose          |
| ---------------------------- | ---------------- |
| `billing:getDailySummary`    | Daily stats      |
| `billing:getBillsByDate`     | Bills for a date |
| `billing:getTopSellingToday` | Top products     |

**Features to test:**

- Date picker (defaults to today)
- Summary cards: Total Sales, Bills Count, Average Bill, Cash/UPI/Card/Credit totals
- Bills table: Bill No, Time, Customer, Items, Payment Mode, Amount
- Click bill row opens bill detail dialog
- Top selling products list
- Payment mode breakdown

### 11.2 Weekly Report Tab

| IPC                        | Purpose     |
| -------------------------- | ----------- |
| `billing:getWeeklySummary` | Weekly data |

**Features to test:**

- Week selector (current week default)
- Day-by-day breakdown table: Date, Bills, Sales, Cash, UPI, Card, Credit
- Weekly totals row
- Comparison with previous week

### 11.3 Monthly Report Tab

| IPC                         | Purpose      |
| --------------------------- | ------------ |
| `billing:getMonthlySummary` | Monthly data |

**Features to test:**

- Month/Year selector
- Day-by-day breakdown for the month
- Monthly totals
- Payment mode summary

### 11.4 Yearly Report Tab

| IPC                        | Purpose     |
| -------------------------- | ----------- |
| `billing:getYearlySummary` | Yearly data |

**Features to test:**

- Year selector
- Month-by-month breakdown: Month, Bills, Sales, Cash, UPI, Card, Credit
- Yearly totals
- Year-over-year comparison

### 11.5 GST Report Tab

| IPC                    | Purpose            |
| ---------------------- | ------------------ |
| `reports:getGstReport` | GST data by period |

**Features to test:**

- Date range selector
- GST breakup by rate: 0%, 5%, 12%, 18%, 28%
- Per rate: Taxable Amount, CGST, SGST, Total Tax, Total
- Summary totals
- Export capability

### 11.6 Profit & Loss Tab

| IPC                     | Purpose         |
| ----------------------- | --------------- |
| `reports:getProfitLoss` | P&L data        |
| `expenses:getSummary`   | Expense summary |

**Features to test:**

- Date range selector
- Revenue section: gross sales, returns, net sales
- Cost section: purchases (COGS)
- Gross profit calculation
- Expenses section: category-wise expense breakdown
- Net profit/loss
- Margins (gross margin %, net margin %)

### 11.7 Bill Detail Dialog (from Reports)

| IPC                   | Purpose           |
| --------------------- | ----------------- |
| `billing:getByBillNo` | Full bill details |
| `billing:returnBill`  | Process return    |
| `billing:cancelBill`  | Cancel bill       |

**Features to test:**

- Accessed by clicking a bill in any report tab
- Full bill detail: items, customer, payment, GST breakup
- Actions dropdown: Return, Exchange, Cancel
- Return from reports follows same flow as EditBillDialog
- Cancel bill: confirmation → bill marked cancelled → stock restored

### 11.8 PDF Report Generation

| IPC                         | Purpose             |
| --------------------------- | ------------------- |
| `report:generateDailyPdf`   | Daily report PDF    |
| `report:generateWeeklyPdf`  | Weekly report PDF   |
| `report:generateMonthlyPdf` | Monthly report PDF  |
| `report:generateYearlyPdf`  | Yearly report PDF   |
| `report:openFile`           | Open generated PDF  |
| `report:getReportsDir`      | Reports folder path |

**Features to test:**

- "Download PDF" button on each report tab
- PDF generated in reports directory
- PDF opens automatically after generation
- PDF contains all data visible in the tab
- "Open Reports Folder" button opens the directory

---

## 12. Customer Analytics

| Attribute     | Detail                                                         |
| ------------- | -------------------------------------------------------------- |
| **Component** | `src/renderer/src/pages/CustomerAnalyticsPage.tsx` (551 lines) |
| **Route**     | `/customer-analytics` (PIN protected)                          |

### 12.1 Summary Cards

| IPC                         | Purpose        |
| --------------------------- | -------------- |
| `customers:getAll`          | Customer count |
| `customers:getTopByRevenue` | Revenue data   |
| `customers:getCreditRisk`   | Risk data      |
| `customers:getTotalCredit`  | Credit data    |

**Features to test:**

- Active Customers count
- Total Revenue across all customers
- Average Revenue per customer
- High Risk customer count
- Total Outstanding credit

### 12.2 Top Customers by Revenue Tab

| IPC                         | Purpose              |
| --------------------------- | -------------------- |
| `customers:getTopByRevenue` | Ranked customer list |

**Features to test:**

- Table: Rank, Customer Name, Phone, Total Revenue, Bills Count, Avg Bill Value
- Sorted by revenue descending
- Date range filter (if available)

### 12.3 Purchase Frequency Tab

| IPC                      | Purpose        |
| ------------------------ | -------------- |
| `customers:getFrequency` | Frequency data |

**Features to test:**

- Table: Customer, Total Bills, First Purchase, Last Purchase, Frequency (days between purchases)
- Identify regular vs dormant customers
- Sorted by frequency

### 12.4 Credit Risk Scoring Tab

| IPC                       | Purpose     |
| ------------------------- | ----------- |
| `customers:getCreditRisk` | Risk scores |

**Features to test:**

- Table: Customer, Outstanding, Credit Limit, Bills on Credit, Oldest Unpaid, Risk Score
- Risk levels: Low, Medium, High (color coded)
- Sorted by risk score descending
- High-risk customer highlighting

---

## 13. Credit Aging

| Attribute     | Detail                                                                                       |
| ------------- | -------------------------------------------------------------------------------------------- |
| **Component** | `src/renderer/src/pages/CreditAgingPage.tsx` (412 lines)                                     |
| **Route**     | `/credit-aging` (PIN protected)                                                              |
| **IPC**       | `customers:getCreditAging`, `customers:getCreditAgingSummary`, `whatsapp:sendCreditReminder` |

### 13.1 Aging Summary Cards

**Features to test:**

- 4 aging bucket cards (clickable as filters):
  - Current (0-30 days): amount + customer count
  - 31-60 days: amount + customer count
  - 61-90 days: amount + customer count
  - 90+ days: amount + customer count
- Total outstanding amount
- Clicking a card filters the list below

### 13.2 Aging Distribution Bar

**Features to test:**

- Visual horizontal bar showing proportion of each bucket
- Color-coded segments (green → yellow → orange → red)

### 13.3 Customer Aging List

**Features to test:**

- Table: Customer, Phone, Outstanding Amount, Oldest Invoice, Aging Bucket
- Filtered by selected bucket (or show all)
- Sorted by outstanding amount or aging
- WhatsApp reminder button per customer
- Click customer for detail

### 13.4 Export Credit Aging

**Features to test:**

- Export button generates Excel report of aging data
- Includes all customers, amounts, aging buckets

---

## 14. Data Export

| Attribute     | Detail                                                   |
| ------------- | -------------------------------------------------------- |
| **Component** | `src/renderer/src/pages/DataExportPage.tsx` (~280 lines) |
| **Route**     | `/data-export` (PIN protected)                           |

### 14.1 Export Types

| Export           | IPC Channel             | Output        |
| ---------------- | ----------------------- | ------------- |
| Daily Report     | `export:dailyReport`    | Excel (.xlsx) |
| Bill History     | `export:billHistory`    | Excel (.xlsx) |
| Stock Report     | `export:stockReport`    | Excel (.xlsx) |
| Customer Report  | `export:customerReport` | Excel (.xlsx) |
| Full Data Export | `export:fullData`       | Excel (.xlsx) |

**Features to test per export:**

- Date range selector with quick presets: Today, Yesterday, This Week, This Month, This Financial Year, Custom Range
- Financial year start respects settings (April 1 default)
- Export button triggers file save dialog
- File generated and saved to selected location
- Success toast with file path
- Each export contains appropriate data columns
- Full Data Export includes all tables

---

## 15. Settings

| Attribute     | Detail                                                |
| ------------- | ----------------------------------------------------- |
| **Component** | `src/renderer/src/pages/SettingsPage.tsx` (922 lines) |
| **Route**     | `/settings` (PIN protected)                           |
| **Shortcut**  | F10                                                   |

### 15.1 General Tab — Shop Details

| IPC                | Purpose                  |
| ------------------ | ------------------------ |
| `settings:getAll`  | Load all settings        |
| `settings:set`     | Update single setting    |
| `settings:setMany` | Update multiple settings |

**Features to test:**
| Setting | Key | Type |
|---------|-----|------|
| Shop Name | `shopName` | Text |
| GSTIN | `gstin` | Text |
| Address | `address` | Textarea |
| Phone | `phone` | Text |
| Receipt Footer | `receiptFooter` | Text |

- All fields pre-filled from saved settings
- Changes auto-save or save on explicit Save button
- Validation: GSTIN format (15 chars)

### 15.2 General Tab — Printer Settings

| IPC                    | Purpose                     |
| ---------------------- | --------------------------- |
| `printer:getAvailable` | List available printers     |
| `printer:setReceipt`   | Set default receipt printer |
| `printer:testPrint`    | Print test receipt          |

**Features to test:**

- Dropdown of available system printers
- Select receipt printer
- "Test Print" button sends test receipt
- Auto-print toggle: automatically print after bill creation
- Receipt copies count setting

### 15.3 Backup Tab — Local Backup

| IPC                   | Purpose               |
| --------------------- | --------------------- |
| `backup:create`       | Create backup (.sql)  |
| `backup:list`         | List existing backups |
| `backup:restore`      | Restore from backup   |
| `backup:clean`        | Clean old backups     |
| `backup:getDir`       | Get backup directory  |
| `backup:selectFolder` | Choose backup folder  |

**Features to test:**

- "Create Backup Now" button — creates timestamped .sql file
- Backup list showing file name, size, date
- Restore from selected backup (confirmation dialog — warns about data replacement)
- "Open Backups Folder" button
- "Open Receipts Folder" button
- "Open Reports Folder" button
- Auto-backup frequency: Hourly / Every 4 Hours / Daily
- Backup retention: keep X days (delete older)

### 15.4 Backup Tab — Cloud Backup (Google Drive)

| IPC                    | Purpose                 |
| ---------------------- | ----------------------- |
| `cloud:getStatus`      | Check connection status |
| `cloud:saveConfig`     | Save OAuth credentials  |
| `cloud:getConfig`      | Load OAuth credentials  |
| `cloud:authenticate`   | OAuth2 flow             |
| `cloud:disconnect`     | Disconnect account      |
| `cloud:backup`         | Upload backup to Drive  |
| `cloud:listBackups`    | List cloud backups      |
| `cloud:downloadBackup` | Download from cloud     |

**Features to test:**

- Enter Google OAuth Client ID and Client Secret
- "Save Config" button
- Status badges: Connected (green) / Not Connected / Not Configured
- "Connect to Google Drive" button → opens browser OAuth flow
- After auth: "Backup to Cloud" button uploads current DB backup
- Cloud backups list: name, size, date, download button
- "Disconnect" button revokes auth
- Download backup from cloud

### 15.5 Security Tab

(See [Section 1.3 — Change PIN](#13-change-pin))

### 15.6 Shortcuts Tab

| Attribute     | Detail                                               |
| ------------- | ---------------------------------------------------- |
| **Component** | `KeyboardShortcutsCard` (inline in SettingsPage.tsx) |
| **IPC**       | `settings:set` (stores shortcut preferences)         |

**Features to test:**

- Fixed shortcuts reference table (F1-F12, Ctrl combos) — read-only
- Configurable shortcuts:
  - **Add Other Item**: default `Alt+O`, selectable from Alt+key options
  - **Quick New Customer**: default `Alt+N`, selectable from Alt+key options
- Available options: Alt+O, Alt+N, Alt+C, Alt+P, Alt+A, Alt+I, Alt+Q, Alt+S, Alt+X, Alt+M, Alt+1-5
- Duplicate prevention: already-assigned shortcuts disabled in dropdown
- System shortcuts (F-keys, Ctrl combos) cannot be assigned
- Changes persist after save

---

## 16. Keyboard Shortcuts (Global)

| Attribute | Detail                                                       |
| --------- | ------------------------------------------------------------ |
| **Hook**  | `src/renderer/src/hooks/useKeyboardShortcuts.ts`             |
| **Help**  | `src/renderer/src/components/layout/ShortcutsHelp.tsx` (F12) |

### Complete Shortcut Reference

#### Navigation

| Shortcut | Action          | Scope  |
| -------- | --------------- | ------ |
| F1       | Go to Dashboard | Global |
| F2       | Go to Billing   | Global |
| F3       | Go to Products  | Global |
| F4       | Go to Purchases | Global |
| F5       | Go to Customers | Global |
| F7       | Go to Reports   | Global |
| F10      | Go to Settings  | Global |

#### Billing Actions

| Shortcut | Action                                | Scope        |
| -------- | ------------------------------------- | ------------ |
| Esc      | Focus search input                    | Billing page |
| Alt+O    | Add Other/custom item (configurable)  | Billing page |
| Alt+N    | Quick add new customer (configurable) | Billing page |
| F6       | Hold current bill                     | Billing page |
| F8       | Recall held bill                      | Billing page |
| F9       | Clear cart                            | Billing page |
| F11      | Open Pay & Print dialog               | Billing page |
| Ctrl+R   | Open Return/Exchange                  | Billing page |
| Ctrl+D   | Open Day Summary popup                | Billing page |

#### Quick Actions

| Shortcut       | Action                   | Scope        |
| -------------- | ------------------------ | ------------ |
| Ctrl+K         | Open Quick Bill Search   | Global       |
| Alt+L / Ctrl+L | Lock screen              | Global       |
| Ctrl+N         | New Bill (clear + fresh) | Billing page |
| Ctrl+Shift+D   | Go to Dashboard          | Global       |
| Ctrl+Shift+R   | Go to Reports            | Global       |
| F12            | Toggle Shortcuts Help    | Global       |

#### Quick Bill Search (Ctrl+K active)

| Shortcut  | Action                 | Mode           |
| --------- | ---------------------- | -------------- |
| ↑ / ↓     | Navigate list          | List / Actions |
| Enter / → | Open actions / Execute | List / Actions |
| ← / Esc   | Go back / Close        | Actions / View |
| Backspace | Go back                | View           |
| V         | View bill details      | Actions / View |
| P         | Print receipt          | Actions / View |
| D         | Download PDF           | Actions / View |
| W         | Send WhatsApp          | Actions / View |
| R         | Return/Exchange        | Actions        |

---

## Appendix A: Full IPC Channel Inventory

### products namespace

| Channel                      | Direction | Purpose                    |
| ---------------------------- | --------- | -------------------------- |
| `products:search`            | invoke    | Search products by text    |
| `products:getAll`            | invoke    | Get paginated product list |
| `products:getById`           | invoke    | Get single product         |
| `products:getByBarcode`      | invoke    | Barcode lookup             |
| `products:create`            | invoke    | Create product             |
| `products:update`            | invoke    | Update product             |
| `products:delete`            | invoke    | Delete product             |
| `products:import`            | invoke    | CSV import                 |
| `products:getLowStock`       | invoke    | Below-threshold products   |
| `products:getOutOfStock`     | invoke    | Zero-stock products        |
| `products:getStockValuation` | invoke    | Total stock value          |
| `products:adjustStock`       | invoke    | Manual stock adjustment    |
| `products:getStockLedger`    | invoke    | Stock movement history     |
| `products:getPriceHistory`   | invoke    | Price change history       |
| `products:bulkStockUpdate`   | invoke    | Bulk CSV stock update      |

### categories namespace

| Channel             | Direction | Purpose         |
| ------------------- | --------- | --------------- |
| `categories:getAll` | invoke    | List categories |
| `categories:create` | invoke    | Create category |
| `categories:update` | invoke    | Update category |
| `categories:delete` | invoke    | Delete category |

### billing namespace

| Channel                      | Direction | Purpose                 |
| ---------------------------- | --------- | ----------------------- |
| `billing:getNextBillNumber`  | invoke    | Next sequential bill no |
| `billing:createBill`         | invoke    | Save bill               |
| `billing:getById`            | invoke    | Get bill by ID          |
| `billing:getByBillNo`        | invoke    | Get bill by number      |
| `billing:getRecentBills`     | invoke    | Recent N bills          |
| `billing:getBillsByDate`     | invoke    | Bills for a date        |
| `billing:getDailySummary`    | invoke    | Daily stats             |
| `billing:getWeekSummary`     | invoke    | Week stats              |
| `billing:getMonthSummary`    | invoke    | Month stats             |
| `billing:getTopSellingToday` | invoke    | Top products today      |
| `billing:getAllBills`        | invoke    | All bills (paginated)   |
| `billing:quickSearch`        | invoke    | Search bills by text    |
| `billing:printReceipt`       | invoke    | Thermal print           |
| `billing:generatePdfReceipt` | invoke    | PDF generation          |
| `billing:getReceiptsDir`     | invoke    | Receipts folder path    |
| `billing:returnBill`         | invoke    | Return a bill           |
| `billing:cancelBill`         | invoke    | Cancel a bill           |
| `billing:getBillsByCustomer` | invoke    | Bills by customer       |
| `billing:processReturn`      | invoke    | Process return/exchange |
| `billing:getReturnHistory`   | invoke    | Return history for bill |
| `billing:getReturnedQtyMap`  | invoke    | Returned qty per item   |
| `billing:holdBill`           | invoke    | Hold current bill       |
| `billing:getHeldBills`       | invoke    | List held bills         |
| `billing:recallHeldBill`     | invoke    | Recall held bill        |
| `billing:deleteHeldBill`     | invoke    | Delete held bill        |
| `billing:getWeeklySummary`   | invoke    | Weekly report data      |
| `billing:getMonthlySummary`  | invoke    | Monthly report data     |
| `billing:getYearlySummary`   | invoke    | Yearly report data      |
| `billing:getPeriodSummary`   | invoke    | Custom period summary   |

### customers namespace

| Channel                           | Direction | Purpose                |
| --------------------------------- | --------- | ---------------------- |
| `customers:search`                | invoke    | Search by name/phone   |
| `customers:getAll`                | invoke    | List all customers     |
| `customers:getById`               | invoke    | Single customer        |
| `customers:create`                | invoke    | Create customer        |
| `customers:update`                | invoke    | Update customer        |
| `customers:getWithCredit`         | invoke    | Customers with credit  |
| `customers:getTotalCredit`        | invoke    | Aggregate credit stats |
| `customers:getTopByRevenue`       | invoke    | Top by revenue         |
| `customers:getFrequency`          | invoke    | Purchase frequency     |
| `customers:getCreditRisk`         | invoke    | Credit risk scores     |
| `customers:getCreditAging`        | invoke    | Aging data             |
| `customers:getCreditAgingSummary` | invoke    | Aging summary          |

### credit namespace

| Channel                       | Direction | Purpose              |
| ----------------------------- | --------- | -------------------- |
| `credit:recordPayment`        | invoke    | Record payment       |
| `credit:getById`              | invoke    | Single payment       |
| `credit:getByCustomer`        | invoke    | Payments by customer |
| `credit:getAll`               | invoke    | All payments         |
| `credit:getLedger`            | invoke    | Credit ledger        |
| `credit:getCollectionSummary` | invoke    | Collection stats     |
| `credit:deletePayment`        | invoke    | Delete payment       |

### settings namespace

| Channel            | Direction | Purpose               |
| ------------------ | --------- | --------------------- |
| `settings:get`     | invoke    | Get single setting    |
| `settings:set`     | invoke    | Set single setting    |
| `settings:getAll`  | invoke    | Get all settings      |
| `settings:setMany` | invoke    | Set multiple settings |

### backup namespace

| Channel               | Direction | Purpose               |
| --------------------- | --------- | --------------------- |
| `backup:create`       | invoke    | Create backup         |
| `backup:list`         | invoke    | List backups          |
| `backup:clean`        | invoke    | Clean old backups     |
| `backup:getDir`       | invoke    | Backup directory path |
| `backup:selectFolder` | invoke    | Folder picker         |
| `backup:restore`      | invoke    | Restore from backup   |

### cloud namespace

| Channel                | Direction | Purpose             |
| ---------------------- | --------- | ------------------- |
| `cloud:getStatus`      | invoke    | Connection status   |
| `cloud:saveConfig`     | invoke    | Save OAuth config   |
| `cloud:getConfig`      | invoke    | Load OAuth config   |
| `cloud:authenticate`   | invoke    | Start OAuth flow    |
| `cloud:disconnect`     | invoke    | Revoke auth         |
| `cloud:backup`         | invoke    | Upload to Drive     |
| `cloud:listBackups`    | invoke    | List cloud backups  |
| `cloud:downloadBackup` | invoke    | Download from cloud |

### printer namespace

| Channel                | Direction | Purpose             |
| ---------------------- | --------- | ------------------- |
| `printer:getAvailable` | invoke    | Available printers  |
| `printer:setReceipt`   | invoke    | Set default printer |
| `printer:testPrint`    | invoke    | Test print          |
| `printer:printReceipt` | invoke    | Print bill receipt  |

### dialog namespace

| Channel             | Direction | Purpose       |
| ------------------- | --------- | ------------- |
| `dialog:openFile`   | invoke    | File picker   |
| `dialog:openFolder` | invoke    | Folder picker |

### export namespace

| Channel                 | Direction | Purpose              |
| ----------------------- | --------- | -------------------- |
| `export:dailyReport`    | invoke    | Export daily report  |
| `export:billHistory`    | invoke    | Export bill history  |
| `export:stockReport`    | invoke    | Export stock data    |
| `export:customerReport` | invoke    | Export customer data |
| `export:fullData`       | invoke    | Export all data      |

### report namespace

| Channel                     | Direction | Purpose             |
| --------------------------- | --------- | ------------------- |
| `report:generateDailyPdf`   | invoke    | Daily PDF           |
| `report:generateWeeklyPdf`  | invoke    | Weekly PDF          |
| `report:generateMonthlyPdf` | invoke    | Monthly PDF         |
| `report:generateYearlyPdf`  | invoke    | Yearly PDF          |
| `report:openFile`           | invoke    | Open generated file |
| `report:getReportsDir`      | invoke    | Reports folder path |

### reports namespace (advanced)

| Channel                    | Direction | Purpose         |
| -------------------------- | --------- | --------------- |
| `reports:getGstReport`     | invoke    | GST report data |
| `reports:getProfitLoss`    | invoke    | P&L data        |
| `reports:getDashboardData` | invoke    | Dashboard stats |

### suppliers namespace

| Channel               | Direction | Purpose          |
| --------------------- | --------- | ---------------- |
| `suppliers:getAll`    | invoke    | List suppliers   |
| `suppliers:getById`   | invoke    | Single supplier  |
| `suppliers:search`    | invoke    | Search suppliers |
| `suppliers:create`    | invoke    | Create supplier  |
| `suppliers:update`    | invoke    | Update supplier  |
| `suppliers:delete`    | invoke    | Delete supplier  |
| `suppliers:getCities` | invoke    | Unique cities    |

### purchases namespace

| Channel                   | Direction | Purpose              |
| ------------------------- | --------- | -------------------- |
| `purchases:getNextNumber` | invoke    | Next purchase number |
| `purchases:create`        | invoke    | Create purchase      |
| `purchases:getById`       | invoke    | Single purchase      |
| `purchases:getAll`        | invoke    | List all purchases   |
| `purchases:getRecent`     | invoke    | Recent purchases     |
| `purchases:getSummary`    | invoke    | Purchase summary     |
| `purchases:delete`        | invoke    | Delete purchase      |

### expenses namespace

| Channel                  | Direction | Purpose            |
| ------------------------ | --------- | ------------------ |
| `expenses:create`        | invoke    | Create expense     |
| `expenses:getAll`        | invoke    | List expenses      |
| `expenses:getByDate`     | invoke    | Expenses by date   |
| `expenses:update`        | invoke    | Update expense     |
| `expenses:delete`        | invoke    | Delete expense     |
| `expenses:getCategories` | invoke    | Expense categories |
| `expenses:getSummary`    | invoke    | Expense summary    |

### whatsapp namespace

| Channel                            | Direction | Purpose                   |
| ---------------------------------- | --------- | ------------------------- |
| `whatsapp:sendBillReceipt`         | invoke    | Send bill via WhatsApp    |
| `whatsapp:sendCreditReminder`      | invoke    | Send credit reminder      |
| `whatsapp:sendPaymentConfirmation` | invoke    | Send payment confirmation |

### auth namespace

| Channel          | Direction | Purpose    |
| ---------------- | --------- | ---------- |
| `auth:verifyPin` | invoke    | Verify PIN |
| `auth:changePin` | invoke    | Change PIN |

---

## Appendix B: Key Data Types

| Type                | Key Fields                                                                                                                                   |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `Product`           | id, name, sku, barcode, categoryId, sellingPrice, purchasePrice, wholesalePrice, mrp, gstRate, stock, lowStockThreshold, unit, hsnCode       |
| `Category`          | id, name                                                                                                                                     |
| `Bill`              | id, billNo, date, customerId, items[], payments[], subtotal, discount, taxableAmount, cgst, sgst, roundOff, grandTotal, status, salesmanName |
| `BillItem`          | id, billId, productId, productName, sku, quantity, price, discount, gstRate, total                                                           |
| `BillPayment`       | mode (cash/upi/card/credit), amount, reference                                                                                               |
| `Customer`          | id, name, phone, type (regular/wholesale), address, gstin, email                                                                             |
| `CreditPayment`     | id, customerId, amount, mode, reference, notes, date                                                                                         |
| `CreditLedgerEntry` | id, customerId, type (credit/payment), amount, balance, reference, date                                                                      |
| `Supplier`          | id, name, phone, city, gstin, address                                                                                                        |
| `Purchase`          | id, purchaseNo, date, supplierId, items[], invoiceNo, paymentStatus, subtotal, gst, grandTotal, notes                                        |
| `PurchaseItem`      | id, purchaseId, productId, productName, quantity, rate, gstRate, amount                                                                      |
| `HeldBill`          | id, label, items[], customer, discount, createdAt                                                                                            |
| `ReturnItem`        | billItemId, quantity, reason                                                                                                                 |
| `ExchangeItem`      | productId, productName, quantity, price, gstRate                                                                                             |
| `BillReturnData`    | billId, type (return/exchange), items[], exchangeItems[], refundMode, reason                                                                 |
| `BillReturnResult`  | success, returnAmount, newBillNo (for exchange), message                                                                                     |
| `DailySummary`      | date, totalSales, billCount, cash, upi, card, credit, returns, avgBill                                                                       |
| `AppSettings`       | shopName, gstin, address, phone, receiptFooter, defaultTaxType, roundOffMode, defaultPaymentMode, autoPrint, ...                             |

---

## Appendix C: Cross-Cutting Features

### C.1 WhatsApp Integration

- Uses `wa.me` URLs to open WhatsApp with pre-formatted messages
- Requires customer phone number
- Three message types: Bill Receipt, Credit Reminder, Payment Confirmation
- Available from: Billing (post-payment), Quick Bill Search, Customer Detail, Credit Aging

### C.2 Thermal Printing (ESC/POS)

- Service: `src/main/services/thermal-printer.service.ts`
- Printer selection from system printers
- Test print capability
- Auto-print on bill creation (configurable)
- Receipt includes: shop header, bill details, items, GST breakup, totals, return annotations, footer

### C.3 PDF Generation

- Services: `src/main/services/pdf-receipt.service.ts`, `pdf-report.service.ts`
- Uses hidden BrowserWindow for HTML-to-PDF rendering
- PDF receipts for individual bills
- PDF reports for daily/weekly/monthly/yearly periods
- Files saved to app-specific directories

### C.4 Excel Export

- Service: `src/main/services/export.service.ts`
- Uses `xlsx` library
- 5 export types from Data Export page
- Additional inline exports from Products (stock), Credit Aging

### C.5 Audit Trail

- Module: `src/main/database/audit.ts`
- Every significant action logged: user, action type, entity, old/new values (JSON)
- Stock ledger: every stock movement with reference
- Price history: every price change with before/after values
- Credit ledger: every credit transaction with running balance

### C.6 Barcode Support

- Library: `bwip-js`
- Barcode scanning on Billing page and Purchases page
- Product lookup by barcode
- Barcode displayed on product details

---

_Total IPC channels: ~100+ | Pages: 10 | Key dialogs: 6+ | Keyboard shortcuts: 30+_
