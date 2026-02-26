# KPT Billing — Products, Inventory & Purchases

> Detailed documentation of product management, stock tracking, and the purchase/stock-in module.

Developed by **[Sultan Kabadi](https://sultanbk.com)**

---

## Products

### Product Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Full product name |
| `short_name` | string | No | Abbreviated name for receipts |
| `sku` | string | Auto | Auto-generated unique stock-keeping unit |
| `barcode` | string | No | Barcode number for scanning |
| `category_id` | integer | No | Link to product category |
| `hsn_code` | string | No | Harmonized System Nomenclature code for GST |
| `purchase_price` | decimal | Yes | Cost price |
| `selling_price` | decimal | Yes | Retail selling price |
| `wholesale_price` | decimal | No | Wholesale/bulk price |
| `gst_rate` | decimal | No | GST percentage (0, 5, 12, 18, 28) |
| `opening_stock` | integer | No | Initial stock quantity |
| `current_stock` | integer | Auto | Current available stock (auto-managed) |
| `low_stock_alert` | integer | No | Threshold for low stock warning |
| `location` | string | No | Warehouse/shelf location |
| `supplier_id` | integer | No | Default supplier |
| `color` | string | No | Product color |
| `size` | string | No | Product size |
| `material` | string | No | Fabric/material type |
| `image_path` | string | No | Product image file path |
| `is_active` | boolean | Auto | Soft delete flag (default: true) |

### Product Operations

| Operation | Description |
|-----------|-------------|
| **Create** | Add new product with all fields, auto-generates SKU |
| **Update** | Edit any field; price changes logged to price_history |
| **Delete** | Soft delete (marks `is_active = false`) |
| **Search** | Search by name, SKU, or short_name |
| **Get by Barcode** | Lookup product by barcode (for scanner) |
| **Paginated List** | Filtered, paginated product listing |

### Product Filters

| Filter | Options |
|--------|---------|
| Search | Name / SKU / short name text search |
| Category | Filter by product category |
| Stock Status | All, Low Stock, Out of Stock |
| Active Status | Active only (default) |
| Page Size | 25, 50, 100 items per page |

---

## Categories

### Default Categories (Textile)

| # | Category |
|---|----------|
| 1 | Saree |
| 2 | Blouse Piece |
| 3 | Dress Material |
| 4 | Dupatta |
| 5 | Fabric |
| 6 | Readymade |
| 7 | Accessories |
| 8 | Other |

### Category Features
- **Hierarchical** — Categories support `parent_id` for sub-categorization
- **CRUD** — Create, read, update, delete categories
- **Product Count** — View how many products belong to each category

---

## HSN Codes (Textile)

Pre-configured HSN codes for textile products:

| HSN Code | Description |
|----------|-------------|
| 5007 | Woven fabrics of silk |
| 5111 | Woven fabrics of carded wool |
| 5112 | Woven fabrics of combed wool |
| 5208 | Woven cotton fabrics (≤200 g/m²) |
| 5209 | Woven cotton fabrics (>200 g/m²) |
| 5210 | Woven cotton with ≥85% cotton |
| 5407 | Woven synthetic filament fabrics |
| 5408 | Woven artificial filament fabrics |
| 5512 | Woven synthetic staple fibre fabrics |
| 5513 | Woven synthetic with cotton |
| 5514 | Woven synthetic twill |
| 5515 | Other woven synthetic fabrics |
| 5516 | Woven artificial staple fabrics |
| 6101 | Knitted overcoats, jackets (men) |
| 6106 | Knitted blouses & shirts (women) |
| 6307 | Other made-up textile articles |

---

## Stock Management

### Stock Tracking
- **Current Stock** — Automatically maintained by the system
- **Opening Stock** — Set when product is created
- **Low Stock Alert** — Configurable threshold per product
- **Out of Stock** — Products with `current_stock = 0`

### Stock Movements

Stock changes are tracked in the `stock_ledger` table:

| Movement Type | Trigger | Stock Effect |
|--------------|---------|-------------|
| `sale` | Bill created | Decrements |
| `purchase` | Purchase order created | Increments |
| `adjustment` | Manual stock adjustment | Increment or Decrement |
| `return` | Bill return/cancellation | Increments |
| `opening` | Initial stock entry | Sets initial value |
| `damage` | Damage/loss recorded | Decrements |

### Stock Ledger Entry Fields
- Product ID
- Movement type
- Quantity (positive or negative)
- Reference type (bill, purchase, adjustment)
- Reference ID
- Notes
- Timestamp

### Stock Adjustment Dialog
- Select product
- Choose type: Purchase, Adjustment, Damage, Return
- Enter quantity
- Add notes
- Stock and ledger updated immediately

### Bulk Stock Update
- Opens a spreadsheet-like dialog
- Shows all products with current stock
- Edit quantities inline
- Save all changes in one operation
- All changes logged to stock ledger

### Stock Valuation
- **Cost Value** — Sum of (current_stock × purchase_price) for all products
- **Selling Value** — Sum of (current_stock × selling_price) for all products
- **Margin** — Difference between selling and cost value

---

## Price Management

### Three Price Tiers
1. **Purchase Price** — Cost price from supplier
2. **Selling Price** — Retail price to customers
3. **Wholesale Price** — Discounted price for wholesale customers

### Price History
- Every price change is recorded in the `price_history` table
- Fields tracked: product_id, field_name (purchase_price/selling_price/wholesale_price), old_value, new_value, changed_by, timestamp
- Viewable per-product via the Price History dialog

---

## Bulk Import

### CSV/Excel Import
- Upload a CSV or Excel file with product data
- Required columns: name, selling_price
- Optional columns: short_name, barcode, hsn_code, purchase_price, wholesale_price, gst_rate, opening_stock, category, color, size, material, location
- Auto-generates SKU for each imported product
- Existing products (matched by barcode or name) can be updated
- Import summary shows: total rows, created, updated, errors

---

## Purchases (Stock-In)

### Purchase Order Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `purchase_no` | string | Auto | Sequential: PUR/0001 |
| `date` | string | Yes | Purchase date |
| `supplier_id` | integer | Yes | Supplier reference |
| `supplier_name` | string | Auto | Denormalized supplier name |
| `city` | string | No | Supply source city |
| `invoice_no` | string | No | Supplier invoice number |
| `invoice_date` | string | No | Supplier invoice date |
| `subtotal` | decimal | Auto | Sum of item amounts |
| `gst_amount` | decimal | Auto | Total GST |
| `total_amount` | decimal | Auto | Grand total |
| `payment_mode` | string | No | cash/upi/card/cheque/bank |
| `payment_status` | string | Yes | paid/unpaid/partial |
| `amount_paid` | decimal | No | Amount paid so far |

### Purchase Line Item Fields

| Field | Type | Description |
|-------|------|-------------|
| `product_id` | integer | Product reference |
| `product_name` | string | Denormalized product name |
| `barcode` | string | Product barcode |
| `hsn_code` | string | HSN code |
| `qty` | integer | Quantity purchased |
| `purchase_rate` | decimal | Cost per unit |
| `selling_rate` | decimal | New selling price |
| `mrp` | decimal | Maximum retail price |
| `gst_rate` | decimal | GST percentage |
| `gst_amount` | decimal | Calculated GST amount |

### Purchase Flow

```
Create Purchase Order
        │
        ▼
Add Line Items (products + quantities + rates)
        │
        ▼
Set Supplier, Invoice Details, Payment Status
        │
        ▼
Save Purchase
        │
        ├── Insert purchase record
        ├── Insert purchase_items
        ├── Update product stock (increment)
        ├── Update product prices (if new rates provided)
        ├── Insert stock_ledger entries (type: purchase)
        └── Insert audit_log entry
```

### Purchase Features
- **Supplier Search** — Search existing suppliers inline
- **Supplier Create** — Create new supplier during purchase entry
- **Barcode Scanner** — Scan product barcodes to quickly add line items
- **City Tracking** — Track which city the goods came from (Surat, Bengaluru, etc.)
- **Purchase History** — View all past purchases, filterable by date and supplier
- **Purchase Detail** — View full details of any purchase order

---

## Suppliers

### Supplier Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Supplier/company name |
| `phone` | string | No | Contact phone |
| `email` | string | No | Contact email |
| `address` | string | No | Full address |
| `city` | string | No | City (used for grouping) |
| `gstin` | string | No | Supplier's GST number |
| `bank_details` | string | No | Bank account details |

### Supplier Features
- Full CRUD operations
- City-based filtering
- Search by name
- View all purchases from a supplier
- Quick create during purchase entry

---

## Dashboard Integration

Stock-related dashboard widgets:
- **Stock Alerts Card** — Shows low stock count + out of stock count
- **Low Stock Alerts Section** — Lists products below threshold with badges
- **View Details → link** — Navigate to Products page filtered by low stock

---

*Developed by [Sultan Kabadi](https://sultanbk.com) — KPT Billing v1.0.0*
