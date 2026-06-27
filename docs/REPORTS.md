# KPT Billing — Reports & Analytics

> Detailed documentation of all report types, analytics modules, and data visualization.

Developed by **[Sultan Kabadi](https://sultanbk.com)**

---

## Overview

KPT Billing provides 7 report types across 3 modules:

1. **Reports Page** (`/reports`) — Daily, Weekly, Monthly, Yearly, GST, and P&L reports
2. **Customer Analytics** (`/customer-analytics`) — Revenue, frequency, and credit risk analysis
3. **Credit Aging** (`/credit-aging`) — Overdue credit analysis with aging buckets

All reports support PDF export, and most support Excel export via the Data Export page.

Some advanced reporting surfaces are licence-gated. The Profit & Loss tab uses
`profitLossReport`, Customer Analytics uses `customerAnalytics`, Credit Aging uses `creditAging`,
and the Data Export page uses `dataExport`. Disabled features show an upgrade prompt instead of the
report content.

---

## Reports Page (`/reports`)

The Reports page has a tabbed interface with 6 report types:

### 1. Daily Report

**Purpose:** Detailed sales summary for a specific date.

**Summary Cards:**

- Total Sales (amount)
- Total Bills (count)
- Total Discount (amount)
- Average Bill Value

**Payment Breakdown:**

- Cash / UPI / Card / Credit — amounts and bill counts
- Visual progress bars with percentages

**Bills Table:**
| Column | Description |
|--------|-------------|
| Bill No. | Clickable to view details |
| Time | Bill creation time |
| Customer | Customer name or "Walk-in" |
| Items | Number of line items |
| Payment | Payment mode badge |
| Amount | Grand total |

**Bill Detail View:**

- Full bill information: number, date, time, customer, salesman
- Itemized table: product, HSN, qty, rate, discount, taxable, CGST, SGST, amount
- Payment breakdown: mode, amounts, UPI reference
- Actions: **Print PDF**, **Download PDF**, **Return Bill**, **Cancel Bill**

---

### 2. Weekly Report

**Purpose:** 7-day rolling sales summary.

**Summary Cards:**

- Total Sales
- Total Bills
- Cash Sales
- UPI Sales
- Card Sales
- Credit Sales
- Total Discount

**Daily Breakdown Table:**
| Column | Description |
|--------|-------------|
| Date | Day of the week |
| Bills | Number of bills |
| Sales | Total sales amount |
| Cash | Cash component |
| UPI | UPI component |
| Card | Card component |
| Credit | Credit component |
| Discount | Discount given |

**Top Products:**

- Top 10 selling products for the week with quantity and revenue

---

### 3. Monthly Report

**Purpose:** Month-level sales summary with daily breakdown.

**Features:**

- Month picker (navigate between months)
- Same summary cards as weekly report
- Daily breakdown table for each day of the month
- Payment trends visualization
- Top products for the month

---

### 4. Yearly Report

**Purpose:** Full financial year summary with monthly breakdown.

**Features:**

- Year picker
- Summary for the entire year
- Monthly breakdown table (12 rows, one per month)
- Monthly totals: sales, bills, cash, UPI, card, credit, discount

---

### 5. GST Report

**Purpose:** GST-compliant report for tax filing (GSTR-1 preparation).

**Date Range:** User-selectable start and end dates.

**Three Sections:**

#### a) HSN-wise Summary

| Column         | Description         |
| -------------- | ------------------- |
| HSN Code       | Product HSN code    |
| Description    | HSN description     |
| Total Quantity | Units sold          |
| Taxable Value  | Pre-tax amount      |
| CGST           | Central GST amount  |
| SGST           | State GST amount    |
| Total Tax      | CGST + SGST         |
| Invoice Value  | Total including tax |

#### b) Rate-wise Breakdown

| GST Rate | Taxable Value | CGST | SGST | Total Tax |
| -------- | ------------- | ---- | ---- | --------- |
| 5%       | ...           | ...  | ...  | ...       |
| 12%      | ...           | ...  | ...  | ...       |
| 18%      | ...           | ...  | ...  | ...       |
| 28%      | ...           | ...  | ...  | ...       |

#### c) GSTR-1 Invoice List

| Column              | Description        |
| ------------------- | ------------------ |
| Invoice No.         | Bill number        |
| Invoice Date        | Bill date          |
| Customer Name       | Buyer name         |
| Customer GSTIN      | Buyer's GST number |
| Taxable Value       | Pre-tax amount     |
| CGST Rate & Amount  | Per rate           |
| SGST Rate & Amount  | Per rate           |
| Total Invoice Value | Grand total        |

---

### 6. Profit & Loss Report

**Purpose:** Comprehensive profitability analysis.

**Licence:** Requires the `profitLossReport` feature flag. When disabled, the tab shows an upgrade
prompt.

**Date Range:** User-selectable period.

**Report Structure:**

```
Revenue
  Total Sales                    ₹ xxx,xxx
  (-) Sales Returns              ₹ xxx
  (-) Discounts Given            ₹ xxx
  ─────────────────────────────────────
  Net Revenue                    ₹ xxx,xxx

Cost of Goods Sold (COGS)
  Total Purchases                ₹ xxx,xxx
  ─────────────────────────────────────

Gross Profit                     ₹ xxx,xxx
  Gross Margin                   xx.x%

Operating Expenses
  Rent                           ₹ xxx
  Electricity                    ₹ xxx
  Salary                         ₹ xxx
  Transport                      ₹ xxx
  Packaging                      ₹ xxx
  Maintenance                    ₹ xxx
  Tea/Food                       ₹ xxx
  Marketing                      ₹ xxx
  Other                          ₹ xxx
  ─────────────────────────────────────
  Total Expenses                 ₹ xxx,xxx

Net Profit                       ₹ xxx,xxx
  Net Profit Margin              xx.x%
```

**Summary Cards:**

- Total Revenue
- COGS (Purchases)
- Gross Profit + Margin %
- Total Expenses
- Net Profit + Margin %

---

## Customer Analytics (`/customer-analytics`)

**Licence:** Requires the `customerAnalytics` feature flag.

Three analysis tabs:

### Tab 1: Top Customers by Revenue

**Period:** User-selectable date range.

**Table:**
| Column | Description |
|--------|-------------|
| Rank | Position by revenue |
| Customer Name | Customer name |
| Phone | Contact number |
| Total Bills | Number of purchases |
| Total Revenue | Sum of bill amounts |
| Avg Bill Value | Revenue / Bills |
| Last Purchase | Date of most recent purchase |

### Tab 2: Purchase Frequency

**Analysis of purchase patterns:**
| Column | Description |
|--------|-------------|
| Customer | Name |
| Total Visits | Number of distinct purchase dates |
| Avg Days Between Visits | Average gap between purchases |
| Last Visit | Most recent purchase date |
| Frequency Category | Regular / Occasional / Rare |

### Tab 3: Credit Risk Scoring

**Risk assessment for credit customers:**
| Column | Description |
|--------|-------------|
| Customer | Name |
| Credit Limit | Set credit limit |
| Current Balance | Outstanding amount |
| Utilization % | Balance / Limit × 100 |
| Risk Level | None / Low / Medium / High |
| Oldest Unpaid | Age of oldest unpaid bill |

**Risk Level Calculation:**
| Utilization | Risk |
|-------------|------|
| 0% | None |
| 1–50% | Low |
| 51–80% | Medium |
| > 80% | High |

---

## Credit Aging Report (`/credit-aging`)

**Purpose:** Analyze overdue credits by aging buckets.

**Licence:** Requires the `creditAging` feature flag.

### Summary Cards

- Total Outstanding
- Current (0–30 days)
- Overdue 31–60 days
- Overdue 61–90 days
- Overdue 90+ days

### Aging Table

| Column         | Description                |
| -------------- | -------------------------- |
| Customer       | Name + phone               |
| Total Balance  | Outstanding amount         |
| Current (0–30) | Amount in 0–30 day bucket  |
| 31–60 Days     | Amount in 31–60 day bucket |
| 61–90 Days     | Amount in 61–90 day bucket |
| 90+ Days       | Amount in 90+ day bucket   |
| Oldest Bill    | Date of oldest unpaid bill |
| Actions        | WhatsApp reminder button   |

### WhatsApp Reminder

- Click the WhatsApp icon to send a pre-formatted credit reminder
- Message includes: customer name, outstanding amount, shop name, contact details
- Opens `wa.me` with pre-filled message

---

## PDF Reports

Reports can be exported as PDF files:

### Available PDF Exports

1. **Bill Invoice** — A4 professional invoice (from bill detail view)
2. **Daily Report PDF** — Summary + payment breakdown + bills table
3. **Report Period PDF** — Summary statistics for any period

### PDF Generation Method

1. HTML template rendered with data
2. Hidden `BrowserWindow` loads the HTML
3. `webContents.printToPDF()` generates the file
4. PDF saved to configurable receipts/reports directory

---

## Data Export (Excel)

From the **Data Export** page (`/data-export`):

**Licence:** Requires the `dataExport` feature flag.

| Export Type          | Description                | Sheets                                                                         |
| -------------------- | -------------------------- | ------------------------------------------------------------------------------ |
| **Daily Report**     | Summary + bills for a date | Summary, Bills                                                                 |
| **Bill History**     | All bills in a date range  | Bills with all columns                                                         |
| **Stock Report**     | Inventory status           | All Products, Low Stock                                                        |
| **Customer Report**  | Customers + credits        | Customers with balances                                                        |
| **Full Data Export** | Everything                 | Bills, Items, Products, Customers, Payments, Purchases, Expenses, Stock Ledger |

All exports produce `.xlsx` files using the xlsx library.

---

## Report Data Sources

### Repository Methods Used

| Report             | Repository    | Method                                                                           |
| ------------------ | ------------- | -------------------------------------------------------------------------------- |
| Daily              | bill.repo     | `getDailySummary(date)`                                                          |
| Weekly             | bill.repo     | `getWeeklySummary()`                                                             |
| Monthly            | bill.repo     | `getMonthlySummary(year, month)`                                                 |
| Yearly             | bill.repo     | `getYearlySummary(year)`                                                         |
| GST                | report.repo   | `getGstReport(startDate, endDate)`                                               |
| P&L                | report.repo   | `getProfitLossReport(startDate, endDate)`                                        |
| Customer Analytics | customer.repo | `getTopCustomersByRevenue()`, `getCustomerFrequency()`, `getCreditRiskScoring()` |
| Credit Aging       | customer.repo | `getCreditAging()`, `getCreditAgingSummary()`                                    |
| Dashboard          | report.repo   | `getDashboardData(today)`                                                        |

---

## DailySummary Type

The core data structure used across reports:

```typescript
interface DailySummary {
  totalSales: number
  totalBills: number
  cashSales: number
  upiSales: number
  cardSales: number
  creditSales: number
  totalDiscount: number
  totalItems: number
  cashBills: number // Number of bills paid by cash
  upiBills: number // Number of bills paid by UPI
  cardBills: number // Number of bills paid by card
  creditBills: number // Number of bills paid on credit
}
```

---

_Developed by [Sultan Kabadi](https://sultanbk.com) — KPT Billing v1.0.0_
