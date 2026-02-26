# KPT Billing — Keyboard Shortcuts Reference

> Complete keyboard shortcut reference with customization guide.

Developed by **[Sultan Kabadi](https://sultanbk.com)**

---

## Overview

KPT Billing provides extensive keyboard shortcuts for fast POS operation. Shortcuts are organized into three categories: Navigation, Billing Page Actions, and Quick Actions. Several shortcuts are customizable through Settings.

---

## Navigation Shortcuts

| Shortcut | Action | Description |
|----------|--------|-------------|
| **F1** | Dashboard | Go to Dashboard/Home page |
| **F2** | Billing | Open POS/Billing page |
| **F3** | Products | Open Products page |
| **F4** | Customers | Open Customers page |
| **F5** | Purchases | Open Purchases page |
| **F6** | Suppliers | Open Suppliers page |
| **F7** | Expenses | Open Expenses page |
| **F8** | Reports | Open Reports page |
| **F9** | Estimates | Open Estimates page |
| **F10** | Settings | Open Settings page |

> Navigation shortcuts work from any page in the application.

---

## Billing Page Shortcuts

These shortcuts only work when on the Billing page (`/billing`):

| Shortcut | Action | Description |
|----------|--------|-------------|
| **F6** | Focus Search | Focus the product search bar |
| **F8** | Payment Dialog | Open payment/checkout dialog |
| **F9** | Hold Bill | Hold the current bill for later |
| **F11** | Recall Bill | Open held bills list |
| **Alt+C** | Clear Cart | Clear all items from cart |
| **Alt+O** | Customer Selector | Open customer selection dropdown |
| **Alt+N** | New Customer | Open quick add customer form |
| **Alt+D** | Toggle Discount | Toggle the discount panel |

> Billing shortcuts take precedence over navigation when on the Billing page. For example, F6 focuses search (not navigate to Suppliers) when on the Billing page.

---

## Quick Action Shortcuts

| Shortcut | Action | Where | Description |
|----------|--------|-------|-------------|
| **Ctrl+K** | Command Palette | Global | Open command palette for quick navigation |
| **Alt+L** | Lock Screen | Global | Lock the application |
| **Ctrl+L** | Lock Screen | Global | Alternative lock shortcut |
| **Ctrl+N** | New Bill | Billing | Start a fresh bill |
| **Ctrl+Shift+D** | Toggle Dark Mode | Global | Switch between light and dark themes |
| **Ctrl+Shift+R** | Quick Report | Global | Open daily report quick view |
| **Escape** | Close Dialogs | Global | Close any open dialog or modal |

---

## Customizable Shortcuts

The following shortcuts can be customized through **Settings → Shortcuts**:

| Action | Default | Customizable Key |
|--------|---------|------------------|
| Focus Product Search | F6 | Alt + [configurable letter] |
| Open Payment Dialog | F8 | Alt + [configurable letter] |
| Hold Bill | F9 | Alt + [configurable letter] |
| Recall Held Bills | F11 | Alt + [configurable letter] |
| Clear Cart | Alt+C | Alt + [configurable letter] |
| Customer Selector | Alt+O | Alt + [configurable letter] |
| New Customer | Alt+N | Alt + [configurable letter] |
| Toggle Discount | Alt+D | Alt + [configurable letter] |

### How to Customize

1. Navigate to **Settings → Shortcuts** tab
2. Each shortcut shows current binding and an input field
3. Type a new letter to change the Alt+ combination
4. Changes save automatically
5. Reset individual shortcuts or all at once

### Shortcut Settings UI

```
┌──────────────────────────────────────────────────────┐
│  ⌨️  Keyboard Shortcuts                               │
│  ┌────────────────────────────────────────────────┐  │
│  │  Action                  Current    New Key    │  │
│  │  ──────────────────────  ─────────  ─────────  │  │
│  │  Focus Product Search    Alt+F      [ F ]      │  │
│  │  Open Payment Dialog     Alt+P      [ P ]      │  │
│  │  Hold Bill               Alt+H      [ H ]      │  │
│  │  Recall Held Bills       Alt+R      [ R ]      │  │
│  │  Clear Cart              Alt+C      [ C ]      │  │
│  │  Customer Selector       Alt+O      [ O ]      │  │
│  │  New Customer            Alt+N      [ N ]      │  │
│  │  Toggle Discount         Alt+D      [ D ]      │  │
│  ├────────────────────────────────────────────────┤  │
│  │                   [Reset All to Defaults]      │  │
│  └────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────┘
```

---

## Shortcuts Help Dialog

Press **?** or access from the sidebar to view the in-app shortcuts reference:

```
┌──────────────────────────────────────┐
│  ⌨️  Keyboard Shortcuts               │
│                                      │
│  Navigation                          │
│  F1         Dashboard                │
│  F2         Billing                  │
│  F3         Products                 │
│  ...                                 │
│                                      │
│  Billing                             │
│  F6         Search Products          │
│  F8         Open Payment             │
│  F9         Hold Bill                │
│  F11        Recall Bill              │
│  ...                                 │
│                                      │
│  Quick Actions                       │
│  Ctrl+K     Command Palette          │
│  Alt+L      Lock Screen              │
│  ...                                 │
│                        [Close]       │
└──────────────────────────────────────┘
```

---

## Command Palette (Ctrl+K)

The command palette provides quick access to all pages and common actions:

| Command | Action |
|---------|--------|
| `Dashboard` | Navigate to Dashboard |
| `New Bill` | Start new bill on Billing page |
| `Products` | Navigate to Products |
| `Customers` | Navigate to Customers |
| `Reports` | Navigate to Reports |
| `Settings` | Navigate to Settings |
| `Lock` | Lock the application |

### Usage
1. Press **Ctrl+K** from anywhere
2. Type to filter available commands
3. Use arrow keys to select
4. Press Enter to execute

---

## Shortcut Conflict Resolution

When multiple shortcuts could match:
1. **Page-specific** shortcuts take priority over navigation
2. **Alt+key** shortcuts are checked before function keys
3. **Ctrl+key** shortcuts are always global
4. Custom shortcuts override defaults

---

## Tips for Fast Operation

1. Use **F2** to jump to billing from any page
2. Keep hands on keyboard: **F6** to search → type product → Enter to add → **F8** to pay
3. Use **F9**/**F11** to hold/recall bills for customers who need to step away
4. **Ctrl+K** is the fastest way to navigate when you know the page name
5. **Alt+L** to lock when stepping away from the counter
6. Customize Alt-key shortcuts to match your muscle memory

---

*Developed by [Sultan Kabadi](https://sultanbk.com) — KPT Billing v1.0.0*
