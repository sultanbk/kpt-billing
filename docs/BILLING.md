# KPT Billing — Billing & POS System

> Detailed documentation of the Point of Sale (POS) billing module.

Developed by **[Sultan Kabadi](https://sultanbk.com)**

---

## Overview

The Billing page (`/`) is the primary POS interface of KPT Billing. It is the **only unprotected page** — accessible without PIN authentication so cashiers can always create bills. The interface is split into two panels: a product search + cart area on the left, and a bill summary + payment area on the right.

---

## Page Layout

```
┌─────────────────────────────────┬──────────────────┐
│  Product Search Bar             │  Customer Section │
│  ┌───────────────────────────┐  │  ┌──────────────┐│
│  │  Search Results Dropdown  │  │  │ Search / New  ││
│  └───────────────────────────┘  │  └──────────────┘│
│                                 │                   │
│  ┌───────────────────────────┐  │  Bill Summary     │
│  │  Cart Items (ScrollArea)  │  │  ┌──────────────┐│
│  │  - Product rows           │  │  │ Subtotal     ││
│  │  - Qty / Price / Discount │  │  │ Discount     ││
│  │  - Per-item totals        │  │  │ Tax          ││
│  └───────────────────────────┘  │  │ Grand Total  ││
│                                 │  └──────────────┘│
│  Cart Actions Bar               │                   │
│  [+ Other] [Hold] [Recall]      │  [Pay & Print]    │
│  [Clear]                        │  F11              │
└─────────────────────────────────┴──────────────────┘
```

---

## Product Search

### Text Search

- Type in the search bar to search products by **name**, **SKU**, or **short name**
- Results appear in a dropdown (max 15 results)
- Navigate with **Arrow Up/Down**, select with **Enter**
- Pressing **Escape** focuses the search bar from anywhere on the page

### Barcode Scanning

- The app auto-detects barcode scanner input
- Detection logic: keystrokes arriving faster than 80–100ms with minimum 4 characters
- On successful scan, the barcode is looked up via `products:getByBarcode`
- If found, the product is automatically added to the cart
- If not found, a toast notification appears

---

## Cart Management

### Adding Items

- Click a product from search results, or press Enter on the highlighted result
- If the product already exists in the cart, its **quantity increments by 1**
- New products are added with quantity 1 at their selling price

### Custom Items ("Other")

- Press **Alt+O** (configurable) or click **+ Other** button
- Adds a row with `productId: 0` — editable name and price
- Useful for miscellaneous items not in the product database

### Cart Item Row

Each cart row displays:

- Sequential number
- Product name (editable for custom items)
- Quantity controls: `-` / `+` buttons, or direct input
- Rate (price per unit, editable for custom items)
- Per-item discount (% or flat)
- Line total
- Delete button

### Cart Actions

| Action         | Shortcut | Description                   |
| -------------- | -------- | ----------------------------- |
| Add Other Item | Alt+O \* | Add custom/miscellaneous item |
| Hold Bill      | F6       | Park current bill for later   |
| Recall Bill    | F8       | Show held bills, recall one   |
| Clear Cart     | F9       | Remove all items from cart    |

\* Configurable via Settings → Shortcuts

---

## Customer Association

### Search Existing Customer

- Type customer name or phone in the customer search field
- Results appear in a dropdown (max 8 results)
- Click to select — customer name and phone are linked to the bill

### Quick Add New Customer

- Click **New** button or press **Alt+N** (configurable)
- Inline form appears with:
  - Customer name (required)
  - Phone number (optional)
- Press Enter or click **Add & Select** to create the customer and auto-link them
- Press Escape to dismiss the form

### Walk-In Customers

- If no customer is selected, the bill is created as a **Walk-in** sale
- Walk-in bills do not affect any customer's credit balance

---

## Bill-Level Discount

- Applied to the entire bill (after line-item subtotals)
- Two modes: **Percentage (%)** or **Flat Amount (₹)**
- Discount is applied to the subtotal before tax calculation

---

## GST Calculation

- Each product has a GST rate (0%, 5%, 12%, 18%, 28%)
- Tax is split equally into **CGST** and **SGST** (intra-state; Karnataka state code 29)
- HSN codes from the textile HSN list (5007–6307)
- Taxable amount = item amount after discount
- CGST = taxable × (GST rate / 2) / 100
- SGST = taxable × (GST rate / 2) / 100

---

## Payment Dialog

Triggered by the **Pay & Print** button or **F11** shortcut.

### Payment Modes

| Mode       | Fields                                                    | Notes                                              |
| ---------- | --------------------------------------------------------- | -------------------------------------------------- |
| **Cash**   | Cash tendered, auto-calculated change                     | Default mode                                       |
| **UPI**    | UPI reference number                                      | For digital payments                               |
| **Card**   | —                                                         | Card payments                                      |
| **Credit** | —                                                         | Requires linked customer; updates customer balance |
| **Mixed**  | Cash amount, UPI amount + ref, Card amount, Credit amount | Split payment across modes                         |

### Payment Flow

1. Select payment mode
2. Enter payment details (if applicable)
3. Click **Complete Payment**
4. Bill is saved to database
5. Stock levels are updated (decremented)
6. Stock ledger entries are created
7. Credit balance updated (if credit mode)
8. Receipt is generated (PDF and/or thermal print)
9. Cart is cleared
10. Bill number is displayed in success toast

### Round-Off

- Configurable in settings: No rounding, Round to ₹1, Round to ₹0.50
- Applied to the grand total after tax

---

## Hold / Recall Bills

### Hold (F6)

- Parks the current cart (items + customer) into the `held_bills` table
- Each held bill gets a UUID
- Cart is cleared after holding
- Multiple bills can be held simultaneously
- The hold action is wrapped in the licence `LimitGate` for `maxBillsPerMonth`; the UI warns at 80% usage and disables the action once the plan limit is reached

### Recall (F8)

- Opens a dialog showing all held bills
- Each entry shows: customer name, item count, timestamp
- Click **Recall** to restore items and customer to the active cart
- The held bill is deleted from the database after recall

---

## Bill Creation (Data Flow)

```
User clicks "Pay & Print"
        │
        ▼
┌─────────────────────┐
│  Validate cart       │  (items > 0, amounts valid)
│  Validate payment    │  (mode selected, amounts match)
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│  BillCreateData      │  Assembled from store + payment dialog
│  - items[]           │
│  - customer info     │
│  - payment details   │
│  - discount          │
│  - GST amounts       │
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│  IPC: billing:create │  → Main process
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│  bill.repo.create()  │
│  1. Insert bill      │
│  2. Insert bill_items│
│  3. Update stock     │
│  4. Insert stock_ledger│
│  5. Update customer balance (if credit) │
│  6. Insert credit_payment (if credit)   │
│  7. Insert audit_log │
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│  Return bill data    │  → Renderer
│  - Bill number       │
│  - Bill ID           │
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│  Generate PDF        │  (if configured)
│  Print receipt       │  (if auto-print enabled)
│  Clear cart          │
│  Show success toast  │
└─────────────────────┘
```

---

## Bill Number Format

```
KPT/{FY}/0001
```

- **KPT** — Shop prefix
- **{FY}** — Financial year (e.g., `25-26` for April 2025 – March 2026)
- **0001** — Sequential 4-digit number, auto-incrementing

Example: `KPT/25-26/0147`

---

## Receipt Output

### PDF Invoice (A4)

- Professional A4 layout with shop header, GSTIN, customer details
- Itemized table with HSN code, qty, rate, discount, tax breakup, amount
- GST summary: CGST + SGST per rate
- Grand total in words (Indian numbering: Lakh, Crore)
- Payment mode details
- Digital "Authorized By" footer

### Thermal Receipt (80mm)

- 48-character width format
- Centered shop header
- Bill details: number, date, time, customer
- Compact item list: name, qty × rate, amount
- Totals: subtotal, discount, tax, grand total
- Payment mode
- Custom footer text

---

## State Management

The billing page uses the `useBillingStore` (Zustand + Immer):

### State

| Field            | Type                  | Description                 |
| ---------------- | --------------------- | --------------------------- |
| `items`          | `BillItem[]`          | Cart line items             |
| `customerName`   | `string`              | Selected customer name      |
| `customerPhone`  | `string`              | Selected customer phone     |
| `customerId`     | `string \| null`      | Selected customer ID        |
| `discountType`   | `'percent' \| 'flat'` | Bill discount type          |
| `discountValue`  | `number`              | Bill discount value         |
| `subtotal`       | `number`              | Calculated subtotal         |
| `discountAmount` | `number`              | Calculated discount amount  |
| `taxAmount`      | `number`              | Calculated tax total        |
| `grandTotal`     | `number`              | Final payable amount        |
| `totalItems`     | `number`              | Total quantity of all items |

### Actions

| Action                               | Description                                  |
| ------------------------------------ | -------------------------------------------- |
| `addItem(product)`                   | Add product to cart (or increment if exists) |
| `addCustomItem()`                    | Add custom/Other item                        |
| `removeItem(index)`                  | Remove item at index                         |
| `updateQuantity(index, qty)`         | Update item quantity                         |
| `updatePrice(index, price)`          | Update item price (custom items)             |
| `updateName(index, name)`            | Update item name (custom items)              |
| `updateDiscount(index, type, value)` | Update per-item discount                     |
| `setCustomer(name, phone, id)`       | Link/unlink customer                         |
| `setDiscount(type, value)`           | Set bill-level discount                      |
| `clearCart()`                        | Remove all items and reset                   |
| `holdBill()`                         | Save cart to held_bills                      |
| `recallBill(id)`                     | Restore held bill to cart                    |
| `recalculate()`                      | Recalculate all totals                       |

---

## Keyboard Shortcuts (Billing Page)

| Key    | Action                |
| ------ | --------------------- |
| Escape | Focus search bar      |
| Alt+O  | Add Other item \*     |
| Alt+N  | Quick add customer \* |
| F6     | Hold bill             |
| F8     | Recall held bill      |
| F9     | Clear cart            |
| F11    | Pay & Print           |

\* Configurable via Settings → Shortcuts tab

---

## Quick Bill Search (Ctrl+K)

The Quick Bill Search is a command-palette accessible from anywhere via **Ctrl+K** or the sidebar search button. It provides rapid access to any bill for viewing, printing, downloading, WhatsApp sharing, and return/exchange processing.

### Features

- **Recent Bills** — 15 most recent bills shown on open (no typing needed)
- **Search** — Type 2+ characters to search by bill number, customer name, or phone
- **3-Mode Interface** — List → Actions → View, fully keyboard-navigable
- **5 Quick Actions** — View (V), Print (P), Download PDF (D), WhatsApp (W), Return/Exchange (R)
- **Bill Detail View** — Full items table with GST, totals, return history, and inline action buttons

See [SHORTCUTS.md](SHORTCUTS.md) for complete keyboard shortcut reference.

---

## Return & Exchange

Bills can be returned or exchanged through the Quick Bill Search (Ctrl+K → R) or from the Reports page.

### Return Flow

1. Search and select the original bill
2. Select items and quantities to return
3. Choose refund mode (Cash, Credit, or Adjust)
4. Enter reason for return
5. Confirm — stock is restored, original bill is recalculated, refund is processed

### Exchange Flow

1. Search and select the original bill
2. Select items to return
3. Switch to Exchange mode
4. Add replacement items (search products or add custom "Other" items)
5. Confirm — original bill recalculated, new bill created for exchange items, net amount settled

### After Return/Exchange

- Original bill quantities and amounts are recalculated based on remaining items
- Stock is restored for returned items
- PDF and thermal receipts show return annotations on affected items
- Return history is tracked in `bill_returns` and `bill_return_items` tables
- An optional new bill is created for exchange items

---

_Developed by [Sultan Kabadi](https://sultanbk.com) — KPT Billing v1.0.0_
