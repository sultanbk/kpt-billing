# KPT Billing — Keyboard Shortcuts Reference

> Complete keyboard shortcut reference for the KPT Billing application.

Developed by **[Sultan Kabadi](https://sultanbk.com)**

---

## Overview

KPT Billing provides extensive keyboard shortcuts for fast POS operation. Shortcuts are organized into four categories: Navigation, Billing Page Actions, Quick Actions, and Quick Bill Search. Several billing-page shortcuts are customizable through Settings.

---

## Navigation Shortcuts

| Shortcut | Action | Description |
|----------|--------|-------------|
| **F1** | Dashboard | Go to Dashboard page |
| **F2** | Billing | Open POS/Billing page |
| **F3** | Products | Open Products page |
| **F4** | Purchases | Open Purchases / Stock-In page |
| **F5** | Customers | Open Customers page |
| **F7** | Reports | Open Reports page |
| **F10** | Settings | Open Settings page |

> Navigation shortcuts work from any page in the application.

---

## Billing Page Shortcuts

These shortcuts work when on the Billing page (`/`):

| Shortcut | Action | Description |
|----------|--------|-------------|
| **Esc** | Focus Search | Focus the product search bar |
| **Alt+O** | Add Other Item | Add a custom/miscellaneous item to cart * |
| **Alt+N** | New Customer | Open quick add customer form * |
| **F6** | Hold Bill | Park current bill for later |
| **F8** | Recall Bill | Show held bills, recall one |
| **F9** | Clear Cart | Remove all items from cart |
| **F11** | Pay & Print | Open payment dialog and complete sale |

\* Configurable via Settings → Shortcuts tab

> Billing shortcuts take precedence over navigation when on the Billing page. For example, F6 holds the bill (not navigate elsewhere) when on the Billing page.

---

## Quick Action Shortcuts

| Shortcut | Action | Description |
|----------|--------|-------------|
| **Ctrl+K** | Quick Bill Search | Open the bill search command palette |
| **Alt+L** | Lock Screen | Lock the application |
| **Ctrl+L** | Lock Screen (alt) | Alternative lock shortcut |
| **Ctrl+N** | New Bill | Navigate to billing page for a new bill |
| **Ctrl+Shift+D** | Go to Dashboard | Navigate directly to Dashboard |
| **Ctrl+Shift+R** | Go to Reports | Navigate directly to Reports |
| **F12** | Shortcuts Help | Show the in-app keyboard shortcuts dialog |
| **Esc** | Close/Blur | Close any open dialog or blur active input |

---

## Quick Bill Search (Ctrl+K)

The Quick Bill Search is a command palette accessible via **Ctrl+K** or the **Search bills** button in the sidebar. It provides rapid access to bill actions without navigating to the Reports page.

### Opening & Searching

- Press **Ctrl+K** from anywhere, or click the search button in the sidebar
- **Recent bills** are shown immediately when the palette opens (no typing needed)
- Type 2+ characters to search by bill number, customer name, or phone number

### List Mode (Bill Selection)

| Shortcut | Action |
|----------|--------|
| **↑ / ↓** | Navigate between bills |
| **Enter** or **→** | Open actions for the selected bill |
| **Esc** | Close the search palette |

### Actions Mode (Per-Bill Actions)

After selecting a bill, these shortcuts execute actions:

| Shortcut | Action | Description |
|----------|--------|-------------|
| **V** | View Bill Details | Show complete bill with items, totals, and return history |
| **P** | Print Receipt | Print thermal receipt for the bill |
| **D** | Download PDF | Generate and open a PDF invoice |
| **W** | Send via WhatsApp | Send bill receipt to customer via WhatsApp (requires phone) |
| **R** | Return / Exchange | Open the return/exchange dialog for this bill |
| **↑ / ↓** | Navigate actions | Move between action options |
| **Enter** | Execute action | Run the highlighted action |
| **← / Esc** | Go back | Return to bill list |

### View Mode (Bill Details)

When viewing full bill details:

| Shortcut | Action |
|----------|--------|
| **P** | Print receipt |
| **D** | Download PDF |
| **W** | Send via WhatsApp |
| **← / Esc / Backspace** | Go back to actions |

---

## Customizable Shortcuts

The following billing-page shortcuts can be customized through **Settings → Shortcuts**:

| Action | Default | How to Customize |
|--------|---------|------------------|
| Add Other Item | Alt+O | Change the Alt+key combination |
| Quick New Customer | Alt+N | Change the Alt+key combination |

### How to Customize

1. Navigate to **Settings → Shortcuts** tab
2. Each shortcut shows current binding and an input field
3. Type a new letter to change the Alt+ combination
4. Changes save automatically
5. Reset individual shortcuts or all at once

---

## Shortcuts Help Dialog

Press **F12** from anywhere to view the in-app shortcuts reference:

```
┌──────────────────────────────────────┐
│  ⌨️  Keyboard Shortcuts               │
│                                      │
│  Navigation                          │
│  F1         Dashboard                │
│  F2         Billing                  │
│  F3         Products                 │
│  F4         Purchases                │
│  F5         Customers                │
│  F7         Reports                  │
│  F10        Settings                 │
│                                      │
│  Billing                             │
│  Esc        Focus product search     │
│  Alt+O      Add Other item           │
│  Alt+N      Quick add customer       │
│  F6         Hold bill                │
│  F8         Recall held bill         │
│  F9         Clear cart               │
│  F11        Pay & Print              │
│                                      │
│  Quick Actions                       │
│  Ctrl+K     Quick Bill Search        │
│  Alt+L      Lock Screen              │
│  Ctrl+N     New Bill                 │
│  ...                                 │
│                                      │
│  Quick Bill Search (Ctrl+K)          │
│  ↑↓         Navigate                 │
│  Enter/→    Open / Execute           │
│  V/P/D/W/R  Action shortcuts         │
│  ←/Esc      Back / Close             │
│                                      │
│        Press Esc or F12 to close     │
└──────────────────────────────────────┘
```

---

## Shortcut Conflict Resolution

When multiple shortcuts could match:
1. **Page-specific** shortcuts take priority over navigation (e.g., F6 on billing page holds bill, not navigate)
2. **Ctrl+key** shortcuts are always global
3. **Alt+key** shortcuts are checked for billing page actions
4. Custom shortcuts override defaults within the billing page

---

## Tips for Fast Operation

1. Use **F2** to jump to billing from any page
2. Keep hands on keyboard: **Esc** to focus search → type product → Enter to add → **F11** to pay
3. Use **F6**/**F8** to hold/recall bills for customers who need to step away
4. **Ctrl+K** is the fastest way to find and act on any bill — view, print, PDF, WhatsApp, or return
5. In the bill search, press the letter shortcut directly (**V**, **P**, **D**, **W**, **R**) — no need to navigate with arrows
6. **Alt+L** to lock when stepping away from the counter
7. **F12** at any time to see all shortcuts

---

*Developed by [Sultan Kabadi](https://sultanbk.com) — KPT Billing v1.0.0*
