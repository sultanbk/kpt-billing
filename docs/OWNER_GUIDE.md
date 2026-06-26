# KPT Billing Owner Guide

This guide is written for the shop owner or manager. It explains what each part of KPT Billing does, how daily work should flow, and what to check regularly. No technical knowledge is needed.

## 1. What This Software Does

KPT Billing helps you manage the main work of a textile shop:

- Create sales bills
- Print receipts and invoices
- Track product stock
- Add new products and categories
- Record purchases from suppliers
- Manage customer credit
- Record credit payments
- Check daily, monthly, GST, profit, and stock reports
- Export data to Excel
- Keep backups of business data

The Billing page is open for daily cashier work. Other pages are protected by PIN because they contain business-sensitive information such as reports, stock, customers, and settings.

## 2. Daily Opening Checklist

Before starting sales for the day:

1. Open KPT Billing.
2. Check that the receipt printer is connected and switched on.
3. Go to Billing.
4. Search or scan one test product if needed.
5. Make sure the product list appears correctly.
6. If you use barcode scanning, scan one product and confirm it adds to the cart.
7. If you use auto-printing, create or reprint a small test bill when required.

If the printer does not work, sales can still be saved. You can print or generate PDF later from bill history.

## 3. Login, PIN, and Protected Pages

Billing is available without PIN so the cashier can work quickly.

Protected pages require the owner PIN:

- Dashboard
- Products
- Purchases
- Customers
- Reports
- Analytics
- Credit Aging
- Data Export
- Settings

Use the PIN screen when the app asks for access. After finishing owner work, use Lock Screen so staff cannot accidentally open reports or settings.

Default owner PIN may be `1234` after first installation. Change it from Settings as soon as possible.

## 4. Billing Flow

Use Billing for normal sales.

Basic billing steps:

1. Search product by name, SKU, or barcode.
2. Select the product, or scan the barcode.
3. Product is added to the cart.
4. Change quantity if needed.
5. Change price or discount if allowed.
6. Add customer if needed.
7. Click Pay.
8. Choose payment mode.
9. Complete the bill.
10. Print or share the bill if required.

### Product Search

You can search by:

- Product name
- Short name
- SKU
- Barcode

Barcode scanner input works like fast keyboard typing. Keep the cursor in the search box or on the billing screen.

### Cart Items

Each item in the cart contains:

- Product name
- Price
- Quantity
- Discount
- GST
- Line total

If the same product is added again, quantity increases instead of creating a duplicate line.

### Custom or Other Item

Use Other Item when:

- Product is not yet added to the system
- One-time sale item is needed
- Manual billing is required

Custom items do not reduce product stock because they are not linked to inventory.

### Discounts

There are two types of discounts:

- Item discount: applied only to one product line
- Bill discount: applied to the full bill

For GST bills, bill-level discount reduces taxable value before GST. This keeps reports and saved bills consistent.

### Payment Modes

Available payment modes:

- Cash
- UPI
- Card
- Credit

For credit sale, select or create a registered customer. Credit sales increase that customer's outstanding balance.

### Holding a Bill

Use Hold when a customer pauses shopping or comes back later.

Hold flow:

1. Add items to cart.
2. Click Hold.
3. Cart becomes empty.
4. Later click Recall.
5. Select the held bill.
6. Continue billing.

Held bills are useful during busy shop hours.

## 5. Returns, Exchanges, and Cancelled Bills

Returns and exchanges are handled from bill history or return screens.

Important behavior:

- Returned product stock is added back.
- Credit balance is adjusted if the original bill was credit.
- Full return/cancel restores only quantities that were not already returned.
- Partial returns keep a record of returned quantity so the same item cannot be returned twice.

Use Cancel only when the bill should not count as a valid sale. Use Return when the customer actually returns goods.

## 6. Products and Inventory

Use Products to manage product master data and stock.

Each product can have:

- Product name
- Category
- HSN code
- Cost price
- MRP
- Selling price
- GST rate
- Opening stock
- Low stock alert
- Barcode
- Description

### Adding a New Product

Steps:

1. Go to Products.
2. Click Add Product.
3. Enter product name.
4. Select or create category.
5. Enter HSN code.
6. Enter cost price, MRP, selling price, GST.
7. Enter opening stock.
8. Enter barcode if available.
9. Save.

After saving, the product becomes available in Billing.

### Adding a New Category

Inside Add Product or Edit Product:

1. Click New beside Category.
2. Type the category name.
3. Click Add.
4. The new category is automatically selected.
5. Save the product.

Examples:

