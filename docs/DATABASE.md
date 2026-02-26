# KPT Billing — Database Schema

> Complete documentation of all database tables, columns, indexes, and relationships.

Developed by **[Sultan Kabadi](https://sultanbk.com)**

---

## Overview

KPT Billing uses **SQLite** (via `better-sqlite3`) with the following configuration:

| Setting | Value |
|---------|-------|
| Engine | SQLite 3 (better-sqlite3) |
| Journal Mode | WAL (Write-Ahead Logging) |
| Synchronous | NORMAL |
| Foreign Keys | ON |
| Busy Timeout | 5000ms |
| Cache Size | 20MB |
| Temp Store | MEMORY |

Database file location: `{userData}/kpt_billing.db`

---

## Entity-Relationship Overview

```
                    ┌──────────┐
                    │ settings │
                    └──────────┘

┌────────────┐      ┌──────────┐      ┌─────────────┐
│ categories │─────▶│ products │◀─────│ suppliers   │
└────────────┘      └────┬─────┘      └──────┬──────┘
                         │                   │
              ┌──────────┼──────────┐        │
              ▼          ▼          ▼        ▼
        ┌──────────┐ ┌────────┐ ┌──────────────────┐
        │bill_items│ │stock_  │ │  purchases       │
        └────┬─────┘ │ledger  │ └────┬─────────────┘
             │       └────────┘      │
             ▼                       ▼
        ┌──────────┐          ┌──────────────┐
        │  bills   │          │purchase_items│
        └────┬─────┘          └──────────────┘
             │
             ▼
        ┌──────────┐     ┌────────────────┐
        │customers │────▶│credit_payments │
        └──────────┘     └────────────────┘

  ┌────────┐  ┌───────────┐  ┌──────────┐  ┌───────────────┐
  │ users  │  │ audit_log │  │ expenses │  │  held_bills   │
  └────────┘  └───────────┘  └──────────┘  └───────────────┘

  ┌───────────┐  ┌────────────────┐  ┌───────────────┐
  │ estimates │──│ estimate_items │  │ price_history │
  └───────────┘  └────────────────┘  └───────────────┘
```

---

## Tables

### 1. `settings`

Key-value store for all application configuration.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `key` | TEXT | **PRIMARY KEY** | Setting identifier |
| `value` | TEXT | NOT NULL | Setting value |
| `updated_at` | TEXT | DEFAULT now | Last updated timestamp |

---

### 2. `categories`

Product categories for organization.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | INTEGER | **PRIMARY KEY** AUTOINCREMENT | Category ID |
| `name` | TEXT | NOT NULL | Category name |
| `parent_id` | INTEGER | — | Parent category (for subcategories) |
| `created_at` | TEXT | DEFAULT now | Creation timestamp |

---

### 3. `products`

Master product catalog.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | INTEGER | **PRIMARY KEY** AUTOINCREMENT | Product ID |
| `name` | TEXT | NOT NULL | Product name |
| `short_name` | TEXT | — | Abbreviated name |
| `sku` | TEXT | NOT NULL, **UNIQUE** | Stock keeping unit code |
| `barcode` | TEXT | — | Barcode value |
| `category_id` | INTEGER | FK → categories(id) | Category reference |
| `sub_category` | TEXT | — | Sub-category text |
| `brand` | TEXT | — | Brand name |
| `hsn_code` | TEXT | NOT NULL, DEFAULT '5007' | HSN/SAC code for GST |
| `purchase_price` | REAL | NOT NULL, DEFAULT 0 | Cost price |
| `selling_price` | REAL | NOT NULL, DEFAULT 0 | Retail selling price |
| `wholesale_price` | REAL | — | Wholesale price |
| `gst_rate` | REAL | NOT NULL, DEFAULT 5 | GST percentage |
| `opening_stock` | INTEGER | NOT NULL, DEFAULT 0 | Initial stock quantity |
| `current_stock` | INTEGER | NOT NULL, DEFAULT 0 | Live stock count |
| `low_stock_alert` | INTEGER | — | Alert threshold |
| `location` | TEXT | — | Storage location |
| `supplier_id` | INTEGER | — | Default supplier |
| `color` | TEXT | — | Product color |
| `size` | TEXT | — | Product size |
| `material` | TEXT | — | Material/fabric type |
| `notes` | TEXT | — | Additional notes |
| `image_path` | TEXT | — | Product image path |
| `is_active` | INTEGER | NOT NULL, DEFAULT 1 | Active/inactive flag |
| `created_at` | TEXT | DEFAULT now | Creation timestamp |
| `updated_at` | TEXT | DEFAULT now | Last update timestamp |

---

### 4. `customers`

Customer master data with credit tracking.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | INTEGER | **PRIMARY KEY** AUTOINCREMENT | Customer ID |
| `name` | TEXT | NOT NULL | Customer name |
| `phone` | TEXT | NOT NULL, **UNIQUE** | Phone number |
| `email` | TEXT | — | Email address |
| `address` | TEXT | — | Full address |
| `city` | TEXT | — | City |
| `gstin` | TEXT | — | GST number |
| `customer_type` | TEXT | NOT NULL, DEFAULT 'regular' | regular / wholesale / walkin |
| `credit_limit` | REAL | — | Maximum credit allowed |
| `opening_balance` | REAL | NOT NULL, DEFAULT 0 | Starting credit balance |
| `current_balance` | REAL | NOT NULL, DEFAULT 0 | Outstanding amount |
| `is_active` | INTEGER | NOT NULL, DEFAULT 1 | Active flag |
| `created_at` | TEXT | DEFAULT now | Creation timestamp |
| `updated_at` | TEXT | DEFAULT now | Last update timestamp |

---

### 5. `bills`

Sales transaction headers.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | INTEGER | **PRIMARY KEY** AUTOINCREMENT | Bill ID |
| `bill_no` | TEXT | NOT NULL, **UNIQUE** | Bill number (e.g., KPT/25-26/0001) |
| `date` | TEXT | NOT NULL | Bill date (YYYY-MM-DD) |
| `time` | TEXT | NOT NULL | Bill time (HH:mm:ss) |
| `customer_id` | INTEGER | FK → customers(id) | Customer reference |
| `customer_name` | TEXT | — | Denormalized customer name |
| `customer_phone` | TEXT | — | Denormalized phone |
| `subtotal` | REAL | NOT NULL, DEFAULT 0 | Sum before tax/discount |
| `discount_amount` | REAL | NOT NULL, DEFAULT 0 | Total discount |
| `taxable_amount` | REAL | NOT NULL, DEFAULT 0 | Amount subject to GST |
| `cgst_amount` | REAL | NOT NULL, DEFAULT 0 | Central GST |
| `sgst_amount` | REAL | NOT NULL, DEFAULT 0 | State GST |
| `igst_amount` | REAL | NOT NULL, DEFAULT 0 | Integrated GST |
| `round_off` | REAL | NOT NULL, DEFAULT 0 | Rounding adjustment |
| `grand_total` | REAL | NOT NULL, DEFAULT 0 | Final payable amount |
| `payment_mode` | TEXT | NOT NULL, DEFAULT 'cash' | Primary payment mode |
| `cash_amount` | REAL | NOT NULL, DEFAULT 0 | Cash portion |
| `upi_amount` | REAL | NOT NULL, DEFAULT 0 | UPI portion |
| `card_amount` | REAL | NOT NULL, DEFAULT 0 | Card portion |
| `credit_amount` | REAL | NOT NULL, DEFAULT 0 | Credit portion |
| `upi_reference` | TEXT | — | UPI transaction reference |
| `cash_tendered` | REAL | NOT NULL, DEFAULT 0 | Cash given by customer |
| `change_amount` | REAL | NOT NULL, DEFAULT 0 | Change returned |
| `status` | TEXT | NOT NULL, DEFAULT 'completed' | completed / returned / cancelled |
| `salesman_name` | TEXT | — | Salesman who created the bill |
| `total_items` | INTEGER | NOT NULL, DEFAULT 0 | Distinct item count |
| `total_qty` | INTEGER | NOT NULL, DEFAULT 0 | Total quantity of all items |
| `notes` | TEXT | — | Bill notes |
| `created_by` | TEXT | — | User who created the bill |
| `created_at` | TEXT | DEFAULT now | Creation timestamp |

---

### 6. `bill_items`

Line items within a bill.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | INTEGER | **PRIMARY KEY** AUTOINCREMENT | Item ID |
| `bill_id` | INTEGER | NOT NULL, FK → bills(id) | Parent bill |
| `product_id` | INTEGER | — | Product reference (null for custom items) |
| `product_name` | TEXT | NOT NULL | Product/item name |
| `hsn_code` | TEXT | NOT NULL, DEFAULT '' | HSN code |
| `qty` | INTEGER | NOT NULL, DEFAULT 1 | Quantity |
| `rate` | REAL | NOT NULL, DEFAULT 0 | Unit price |
| `discount_type` | TEXT | NOT NULL, DEFAULT 'flat' | flat / percent |
| `discount_value` | REAL | NOT NULL, DEFAULT 0 | Discount amount/percent |
| `taxable_amount` | REAL | NOT NULL, DEFAULT 0 | Taxable amount |
| `cgst_rate` | REAL | NOT NULL, DEFAULT 0 | CGST rate % |
| `cgst_amount` | REAL | NOT NULL, DEFAULT 0 | CGST amount |
| `sgst_rate` | REAL | NOT NULL, DEFAULT 0 | SGST rate % |
| `sgst_amount` | REAL | NOT NULL, DEFAULT 0 | SGST amount |
| `amount` | REAL | NOT NULL, DEFAULT 0 | Line total (incl. tax) |

---

### 7. `stock_ledger`

Tracks every stock movement.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | INTEGER | **PRIMARY KEY** AUTOINCREMENT | Entry ID |
| `product_id` | INTEGER | NOT NULL, FK → products(id) | Product reference |
| `type` | TEXT | NOT NULL | sale / purchase / adjustment / return / opening / manual |
| `qty` | INTEGER | NOT NULL | Quantity changed (positive or negative) |
| `reference_type` | TEXT | — | Entity type (bill, purchase, etc.) |
| `reference_id` | INTEGER | — | Entity ID |
| `notes` | TEXT | — | Notes |
| `created_by` | TEXT | — | User |
| `created_at` | TEXT | DEFAULT now | Timestamp |

---

### 8. `users`

Application users for authentication.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | INTEGER | **PRIMARY KEY** AUTOINCREMENT | User ID |
| `name` | TEXT | NOT NULL | User name |
| `pin` | TEXT | NOT NULL | Hashed PIN |
| `role` | TEXT | NOT NULL, DEFAULT 'cashier' | owner / manager / cashier |
| `is_active` | INTEGER | NOT NULL, DEFAULT 1 | Active flag |
| `created_at` | TEXT | DEFAULT now | Creation timestamp |

---

### 9. `audit_log`

Tracks all significant user actions.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | INTEGER | **PRIMARY KEY** AUTOINCREMENT | Log ID |
| `user_id` | INTEGER | — | Acting user |
| `user_name` | TEXT | — | User name (denormalized) |
| `action` | TEXT | NOT NULL | Action performed |
| `entity_type` | TEXT | NOT NULL | Entity type |
| `entity_id` | INTEGER | — | Entity ID |
| `old_value` | TEXT | — | Previous value (JSON) |
| `new_value` | TEXT | — | New value (JSON) |
| `created_at` | TEXT | DEFAULT now | Timestamp |

---

### 10. `held_bills`

Temporarily held bills awaiting completion.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | TEXT | **PRIMARY KEY** | UUID identifier |
| `customer_name` | TEXT | — | Associated customer |
| `customer_phone` | TEXT | — | Customer phone |
| `items_json` | TEXT | NOT NULL | Serialized cart items (JSON) |
| `held_at` | TEXT | DEFAULT now | When the bill was held |

---

### 11. `suppliers`

Supplier/vendor master data.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | INTEGER | **PRIMARY KEY** AUTOINCREMENT | Supplier ID |
| `name` | TEXT | NOT NULL | Supplier name |
| `phone` | TEXT | — | Phone number |
| `email` | TEXT | — | Email |
| `address` | TEXT | — | Address |
| `city` | TEXT | — | City |
| `gstin` | TEXT | — | GST number |
| `bank_details` | TEXT | — | Bank account details |
| `is_active` | INTEGER | NOT NULL, DEFAULT 1 | Active flag |
| `created_at` | TEXT | DEFAULT now | Creation timestamp |

---

### 12. `purchases`

Purchase/stock-in transaction headers.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | INTEGER | **PRIMARY KEY** AUTOINCREMENT | Purchase ID |
| `purchase_no` | TEXT | NOT NULL, **UNIQUE** | Purchase number |
| `date` | TEXT | NOT NULL | Purchase date |
| `supplier_id` | INTEGER | FK → suppliers(id) | Supplier reference |
| `supplier_name` | TEXT | — | Denormalized name |
| `city` | TEXT | — | Supplier city |
| `invoice_no` | TEXT | — | Vendor invoice number |
| `invoice_date` | TEXT | — | Vendor invoice date |
| `total_items` | INTEGER | NOT NULL, DEFAULT 0 | Item count |
| `total_qty` | INTEGER | NOT NULL, DEFAULT 0 | Total quantity |
| `subtotal` | REAL | NOT NULL, DEFAULT 0 | Subtotal |
| `gst_amount` | REAL | NOT NULL, DEFAULT 0 | GST amount |
| `discount_amount` | REAL | NOT NULL, DEFAULT 0 | Discount |
| `grand_total` | REAL | NOT NULL, DEFAULT 0 | Final total |
| `payment_mode` | TEXT | NOT NULL, DEFAULT 'cash' | Payment mode |
| `payment_status` | TEXT | NOT NULL, DEFAULT 'paid' | paid / pending / partial |
| `amount_paid` | REAL | NOT NULL, DEFAULT 0 | Amount paid |
| `notes` | TEXT | — | Notes |
| `created_by` | TEXT | — | User |
| `created_at` | TEXT | DEFAULT now | Creation timestamp |

---

### 13. `purchase_items`

Line items within a purchase.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | INTEGER | **PRIMARY KEY** AUTOINCREMENT | Item ID |
| `purchase_id` | INTEGER | NOT NULL, FK → purchases(id) | Parent purchase |
| `product_id` | INTEGER | FK → products(id) | Product reference |
| `product_name` | TEXT | NOT NULL | Product name |
| `barcode` | TEXT | — | Barcode |
| `hsn_code` | TEXT | — | HSN code |
| `qty` | INTEGER | NOT NULL, DEFAULT 1 | Quantity |
| `purchase_rate` | REAL | NOT NULL, DEFAULT 0 | Cost per unit |
| `selling_rate` | REAL | NOT NULL, DEFAULT 0 | Selling price |
| `mrp` | REAL | NOT NULL, DEFAULT 0 | Maximum retail price |
| `gst_rate` | REAL | NOT NULL, DEFAULT 0 | GST rate % |
| `gst_amount` | REAL | NOT NULL, DEFAULT 0 | GST amount |
| `amount` | REAL | NOT NULL, DEFAULT 0 | Line total |

---

### 14. `credit_payments`

Payments received against customer credit.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | INTEGER | **PRIMARY KEY** AUTOINCREMENT | Payment ID |
| `customer_id` | INTEGER | NOT NULL, FK → customers(id) | Customer |
| `date` | TEXT | DEFAULT today | Payment date |
| `amount` | REAL | NOT NULL, DEFAULT 0 | Payment amount |
| `payment_mode` | TEXT | NOT NULL, DEFAULT 'cash' | Mode |
| `reference_no` | TEXT | — | Reference number |
| `balance_before` | REAL | NOT NULL, DEFAULT 0 | Balance before payment |
| `balance_after` | REAL | NOT NULL, DEFAULT 0 | Balance after payment |
| `bill_id` | INTEGER | FK → bills(id) | Linked bill (optional) |
| `notes` | TEXT | — | Notes |
| `created_by` | TEXT | — | User |
| `created_at` | TEXT | DEFAULT now | Creation timestamp |

---

### 15. `expenses`

Business expense tracking.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | INTEGER | **PRIMARY KEY** AUTOINCREMENT | Expense ID |
| `date` | TEXT | NOT NULL | Expense date |
| `category` | TEXT | NOT NULL | Category (rent, salary, etc.) |
| `amount` | REAL | NOT NULL | Amount |
| `description` | TEXT | — | Description |
| `payment_mode` | TEXT | NOT NULL, DEFAULT 'cash' | Payment mode |
| `created_by` | TEXT | — | User |
| `created_at` | TEXT | DEFAULT now | Creation timestamp |

---

### 16. `estimates`

Quotation / estimate headers.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | INTEGER | **PRIMARY KEY** AUTOINCREMENT | Estimate ID |
| `estimate_no` | TEXT | NOT NULL, **UNIQUE** | Estimate number |
| `date` | TEXT | NOT NULL | Estimate date |
| `customer_name` | TEXT | — | Customer name |
| `customer_phone` | TEXT | — | Customer phone |
| `subtotal` | REAL | NOT NULL, DEFAULT 0 | Subtotal |
| `discount_amount` | REAL | NOT NULL, DEFAULT 0 | Discount |
| `tax_amount` | REAL | NOT NULL, DEFAULT 0 | Tax amount |
| `grand_total` | REAL | NOT NULL, DEFAULT 0 | Grand total |
| `valid_days` | INTEGER | NOT NULL, DEFAULT 15 | Validity period |
| `status` | TEXT | NOT NULL, DEFAULT 'active' | active / converted / expired |
| `converted_bill_id` | INTEGER | — | Bill ID if converted |
| `notes` | TEXT | — | Notes |
| `created_at` | TEXT | DEFAULT now | Creation timestamp |

---

### 17. `estimate_items`

Line items within an estimate.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | INTEGER | **PRIMARY KEY** AUTOINCREMENT | Item ID |
| `estimate_id` | INTEGER | NOT NULL, FK → estimates(id) | Parent estimate |
| `product_id` | INTEGER | — | Product reference |
| `product_name` | TEXT | NOT NULL | Product name |
| `hsn_code` | TEXT | NOT NULL, DEFAULT '' | HSN code |
| `qty` | INTEGER | NOT NULL, DEFAULT 1 | Quantity |
| `rate` | REAL | NOT NULL, DEFAULT 0 | Unit price |
| `discount_value` | REAL | NOT NULL, DEFAULT 0 | Discount |
| `amount` | REAL | NOT NULL, DEFAULT 0 | Line total |

---

### 18. `price_history`

Tracks price changes for products.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | INTEGER | **PRIMARY KEY** AUTOINCREMENT | Entry ID |
| `product_id` | INTEGER | NOT NULL, FK → products(id) | Product reference |
| `field_name` | TEXT | NOT NULL | Which price changed |
| `old_value` | REAL | NOT NULL, DEFAULT 0 | Previous price |
| `new_value` | REAL | NOT NULL, DEFAULT 0 | New price |
| `changed_by` | TEXT | — | User who changed it |
| `created_at` | TEXT | DEFAULT now | Timestamp |

---

## Indexes

| Index Name | Table | Column(s) | Purpose |
|------------|-------|-----------|---------|
| `idx_products_name` | products | name | Fast product search |
| `idx_products_sku` | products | sku | SKU lookup |
| `idx_products_barcode` | products | barcode | Barcode scanning |
| `idx_products_category` | products | category_id | Category filtering |
| `idx_products_active` | products | is_active | Active product filtering |
| `idx_bills_date` | bills | date | Date-based queries |
| `idx_bills_bill_no` | bills | bill_no | Bill number lookup |
| `idx_bills_customer` | bills | customer_id | Customer bill history |
| `idx_bills_status` | bills | status | Status filtering |
| `idx_bill_items_bill` | bill_items | bill_id | Bill items lookup |
| `idx_stock_ledger_product` | stock_ledger | product_id | Stock history |
| `idx_customers_phone` | customers | phone | Phone lookup |
| `idx_audit_log_entity` | audit_log | entity_type, entity_id | Audit trail query |
| `idx_purchases_date` | purchases | date | Date-based queries |
| `idx_purchases_supplier` | purchases | supplier_id | Supplier purchase history |
| `idx_purchase_items_purchase` | purchase_items | purchase_id | Purchase items lookup |
| `idx_suppliers_name` | suppliers | name | Supplier search |
| `idx_credit_payments_customer` | credit_payments | customer_id | Customer payments |
| `idx_credit_payments_date` | credit_payments | date | Date-based queries |
| `idx_price_history_product` | price_history | product_id | Product price history |
| `idx_price_history_date` | price_history | created_at | Date-based price queries |

**Total: 21 indexes** across 18 tables.

---

## Migrations

The database uses an **auto-migration** strategy:

1. All `CREATE TABLE IF NOT EXISTS` statements run on every startup
2. Safe `ALTER TABLE` migrations add new columns to existing tables
3. No separate migration files — schema is defined in `connection.ts`
4. `seedDefaults()` populates initial categories, HSN codes, and default user

### Safe Column Additions

```sql
-- Example: Adding 'city' column to suppliers (if not exists)
ALTER TABLE suppliers ADD COLUMN city TEXT
```

Column additions check existing schema first using `PRAGMA table_info()`.

---

## Default Seeds

### Default User
- Name: `Puneet`
- Role: `owner`
- PIN: `1234`

### Default Categories
8 textile categories (Sarees, Dress Materials, Readymade, etc.)

### Default HSN Codes
16 textile HSN codes with GST rates (see [SETTINGS.md](SETTINGS.md))

---

*Developed by [Sultan Kabadi](https://sultanbk.com) — KPT Billing v1.0.0*
