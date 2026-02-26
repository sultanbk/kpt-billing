# KPT Billing — Settings

> Detailed documentation of the application settings interface, all configurable options, and their effects.

Developed by **[Sultan Kabadi](https://sultanbk.com)**

---

## Overview

The Settings page uses a **tabbed layout** with a left sidebar navigation and right content panel. Four tabs organize all configuration options:

| Tab | Icon | Description |
|-----|------|-------------|
| **General** | 🏪 | Shop details, printer configuration, app preferences |
| **Backup** | 💾 | Local backup, cloud backup, restore |
| **Security** | 🔒 | PIN management, user management |
| **Shortcuts** | ⌨️ | Customizable keyboard shortcuts |

---

## Settings Page Layout

```
┌───────────────┬──────────────────────────────────────┐
│               │                                      │
│  ● General    │   [ Content for selected tab ]       │
│    Backup     │                                      │
│    Security   │                                      │
│    Shortcuts  │                                      │
│               │                                      │
│               │                                      │
│               │                                      │
└───────────────┴──────────────────────────────────────┘
```

- Active tab is highlighted with a colored background
- Only the selected tab's content is rendered
- Responsive — tabs stack vertically on the left

---

## General Tab

### Shop Details

| Setting | Type | Description | Default |
|---------|------|-------------|---------|
| `shop_name` | text | Business name on receipts | Krishnapriya Textiles |
| `shop_address` | text | Full shop address | — |
| `shop_phone` | text | Contact phone number | — |
| `shop_email` | text | Contact email | — |
| `shop_gstin` | text | GST Identification Number | — |
| `bill_prefix` | text | Prefix for bill numbers | `KPT` |
| `financial_year` | text | Current financial year | `25-26` |
| `bill_terms` | textarea | Terms printed on bills | — |
| `bill_footer` | textarea | Footer text on bills | — |

### Printer Configuration

| Setting | Type | Description | Default |
|---------|------|-------------|---------|
| `printer_type` | select | `pdf` or `thermal` | `pdf` |
| `thermal_printer_name` | text | System printer name | — |
| `thermal_printer_width` | number | Paper width in mm | `80` |
| `paper_size` | select | PDF paper size: `A4`, `A5`, `58mm`, `80mm` | `A4` |

### Application Preferences

| Setting | Type | Description | Default |
|---------|------|-------------|---------|
| `default_tax_rate` | number | Default GST rate for new products | `5` |
| `currency_symbol` | text | Currency symbol | `₹` |
| `date_format` | select | Date display format | `DD-MM-YYYY` |
| `theme` | select | `light` or `dark` | `light` |
| `low_stock_threshold` | number | Alert threshold for low stock | `10` |

---

## Backup Tab

See [BACKUP.md](BACKUP.md) for full documentation.

### Local Backup Settings

| Setting | Type | Description | Default |
|---------|------|-------------|---------|
| `backup_path` | directory | Backup storage location | — |
| `auto_backup` | toggle | Backup on app close | `true` |
| `backup_retention_days` | number | Days to keep backups | `30` |

### Cloud Backup

- Google Drive OAuth2 connection
- Upload / Download / List operations
- Connection status display

### Restore

- Select `.sql` file to restore
- Safety backup created automatically before restore
- App restarts after successful restore

---

## Security Tab

See [SECURITY.md](SECURITY.md) for full documentation.

### PIN Management

- Change current user's PIN
- Requires current PIN verification
- New PIN: 4–8 digits with confirmation

### User Management (Owner Only)

- Add new users with name, role, and PIN
- Edit user details and roles
- Delete users (cannot delete last owner)
- Roles: Owner, Manager, Cashier

---

## Shortcuts Tab

See [SHORTCUTS.md](SHORTCUTS.md) for full documentation.

### Customizable Bindings

8 billing-page shortcuts can be remapped to different Alt+key combinations:

| Action | Default Binding |
|--------|----------------|
| Focus Product Search | Alt+F |
| Open Payment Dialog | Alt+P |
| Hold Bill | Alt+H |
| Recall Held Bills | Alt+R |
| Clear Cart | Alt+C |
| Customer Selector | Alt+O |
| New Customer | Alt+N |
| Toggle Discount | Alt+D |

### Customization UI

- Each shortcut shows a text input for the key letter
- Type a new letter → binding updates immediately
- "Reset All to Defaults" button available
- Conflicts are prevented (duplicate keys not allowed)

---

## Settings Storage

Settings are stored in the `settings` table as key-value pairs:

```sql
CREATE TABLE settings (
  key   TEXT PRIMARY KEY,
  value TEXT
);
```

### Reading Settings

```typescript
// All settings are loaded into the Zustand store on app init
const settings = useStore(state => state.settings);

// Access individual settings
const shopName = settings.shop_name;
const taxRate = Number(settings.default_tax_rate);
```

### Updating Settings

```typescript
// IPC call to update a setting
await window.api.settings.update('shop_name', 'New Shop Name');

// The store is refreshed after update
```

---

## Hidden/System Settings

Some settings are managed programmatically and not exposed in the UI:

| Key | Description |
|-----|-------------|
| `gdrive_access_token` | Google Drive OAuth access token |
| `gdrive_refresh_token` | Google Drive OAuth refresh token |
| `gdrive_token_expiry` | Token expiration timestamp |
| `last_backup_date` | Timestamp of last backup |
| `last_bill_number` | Last used bill sequence number |
| `db_version` | Database schema version |

---

## Default Categories

The app ships with 8 pre-configured product categories:

| Category | Description |
|----------|-------------|
| Sarees | All types of sarees |
| Dress Materials | Unstitched dress materials |
| Readymade | Ready-to-wear garments |
| Blouse Pieces | Blouse material pieces |
| Fabrics | Raw fabric by the meter |
| Accessories | Fashion accessories |
| Kids Wear | Children's clothing |
| Others | Miscellaneous items |

Categories can be managed (add/edit/delete) from the Products page.

---

## Default HSN Codes

Pre-configured HSN codes for textile products:

| HSN Code | Description | GST Rate |
|----------|-------------|----------|
| 5007 | Woven fabrics of silk | 5% |
| 5111 | Woven fabrics of carded wool | 5% |
| 5112 | Woven fabrics of combed wool | 5% |
| 5208 | Woven fabrics of cotton (≤200g/m²) | 5% |
| 5209 | Woven fabrics of cotton (>200g/m²) | 5% |
| 5210 | Woven fabrics of cotton (mixed) | 5% |
| 5407 | Woven fabrics of synthetic filament | 5% |
| 5408 | Woven fabrics of artificial filament | 5% |
| 5512 | Woven fabrics of synthetic staple | 5% |
| 5513 | Woven fabrics of synthetic staple (mixed) | 5% |
| 5514 | Woven fabrics of synthetic staple (twill) | 5% |
| 5515 | Other woven fabrics of synthetic staple | 5% |
| 5516 | Woven fabrics of artificial staple | 5% |
| 6101 | Knitted overcoats, jackets (men) | 12% |
| 6104 | Knitted suits, dresses (women) | 12% |
| 6109 | T-shirts, singlets, knitted | 12% |

---

*Developed by [Sultan Kabadi](https://sultanbk.com) — KPT Billing v1.0.0*
