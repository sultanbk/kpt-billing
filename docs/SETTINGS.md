# KPT Billing - Settings

Settings is the owner-facing configuration area for shop identity, payment details, printers,
barcode labels, receipts, backups, security, and shortcuts. It stores values in the local SQLite
`settings` table as string key-value pairs.

Licence state is managed separately through the licence cache and the `window.license` API, not the
general settings table. See [LICENCE.md](LICENCE.md) for activation, plan gating, and upgrade UI
details.

## Layout

The Settings page is configuration-only and uses eight tabs:

| Tab       | Purpose                                                                         |
| --------- | ------------------------------------------------------------------------------- |
| General   | Shop identity, GST/PAN, state code, bill prefix, and default payment mode       |
| Payments  | Owner-gated bank, UPI, and scanner details used on receipts and payment slips   |
| Printers  | Receipt and label printer selection, test prints, and diagnostics               |
| Barcode   | Label content visibility, size, barcode dimensions, and calibration offsets     |
| Receipt   | Paper width, receipt copies, auto-print, footer mode, and receipt folder access |
| Backup    | Local SQL backups, restore, retention, and optional Google Drive backup         |
| Security  | Owner PIN change                                                                |
| Shortcuts | Configurable billing shortcuts and fixed shortcut reference                     |

Guide and About content are not Settings tabs. User-facing help should live in documentation or a
dedicated help/support surface.

## Important Keys

| Key                   | Default                 | Notes                                                   |
| --------------------- | ----------------------- | ------------------------------------------------------- |
| `shopName`            | `KRISHNAPRIYA TEXTILES` | Printed on receipts and reports                         |
| `shopAddress`         | Shop address            | Printed on receipts                                     |
| `shopPhone`           | `9108455006`            | Printed on receipts                                     |
| `gstin`               | empty                   | Business GSTIN                                          |
| `pan`                 | empty                   | Business PAN                                            |
| `stateCode`           | `29`                    | Karnataka by default                                    |
| `billPrefix`          | `KPT`                   | Prefix for new bill numbers                             |
| `defaultPaymentMode`  | `cash`                  | Default billing payment mode                            |
| `paymentMethods`      | `[]`                    | JSON array of bank, UPI, and scanner methods            |
| `upiVpa`              | empty                   | Legacy/default receipt UPI value kept for compatibility |
| `upiPayeeName`        | empty                   | Legacy/default receipt UPI payee kept for compatibility |
| `receiptPrinterName`  | empty                   | Exact system printer name                               |
| `labelPrinterName`    | empty                   | Exact system printer name for product labels            |
| `barcodeLabelSize`    | `46x25`                 | `46x25` or `60x40`                                      |
| `barcodeWidth`        | `75`                    | Barcode width percentage                                |
| `barcodeHeight`       | `5.5`                   | Barcode height in mm                                    |
| `barcodeNudgeX`       | `0.0`                   | Horizontal print calibration in mm                      |
| `barcodeNudgeY`       | `0.0`                   | Vertical print calibration in mm                        |
| `receiptPaperWidthMm` | `58`                    | `58`, `72`, or `80`                                     |
| `receiptCopies`       | `1`                     | Number of receipt copies                                |
| `receiptFooterType`   | `default`               | `default`, `custom`, or `none`                          |
| `receiptFooter`       | empty                   | Used when footer mode is `custom`                       |
| `autoPrintReceipt`    | `true`                  | Auto-print after checkout                               |
| `backupFrequency`     | `4hours`                | `hourly`, `4hours`, or `daily`                          |
| `backupRetention`     | `30`                    | Number of backups/days retained by backup cleanup       |
| `backupPath`          | empty                   | Optional custom local backup path                       |

## Storage And Compatibility

- Renderer settings are handled as `Record<string, string>` because the database stores strings.
- Renderer helper functions convert booleans, numbers, defaults, and payment JSON at the UI edge.
- Existing IPC channels remain stable: `settings:*`, `printer:*`, `backup:*`, `cloud:*`, and `auth:*`.
- `paymentMethods` is the structured payment source. The legacy `upiVpa` and `upiPayeeName` keys are
  still synchronized from the default UPI/scanner method so receipt code remains compatible.
- Missing defaults are supplied from `DEFAULT_SETTINGS` before saving.

## Related Docs

- [BACKUP.md](BACKUP.md)
- [SECURITY.md](SECURITY.md)
- [SHORTCUTS.md](SHORTCUTS.md)
- [LICENCE.md](LICENCE.md)
- [OWNER_GUIDE.md](OWNER_GUIDE.md)
