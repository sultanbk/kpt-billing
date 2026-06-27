# KPT Billing — Complete Feature List

> Comprehensive overview of all features in the KPT Billing application.

Developed by **[Sultan Kabadi](https://sultanbk.com)**

---

## Table of Contents

1. [Point of Sale (Billing)](#1-point-of-sale-billing)
2. [Product & Inventory Management](#2-product--inventory-management)
3. [Customer Management](#3-customer-management)
4. [Credit Management](#4-credit-management)
5. [Purchase & Stock-In](#5-purchase--stock-in)
6. [Supplier Management](#6-supplier-management)
7. [Reporting & Analytics](#7-reporting--analytics)
8. [PDF Generation](#8-pdf-generation)
9. [Thermal Printing](#9-thermal-printing)
10. [Barcode Support](#10-barcode-support)
11. [WhatsApp Integration](#11-whatsapp-integration)
12. [Data Export (Excel)](#12-data-export-excel)
13. [Backup & Restore](#13-backup--restore)
14. [Security & Access Control](#14-security--access-control)
15. [Keyboard Shortcuts](#15-keyboard-shortcuts)
16. [Quick Bill Search](#16-quick-bill-search)
17. [Return & Exchange](#17-return--exchange)
18. [Dashboard](#18-dashboard)
19. [Settings & Configuration](#19-settings--configuration)
20. [Estimates / Quotations](#20-estimates--quotations)
21. [Expense Tracking](#21-expense-tracking)
22. [Audit Trail](#22-audit-trail)
23. [Licence & Plan Gating](#23-licence--plan-gating)

---

## 1. Point of Sale (Billing)

The core billing system provides a full POS experience:

- **Product Search** — Search by name, SKU, or short name with real-time dropdown results
- **Barcode Scanning** — Auto-detects rapid keystroke input as barcode scans, instantly adds product to cart
- **Shopping Cart** — Add, remove, update quantities, per-item discounts (% or flat), editable prices
- **Custom Items** — Add miscellaneous/unlisted items ("Other Item") with custom name and price
- **Customer Association** — Search and link a customer, or quick-add a new customer inline
- **Bill-Level Discount** — Apply % or flat discount to the entire bill
- **GST Calculation** — Automatic CGST + SGST split based on product GST rate and HSN code
- **Multiple Payment Modes** — Cash, UPI (with reference number), Card, Credit, and Mixed (split across modes)
- **Cash Tendered & Change** — Calculates change when cash tendered exceeds bill amount
- **Hold / Recall Bills** — Park a bill in progress (F6) and recall it later (F8), persisted to database
- **Plan Limit Awareness** — The hold-bill action warns near the monthly bill limit and is disabled when the plan limit is reached
- **Round-Off** — Configurable rounding: none, round to ₹1, or round to ₹0.50
- **Auto Print** — Optionally auto-print receipt on bill creation
- **Bill Numbering** — Auto-generated sequential bill numbers: `KPT/{FY}/0001`
- **Bill Status** — Completed, Returned, or Cancelled
- **Return & Exchange** — Process returns or exchanges on completed bills with stock restoration, refund tracking, and new bill creation for exchanges

---

## 2. Product & Inventory Management

- **Full CRUD** — Create, read, update, delete products
- **Plan Limit Awareness** — Add Product warns near the product limit and is disabled when the plan limit is reached
- **Product Fields** — Name, short name, SKU (auto-generated), barcode, category, HSN code, purchase price, selling price, wholesale price, GST rate, stock, location, color, size, material, supplier, image
- **Category Management** — Hierarchical categories with parent/child support (default: Saree, Blouse Piece, Dress Material, Dupatta, Fabric, Readymade, Accessories, Other)
- **Stock Tracking** — Current stock with opening stock, low stock alerts, out-of-stock detection
- **Stock Adjustment** — Manual adjustments with type tracking: purchase, adjustment, damage, return
- **Stock Ledger** — Complete movement audit trail per product (every stock change logged)
- **Bulk Import** — Import products from CSV or Excel files
- **Bulk Stock Update** — Update stock for multiple products in a single dialog
- **Price History** — Full audit trail of price changes (purchase, selling, wholesale) with timestamps
- **Stock Valuation** — Calculate total inventory value at cost and selling price
- **Pagination & Filtering** — Paginated product list with search, category filter, stock status filter
- **Low Stock Alerts** — Configurable threshold; products below threshold shown on dashboard

---

## 3. Customer Management

- **Full CRUD** — Create, read, update, delete customers
- **Customer Fields** — Name, phone (unique), email, address, city, GSTIN, customer type
- **Customer Types** — Regular, Wholesale, Walk-in
- **Customer Search** — Real-time search by name or phone number
- **Bill History** — View all bills for a specific customer
- **Quick Add** — Inline customer creation directly from the billing page (Alt+N shortcut)
- **WhatsApp Messaging** — Send bills, reminders, and confirmations to customer phone via WhatsApp
- **Plan-Gated WhatsApp Actions** — Reminder buttons are hidden when the active plan does not include WhatsApp integration

---

## 4. Credit Management

- **Credit Issuance** — Bills paid via credit mode update the customer's balance
- **Credit Limits** — Set per-customer credit limits
- **Payment Recording** — Record credit payments with mode (cash/UPI/card/cheque/bank transfer), reference number, and notes
- **Credit Ledger** — Chronological ledger showing all credits issued and payments received with running balance
- **Balance Tracking** — Before/after balance on every transaction
- **Credit Aging Report** — Aging buckets: Current (0–30 days), 31–60 days, 61–90 days, 90+ days
- **Credit Risk Scoring** — Credit utilization % with risk levels: None, Low, Medium, High
- **Collection Summary** — Total collections by date range
- **WhatsApp Reminders** — Send overdue credit reminders via WhatsApp
- **Customer Analytics** — Top customers by revenue, purchase frequency analysis, credit risk analysis
- **Plan-Gated Analytics** — Customer Analytics and Credit Aging render upgrade prompts when their feature flags are disabled

---

## 5. Purchase & Stock-In

- **Purchase Entry** — Create purchase orders from suppliers with full line items
- **Supplier Search / Create** — Search existing suppliers or create new ones inline during purchase entry
- **Line Items** — Product, barcode, HSN code, quantity, purchase rate, selling rate, MRP, GST rate/amount
- **City Tracking** — Track supply source cities (Surat, Bengaluru, etc.)
- **Invoice Tracking** — Capture supplier invoice number and date
- **Payment Status** — Paid, Unpaid, or Partial payment tracking
- **Auto Stock Update** — Stock and stock ledger automatically updated on purchase creation
- **Purchase History** — View all purchases with details, filterable by date and supplier
- **Barcode Scanner** — Scan product barcodes during purchase entry for quick product lookup
- **Auto Purchase Number** — Sequential purchase numbers: `PUR/0001`

---

## 6. Supplier Management

- **Full CRUD** — Create, read, update, delete suppliers
- **Supplier Fields** — Name, phone, email, address, city, GSTIN, bank details
- **City-Based Grouping** — Group and filter suppliers by city
- **Supplier Search** — Quick search during purchase entry
- **Linked Purchases** — View all purchases from a supplier

---

## 7. Reporting & Analytics

### Standard Reports

- **Daily Report** — Sales summary for a specific date with bills list, payment breakdown, top products
- **Weekly Report** — 7-day rolling summary with daily breakdown
- **Monthly Report** — Month summary with daily breakdown and payment trends
- **Yearly Report** — Year summary with monthly breakdown

### Financial Reports

- **GST Report** — HSN-wise summary, rate-wise breakdowns (5%, 12%, 18%, 28%), GSTR-1 invoice list with all tax details
- **Profit & Loss Report** — Revenue, Cost of Goods Sold (purchases), gross profit, expenses by category, net profit, profit margins (gross % and net %)
- **Plan-Gated P&L** — The Profit & Loss tab is gated by the `profitLossReport` feature flag

### Analytics

- **Customer Analytics** — Three tabs: Top Customers by Revenue, Purchase Frequency, Credit Risk Scoring
- **Credit Aging Report** — 30/60/90/90+ day overdue buckets with summary statistics and WhatsApp reminder capability
- **Dashboard Analytics** — Real-time stats: today's sales vs yesterday, week/month totals, payment mode breakdown, top sellers, low stock

### Report Features

- View individual bill details from any report
- Return or cancel bills directly from report views
- Print / Download PDF from bill detail view
- Date range selection for all reports
- Export reports to PDF

---

## 8. PDF Generation

- **A4 Professional Invoices** — Full-page invoices with:
  - Shop header with name, address, GSTIN, phone
  - Bill number, date, time
  - Customer details (name, phone, GSTIN if applicable)
  - Itemized table with product name, HSN, quantity, rate, discount, taxable amount, CGST, SGST, total
  - Summary: subtotal, discount, taxable amount, tax breakup, round-off, grand total
  - Amount in words (Indian numbering: Lakh, Crore)
  - Payment mode details
  - Digital "Authorized By" footer
- **Report PDFs** — Summary cards, payment breakdown, top products, bill listings
- **Generation Method** — Hidden BrowserWindow renders HTML template, then `printToPDF()` produces the file

---

## 9. Thermal Printing

- **ESC/POS Protocol** — Direct printing to 80mm thermal printers
- **Compatible Printers** — TVS RP 3000 Lite and other ESC/POS compatible printers
- **Receipt Format** — 48-character width with:
  - Shop header (centered)
  - Bill number, date, time, customer
  - Itemized list with quantities and amounts
  - Subtotal, discount, tax, grand total
  - Payment details
  - Custom footer
- **Auto Print** — Configurable to print automatically on bill creation
- **Test Print** — Send test page from Settings to verify printer setup
- **Printer Selection** — Choose from system-detected printers

---

## 10. Barcode Support

- **Barcode Scanning** — Auto-detects rapid sequential keystrokes (< 80–100ms interval, minimum 4 characters) as barcode input
- **Billing Integration** — Scanned barcode triggers product lookup and adds directly to cart
- **Purchase Integration** — Scan barcodes during purchase entry to find products
- **Barcode Generation** — Generate barcodes for products using bwip-js
- **Product Barcode Field** — Each product can store a unique barcode
- **Balanced Proportions** — Layout optimized with balanced barcode-to-text dimensions to prevent vertical overflow/margins
- **High-Contrast MRP Strikethrough** — Displays a clean black vector line overlay for thermal compatibility instead of gray fonts
- **Customizable Barcode Styles & Dimensions** — Complete configuration of barcode label layout directly from Settings: adjust line width (`50%-100%`), line height (`3.0mm-15.0mm`), shop/product/pricing/SKU font sizes (`6pt-20pt`), text alignments (`Left`, `Center`, `Right`), margins (paddings X and Y), gap size, and toggle scannable SKU code text beneath the barcode lines.
- **Printer Alignment Calibration** — Configurable horizontal (X) and vertical (Y) offsets in millimeters (`[-5.0mm, +5.0mm]`) to fix print misalignment issues on thermal label printers

---

## 11. WhatsApp Integration

Three pre-formatted message templates:

1. **Bill Receipt** — Full itemized bill with totals sent as WhatsApp message
2. **Credit Reminder** — Outstanding balance notification for overdue customers
3. **Payment Confirmation** — Payment received acknowledgment with remaining balance

- Opens `wa.me` URLs with pre-filled messages
- Formats Indian phone numbers with +91 prefix
- Available from Customers page and Credit Aging report

---

## 12. Data Export (Excel)

Five export types available from the Data Export page:

| Export Type          | Contents                                                                                    |
| -------------------- | ------------------------------------------------------------------------------------------- |
| **Daily Report**     | Summary sheet + all bills for a date                                                        |
| **Bill History**     | All bills with full details for a date range                                                |
| **Stock Report**     | Complete inventory + low stock items                                                        |
| **Customer Report**  | All customers with credit details                                                           |
| **Full Data Export** | Bills, items, products, customers, payments, purchases, expenses, stock ledger — everything |

All exports generate `.xlsx` files using the xlsx library.

The Data Export page is gated by the `dataExport` licence feature flag.

---

## 13. Backup & Restore

### Local Backup

- **SQL Dump** — Full database exported as portable `.sql` file (schema + data)
- **Auto-Backup** — Configurable frequency: hourly, every 4 hours, or daily
- **Retention** — Configurable retention period (default: 30 days)
- **Restore** — Restore from any `.sql` dump file. Safety backup of current data created automatically before restore. App reloads after restoration.

### Cloud Backup (Google Drive)

- **OAuth2 Authentication** — Connects via Google Cloud OAuth 2.0 Desktop credentials
- **Upload** — Push local backup to Google Drive
- **Download** — Pull backups from Google Drive
- **List** — View all cloud backups with timestamps and sizes
- **Disconnect** — Revoke Google Drive access

---

## 14. Security & Access Control

- **PIN-Based Authentication** — 4–8 digit numeric PIN
- **Role-Based Access** — Owner, Manager, Cashier roles
- **Protected Pages** — Dashboard, Products, Purchases, Customers, Reports, Analytics, Settings all require PIN
- **Billing Page** — Always accessible without PIN (cashier can always bill)
- **Lock Screen** — Lock the app (Alt+L or Ctrl+L), requires PIN to unlock. Shows clock and date.
- **PIN Change** — Change PIN from Settings → Security tab
- **PinGate Component** — Wraps protected routes with PIN verification
- **Default Credentials** — Owner "Puneet", PIN: 1234

---

## 15. Keyboard Shortcuts

### Navigation (Fixed)

| Key | Action              |
| --- | ------------------- |
| F1  | Dashboard           |
| F2  | Billing             |
| F3  | Products            |
| F4  | Purchases           |
| F5  | Customers           |
| F7  | Reports             |
| F10 | Settings            |
| F12 | Show shortcuts help |

### Billing Page

| Key   | Action                     |
| ----- | -------------------------- |
| Esc   | Focus product search       |
| Alt+O | Add Other (custom) item \* |
| Alt+N | Quick add new customer \*  |
| F6    | Hold current bill          |
| F8    | Recall held bill           |
| F9    | Clear cart                 |
| F11   | Pay & Print                |

### Quick Actions

| Key          | Action                  |
| ------------ | ----------------------- |
| Ctrl+K       | Quick Bill Search       |
| Alt+L        | Lock Screen             |
| Ctrl+L       | Lock Screen (alternate) |
| Ctrl+N       | New Bill                |
| Ctrl+Shift+D | Go to Dashboard         |
| Ctrl+Shift+R | Go to Reports           |

\* Configurable via Settings → Shortcuts tab

---

## 16. Quick Bill Search

A command-palette style interface for rapid bill lookup and actions, accessible via **Ctrl+K** or the dedicated sidebar search button.

### Features

- **Recent Bills** — Shows the 15 most recent bills immediately on open (no typing needed)
- **Full-Text Search** — Search by bill number, customer name, or phone number
- **3-Mode Interface** — List → Actions → View, navigable entirely by keyboard
- **Dedicated Sidebar Button** — "Search bills... Ctrl+K" button always visible in the sidebar

### Quick Actions Per Bill

| Action            | Shortcut | Description                                                          |
| ----------------- | -------- | -------------------------------------------------------------------- |
| View Bill Details | **V**    | Full bill view with items table, GST breakup, totals, return history |
| Print Receipt     | **P**    | Send thermal receipt to printer                                      |
| Download PDF      | **D**    | Generate and open a PDF invoice                                      |
| Send via WhatsApp | **W**    | Send bill receipt to customer (requires phone number)                |
| Return / Exchange | **R**    | Open the return/exchange dialog for the bill                         |

### Keyboard Navigation

| Mode    | Shortcut            | Action                         |
| ------- | ------------------- | ------------------------------ |
| List    | ↑↓                  | Navigate between bills         |
| List    | Enter / →           | Open actions for selected bill |
| List    | Esc                 | Close search                   |
| Actions | V / P / D / W / R   | Execute action directly        |
| Actions | ↑↓                  | Navigate between actions       |
| Actions | Enter               | Execute highlighted action     |
| Actions | ← / Esc             | Go back to list                |
| View    | P / D / W           | Quick actions on viewed bill   |
| View    | ← / Esc / Backspace | Go back to actions             |

### Bill Detail View

- Bill header: number, status badge, date, time, salesman
- Customer info: name, phone, payment mode with UPI reference
- Items table: product name, SKU, quantity, price, GST%, total
- Return annotations: returned quantities shown with strike-through for fully returned items
- Totals: subtotal, discount, GST, round-off, grand total
- Return history section: type badges, amounts, dates, linked new bills
- Inline action buttons: Print, PDF, WhatsApp

---

## 17. Return & Exchange

Full return and exchange processing with automatic stock restoration and bill recalculation.

### Access Points

- **Quick Bill Search** (Ctrl+K) → select bill → **R** (Return/Exchange)
- **Reports Page** → Bill detail → Return/Exchange dropdown
- **Bill History** → Actions dropdown → Return or Exchange

### 4-Step Workflow

1. **Search** — Find the original bill by number, customer, or phone
2. **Edit** — Select items and quantities to return, choose mode (Return or Exchange)
3. **Confirm** — Review summary with amounts and refund details
4. **Done** — Success screen with print/WhatsApp options

### Return Mode

- Select items and quantities to return
- Choose refund method: Cash, Credit to account, or Adjust
- Stock is automatically restored for returned items
- Original bill amounts are recalculated based on remaining items
- Refund amount calculated with proportional GST

### Exchange Mode

- Select items to return (same as return mode)
- Add new replacement items with search or "Other" custom items
- Net amount calculated: exchange total minus return credit
- If exchange total > return credit → customer pays the difference
- If return credit > exchange total → refund the difference
- New bill created for exchange items
- Original bill recalculated

### Bill Recalculation After Return

- Original bill's subtotal, discount, taxable amount, GST, round-off, and grand total are recalculated
- Based on effective remaining quantities (original qty minus returned qty)
- Total items and total quantity updated
- Proportional discount applied to remaining items

### Return History

- Full return/exchange history stored in `bill_returns` and `bill_return_items` tables
- Each return records: type, reason, amounts, refund mode, linked new bill (for exchanges)
- Return history displayed in bill detail views (PDF, thermal receipt, Reports, Quick Bill Search)
- Items show return annotations: "(2 returned)" or "(Returned)" with visual strike-through

### PDF & Print Integration

- PDF invoices show return annotations on items and a "Returns / Exchanges Applied" section
- Thermal receipts show "** RETURNED **" annotations and a "RETURNS / EXCHANGES" section
- Both formats show the updated (recalculated) totals

---

## 18. Dashboard

Real-time dashboard with auto-refresh (every 60 seconds):

### Primary Stats (4 cards)

- **Today's Sales** — Total amount with bill count and % change vs yesterday
- **Cash In Hand** — Cash collected today with UPI and Card sub-totals
- **Pending Credits** — Total outstanding credit with customer count and today's collections
- **Stock Alerts** — Low stock + out of stock counts with quick navigation

### Secondary Stats (4 cards)

- **Week Sales** — Last 7 days total
- **Month Sales** — Current month total
- **Avg Bill Value** — Today's average bill amount
- **Today's Expenses** — Expense total with net income calculation

### Additional Sections

- **Payment Breakdown** — Visual bar chart with per-mode amounts, bill counts, and percentages
- **Recent Bills** — Last 10 bills with bill number, time, customer, payment mode, amount
- **Top Selling Today** — Ranked product list by revenue with quantity sold
- **Low Stock Alerts** — Products below threshold with stock count badges
- **Credit Sales Today** — Credit issued vs. collections received

---

## 19. Settings & Configuration

An eight-tab comprehensive settings interface:

### General Tab

- Shop name, GSTIN, address, phone info
- Financial year and state code selection

### Payments Tab (Owner Only)

- Manage bank accounts, default billing UPI VPAs, payee names, and QR scanner codes

### Printers Tab

- Active Receipt Printer and Active Label Printer selections
- Test Print and live Printer Diagnostics (checks spooler state, port, offline status)

### Barcode Tab

- **Collapsible Accordion Panels** — All configurations are neatly organized into four collapsible accordion panels (Content Visibility, Dimensions, Advanced Typography, Calibration), ensuring only one section is open at a time for a clean dashboard view.
- **Premium Switch Toggle Cards** — Raw checkbox controls are replaced by elegant, grid-aligned custom card switches (iOS-style toggles) that illuminate when active.
- **Content Visibility** — Toggle visibility of Shop Name, Product Name, MRP, Selling Price, and Discount Percentage on labels.
- **Strike-through MRP Formatting** — Vector strikethrough line overlay for high-contrast thermal barcode compliance.
- **Shop Name Override** — Override shop header text with a Custom Sale Name (with collapsible input field).
- **Label & Barcode Dimensions** — Configurable default label size (`46x25`mm standard or `60x40`mm large presets), barcode width (`50%` to `100%`), and barcode height (`3.0` to `15.0` mm).
- **Advanced Typography & Layout** — Adjust element-level alignments, custom point (`pt`) font sizes, margins (X & Y paddings), element gap spacing, and readable SKU code text toggle.
- **Printer Alignment Calibration** — Fine-tune horizontal (X-axis) and vertical (Y-axis) margins within `[-5.0 mm, +5.0 mm]` to resolve physical print misalignment on thermal printers.
- **Live Barcode Preview** — Interactive visual mockup card that scales automatically and shifts in real-time according to alignment nudge, margins, alignments, and sizing settings.
- **One-Click "Test Print Label"** — Directly print a sample label using current (including unsaved) calibration adjustments for immediate physical validation.

### Receipt Tab

- Thermal receipt paper width profiles selection (58mm, 72mm, 80mm)
- Auto-print receipt on bill completion toggle
- Customizable Exchange Policy Footer (Standard, Custom Text with presets, or No Footer)
- Floating live receipt layout preview panel with SVG jagged edges scaling dynamically

### Backup Tab

- Create / restore local backups
- Open backups, receipts, reports folders
- Auto-backup frequency and retention
- Google Drive cloud backup setup and management

### Security Tab

- Change PIN (current → new → confirm)
- Cashier user accounts management (Owner Only)

### Shortcuts Tab

- Fixed shortcuts reference (F1–F12, Ctrl combos)
- Configurable shortcuts: Add Other Item, Quick New Customer
- Duplicate prevention — already-assigned shortcuts disabled

### Hidden Settings (stored in DB)

- Default tax type (inclusive/exclusive), round-off mode, default payment mode
- Require customer on bill, enable salesman, enable wholesale
- Receipt copies, state code, bill prefix, financial year start
- Theme, font size

---

## 20. Estimates / Quotations

- **Create Estimates** — Itemized quotations with product details, quantities, prices
- **Estimate Number** — Auto-generated sequential numbers
- **Validity Period** — Default 15 days, configurable
- **Status Tracking** — Active, Converted (to bill), Expired
- **Convert to Bill** — One-click conversion from estimate to actual bill
- **Customer Details** — Name and phone captured on estimate

---

## 21. Expense Tracking

- **Record Expenses** — Date, category, amount, description, payment mode
- **Expense Categories** — Rent, Electricity, Salary, Transport, Packaging, Maintenance, Tea/Food, Marketing, Other
- **CRUD Operations** — Create, view, update, delete expenses
- **Date Filtering** — View expenses by specific date or date range
- **Summary Reports** — Category-wise expense summary integrated into P&L Report
- **Dashboard Integration** — Today's expenses shown on dashboard with net income

---

## 22. Audit Trail

- **Audit Log** — Every significant action recorded: user, action type, entity, old/new values (JSON)
- **Stock Ledger** — Every stock movement logged with reference (sale, purchase, adjustment, return, damage)
- **Price History** — Every price change recorded with before/after values and who changed it
- **Credit Ledger** — Every credit transaction logged with running balance

---

## 23. Licence & Plan Gating

Sarva One Billing includes a local-first licence system with plan-based feature flags and numeric
limits.

- **Activation Screen** — Accepts `SARVA-XXXX-XXXX-XXXX-XXXX` licence keys and shows specific error messages for machine mismatch, invalid, expired, and suspended licences.
- **Status Bar** — Shows trial, active, grace, expired, and suspended licence states.
- **Upgrade Prompts** — Locked features show a helpful card with the Growth/Pro/Custom plan comparison and WhatsApp upgrade CTA.
- **Feature Gates** — `FeatureGate` controls premium pages or page sections such as P&L, Customer Analytics, Credit Aging, Data Export, and WhatsApp actions.
- **Limit Gates** — `LimitGate` warns at 80% of a numeric plan limit and disables actions at the limit.
- **Offline Cache** — The main process validates with the licence server when available and falls back to the local `license_cache` table during offline use.

See [LICENCE.md](LICENCE.md) for implementation details.

---

_Developed by [Sultan Kabadi](https://sultanbk.com) — KPT Billing v2.0.0_