- Saree
- Blouse Piece
- Dress Material
- Fabric
- Readymade
- Accessories

### Editing Product Price

When product price changes, edit the product. The system keeps price history so you can later see when price changed.

### Stock Adjustment

Use Adjust Stock when:

- Stock count is corrected manually
- Damaged item is removed
- Return from customer should be adjusted manually
- Extra stock is found

Prefer Purchases for normal supplier stock-in, because Purchases also saves supplier and invoice details.

### Bulk Stock Update

Use Bulk Stock Update for stock-taking or inventory correction using CSV. This updates product stock by matching SKU or barcode.

## 7. Purchases and Stock-In

Use Purchases when new stock comes from suppliers.

Purchase flow:

1. Go to Purchases.
2. Click New Purchase.
3. Select supplier or create new supplier.
4. Enter purchase city and invoice details.
5. Search or scan products.
6. Enter quantity, purchase rate, MRP, selling rate, GST.
7. Save purchase.

After saving:

- Product stock increases.
- Product purchase price is updated.
- Selling price can be updated from purchase entry.
- Purchase history is saved.
- Stock ledger records the stock-in.

### New Product During Purchase

If a product does not exist, add it manually in purchase entry. After saving, it becomes a product in inventory.

### Deleting a Purchase

Deleting a purchase reverses the stock added by that purchase. Use this only if the purchase entry was wrong.

## 8. Customers

Use Customers to manage customer records and credit.

Customer details can include:

- Name
- Phone
- Address
- Customer type
- Credit limit
- Current balance

Customers are important for:

- Credit sales
- Bill history
- WhatsApp messages
- Credit reminders
- Customer analytics

### Walk-in Customer

For normal cash sales, you can bill as Walk-in Customer. No customer record is required.

### Registered Customer

Create a customer when:

- Customer buys on credit
- Customer wants bill history
- Customer should receive WhatsApp bills or reminders
- You want to track customer revenue

## 9. Credit Management

Credit means the customer owes money to the shop.

Credit is created when:

- A bill is paid by Credit mode
- A mixed payment includes a credit amount, if enabled

Credit is reduced when:

- Customer makes a payment
- Credit bill is returned or cancelled
- Store credit/refund adjustment is applied

### Recording Credit Payment

Steps:

1. Go to Customers or Credit section.
2. Open customer with outstanding balance.
3. Record payment.
4. Choose mode: cash, UPI, card, cheque, or bank transfer.
5. Save.

The customer's balance reduces immediately.

### Credit Aging

Credit Aging shows how old pending balances are:

- Current
- 31 to 60 days
- 61 to 90 days
- 90+ days

Use this page regularly to follow up with customers.

## 10. Dashboard

Dashboard gives quick business status.

It may show:

- Today's sales
- Total bills
- Low stock alerts
- Out-of-stock items
- Pending credit
- Recent activity

Use Dashboard at the start and end of the day to understand shop position quickly.

## 11. Reports

Reports help you check business performance.

Common reports:

- Daily report
- Weekly report
- Monthly report
- Yearly report
- GST report
- Profit and loss
- Bill history

### Daily Report

Use this at closing time.

Check:

- Total sales
- Cash received
- UPI received
- Card received
- Credit sales
- Total bills
- Expenses if recorded

### GST Report

Use GST report for tax review. It shows GST-related sales breakup. Always verify with your accountant before filing.

### Profit and Loss

Profit and loss depends on accurate product cost price, purchase entries, sales, and expenses. If cost price is wrong, profit report will also be wrong.

## 12. Customer Analytics

Customer Analytics helps understand customer behavior.

It may show:

- Top customers by revenue
- Frequent customers
- Last purchase date
- Credit risk

Use this to identify important customers and follow up on inactive or high-credit customers.

## 13. Data Export

Data Export creates Excel files for business records.

Use it for:

- Accountant sharing
- Backup copies
- Manual checking
- Stock review
- Customer list export

Export options may include:

- Bills
- Stock
- Customers
- Full data

Save exported files in a clear folder, for example:

`KPT Reports / 2026 / May`

## 14. Settings

Settings controls shop and system behavior.

Important settings:

- Shop name
- Address
- GSTIN
- Phone number
- Bill prefix
- Financial year
- Receipt printer
- Label printer
- Backup location
- PIN/security
- Shortcuts

Do not change settings during busy billing hours unless needed.

## 15. Printers and Receipts

The app supports receipt printing and PDF receipts.

If receipt does not print:

1. Check printer power.
2. Check USB connection.
3. Check paper roll.
4. Go to Settings and confirm selected printer.
5. Try test print.
6. If still failing, save the bill and print later.

