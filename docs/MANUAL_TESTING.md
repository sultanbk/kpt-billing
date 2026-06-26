# KPT Billing — Manual Testing Guide

> Step-by-step procedures to manually test every feature.
> Work through each section in order; later sections depend on data created by earlier ones.

---

## Prerequisites

1. Install the app from `dist/kpt-billing-1.0.0-setup.exe` (or run `npm run dev`).
2. Default PIN: **1234** (SHA-256 hashed in SQLite — `settings.pin_hash`).
3. Keep a thermal receipt printer connected (or skip print-specific steps).
4. Have WhatsApp Desktop installed for WhatsApp steps.

---

## Table of Contents

| #   | Section                                                       | Est. Time |
| --- | ------------------------------------------------------------- | --------- |
| 1   | [PIN Gate & Lock Screen](#1-pin-gate--lock-screen)            | 5 min     |
| 2   | [Navigation & Shortcuts](#2-navigation--shortcuts)            | 5 min     |
| 3   | [Dashboard](#3-dashboard)                                     | 5 min     |
| 4   | [Category Management](#4-category-management)                 | 5 min     |
| 5   | [Product Management](#5-product-management)                   | 15 min    |
| 6   | [Supplier Management](#6-supplier-management)                 | 5 min     |
| 7   | [Purchase / Stock-In](#7-purchase--stock-in)                  | 10 min    |
| 8   | [Customer Management](#8-customer-management)                 | 10 min    |
| 9   | [Billing / POS](#9-billing--pos)                              | 20 min    |
| 10  | [Hold & Recall Bills](#10-hold--recall-bills)                 | 5 min     |
| 11  | [Bulk Billing](#11-bulk-billing)                              | 10 min    |
| 12  | [Return & Exchange](#12-return--exchange)                     | 10 min    |
| 13  | [Credit Management](#13-credit-management)                    | 10 min    |
| 14  | [Quick Bill Search](#14-quick-bill-search)                    | 5 min     |
| 15  | [Expenses](#15-expenses)                                      | 5 min     |
| 16  | [Reports](#16-reports)                                        | 10 min    |
| 17  | [Customer Analytics](#17-customer-analytics)                  | 5 min     |
| 18  | [Credit Aging](#18-credit-aging)                              | 5 min     |
| 19  | [Data Export](#19-data-export)                                | 5 min     |
| 20  | [Settings](#20-settings)                                      | 10 min    |
| 21  | [Printing](#21-printing)                                      | 5 min     |
| 22  | [WhatsApp Integration](#22-whatsapp-integration)              | 5 min     |
| 23  | [Backup & Restore](#23-backup--restore)                       | 10 min    |
| 24  | [Cloud Backup (Google Drive)](#24-cloud-backup-google-drive)  | 10 min    |
| 25  | [Edge Cases & Negative Tests](#25-edge-cases--negative-tests) | 10 min    |

---

## 1. PIN Gate & Lock Screen

### 1.1 — First Launch PIN Entry

| Step | Action                          | Expected Result                                         |
| ---- | ------------------------------- | ------------------------------------------------------- |
| 1    | Launch the app                  | PIN entry screen appears with 4-digit input             |
| 2    | Enter wrong PIN `0000`          | Error message: "Invalid PIN" or similar shake animation |
| 3    | Enter wrong PIN 5 times rapidly | Lockout / rate-limit message appears                    |
| 4    | Enter correct PIN `1234`        | App unlocks, Dashboard is shown                         |

### 1.2 — Lock Screen

| Step | Action                      | Expected Result                            |
| ---- | --------------------------- | ------------------------------------------ |
| 1    | Press `Alt+L` (or `Ctrl+L`) | Lock screen appears, app content hidden    |
| 2    | Enter correct PIN           | App unlocks back to previously active page |

---

## 2. Navigation & Shortcuts

### 2.1 — Sidebar Navigation

| Step | Action                                                                                                                                                 | Expected Result                      |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------ |
| 1    | Click each sidebar icon in order: Dashboard, Billing, Products, Purchases, Customers, Reports, Customer Analytics, Credit Aging, Data Export, Settings | Corresponding page loads             |
| 2    | Verify the active sidebar item is highlighted                                                                                                          | Active item has primary color/accent |

### 2.2 — Keyboard Navigation

| Step | Action                 | Expected Result                    |
| ---- | ---------------------- | ---------------------------------- |
| 1    | Press `F1`             | Dashboard page opens               |
| 2    | Press `F2`             | Billing page opens, search focused |
| 3    | Press `F3`             | Products page opens                |
| 4    | Press `F4`             | Purchases page opens               |
| 5    | Press `F5`             | Customers page opens               |
| 6    | Press `F7`             | Reports page opens                 |
| 7    | Press `F10`            | Settings page opens                |
| 8    | Press `Ctrl+N`         | Goes to Billing page               |
| 9    | Press `Ctrl+Shift+D`   | Goes to Dashboard                  |
| 10   | Press `Ctrl+Shift+R`   | Goes to Reports                    |
| 11   | Press `F12`            | Shortcuts help overlay opens       |
| 12   | Press `Esc` on overlay | Overlay closes                     |

---

## 3. Dashboard

| Step | Action                                  | Expected Result                                              |
| ---- | --------------------------------------- | ------------------------------------------------------------ |
| 1    | Navigate to Dashboard (`F1`)            | Dashboard loads with stat cards                              |
| 2    | Check "Today's Sales" card              | Shows ₹0 if no bills today, or correct sum                   |
| 3    | Check "Today's Bills" card              | Shows correct bill count for today                           |
| 4    | Check "Low Stock" card                  | Shows count of products below minimum stock                  |
| 5    | Check "This Week" sales card            | Shows sum of last 7 days' sales                              |
| 6    | Check "Recent Bills" table              | Lists last 10 bills with bill number, customer, amount, time |
| 7    | Check "Top Selling Today" section       | Shows top 5 products by quantity sold today                  |
| 8    | Check "Today's Expenses" card           | Shows today's total expenses                                 |
| 9    | Verify "Net" calculation below expenses | Net = Today's Sales − Today's Expenses                       |
| 10   | Check collections and credits section   | Shows pending credits count and amount                       |
| 11   | Check low stock items list              | Lists up to 8 low-stock products with stock levels           |
| 12   | Click "New Bill" button                 | Navigates to Billing page                                    |
| 13   | Wait 60 seconds                         | Dashboard auto-refreshes data                                |

---

## 4. Category Management

> Categories are managed from the Products page.

| Step | Action                                             | Expected Result                                       |
| ---- | -------------------------------------------------- | ----------------------------------------------------- |
| 1    | Go to Products (`F3`)                              | Products page loads                                   |
| 2    | Find category filter/dropdown                      | Category list visible (may include "All")             |
| 3    | Click "Add Category" or "+" next to categories     | Category creation input appears                       |
| 4    | Type "Test Category" and submit                    | New category appears in list                          |
| 5    | Create a child category under "Test Category"      | Child category created, nested properly               |
| 6    | Rename "Test Category" to "Renamed Category"       | Category name updated in list                         |
| 7    | Try to delete a category that has child categories | Error: "Cannot delete category with child categories" |
| 8    | Delete the child category first, then parent       | Both deleted successfully                             |

---

## 5. Product Management

### 5.1 — Create Product

| Step | Action                                                            | Expected Result                  |
| ---- | ----------------------------------------------------------------- | -------------------------------- |
| 1    | Go to Products (`F3`)                                             | Products page with list/grid     |
| 2    | Click "Add Product" button                                        | Product form dialog/panel opens  |
| 3    | Fill in: Name="Test Shirt", SKU="TST001", Barcode="1234567890123" | Fields accept input              |
| 4    | Set Purchase Price=200, Selling Price=350                         | Price fields filled              |
| 5    | Set Stock=50, Min Stock=10, Unit="pcs"                            | Stock fields filled              |
| 6    | Set GST Rate=5%, HSN="6109"                                       | Tax fields filled                |
| 7    | Select a category                                                 | Category assigned                |
| 8    | Click "Save"                                                      | Product created, appears in list |
| 9    | Verify SKU was auto-generated if left blank                       | SKU like "KPT-XXXXX" assigned    |

### 5.2 — Search & Filter Products

| Step | Action                    | Expected Result                      |
| ---- | ------------------------- | ------------------------------------ |
| 1    | Type "Test" in search box | Products matching "Test" shown       |
| 2    | Filter by category        | Only products in that category shown |
| 3    | Filter by "Low Stock"     | Only low stock products shown        |
| 4    | Filter by "Out of Stock"  | Only zero-stock products shown       |
| 5    | Clear all filters         | Full product list restored           |

### 5.3 — Edit Product

| Step | Action                               | Expected Result                         |
| ---- | ------------------------------------ | --------------------------------------- |
| 1    | Click on a product in the list       | Product detail/edit opens               |
| 2    | Change selling price from 350 to 400 | Price field updated                     |
| 3    | Save changes                         | Product updated, price history recorded |
| 4    | Open Price History dialog            | Shows old price → new price with date   |

### 5.4 — Stock Adjustment

| Step | Action                                 | Expected Result                |
| ---- | -------------------------------------- | ------------------------------ |
| 1    | Select a product                       | Product selected               |
| 2    | Click "Adjust Stock"                   | Stock adjustment dialog opens  |
| 3    | Add +10 stock with note "Manual count" | Stock increased by 10          |
| 4    | View Stock Ledger for same product     | Shows the +10 adjustment entry |
| 5    | Subtract -5 stock                      | Stock decreased by 5           |
| 6    | Verify stock ledger has both entries   | Both +10 and -5 visible        |

### 5.5 — Delete Product

| Step | Action                            | Expected Result             |
| ---- | --------------------------------- | --------------------------- |
| 1    | Create a dummy product "ToDelete" | Product created             |
| 2    | Click delete on that product      | Confirmation prompt appears |
| 3    | Confirm deletion                  | Product removed from list   |

### 5.6 — Bulk Stock Update

| Step | Action                                    | Expected Result                                       |
| ---- | ----------------------------------------- | ----------------------------------------------------- |
| 1    | Click "Bulk Stock Update" button          | Dialog opens with SKU/barcode + stock fields          |
| 2    | Enter several SKUs with new stock amounts | Entries accepted                                      |
| 3    | Click "Update"                            | Stock updated for all matched products, results shown |
| 4    | Try with invalid SKU                      | Error shown for that SKU, others processed            |

### 5.7 — CSV Import

| Step | Action                                      | Expected Result                                                 |
| ---- | ------------------------------------------- | --------------------------------------------------------------- |
| 1    | Click "Import" button on Products page      | File picker opens                                               |
| 2    | Select a properly formatted CSV file        | Import dialog shows preview                                     |
| 3    | Confirm import                              | Products created, import results shown (created/updated/errors) |
| 4    | Try importing a non-CSV file                | Error: file must be .csv                                        |
| 5    | Import CSV with commas inside quoted fields | Fields parsed correctly (not split on embedded commas)          |

---

## 6. Supplier Management

| Step | Action                                                     | Expected Result                    |
| ---- | ---------------------------------------------------------- | ---------------------------------- |
| 1    | Go to Purchases (`F4`)                                     | Purchases page loads               |
| 2    | Start typing a supplier name in supplier field             | Supplier search dropdown appears   |
| 3    | Click "New Supplier"                                       | Quick-add supplier form appears    |
| 4    | Fill Name="ABC Textiles", Phone="9876543210", City="Surat" | Fields accept input                |
| 5    | Save supplier                                              | Supplier created and auto-selected |
| 6    | Verify city appears in city dropdown on next purchase      | "Surat" in city suggestions        |

---

## 7. Purchase / Stock-In

### 7.1 — Create Purchase

| Step | Action                                                     | Expected Result                                           |
| ---- | ---------------------------------------------------------- | --------------------------------------------------------- |
| 1    | Go to Purchases (`F4`), ensure "New Purchase" tab active   | Empty purchase form shown                                 |
| 2    | Select or create a supplier                                | Supplier assigned                                         |
| 3    | Select a city from dropdown (or type new)                  | City set                                                  |
| 4    | Enter invoice number "INV-001"                             | Invoice number set                                        |
| 5    | Set invoice date                                           | Date set                                                  |
| 6    | Search for "Test Shirt" in product search                  | Product appears in results                                |
| 7    | Click to add product                                       | Product added to purchase line items                      |
| 8    | Set Qty=20, Purchase Price=180, Selling Price=340          | Line item updated                                         |
| 9    | Add a second product by barcode scan (or type barcode)     | Second product added                                      |
| 10   | Verify totals calculation                                  | Grand total = sum of (qty × purchase price) for all items |
| 11   | Set payment mode and status                                | Payment details set                                       |
| 12   | Click "Save Purchase"                                      | Purchase created successfully                             |
| 13   | Verify "Test Shirt" stock increased by 20                  | Go to Products, check stock                               |
| 14   | Verify purchase price and selling price updated on product | Prices match what was entered                             |

### 7.2 — Barcode Scanner in Purchases

| Step | Action                                   | Expected Result                                            |
| ---- | ---------------------------------------- | ---------------------------------------------------------- |
| 1    | Focus the product search field           | Cursor in search box                                       |
| 2    | Scan a barcode (or type quickly + Enter) | Product matched and added to items                         |
| 3    | Scan the same barcode again              | Quantity incremented on existing line (not duplicate line) |

### 7.3 — Purchase History

| Step | Action                                                  | Expected Result                                              |
| ---- | ------------------------------------------------------- | ------------------------------------------------------------ |
| 1    | Switch to "History" tab                                 | List of past purchases shown                                 |
| 2    | Click "View" on a purchase                              | Purchase detail dialog opens showing items, prices, supplier |
| 3    | Click "Delete" on a purchase                            | Confirm dialog appears (styled, not native alert)            |
| 4    | Confirm deletion                                        | Purchase deleted, stock reversed to previous purchase prices |
| 5    | Verify product stock decreased by the purchase quantity | Check product stock in Products page                         |

---

## 8. Customer Management

### 8.1 — Create Customer

| Step | Action                                                        | Expected Result                   |
| ---- | ------------------------------------------------------------- | --------------------------------- |
| 1    | Go to Customers (`F5`)                                        | Customer list shown               |
| 2    | Click "Add Customer"                                          | Customer form opens               |
| 3    | Fill: Name="Rahul Sharma", Phone="9876543210", Email, Address | Fields accept input               |
| 4    | Set Credit Limit=5000                                         | Credit limit set                  |
| 5    | Save                                                          | Customer created, appears in list |

### 8.2 — Search Customers

| Step | Action                 | Expected Result                 |
| ---- | ---------------------- | ------------------------------- |
| 1    | Type "Rahul" in search | Matching customers shown        |
| 2    | Search by phone "9876" | Customer found by partial phone |
| 3    | Clear search           | Full list shown                 |

### 8.3 — Edit Customer

| Step | Action                                 | Expected Result                 |
| ---- | -------------------------------------- | ------------------------------- |
| 1    | Click a customer                       | Customer detail/edit view opens |
| 2    | Change credit limit from 5000 to 10000 | Field updated                   |
| 3    | Save                                   | Changes persisted               |

### 8.4 — Customer Credit View

| Step | Action                              | Expected Result                                  |
| ---- | ----------------------------------- | ------------------------------------------------ |
| 1    | View a customer with credit balance | Credit balance shown                             |
| 2    | Check credit ledger                 | Shows all credit transactions (bills + payments) |
| 3    | Check bill history for customer     | Lists all bills for this customer                |

### 8.5 — Credit Reminder via WhatsApp

| Step | Action                                                   | Expected Result                        |
| ---- | -------------------------------------------------------- | -------------------------------------- |
| 1    | On a customer with pending credit, click "Send Reminder" | WhatsApp opens with pre-filled message |
| 2    | Verify message has customer name, balance amount         | Message content correct                |

---

## 9. Billing / POS

### 9.1 — Create Cash Bill

| Step | Action                                                    | Expected Result                                     |
| ---- | --------------------------------------------------------- | --------------------------------------------------- |
| 1    | Go to Billing (`F2`)                                      | Billing page loads, search focused                  |
| 2    | Type product name "Test Shirt"                            | Search results dropdown appears                     |
| 3    | Use `↑`/`↓` arrows to navigate, `Enter` to select         | Product added to cart                               |
| 4    | Verify cart shows: product name, qty=1, price, GST, total | All fields correct                                  |
| 5    | Change quantity to 3                                      | Qty updated, line total recalculated                |
| 6    | Add a second product                                      | Second line item appears                            |
| 7    | Verify subtotal, GST total, grand total                   | All calculations correct                            |
| 8    | Apply item-level discount: 10% on first item              | Item total reduced, savings shown                   |
| 9    | Apply bill-level discount: ₹50                            | Grand total reduced by ₹50                          |
| 10   | Press `F11` (or click Pay)                                | Payment dialog opens                                |
| 11   | Verify amount = rounded grand total (Math.round)          | Amount pre-filled correctly                         |
| 12   | Payment mode = Cash (default)                             | Cash mode selected                                  |
| 13   | Enter amount received (e.g. ₹1000)                        | Change calculated and shown                         |
| 14   | Click "Create Bill"                                       | Bill created, success screen shown with bill number |
| 15   | Verify stock decreased for both products                  | Check product stock                                 |

### 9.2 — Create UPI Bill

| Step | Action                            | Expected Result                                 |
| ---- | --------------------------------- | ----------------------------------------------- |
| 1    | Add products to cart              | Cart has items                                  |
| 2    | Open payment (`F11`)              | Payment dialog opens                            |
| 3    | Select "UPI" mode                 | UPI mode selected                               |
| 4    | Leave reference blank, try to pay | Error: "Please enter UPI transaction reference" |
| 5    | Enter reference "UPI123456"       | Reference accepted                              |
| 6    | Create bill                       | Bill created with UPI payment mode              |

### 9.3 — Create Card Bill

| Step | Action                     | Expected Result                     |
| ---- | -------------------------- | ----------------------------------- |
| 1    | Add products, open payment | Payment dialog                      |
| 2    | Select "Card" mode         | Card mode selected                  |
| 3    | Create bill                | Bill created with Card payment mode |

### 9.4 — Create Credit Bill

| Step | Action                                                         | Expected Result                                               |
| ---- | -------------------------------------------------------------- | ------------------------------------------------------------- |
| 1    | Add products to cart                                           | Cart has items                                                |
| 2    | Do NOT set a customer                                          | No customer selected                                          |
| 3    | Open payment, select "Credit"                                  | Credit mode selected                                          |
| 4    | Try to create bill                                             | Error: "Please select a registered customer for credit sales" |
| 5    | Set customer "Rahul Sharma" (from billing page customer field) | Customer set                                                  |
| 6    | Open payment, select "Credit"                                  | Credit mode with customer                                     |
| 7    | Verify credit limit warning if applicable                      | Warning shown if exceeds limit                                |
| 8    | Create bill                                                    | Bill created, customer credit balance increased               |
| 9    | Go to Customers, check Rahul's credit balance                  | Balance = bill amount                                         |

### 9.5 — Custom (Other) Item

| Step | Action                                      | Expected Result                                    |
| ---- | ------------------------------------------- | -------------------------------------------------- |
| 1    | Press `Alt+O` on Billing page               | "Add Other Item" dialog opens                      |
| 2    | Enter: Name="Alterations", Price=150, Qty=1 | Fields filled                                      |
| 3    | Add item                                    | Custom item appears in cart (no product ID)        |
| 4    | Create bill with this item                  | Bill created, no stock changes (no product linked) |

### 9.6 — Barcode Scanning

| Step | Action                                                 | Expected Result                           |
| ---- | ------------------------------------------------------ | ----------------------------------------- |
| 1    | On Billing page, scan a barcode (or type fast + Enter) | Product found by barcode, added to cart   |
| 2    | Scan same barcode again                                | Quantity incremented (not duplicate line) |
| 3    | Scan unknown barcode                                   | "Product not found" message               |

### 9.7 — Customer Selection on Billing Page

| Step | Action                                    | Expected Result                     |
| ---- | ----------------------------------------- | ----------------------------------- |
| 1    | Click customer name field on billing page | Customer search input appears       |
| 2    | Type "Rah"                                | Matching customers shown            |
| 3    | Select "Rahul Sharma"                     | Customer name, phone, ID set        |
| 4    | Press `Alt+N`                             | Quick add new customer dialog opens |
| 5    | Fill and save new customer                | Customer created and auto-selected  |

### 9.8 — Clear Cart

| Step | Action                                    | Expected Result                 |
| ---- | ----------------------------------------- | ------------------------------- |
| 1    | Add items to cart                         | Cart has items                  |
| 2    | Press `F9`                                | Cart cleared, all items removed |
| 3    | Verify customer and discount also cleared | Everything reset                |

### 9.9 — Remove Single Item

| Step | Action                          | Expected Result                      |
| ---- | ------------------------------- | ------------------------------------ |
| 1    | Add 3 products to cart          | 3 line items                         |
| 2    | Click delete (X) on middle item | Only that item removed               |
| 3    | Verify totals recalculated      | Totals correct for remaining 2 items |

### 9.10 — Zero Total Prevention

| Step | Action                                            | Expected Result                               |
| ---- | ------------------------------------------------- | --------------------------------------------- |
| 1    | Add a product with price=0 or apply 100% discount | Grand total = ₹0                              |
| 2    | Try to pay                                        | Error: "Bill total must be greater than zero" |

### 9.11 — Day Summary Popup

| Step | Action                                                       | Expected Result                   |
| ---- | ------------------------------------------------------------ | --------------------------------- |
| 1    | Press `Ctrl+D` on Billing page                               | Day summary popup opens           |
| 2    | Verify it shows today's sales, bill count, payment breakdown | Data matches actual bills created |

---

## 10. Hold & Recall Bills

### 10.1 — Hold a Bill

| Step | Action                                                             | Expected Result         |
| ---- | ------------------------------------------------------------------ | ----------------------- |
| 1    | Add products and set customer "Rahul Sharma" to cart               | Cart ready              |
| 2    | Press `F6`                                                         | Bill held, cart cleared |
| 3    | Verify "Held Bills" badge/count appears on sidebar or billing page | Count shows 1           |

### 10.2 — Recall a Bill

| Step | Action                                            | Expected Result                                                     |
| ---- | ------------------------------------------------- | ------------------------------------------------------------------- |
| 1    | Press `F8`                                        | Held bills list appears                                             |
| 2    | Select the held bill                              | Cart restored with items, customer name, phone, **and customer ID** |
| 3    | Verify all items, quantities, prices match        | Data intact                                                         |
| 4    | Verify customer is "Rahul Sharma" with correct ID | Customer ID preserved (fix verified)                                |
| 5    | Proceed to pay and create bill                    | Bill created normally                                               |

### 10.3 — Hold Multiple Bills

| Step | Action                       | Expected Result                             |
| ---- | ---------------------------- | ------------------------------------------- |
| 1    | Hold bill #1 with Customer A | Bill 1 held                                 |
| 2    | Hold bill #2 with Customer B | Bill 2 held                                 |
| 3    | Recall bill #1               | Cart shows bill 1's data, bill 2 still held |
| 4    | Recall bill #2               | Cart shows bill 2's data                    |

### 10.4 — Persistence Across Restart

| Step | Action                       | Expected Result                                  |
| ---- | ---------------------------- | ------------------------------------------------ |
| 1    | Hold a bill                  | Bill held                                        |
| 2    | Close and reopen the app     | App restarts                                     |
| 3    | Press `F8` to see held bills | Previously held bill still there                 |
| 4    | Recall it                    | All data restored including customer information |

---

## 11. Bulk Billing

### 11.1 — Generate Bulk Bills

| Step | Action                                                                  | Expected Result                                   |
| ---- | ----------------------------------------------------------------------- | ------------------------------------------------- |
| 1    | Add products to cart on Billing page                                    | Cart has items                                    |
| 2    | Click "Bulk Bill" button                                                | Bulk Bill dialog opens (Step 1: Select Customers) |
| 3    | Search and select 3+ customers                                          | Customers added to list                           |
| 4    | Set per-customer payment modes (e.g., cash for one, credit for another) | Individual modes set                              |
| 5    | Click "Apply Cash to All"                                               | All customers switch to cash                      |
| 6    | Click "Review"                                                          | Step 2: Review screen                             |
| 7    | Verify total = grandTotal × customer count                              | Aggregate total correct                           |
| 8    | **Verify stock warnings** if total needed > available stock             | Warning banner shown for insufficient items       |
| 9    | Click "Generate Bills"                                                  | Processing screen, bills created one by one       |
| 10   | Verify all bills show success (green checkmarks)                        | All bills created                                 |
| 11   | Verify stock reduced by (item qty × customer count) for each product    | Stock correct                                     |

### 11.2 — Inline Customer Add

| Step | Action                                 | Expected Result                             |
| ---- | -------------------------------------- | ------------------------------------------- |
| 1    | In bulk bill Step 1, click "Quick Add" | Inline customer form appears                |
| 2    | Enter name and phone                   | Fields filled                               |
| 3    | Save                                   | Customer created and auto-selected for bulk |

### 11.3 — Print All

| Step | Action                                        | Expected Result                           |
| ---- | --------------------------------------------- | ----------------------------------------- |
| 1    | After bulk bill generation, click "Print All" | All successful bills printed sequentially |
| 2    | Verify each receipt printed                   | Receipts correct                          |

### 11.4 — WhatsApp All

| Step | Action                                          | Expected Result                  |
| ---- | ----------------------------------------------- | -------------------------------- |
| 1    | After generation, click WhatsApp icon on a bill | WhatsApp opens for that customer |

---

## 12. Return & Exchange

### 12.1 — Full Return

| Step | Action                                                     | Expected Result                       |
| ---- | ---------------------------------------------------------- | ------------------------------------- |
| 1    | Press `Ctrl+R` on Billing page                             | Return/Exchange dialog opens          |
| 2    | Enter a bill number or search                              | Bill found and loaded                 |
| 3    | Verify bill items shown with original quantities           | All items listed                      |
| 4    | Select return mode: "Return"                               | Return mode active                    |
| 5    | Set return qty for each item (full quantity)               | Return quantities set                 |
| 6    | Select refund mode (cash/credit)                           | Refund mode selected                  |
| 7    | Enter return reason                                        | Reason entered                        |
| 8    | Click "Process Return"                                     | Return processed, refund amount shown |
| 9    | Verify stock increased back for returned items             | Stock restored                        |
| 10   | If refund=credit, verify customer credit balance decreased | Balance reduced                       |

### 12.2 — Partial Return

| Step | Action                                   | Expected Result                                        |
| ---- | ---------------------------------------- | ------------------------------------------------------ |
| 1    | Open return dialog for a multi-item bill | Bill loaded                                            |
| 2    | Return only 1 of 3 items                 | Partial return                                         |
| 3    | Process                                  | Only returned item stock restored, refund proportional |
| 4    | Try returning the same items again       | Already-returned quantities grayed out / blocked       |

### 12.3 — Exchange

| Step | Action                             | Expected Result                                                      |
| ---- | ---------------------------------- | -------------------------------------------------------------------- |
| 1    | Open return dialog                 | Dialog opens                                                         |
| 2    | Select "Exchange" mode             | Exchange mode                                                        |
| 3    | Select items to return             | Return items selected                                                |
| 4    | Add new exchange items             | New items added                                                      |
| 5    | Verify price difference calculated | Difference shown (customer pays or receives)                         |
| 6    | Process exchange                   | Return items stocked back, new items deducted, exchange bill created |

### 12.4 — Return via Quick Bill Search

| Step | Action                   | Expected Result                            |
| ---- | ------------------------ | ------------------------------------------ |
| 1    | Press `Ctrl+K`           | Quick search opens                         |
| 2    | Search for a bill number | Bill found                                 |
| 3    | Press `→` then `R`       | Return/Exchange dialog opens for that bill |

---

## 13. Credit Management

### 13.1 — Record Credit Payment

| Step | Action                              | Expected Result                                   |
| ---- | ----------------------------------- | ------------------------------------------------- |
| 1    | Go to Customers (`F5`)              | Customer list                                     |
| 2    | Select customer with credit balance | Customer detail view                              |
| 3    | Click "Record Payment"              | Payment form opens                                |
| 4    | Enter amount=500, mode=Cash         | Payment details entered                           |
| 5    | Save                                | Payment recorded, credit balance decreased by 500 |
| 6    | Check credit ledger                 | New payment entry with date and amount            |

### 13.2 — Payment Confirmation WhatsApp

| Step | Action                                             | Expected Result                             |
| ---- | -------------------------------------------------- | ------------------------------------------- |
| 1    | After recording payment, click "Send Confirmation" | WhatsApp opens with payment details message |

### 13.3 — Credit Ledger

| Step | Action                                                     | Expected Result                  |
| ---- | ---------------------------------------------------------- | -------------------------------- |
| 1    | View credit ledger for a customer                          | Shows chronological list         |
| 2    | Verify entries: credit bills (debit) and payments (credit) | All entries present              |
| 3    | Verify running balance                                     | Each entry shows updated balance |

### 13.4 — Delete Credit Payment

| Step | Action                               | Expected Result                     |
| ---- | ------------------------------------ | ----------------------------------- |
| 1    | Delete a credit payment              | Payment removed                     |
| 2    | Verify customer balance recalculated | Balance increased by deleted amount |

---

## 14. Quick Bill Search

| Step | Action                           | Expected Result               |
| ---- | -------------------------------- | ----------------------------- |
| 1    | Press `Ctrl+K`                   | Search overlay opens          |
| 2    | Type a bill number (e.g. "KPT-") | Matching bills shown          |
| 3    | Type a customer name             | Bills for that customer shown |
| 4    | Use `↑`/`↓` arrows               | Navigate through results      |
| 5    | Press `Enter` or `→` on a bill   | Action menu appears           |
| 6    | Press `V`                        | View bill detail dialog       |
| 7    | Press `P`                        | Print receipt                 |
| 8    | Press `D`                        | Download PDF receipt          |
| 9    | Press `W`                        | Open WhatsApp with bill       |
| 10   | Press `R`                        | Open Return/Exchange dialog   |
| 11   | Press `←`                        | Go back to search results     |
| 12   | Press `Esc`                      | Close search overlay          |

---

## 15. Expenses

| Step | Action                                                                      | Expected Result                   |
| ---- | --------------------------------------------------------------------------- | --------------------------------- |
| 1    | Go to Reports (`F7`)                                                        | Reports page loads                |
| 2    | Navigate to Expenses section/tab                                            | Expenses view shown               |
| 3    | Click "Add Expense"                                                         | Expense form opens                |
| 4    | Enter: Category="Rent", Amount=5000, Description="Monthly rent", Date=today | Fields filled                     |
| 5    | Set payment mode (cash/upi/card)                                            | Mode set                          |
| 6    | Save                                                                        | Expense created, appears in list  |
| 7    | Filter expenses by date range                                               | Filtered list shown               |
| 8    | Filter by category                                                          | Only matching category shown      |
| 9    | Edit an expense                                                             | Updated successfully              |
| 10   | Delete an expense                                                           | Removed from list                 |
| 11   | Verify expense categories auto-suggest                                      | Previously used categories appear |
| 12   | Check expense summary (by category and payment mode)                        | Breakdown correct                 |

---

## 16. Reports

### 16.1 — Daily Summary

| Step | Action                                                 | Expected Result                                  |
| ---- | ------------------------------------------------------ | ------------------------------------------------ |
| 1    | Go to Reports (`F7`)                                   | Reports page                                     |
| 2    | View Daily Summary for today                           | Shows total sales, bill count, payment breakdown |
| 3    | Check payment mode breakdown (cash/upi/card/credit)    | Amounts match actual bills                       |
| 4    | Check bill count matches number of bills created today | Count correct                                    |
| 5    | Generate PDF report                                    | PDF created and opened                           |

### 16.2 — Weekly Summary

| Step | Action              | Expected Result       |
| ---- | ------------------- | --------------------- |
| 1    | View Weekly summary | Shows 7-day breakdown |
| 2    | Generate weekly PDF | PDF created           |

### 16.3 — Monthly Summary

| Step | Action               | Expected Result          |
| ---- | -------------------- | ------------------------ |
| 1    | View Monthly summary | Shows current month data |
| 2    | Generate monthly PDF | PDF created              |

### 16.4 — Yearly Summary

| Step | Action              | Expected Result                  |
| ---- | ------------------- | -------------------------------- |
| 1    | View Yearly summary | Shows monthly breakdown for year |
| 2    | Generate yearly PDF | PDF created                      |

### 16.5 — Custom Period Summary

| Step | Action                       | Expected Result               |
| ---- | ---------------------------- | ----------------------------- |
| 1    | Set custom date range        | Date range set                |
| 2    | View summary for that period | Data shown for selected dates |

### 16.6 — GST Report

| Step | Action                         | Expected Result                                                                             |
| ---- | ------------------------------ | ------------------------------------------------------------------------------------------- |
| 1    | Navigate to GST Report section | GST report view                                                                             |
| 2    | Click "This Month"             | Date range set to current month                                                             |
| 3    | Click "Last Month"             | Date range set to last month                                                                |
| 4    | Click "This Quarter"           | Date range = current Indian fiscal quarter (Q1=Apr-Jun, Q2=Jul-Sep, Q3=Oct-Dec, Q4=Jan-Mar) |
| 5    | Click "This FY"                | Date range = April 1 of current FY to today (Indian financial year)                         |
| 6    | Verify CGST, SGST totals       | Match actual GST from bills                                                                 |
| 7    | Verify HSN-wise breakdown      | Each HSN code with taxable value and tax amounts                                            |

### 16.7 — Profit & Loss Report

| Step | Action                                             | Expected Result     |
| ---- | -------------------------------------------------- | ------------------- |
| 1    | Navigate to P&L section                            | P&L report view     |
| 2    | Set date range                                     | Range selected      |
| 3    | View revenue, expenses, purchases, net profit/loss | All figures correct |

### 16.8 — Bill History

| Step | Action                           | Expected Result          |
| ---- | -------------------------------- | ------------------------ |
| 1    | Navigate to Bill History section | Bill list with filters   |
| 2    | Filter by date range             | Bills within range shown |
| 3    | Filter by payment mode           | Only matching bills      |
| 4    | Click "View" on a bill           | Bill detail dialog opens |
| 5    | Click "Print" on a bill          | Receipt printed          |

---

## 17. Customer Analytics

| Step | Action                                 | Expected Result                  |
| ---- | -------------------------------------- | -------------------------------- |
| 1    | Navigate to Customer Analytics page    | Analytics dashboard loads        |
| 2    | Check "Top Customers by Revenue"       | Ranked list with revenue amounts |
| 3    | Check "Customer Frequency"             | Visit/purchase frequency data    |
| 4    | Check "Credit Risk" analysis           | Customers ranked by credit risk  |
| 5    | Verify data makes sense with test data | Numbers match actual bills       |

---

## 18. Credit Aging

| Step | Action                                                             | Expected Result                                   |
| ---- | ------------------------------------------------------------------ | ------------------------------------------------- |
| 1    | Navigate to Credit Aging page                                      | Aging report loads                                |
| 2    | Verify aging buckets: Current, 30 days, 60 days, 90 days, 90+ days | Buckets shown                                     |
| 3    | Verify aging uses "first unpaid credit date" (not first-ever)      | Amounts in correct buckets (FIFO)                 |
| 4    | Check aging summary totals                                         | Total matches sum of all customer credit balances |
| 5    | Click on a customer                                                | Shows their individual aging detail               |
| 6    | Send reminder via WhatsApp                                         | WhatsApp opens with balance details               |

---

## 19. Data Export

| Step | Action                                      | Expected Result                         |
| ---- | ------------------------------------------- | --------------------------------------- |
| 1    | Navigate to Data Export page                | Export options shown                    |
| 2    | Click "Daily Report" export                 | Excel/CSV file generated and saved      |
| 3    | Click "Bill History" export with date range | File generated                          |
| 4    | Click "Stock Report"                        | File with all products and stock levels |
| 5    | Click "Customer Report"                     | File with all customer data             |
| 6    | Click "Full Data Export"                    | Comprehensive export of all data        |
| 7    | Open each exported file                     | Data correct and readable               |

---

## 20. Settings

### 20.1 — General Settings

| Step | Action                            | Expected Result                             |
| ---- | --------------------------------- | ------------------------------------------- |
| 1    | Go to Settings (`F10`)            | Settings page loads on "General" tab        |
| 2    | Update Shop Name="KPT Textiles"   | Field updated                               |
| 3    | Update Shop Address, Phone, GSTIN | Fields updated                              |
| 4    | Save                              | Settings persisted                          |
| 5    | Create a bill and print receipt   | Receipt shows updated shop name and details |

### 20.2 — Printer Settings

| Step | Action                                | Expected Result                  |
| ---- | ------------------------------------- | -------------------------------- |
| 1    | In General tab, find printer settings | Printer section visible          |
| 2    | Click "Get Available Printers"        | List of installed printers shown |
| 3    | Select a printer                      | Printer set                      |
| 4    | Click "Test Print"                    | Test receipt printed             |

### 20.3 — Backup Tab

| Step                                 | Action                       | Expected Result                           |
| ------------------------------------ | ---------------------------- | ----------------------------------------- |
| 1                                    | Switch to "Backup" tab       | Backup options shown                      |
| 2                                    | Click "Create Backup"        | Backup file created, success message      |
| 3                                    | View backup list             | Shows previous backups with date and size |
| 4                                    | Click "Select Backup Folder" | Folder picker opens                       |
| 5                                    | Set custom backup folder     | Folder changed                            |
| (See section 23 for restore testing) |                              |                                           |

### 20.4 — Security Tab

| Step | Action                                      | Expected Result          |
| ---- | ------------------------------------------- | ------------------------ |
| 1    | Switch to "Security" tab                    | PIN change section shown |
| 2    | Enter current PIN=1234, new PIN=5678        | Fields filled            |
| 3    | Click "Change PIN"                          | PIN changed successfully |
| 4    | Lock screen (`Alt+L`)                       | Lock screen appears      |
| 5    | Try old PIN 1234                            | Fails                    |
| 6    | Enter new PIN 5678                          | Unlocks successfully     |
| 7    | **Change PIN back to 1234** for convenience | PIN restored             |

### 20.5 — Shortcuts Tab

| Step | Action                                     | Expected Result                      |
| ---- | ------------------------------------------ | ------------------------------------ |
| 1    | Switch to "Shortcuts" tab                  | List of all keyboard shortcuts shown |
| 2    | Verify all shortcuts match actual behavior | Shortcuts are accurate               |

---

## 21. Printing

### 21.1 — Thermal Receipt Print

| Step | Action                                                                            | Expected Result         |
| ---- | --------------------------------------------------------------------------------- | ----------------------- |
| 1    | Create a bill (cash)                                                              | Bill created            |
| 2    | Click "Print" on success screen                                                   | Thermal receipt printed |
| 3    | Verify receipt has: shop name, bill number, date, items, GST, total, payment mode | All fields present      |
| 4    | Verify item-level discount shown                                                  | Discount visible        |
| 5    | Verify bill-level discount shown                                                  | Discount visible        |

### 21.2 — PDF Receipt

| Step | Action                                                   | Expected Result                               |
| ---- | -------------------------------------------------------- | --------------------------------------------- |
| 1    | Click "Download PDF" on bill success or via Quick Search | PDF generated                                 |
| 2    | Open the PDF                                             | Shows formatted receipt with all bill details |

### 21.3 — Reprint from Quick Search

| Step | Action                       | Expected Result                 |
| ---- | ---------------------------- | ------------------------------- |
| 1    | `Ctrl+K` → search bill → `P` | Receipt reprinted for that bill |

---

## 22. WhatsApp Integration

### 22.1 — Bill Receipt via WhatsApp

| Step | Action                                        | Expected Result                             |
| ---- | --------------------------------------------- | ------------------------------------------- |
| 1    | Create bill for customer with phone number    | Bill created                                |
| 2    | Click "WhatsApp" on success screen            | WhatsApp Desktop opens with receipt message |
| 3    | Verify message has bill number, amount, items | Message correct                             |

### 22.2 — WhatsApp for Walk-in (No Phone)

| Step | Action                             | Expected Result                       |
| ---- | ---------------------------------- | ------------------------------------- |
| 1    | Create bill without customer phone | Bill success screen shows phone input |
| 2    | Enter 10-digit phone number        | Phone accepted                        |
| 3    | Click send                         | WhatsApp opens for that phone         |

### 22.3 — Credit Reminder WhatsApp

| Step | Action                                                 | Expected Result |
| ---- | ------------------------------------------------------ | --------------- |
| 1    | On customer with credit balance, click "Send Reminder" | WhatsApp opens  |
| 2    | Verify message: customer name, pending amount          | Message correct |

### 22.4 — Payment Confirmation WhatsApp

| Step | Action                                                     | Expected Result |
| ---- | ---------------------------------------------------------- | --------------- |
| 1    | After recording credit payment, send confirmation          | WhatsApp opens  |
| 2    | Verify: amount paid, remaining balance, payment mode, date | Message correct |

---

## 23. Backup & Restore

### 23.1 — Local Backup

| Step | Action                      | Expected Result                                      |
| ---- | --------------------------- | ---------------------------------------------------- |
| 1    | Go to Settings → Backup tab | Backup UI shown                                      |
| 2    | Click "Create Backup"       | Backup created, toast: "Backup created successfully" |
| 3    | Note the backup file path   | Path shown                                           |
| 4    | View backup list            | New backup at top with correct date/size             |
| 5    | Click "Open Folder"         | File explorer opens at backup directory              |

### 23.2 — Restore from Backup

| Step | Action                     | Expected Result                                                  |
| ---- | -------------------------- | ---------------------------------------------------------------- |
| 1    | Click "Restore"            | File picker opens for selecting backup file                      |
| 2    | Select a valid backup file | Confirmation dialog                                              |
| 3    | Confirm restore            | App restores DB from backup, creates safety backup of current DB |
| 4    | App reloads automatically  | Data matches the backup's state                                  |

### 23.3 — Backup Retention / Cleanup

| Step | Action                     | Expected Result                             |
| ---- | -------------------------- | ------------------------------------------- |
| 1    | Create multiple backups    | Several backup files exist                  |
| 2    | Run cleanup (if available) | Old backups beyond retention period deleted |

---

## 24. Cloud Backup (Google Drive)

### 24.1 — Setup Google Drive

| Step | Action                                         | Expected Result                           |
| ---- | ---------------------------------------------- | ----------------------------------------- |
| 1    | Go to Settings → Backup tab, Cloud section     | Cloud backup UI                           |
| 2    | Enter Google OAuth Client ID and Client Secret | Fields accept input                       |
| 3    | Save config                                    | Config saved                              |
| 4    | Click "Authenticate"                           | Browser opens Google OAuth consent screen |
| 5    | Complete Google auth                           | Status shows "Authenticated" / connected  |

### 24.2 — Cloud Backup

| Step | Action                         | Expected Result                       |
| ---- | ------------------------------ | ------------------------------------- |
| 1    | Click "Backup to Google Drive" | Upload starts                         |
| 2    | Wait for completion            | Success message shown                 |
| 3    | List cloud backups             | New backup visible with date and size |

### 24.3 — Cloud Restore

| Step | Action                          | Expected Result |
| ---- | ------------------------------- | --------------- |
| 1    | Select a cloud backup from list | Backup selected |
| 2    | Click "Download"                | File downloaded |
| 3    | Restore from downloaded file    | Data restored   |

### 24.4 — Disconnect

| Step | Action                         | Expected Result           |
| ---- | ------------------------------ | ------------------------- |
| 1    | Click "Disconnect"             | Google Drive disconnected |
| 2    | Status shows not authenticated | Connection removed        |

---

## 25. Edge Cases & Negative Tests

### 25.1 — Billing Edge Cases

| #   | Test                                                                          | Expected Result                                   |
| --- | ----------------------------------------------------------------------------- | ------------------------------------------------- |
| 1   | Create bill with all-zero-price items                                         | Blocked: "Bill total must be greater than zero"   |
| 2   | Create credit bill without customer ID                                        | Blocked: "Please select a registered customer"    |
| 3   | Create UPI bill without reference                                             | Blocked: "Please enter UPI transaction reference" |
| 4   | Add item with qty exceeding stock (no stock control in billing shows warning) | Warning toast but allows (or blocks per config)   |
| 5   | Apply 100% discount such that total=0                                         | Blocked                                           |
| 6   | Create bill with same product added twice                                     | Items should merge (quantity increased)           |

### 25.2 — Return Edge Cases

| #   | Test                                            | Expected Result                 |
| --- | ----------------------------------------------- | ------------------------------- |
| 1   | Return same item twice (already fully returned) | Blocked: max return qty shows 0 |
| 2   | Exchange with no new items selected             | Should show validation error    |
| 3   | Return a cancelled bill                         | Should be blocked               |

### 25.3 — Credit Edge Cases

| #   | Test                                             | Expected Result                                     |
| --- | ------------------------------------------------ | --------------------------------------------------- |
| 1   | Record payment exceeding credit balance          | Should be allowed (overpayment) or warned           |
| 2   | Credit bill exceeding credit limit               | Warning shown, but can proceed                      |
| 3   | Return on a credit bill → refund to credit       | Customer balance reduced correctly                  |
| 4   | Return on a **cash** bill → refund mode = credit | Customer balance goes negative (shop owes customer) |

### 25.4 — Product Edge Cases

| #   | Test                                    | Expected Result                               |
| --- | --------------------------------------- | --------------------------------------------- |
| 1   | Create product with duplicate barcode   | Error or handled gracefully                   |
| 2   | Import CSV with invalid data rows       | Errors reported per-row, valid rows processed |
| 3   | Bulk stock update with non-existent SKU | Error for that SKU, others updated            |

### 25.5 — Purchase Edge Cases

| #   | Test                                                            | Expected Result                                   |
| --- | --------------------------------------------------------------- | ------------------------------------------------- |
| 1   | Delete purchase → verify prices restored from previous purchase | Product prices revert to prior purchase prices    |
| 2   | Delete only purchase for a product                              | Prices restored from product's original values    |
| 3   | Delete purchase dialog uses styled dialog (not native confirm)  | Properly styled dialog with Cancel/Delete buttons |

### 25.6 — Data Integrity

| #   | Test                                        | Expected Result                                    |
| --- | ------------------------------------------- | -------------------------------------------------- |
| 1   | Close app during bill creation (force kill) | Data not corrupted, transaction rolled back        |
| 2   | Held bills survive app restart              | Held bills loaded from DB on relaunch              |
| 3   | Corrupt held bill JSON in DB                | Skipped gracefully, other held bills load normally |

### 25.7 — GST Calculations

| #   | Test                             | Expected Result                                                |
| --- | -------------------------------- | -------------------------------------------------------------- |
| 1   | Bill with 5% GST items           | CGST=2.5%, SGST=2.5% correct                                   |
| 2   | Bill with 12% GST items          | CGST=6%, SGST=6% correct                                       |
| 3   | Bill with 18% GST items          | CGST=9%, SGST=9% correct                                       |
| 4   | Bill-level discount + GST        | GST calculated AFTER discount applied (proportional reduction) |
| 5   | Mixed GST rate items in one bill | Each item's GST calculated at its own rate                     |

---

## Quick Reference — Keyboard Shortcuts

| Shortcut           | Action                               |
| ------------------ | ------------------------------------ |
| `F1`               | Dashboard                            |
| `F2`               | Billing (New Bill)                   |
| `F3`               | Products                             |
| `F4`               | Purchases / Stock-In                 |
| `F5`               | Customers                            |
| `F6`               | Hold current bill                    |
| `F7`               | Reports                              |
| `F8`               | Recall held bill                     |
| `F9`               | Clear cart                           |
| `F10`              | Settings                             |
| `F11`              | Pay & Print                          |
| `F12`              | Shortcuts Help                       |
| `Esc`              | Focus product search / Close overlay |
| `Alt+O`            | Add Other (custom) item              |
| `Alt+N`            | Quick add new customer               |
| `Alt+L` / `Ctrl+L` | Lock Screen                          |
| `Ctrl+D`           | Day summary popup                    |
| `Ctrl+K`           | Quick Bill Search                    |
| `Ctrl+N`           | New Bill (go to Billing)             |
| `Ctrl+R`           | Return / Exchange                    |
| `Ctrl+Shift+D`     | Go to Dashboard                      |
| `Ctrl+Shift+R`     | Go to Reports                        |

---

## Testing Checklist Summary

- [ ] PIN Gate & Lock Screen
- [ ] Sidebar & Keyboard Navigation
- [ ] Dashboard (all stat cards)
- [ ] Category CRUD + child protection
- [ ] Product CRUD + search/filter
- [ ] Stock adjustment + ledger
- [ ] Bulk stock update
- [ ] CSV import (with quoted fields)
- [ ] Supplier CRUD
- [ ] Purchase creation (manual + barcode)
- [ ] Purchase history + delete (styled dialog)
- [ ] Customer CRUD + search
- [ ] Cash billing (full flow)
- [ ] UPI billing (with reference)
- [ ] Card billing
- [ ] Credit billing (customer required)
- [ ] Custom item billing (Alt+O)
- [ ] Barcode scanning in billing
- [ ] Item/bill level discounts
- [ ] Hold & Recall bills (with customer ID)
- [ ] Bulk billing (stock warnings, per-customer modes)
- [ ] Full return + partial return
- [ ] Exchange
- [ ] Credit payment recording
- [ ] Credit ledger
- [ ] Quick Bill Search (Ctrl+K) + all actions
- [ ] Expenses CRUD + filters
- [ ] Daily/Weekly/Monthly/Yearly reports + PDF
- [ ] GST Report (fiscal quarters & FY)
- [ ] Profit & Loss report
- [ ] Bill History + filters
- [ ] Customer Analytics
- [ ] Credit Aging (FIFO)
- [ ] Data Export (all 5 types)
- [ ] Settings (shop info, printer, PIN)
- [ ] Thermal print + PDF receipt
- [ ] WhatsApp (bill, reminder, payment)
- [ ] Local backup + restore
- [ ] Cloud backup (Google Drive)
- [ ] Edge cases & negative tests
- [ ] GST calculation accuracy
