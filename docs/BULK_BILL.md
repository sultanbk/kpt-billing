# Bulk Bill Feature

Generate the same bill for multiple customers at once — useful for distributing identical orders (e.g., monthly subscriptions, bulk product deliveries, event billing).

---

## How to Access

1. Add items to the cart on the **Billing Page**
2. Apply any discount if needed
3. Click the **"Bulk Bill"** button in the action bar (between Return/Exchange and Recall)

> The button is disabled when the cart is empty.

---

## 4-Step Wizard Flow

### Step 1 — Select Customers

| Feature                       | Description                                                                                                                                         |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Search**                    | Type a customer name or phone number to search. Results appear in a dropdown list.                                                                  |
| **Keyboard Navigation**       | Use `↑` / `↓` arrow keys to navigate results, `Enter` to select/deselect.                                                                           |
| **Toggle Selection**          | Click a customer row (or press Enter) to add/remove them from the selection.                                                                        |
| **Per-Customer Payment Mode** | Each selected customer shows a 4-icon toggle (Cash / UPI / Card / Credit). Click an icon to override that customer's payment mode.                  |
| **Default Payment Mode**      | A grid of 4 buttons at the bottom. Changing the default resets all per-customer overrides.                                                          |
| **Add New Customer**          | Expand the "Add New Customer" section to create a customer inline (Name required, Phone optional). The new customer is auto-selected upon creation. |
| **Summary Card**              | Shows per-bill total, customer count, and combined total.                                                                                           |
| **Clear All**                 | Removes all selected customers at once.                                                                                                             |

Click **"Review (N bills)"** to proceed.

### Step 2 — Review & Confirm

Displays a full summary before generation:

- **Items list** — Every item in the bill with quantity and line total
- **Grand total** — Per-bill amount
- **Default payment mode** badge
- **Customer list** — Numbered, each showing their payment mode badge

Click **"Generate N Bills"** to start, or **"Back"** to edit selections.

### Step 3 — Processing

Bills are generated **sequentially** (one at a time):

- Each row shows real-time status: `Waiting` → `Creating (spinner)` → `Done ✓ (bill number)` or `Failed ✗`
- A progress bar at the bottom tracks overall completion
- The dialog **cannot be closed** during processing to prevent partial generation
- Each bill is created without triggering any automatic receipt download

If one bill fails, the remaining bills continue unaffected.

### Step 4 — Done

Shows the final results:

| Element             | Description                                                                                    |
| ------------------- | ---------------------------------------------------------------------------------------------- |
| **Results list**    | Each customer with status — green for success (with bill number), red for failure (with error) |
| **Print button**    | Per-bill print icon next to each successful bill                                               |
| **WhatsApp button** | Per-bill WhatsApp icon (only shown if the customer has a valid phone number)                   |
| **Print All**       | Prints all successful bills sequentially with a 500ms delay between each                       |
| **Summary card**    | Total amount billed and count of successful bills                                              |
| **Done button**     | Closes the dialog and clears the cart                                                          |

---

## Per-Customer Payment Mode

Each customer can have an independent payment mode:

- **Cash** — Full amount in cash
- **UPI** — Full amount via UPI
- **Card** — Full amount via card
- **Credit** — Full amount as store credit

The **default payment mode** (set via the 4-button grid) applies to all customers who don't have an individual override. Changing the default clears all overrides.

### How It Works in Bill Data

The payment object is constructed per customer:

```
payment: {
  mode: 'cash' | 'upi' | 'card' | 'credit',
  amount: grandTotal,
  received: grandTotal,
  change: 0,
  cashAmount:   (mode === 'cash')   ? grandTotal : 0,
  upiAmount:    (mode === 'upi')    ? grandTotal : 0,
  cardAmount:   (mode === 'card')   ? grandTotal : 0,
  creditAmount: (mode === 'credit') ? grandTotal : 0,
}
```

---

## Inline Customer Creation

If a customer doesn't exist in the database:

1. Click **"Add New Customer"** to expand the form
2. Enter **Name** (required) and **Phone** (optional, 10-digit)
3. Press **Enter** or click **Add**
4. The customer is created in the database and auto-selected in the list

---

## Auto-Print Prevention

Auto-print/auto-download of receipts is **completely disabled** for all bills (both single and bulk). Receipts are never automatically saved to the `/receipts` folder on bill creation. The owner can manually print or download any bill when needed:

- **Single bill**: Use the Print button after billing, or from the bill history
- **Bulk bills**: Use the per-bill Print button or **Print All** from the results screen

---

## WhatsApp Sharing

On the results screen, each successful bill with a valid customer phone shows a WhatsApp icon:

- Clicking it opens WhatsApp with the bill receipt for that customer
- Customers with placeholder phones (starting with `__NOPHONE__`) don't show the WhatsApp button

---

## Error Handling

| Scenario                             | Behavior                                                    |
| ------------------------------------ | ----------------------------------------------------------- |
| Bill creation fails for one customer | Marked as "Failed" with error message; other bills continue |
| All bills fail                       | Summary shows 0 billed, Print All hidden                    |
| Network/database error during search | Search results cleared silently                             |
| Customer creation fails              | Toast error message shown                                   |
| WhatsApp send fails                  | Toast error message shown                                   |

---

## Technical Details

### Files Involved

| File                                                     | Role                                        |
| -------------------------------------------------------- | ------------------------------------------- |
| `src/renderer/src/components/billing/BulkBillDialog.tsx` | Main dialog component (4-step wizard UI)    |
| `src/renderer/src/pages/BillingPage.tsx`                 | Hosts the dialog, passes cart data as props |
| `src/shared/types/index.ts`                              | `BillCreateData` type definition            |
| `src/main/ipc/validation.ts`                             | Zod schema for `billCreateSchema`           |
| `src/main/ipc/billing.ipc.ts`                            | IPC handler (auto-print removed)            |

### Props Interface

```typescript
interface BulkBillDialogProps {
  open: boolean
  onClose: () => void
  items: BillItem[]
  discount: number
  discountType: 'percentage' | 'amount'
  grandTotal: number
  onAllDone: () => void
}
```

### State Management

All state is local to the component (no external store). State is fully reset every time the dialog opens via a `useEffect` on the `open` prop.

### APIs Used

| API Call                                             | Purpose                        |
| ---------------------------------------------------- | ------------------------------ |
| `window.api.customers.search(query)`                 | Search customers by name/phone |
| `window.api.customers.create(data)`                  | Create new customer inline     |
| `window.api.billing.createBill(data)`                | Create a bill                  |
| `window.api.billing.printReceipt(billId)`            | Print a single bill receipt    |
| `window.api.whatsapp.sendBillReceipt(billId, phone)` | Share bill via WhatsApp        |