Never recreate the same bill just because printing failed. Use reprint or PDF instead.

## 16. Backups

Backup is very important because all business data is valuable.

Recommended habit:

- Take backup daily at closing.
- Keep one local backup.
- Keep one external or cloud backup.
- Before major updates, take backup.
- Before restoring old data, take backup of current data first.

If the computer fails and there is no backup, sales, stock, customers, and credit records may be lost.

## 17. WhatsApp Sharing

WhatsApp features help send:

- Bill receipt
- Credit reminder
- Payment confirmation

Before sending, check customer phone number. If the number is wrong, the message may go to the wrong person.

## 18. Shortcuts

Useful shortcuts:

| Shortcut | Use                |
| -------- | ------------------ |
| F1       | Dashboard          |
| F2       | Billing            |
| F3       | Products           |
| F4       | Purchases          |
| F5       | Customers          |
| F6       | Hold bill          |
| F7       | Reports            |
| F8       | Recall held bill   |
| F9       | Clear cart         |
| F10      | Settings           |
| F11      | Payment            |
| Ctrl+K   | Search bills       |
| Ctrl+R   | Return or exchange |
| Ctrl+D   | Today's summary    |
| Alt+L    | Lock screen        |

Shortcuts help during rush hours.

## 19. End-of-Day Closing Checklist

At closing time:

1. Open Today's Summary or Daily Report.
2. Count physical cash.
3. Match cash with cash sales.
4. Check UPI and card totals with bank/payment app.
5. Review credit sales.
6. Record any expenses.
7. Check pending held bills.
8. Take backup.
9. Lock or close the app.

If totals do not match, check bill history before making manual adjustments.

## 20. Stock Accuracy Rules

To keep stock correct:

- Always use Purchases for supplier stock-in.
- Always bill actual products, not custom items, when stock should reduce.
- Use Stock Adjustment only for corrections.
- Do not delete purchases unless the entry is wrong.
- Handle returns through return flow, not manual stock adjustment.
- Run stock checks regularly.

## 21. Credit Accuracy Rules

To keep credit correct:

- Register customer before credit sale.
- Do not use Walk-in Customer for credit.
- Record every payment immediately.
- Check Credit Aging weekly.
- Avoid deleting credit payment records unless the entry was wrong.
- For returned credit bills, use return flow so balance adjusts correctly.

## 22. Common Mistakes to Avoid

- Creating duplicate products for the same item
- Billing stock products as Other Item
- Recreating bills when printer fails
- Forgetting to record supplier purchases
- Giving credit without selecting a registered customer
- Editing product stock instead of entering purchase
- Not taking daily backup
- Sharing reports without checking date range

## 23. Simple Troubleshooting

### Product not found in billing

Check Products page:

- Is product active?
- Is name/SKU/barcode correct?
- Was product saved?
- Was barcode entered correctly?

### Stock is wrong

Check:

- Purchase entries
- Sales bills
- Returns
- Stock adjustments
- Bulk stock update history

### Customer balance is wrong

Check:

- Credit bills
- Credit payments
- Returned or cancelled bills
- Duplicate customer records

### Report amount looks wrong

Check:

- Date range
- Cancelled or returned bills
- Payment modes
- Expenses
- Product cost prices

### App feels stuck

Wait a few seconds. If still stuck:

1. Close the app.
2. Open it again.
3. If problem continues, take note of what screen/action caused it.
4. Contact support.

## 24. Owner Responsibilities

The owner should regularly:

- Review daily sales
- Review credit balances
- Check low stock
- Confirm backups
- Keep PIN private
- Review reports before sharing with accountant
- Check printer and barcode scanner setup
- Ensure staff use correct billing flow

## 25. Recommended Weekly Routine

Once a week:

1. Review Dashboard.
2. Check Credit Aging.
3. Follow up high-value credit customers.
4. Check low stock products.
5. Review top-selling products.
6. Export weekly data if needed.
7. Confirm backup files exist.

## 26. When to Contact Support

Contact support when:

- App does not open
- Database restore is needed
- Bills are not saving
- Printer setup is not working after basic checks
- Reports show unexpected totals after checking date range
- Data was accidentally deleted
- Backup or cloud sync is failing

Before contacting support, note:

- What you were doing
- Which page you were on
- Any error message shown
- Approximate time of issue
- Whether app was restarted

## 27. Golden Rule

For accurate business records:

Sales should be entered through Billing, stock-in through Purchases, customer dues through Credit, and corrections through the proper return or adjustment flow.

If the correct flow is used, reports, stock, and customer balances will stay reliable.
