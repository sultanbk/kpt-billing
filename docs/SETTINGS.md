# KPT Billing — Settings

> Detailed documentation of the application settings interface, all configurable options, and their effects.

Developed by **[Sultan Kabadi](https://sultanbk.com)**

---

## Overview

The Settings page uses an **eight-tab layout** with a left sidebar navigation and right content panel. These tabs organize all configuration options:

| Tab           | Icon | Description                                                       |
| ------------- | ---- | ----------------------------------------------------------------- |
| **General**   | 🏪   | Basic shop details (name, address, GSTIN, FY, state code)         |
| **Payments**  | 💳   | Shop bank accounts and default billing UPI scanner configurations |
| **Printers**  | 🖨️   | Configure receipt/label printers and run diagnostics checks      |
| **Barcode**   | 🏷️   | Customize barcode print details, sizes, and alignment calibration |
| **Receipt**   | 📄   | Receipt paper profiles, auto-print triggers, and footer policies  |
| **Backup**    | 💾   | Local and Google Drive database backups and recovery              |
| **Security**  | 🔒   | Lock screen PIN management and Cashier user authorization accounts|
| **Shortcuts** | ⌨️   | Remap key bindings for custom POS page shortcuts                  |

---

## Settings Page Layout

```
┌───────────────┬──────────────────────────────────────┐
│  🏪 General   │                                      │
│  💳 Payments  │   [ Content for selected tab ]       │
│  🖨️ Printers  │                                      │
│  🏷️ Barcode   │                                      │
│  📄 Receipt   │                                      │
│  💾 Backup    │                                      │
│  🔒 Security  │                                      │
│  ⌨️ Shortcuts │                                      │
└───────────────┴──────────────────────────────────────┘
```

- Active tab is highlighted with a colored background
- Only the selected tab's content is rendered
- Responsive — tabs stack vertically on the left

---

## Configurable Options by Tab

### 1. General Tab
🏪 Configure shop identification info and billing parameters.

| Key | Type | Description | Default |
| --- | --- | --- | --- |
| `shopName` | text | Store name printed on headers | KRISHNAPRIYA TEXTILES |
| `shopAddress` | text | Shop address printed on receipts | Shirahatti 582120, Karnataka |
| `shopPhone` | text | Shop contact number | 9108455006 |
| `shopEmail` | text | Store contact email | — |
| `gstin` | text | Goods and Services Tax Identification Number | — |
| `pan` | text | Permanent Account Number of the business | — |
| `stateCode` | select | Indian State Code (e.g. 29 for Karnataka) | 29 |
| `billPrefix` | text | Serialized prefix for invoices | KPT |

### 2. Payments Tab (Owner Only)
💳 Manage banking details and QR payment configurations.

| Key | Type | Description | Default |
| --- | --- | --- | --- |
| `paymentMethods` | JSON | Structured array of bank accounts and scanner QR configurations | `[]` |
| `upiVpa` | text | Default VPA / UPI ID address for barcode billing scan-to-pay | — |
| `upiPayeeName` | text | Payee name registered to default UPI ID | — |

### 3. Printers Tab
🖨️ Hardware printing devices configuration and status checks.

| Key | Type | Description | Default |
| --- | --- | --- | --- |
| `receiptPrinterName` | select | Selected system printer for thermal checkouts | — |
| `labelPrinterName` | select | Selected system printer for barcode stickers | — |

### 4. Barcode Tab
🏷️ Tailor sticker layouts, sizing, and alignment margins. Features a redesigned interface structured with four collapsible accordions (Content Visibility, Dimensions, Advanced Typography, and Printer Calibration) using premium iOS-style switch toggle cards.


| Key | Type | Description | Default |
| --- | --- | --- | --- |
| `barcodeLabelSize` | select | Label size preset (`46x25` or `60x40`) | `46x25` |
| `barcodeShowShopName` | toggle | Show shop name at the top of labels | `true` |
| `barcodeShowSaleName` | toggle | Override shop name with a custom sale name | `false` |
| `barcodeSaleNameText` | text | Custom sale header (e.g. DIWALI SALE) | — |
| `barcodeShowName` | toggle | Include product shortName or name | `true` |
| `barcodeShowMrp` | toggle | Display the Maximum Retail Price | `true` |
| `barcodeShowSellingPrice` | toggle | Display the store selling price | `true` |
| `barcodeStrikeMrp` | toggle | Render vector line strike-through on MRP | `true` |
| `barcodeShowDiscount` | toggle | Calculate and print percentage discount | `true` |
| `barcodeWidth` | slider | Barcode line width scaling percentage (`[50%, 100%]`) | `75` |
| `barcodeHeight` | slider | Barcode line height in millimeters (`[3.0, 15.0]`) | `5.5` |
| `barcodeShopFontSize` | input | Font size in points for shop/sale name (`6.0` to `16.0` or `default`) | `default` |
| `barcodeNameFontSize` | input | Font size in points for product name (`8.0` to `20.0` or `default`) | `default` |
| `barcodePriceFontSize` | input | Font size in points for price row details (`8.0` to `18.0` or `default`) | `default` |
| `barcodeCodeFontSize` | input | Font size in points for SKU/code text (`6.0` to `14.0` or `default`) | `default` |
| `barcodeShopAlign` | select | Text alignment for shop/sale header (`left`, `center`, `right`) | `right` |
| `barcodeNameAlign` | select | Text alignment for product name (`left`, `center`, `right`) | `left` |
| `barcodePriceAlign` | select | Alignment for price row details (`left`, `center`, `right`) | `left` |
| `barcodeCodeAlign` | select | Alignment for SKU code text (`left`, `center`, `right`) | `center` |
| `barcodePaddingX` | slider | Horizontal margins/padding in mm (`0.0` to `8.0` or `default`) | `default` |
| `barcodePaddingY` | slider | Vertical margins/padding in mm (`0.0` to `8.0` or `default`) | `default` |
| `barcodeGap` | slider | Vertical gap between label elements in mm (`0.0` to `6.0` or `default`) | `default` |
| `barcodeShowCode` | toggle | Include the scannable SKU/code text beneath barcode | `true` |
| `barcodeNudgeX` | slider | Calibration horizontal offset in mm (`[-5.0, 5.0]`) | `0.0` |
| `barcodeNudgeY` | slider | Calibration vertical offset in mm (`[-5.0, 5.0]`) | `0.0` |

### 5. Receipt Tab
📄 Customize the customer receipt widths and policy footers.

| Key | Type | Description | Default |
| --- | --- | --- | --- |
| `receiptPaperWidthMm` | select | Thermal paper size profile (`58`, `72`, `80` mm) | `58` |
| `autoPrintReceipt` | toggle | Triggers print automatically upon bill creation | `true` |
| `receiptCopies` | select | Number of receipt copies to output per checkout | `1` |
| `receiptFooterType` | select | Footer policy selection (`default`, `custom`, `none`) | `default` |
| `receiptFooter` | textarea | Customer policy or custom footer text printed at bottom | — |

### 6. Backup Tab

See [BACKUP.md](BACKUP.md) for full documentation.

### Local Backup Settings

| Setting                 | Type      | Description             | Default |
| ----------------------- | --------- | ----------------------- | ------- |
| `backup_path`           | directory | Backup storage location | —       |
| `auto_backup`           | toggle    | Backup on app close     | `true`  |
| `backup_retention_days` | number    | Days to keep backups    | `30`    |

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

| Action               | Default Binding |
| -------------------- | --------------- |
| Focus Product Search | Alt+F           |
| Open Payment Dialog  | Alt+P           |
| Hold Bill            | Alt+H           |
| Recall Held Bills    | Alt+R           |
| Clear Cart           | Alt+C           |
| Customer Selector    | Alt+O           |
| New Customer         | Alt+N           |
| Toggle Discount      | Alt+D           |

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
const settings = useStore((state) => state.settings)

// Access individual settings
const shopName = settings.shop_name
const taxRate = Number(settings.default_tax_rate)
```

### Updating Settings

```typescript
// IPC call to update a setting
await window.api.settings.update('shop_name', 'New Shop Name')

// The store is refreshed after update
```

---

## Hidden/System Settings

Some settings are managed programmatically and not exposed in the UI:

| Key                    | Description                      |
| ---------------------- | -------------------------------- |
| `gdrive_access_token`  | Google Drive OAuth access token  |
| `gdrive_refresh_token` | Google Drive OAuth refresh token |
| `gdrive_token_expiry`  | Token expiration timestamp       |
| `last_backup_date`     | Timestamp of last backup         |
| `last_bill_number`     | Last used bill sequence number   |
| `db_version`           | Database schema version          |

---

## Default Categories

The app ships with 8 pre-configured product categories:

| Category        | Description                |
| --------------- | -------------------------- |
| Sarees          | All types of sarees        |
| Dress Materials | Unstitched dress materials |
| Readymade       | Ready-to-wear garments     |
| Blouse Pieces   | Blouse material pieces     |
| Fabrics         | Raw fabric by the meter    |
| Accessories     | Fashion accessories        |
| Kids Wear       | Children's clothing        |
| Others          | Miscellaneous items        |

Categories can be managed (add/edit/delete) from the Products page.

---

## Default HSN Codes

Pre-configured HSN codes for textile products:

| HSN Code | Description                               | GST Rate |
| -------- | ----------------------------------------- | -------- |
| 5007     | Woven fabrics of silk                     | 5%       |
| 5111     | Woven fabrics of carded wool              | 5%       |
| 5112     | Woven fabrics of combed wool              | 5%       |
| 5208     | Woven fabrics of cotton (≤200g/m²)        | 5%       |
| 5209     | Woven fabrics of cotton (>200g/m²)        | 5%       |
| 5210     | Woven fabrics of cotton (mixed)           | 5%       |
| 5407     | Woven fabrics of synthetic filament       | 5%       |
| 5408     | Woven fabrics of artificial filament      | 5%       |
| 5512     | Woven fabrics of synthetic staple         | 5%       |
| 5513     | Woven fabrics of synthetic staple (mixed) | 5%       |
| 5514     | Woven fabrics of synthetic staple (twill) | 5%       |
| 5515     | Other woven fabrics of synthetic staple   | 5%       |
| 5516     | Woven fabrics of artificial staple        | 5%       |
| 6101     | Knitted overcoats, jackets (men)          | 12%      |
| 6104     | Knitted suits, dresses (women)            | 12%      |
| 6109     | T-shirts, singlets, knitted               | 12%      |

---

_Developed by [Sultan Kabadi](https://sultanbk.com) — KPT Billing v2.0.0_
