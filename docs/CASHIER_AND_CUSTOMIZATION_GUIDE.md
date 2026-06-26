# KPT Billing — Cashier Usability, Security & Receipt Customization Guide

> Detailed operational guide for the role-based security systems, owner authentication gates, receipt and barcode customizer settings, and the F12 interactive shortcuts panel.

Developed by **[Sultan Kabadi](https://sultanbk.com)**

---

## Overview

This guide explains how to use and verify the new features introduced in KPT Billing v2.0.0 to support non-technical staff while keeping owner-specific dashboards and settings secure.

It covers:

1. **Cashier Access Restrictions & Owner PIN Gate** — Hiding sensitive sections and preventing unauthorized actions.
2. **Receipt Customization & Custom Footer Settings** — Tailoring invoices, custom footers, and tax breakdowns.
3. **Thermal Barcode Label Enhancements** — Ensuring crisp MRP display and preventing label clipping on small formats.
4. **F12 Interactive Keyboard Shortcuts Drawer** — Accessing quick guides and training tips for cashiers.

---

## 1. Cashier Access Restrictions & Owner PIN Gate

To make the app safe and easy for billing staff (cashiers), KPT Billing restricts access to owner-only pages (e.g., Settings, Reports, Data Export, Analytics, and the Dashboard).

### Access Control Matrix (Role Details)

| Module / Page                   | Route Link            | Owner / Manager Role |            Cashier Role            |
| :------------------------------ | :-------------------- | :------------------: | :--------------------------------: |
| **Billing / POS Page**          | `/`                   |    ✅ Full Access    |           ✅ Full Access           |
| **Inventory / Products List**   | `/products`           | ✅ Add, Edit, Delete | 👁️ Read-Only (PIN Gate for Writes) |
| **Purchases Stock-In**          | `/purchases`          | ✅ Add, Edit, Delete | 👁️ Read-Only (PIN Gate for Writes) |
| **Dashboard**                   | `/dashboard`          |    ✅ Full Access    |        ❌ Hidden & Blocked         |
| **Reports (GST, P&L, History)** | `/reports`            |    ✅ Full Access    |        ❌ Hidden & Blocked         |
| **Customer Analytics**          | `/customer-analytics` |    ✅ Full Access    |        ❌ Hidden & Blocked         |
| **Credit Aging**                | `/credit-aging`       |    ✅ Full Access    |        ❌ Hidden & Blocked         |
| **Data Export (Excel)**         | `/data-export`        |    ✅ Full Access    |        ❌ Hidden & Blocked         |
| **System Settings**             | `/settings`           |    ✅ Full Access    |        ❌ Hidden & Blocked         |

---

### UI Safeguards for Cashiers

#### A. Sidebar Auto-Filtering

When a user logs in with a **Cashier** PIN:

- The system automatically filters out the restricted pages in [Sidebar.tsx](file:///d:/sultan/kpt_billing/src/renderer/src/components/layout/Sidebar.tsx).
- The cashier only sees **Billing**, **Products**, and **Purchases** tabs on the sidebar layout.

#### B. Direct Page Routing Guard

If a cashier tries to access a restricted URL directly (such as `/settings` or `/reports`) or uses a keyboard hotkey:

- A full-screen security gate ([OwnerPinGate.tsx](file:///d:/sultan/kpt_billing/src/renderer/src/components/layout/OwnerPinGate.tsx)) is triggered.
- It displays a secure keypad block and states: _"This page is restricted to Owner/Manager access. Enter the Owner PIN to proceed."_

#### C. Inventory Action Guards (Read-Only Mode)

Cashiers can search products or view stock lists. However, editing actions are locked behind the [OwnerActionGuard.tsx](file:///d:/sultan/kpt_billing/src/renderer/src/components/layout/OwnerActionGuard.tsx) modal.

- **Affected buttons:** _Add Product_, _Edit_, _Delete_, _Adjust Stock_, _Bulk Update CSV_, _New Purchase_, and _Delete Purchase_.
- Clicking any of these triggers a modal prompt. An owner must enter their PIN to unlock the action for the session, keeping the cashier focused and protecting inventory integrity.

> [!IMPORTANT]
> The default owner PIN is `1234`. Make sure to create unique user accounts for your cashier staff under **Settings ➔ Security ➔ User Management** to prevent sharing the owner PIN.

---

## 2. Receipt Customization & Custom Footer Settings

The **Settings** page has been expanded with customization and printing configuration tabs to allow full control over customer receipt formats and thermal layouts.

### Custom Footers & Policies

Under [SettingsPage.tsx](file:///d:/sultan/kpt_billing/src/renderer/src/pages/SettingsPage.tsx) (in the **Customisation** or **Receipt** configuration card), you can now configure how the bottom of the bill prints:

1. **Exchange Policy Toggle:**
   - A radio button / toggle lets you enable or disable the default return and exchange store policy text:
     ```text
     Exchange Policy: Goods can be exchanged within 7 days if accompanied by bill.
     Thank You! Come Again.
     ```
2. **Custom Footer Text Area:**
   - Write custom greetings, store notes, special discounts announcements, or social media links to print below the exchange policy.
3. **Include/Exclude Footers:**
   - A master checkbox lets you completely turn on/off the footer sections during quick thermal prints when paper needs to be conserved.

### Compliance & Layout Upgrades on Receipts

- **GST Split Breakdown:** The receipt totals now split the tax evenly between **CGST (2.5%)** and **SGST (2.5%)** instead of showing a single GST row. This provides tax breakdown transparency to customers and GST-compliant records.
- **Pre-Tax Rate Billing:** In the itemized list, the `Amt` column calculates the pre-tax total using mathematical **Rate × Qty** with strict `.00` double-decimal precision instead of post-tax round-offs.

---

## 3. Barcode Label Customization & MRP Visibility

When printing product tags and barcode labels, the shop owner can manage labels from the settings screen.

> [!NOTE]
> Since thermal printers use binary black-and-white print technology, gray colors are often dithered to nothingness. The system has been optimized to resolve this and prevent vertical clipping.

```
┌──────────────────────────────────────┐
│  BARCODE LABEL PREVIEW (60x40 Preset)│
│                                      │
│  KRISHNAPRIYA TEXTILES               │
│  SKU: KPT-SAR-0012                   │
│  Price: ₹450.00                      │
│  MRP: ₹600.00 (Strikethrough)        │
│  [|||| | || ||| || |||]              │
└──────────────────────────────────────┘
```

### Key Barcode Settings

- **Show MRP Checkbox:** Ensures that the strikethrough Maximum Retail Price (MRP) prints alongside the discount selling price. Checkboxes default to `true` on initialization in [index.ts](file:///d:/sultan/kpt_billing/src/shared/constants/index.ts).
- **Label Presets:** Select between standard label formats:
  - **46x25 mm Preset:** Perfect for small price tags. Includes dynamic margins and scaled-down text to prevent overflow.
  - **60x40 mm Preset:** Large tags with ample room for product SKU, name, price, and barcode representation.
- **Thermal Binary Printing Optimization:**
  The barcode generator in [product-label-printer.service.ts](file:///d:/sultan/kpt_billing/src/main/services/product-label-printer.service.ts) has been updated:
  - Strike-through text color changed from light gray (`#666`) to pure black (`#000`) so it prints clearly on thermal label rolls.
  - Generates auto-sized spacing blocks based on the selected preset dimensions to prevent barcode lines from cutting off at the bottom edges of the physical paper.

### 3.1 Printer Alignment Calibration (Horizontal/Vertical Offsets)

To resolve physical layout shifts and misalignments when printing tags on specific hardware models (like SNBC BTP-LP46, TVS, TSC), the Barcode settings tab features a persistent alignment calibration tool:

1. **Horizontal Alignment Offset (X-Axis)**:
   - Remap margins to shift printed blocks left (negative values) or right (positive values) by up to `-5.0mm` to `+5.0mm` in `0.5mm` steps.
2. **Vertical Alignment Offset (Y-Axis)**:
   - Shift printed elements up (negative values) or down (positive values) by up to `-5.0mm` to `+5.0mm` in `0.5mm` steps.

#### Calibration Visual Sync & Validation

- **Real-Time Visual Sandbox**: The **Live Barcode Preview** card on the settings page shifts physically as sliders are dragged. The preview wraps the card layout inside an overflow-hidden wrapper that replicates standard sticker boundaries, demonstrating the exact margins position change.
- **Immediate Testing**: The **Test Print Label** button routes the current unsaved slider offsets directly to the active hardware print queue, permitting real-world physical verification before committing settings.
- **DPI Dots Resolution**: Millimeters are mathematically parsed to dot increments (at `203 DPI` where `1 mm = 8 dots`) for raw command paths (`TSPL`) or injected as translation rules for Electron HTML formats, providing consistent alignments on both print pipelines.

---

## 4. F12 Interactive Keyboard Shortcuts Drawer

The shortcuts window has been replaced by a modern sliding sidebar panel in [ShortcutsHelp.tsx](file:///d:/sultan/kpt_billing/src/renderer/src/components/layout/ShortcutsHelp.tsx) that slides out smoothly from the right side of the screen when pressing **F12** or clicking the help link.

### Cashier Training & Quick Tips

The drawer includes helper cards explaining complex features for cashiers:

```
┌──────────────────────────────────────────────┐
│  ⌨️ SHORTCUTS & QUICK TIPS              [X]  │
├──────────────────────────────────────────────┤
│  • F1  ➔ Dashboard                           │
│  • F2  ➔ Billing                             │
│  • F12 ➔ Help (Toggle Drawer)                │
├──────────────────────────────────────────────┤
│  💡 Cashier Tips                             │
│  ┌────────────────────────────────────────┐  │
│  │ 💳 Split Payments                      │  │
│  │ When a customer wants to pay part cash │  │
│  │ and part UPI, enter the cash amount    │  │
│  │ first in the payment modal, then select │  │
│  │ UPI for the remaining balance.         │  │
│  └────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────┐  │
│  │ 🔄 Hold & Recall                       │  │
│  │ To temporarily save a cart while a     │  │
│  │ customer picks another item, press F6.  │  │
│  │ Retrieve it later by pressing F8.      │  │
│  └────────────────────────────────────────┘  │
└──────────────────────────────────────────────┘
```

1. **Split Payments Guide:**
   - Step-by-step instructions on checking out bills with mixed payment modes (e.g. paying ₹500 in Cash and the rest via UPI).
2. **Hold & Recall Bills:**
   - Instruction on parking carts when a customer leaves to pick another saree, allowing cashiers to keep checking out other customers.
3. **WhatsApp Bills:**
   - Guide explaining how to insert a customer's phone number during checkout to instantly trigger a WhatsApp receipt message, reducing paper usage.

---

## 5. Checkout Keyboard Navigation & Cart Auto-Recovery

To facilitate fast, mouse-free checkouts for cashiers, the billing interface handles focus redirection and key combinations:

### A. Intelligent Background Focus Redirection

- **Automatic Refocusing:** If a cashier clicks outside the inputs (losing the typing cursor), they can simply scan or start typing a product query. The billing page captures the keystroke, focuses the search input, and inserts the letter automatically.
- **Background Click Capture:** Clicking on any blank page background automatically focuses the search input, ensuring the terminal is always ready to receive barcode scanner input.
- **Search Escape shortcut:** Pressing `Esc` at any time instantly clears the search query and focuses the input.

### B. Payment Dialog & Dynamic Themes

When the checkout dialog is open, cashiers can easily distinguish transaction types visually:

- **Checkout Color-Coding:** The payment selector cards and theme colors adjust dynamically (Cash = Green, UPI = Blue, Card = Purple, Credit = Amber) to visually guide the user.
- **Dynamic Action Button:** The main submission button ("Complete & Print") dynamically matches the selected payment mode color theme, helping cashiers confirm checkout actions at a glance.

### C. Automatic Cart Recovery

If the app closes, the computer loses power, or the cashier restarts the app:

- The system automatically auto-saves the active cart items, custom items, customer details, and discount inputs in the background.
- Upon relaunch, the cashier's active cart is fully recovered, keeping the team from having to scan items a second time.

### D. Multi-Cart Tabs (Parallel Customer Billing)

To serve multiple customers in parallel without losing order progress:

- **Opening Tabs:** Click the `+` button at the top of the Left panel to open a new tab. An empty cart will be created, allowing you to check out a new customer.
- **Switching Tabs:** Simply click on any tab name to switch to that active session. All items, customer choices, and discounts are immediately loaded.
- **Items Count Indicator:** Each tab displays a small round badge showing the number of unique items added to that cart. The active cart displays a highlighted badge in the primary theme color, whereas inactive carts show a subtle grey badge, reminding cashiers where items are pending checkout.
- **Dynamic Naming:** Tabs are named `Cart 1`, `Cart 2`, etc. by default. When you link a customer, the tab automatically updates to display their name, making it easy to identify which cart belongs to whom. It reverts back to the default name if you clear the cart or remove the customer.
- **Tab Persistence:** All tabs and their contents are saved in real-time. Even after app restarts, all open tabs and their items are recovered.
- **Closing Tabs:** Click the `x` button on a tab to close it and discard its items. You can never close the last remaining tab.

---

## 6. Product History Ledger (Stock Movements & Price History)

To give the shop owner full oversight over stock counts and price adjustments, the **Product History Ledger** displays a comprehensive timeline of every update that affected an item.

### Accessing the Ledger

1. Go to the **Products** page.
2. Click the actions menu button (`•••`) on the right side of a product row.
3. Select **Product History** from the dropdown menu.

### Detailed Tabs

The popup modal features a tabbed view to organize data cleanly:

- **Stock Movements Tab:** Displays a chronological log of all stock increases and decreases.
  - _Color-Coded Badges:_ Clear labels describe the type of action (e.g. Sale, Purchase/Restock, Manual Adjustment, Customer Return, Damage/Loss, or Opening Stock).
  - _Quantity Indicators:_ Shows the exact quantity change (e.g. `+10 pcs` in green or `-1 pcs` in red).
  - _Contextual References:_ Displays associated invoice or bill numbers (e.g., `"Sale Bill KPT/26/012"` or `"Purchase Invoice #1024"`) alongside custom notes.
  - _Timestamps & Staff:_ Shows the date, time, and user account that recorded the event.
- **Price History Tab:** Displays a chronological record of changes made to the product's price settings.
  - _Price Fields:_ Tracks modifications to Selling Price, Cost/Purchase Price, and Wholesale Price.
  - _Arrow Trends:_ Displays green trending indicators for price reductions and red indicators for price increases.
  - _Value Comparison:_ Shows the old value struck through next to the new value (e.g. `₹500.00` ➔ `₹550.00`).
  - _Staff Tracking:_ Shows the user account that authorized the price update.

---

## Verification & Testing Checklist

Owners can verify the configuration updates using the following steps:

1. **Log in as a Cashier:**
   - Log out of your session by clicking Alt+L.
   - Enter a cashier's PIN.
   - **Expected:** Dashboard, Settings, Reports, Analytics, and Data Export should disappear from the sidebar.
2. **Test Route Security:**
   - Press the settings shortcut (F10) or attempt to type `/settings` in the application search.
   - **Expected:** An Owner PIN overlay should block the page immediately.
3. **Verify Action Gate:**
   - Navigate to the **Products** page.
   - Click the **Add Product** button.
   - **Expected:** An Owner Action Gate pop-up appears, asking for the Owner PIN to permit adding a new product.
4. **Configure Receipt Footer:**
   - Log in with the Owner PIN and go to **Settings ➔ Customisation / General**.
   - Edit the exchange policy option and add a custom footer sentence.
   - Perform a mock checkout sale, select thermal or PDF print, and confirm the custom text appears at the bottom.
5. **Inspect Barcode Tag Print:**
   - Go to a product's action panel and print barcode labels using the `46x25` or `60x40` preset.
   - **Expected:** Both the selling price and the original MRP (with black strike-through) print clearly on the label, with no text clipping at the margins.

---

_For further support or details on the database tables involved, refer to [DATABASE.md](file:///d:/sultan/kpt_billing/docs/DATABASE.md) and [SECURITY.md](file:///d:/sultan/kpt_billing/docs/SECURITY.md)._
