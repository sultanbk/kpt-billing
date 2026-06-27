# KPT Billing — Customer Management & Credit System

> Detailed documentation of customer management, credit lifecycle, and WhatsApp integration.

Developed by **[Sultan Kabadi](https://sultanbk.com)**

---

## Overview

The Customers module provides complete customer lifecycle management including a full credit system with aging analysis, payment recording, and WhatsApp messaging.

---

## Customer Fields

| Field             | Type     | Required | Description                               |
| ----------------- | -------- | -------- | ----------------------------------------- |
| `name`            | string   | Yes      | Customer full name                        |
| `phone`           | string   | Unique   | Phone number (unique identifier)          |
| `email`           | string   | No       | Email address                             |
| `address`         | string   | No       | Full address                              |
| `city`            | string   | No       | City                                      |
| `gstin`           | string   | No       | GST identification number                 |
| `customer_type`   | enum     | No       | `regular`, `wholesale`, or `walkin`       |
| `credit_limit`    | decimal  | No       | Maximum allowed credit (default: 0)       |
| `opening_balance` | decimal  | No       | Initial credit balance                    |
| `current_balance` | decimal  | Auto     | Current outstanding amount (auto-managed) |
| `created_at`      | datetime | Auto     | Registration timestamp                    |
| `updated_at`      | datetime | Auto     | Last update timestamp                     |

---

## Customer Operations

| Operation           | Description                            |
| ------------------- | -------------------------------------- |
| **Create**          | Add new customer, phone must be unique |
| **Update**          | Edit customer details                  |
| **Delete**          | Remove customer (if no linked bills)   |
| **Search**          | Real-time search by name or phone      |
| **Get All**         | Paginated customer list                |
| **Get With Credit** | Customers with outstanding balances    |
| **Bill History**    | View all bills for a customer          |
| **Credit Ledger**   | Chronological credit/payment log       |

---

## Customer Types

| Type          | Description                           |
| ------------- | ------------------------------------- |
| **Regular**   | Standard retail customer              |
| **Wholesale** | Bulk buyer, may get wholesale pricing |
| **Walk-in**   | One-time customer (no record kept)    |

---

## Quick Add Customer (from Billing Page)

A streamlined inline form accessible during billing:

1. Click **New** button in the Customer section, or press **Alt+N**
2. Enter customer name (required) and phone (optional)
3. Click **Add & Select** or press Enter
4. Customer is created and automatically linked to the current bill
5. Press Escape to dismiss without creating

---

## Credit System

### How Credits Work

1. **Credit Issuance** — When a bill is paid via "Credit" mode, the bill amount is added to the customer's `current_balance`
2. **Credit Limit Check** — The system tracks credit utilization against the set `credit_limit`
3. **Payment Recording** — Payments received reduce the `current_balance`
4. **Balance Tracking** — Every transaction records balance_before and balance_after

### Credit Payment Recording

| Field            | Type    | Description                                |
| ---------------- | ------- | ------------------------------------------ |
| `customer_id`    | integer | Customer reference                         |
| `date`           | string  | Payment date                               |
| `amount`         | decimal | Amount received                            |
| `payment_mode`   | string  | cash / upi / card / cheque / bank_transfer |
| `reference_no`   | string  | Payment reference (cheque no., UTR, etc.)  |
| `notes`          | string  | Optional notes                             |
| `balance_before` | decimal | Balance before this payment                |
| `balance_after`  | decimal | Balance after this payment                 |
| `bill_id`        | integer | Optional: linked to a specific bill        |

### Credit Ledger

A chronological view of all credit transactions for a customer:

```
Date        | Type    | Reference     | Debit    | Credit   | Balance
─────────────────────────────────────────────────────────────────────
2026-01-15  | Sale    | KPT/25-26/42  | ₹2,500   |          | ₹2,500
2026-01-20  | Payment | Cash          |          | ₹1,000   | ₹1,500
2026-02-01  | Sale    | KPT/25-26/78  | ₹3,200   |          | ₹4,700
2026-02-10  | Payment | UPI: ABC123   |          | ₹2,000   | ₹2,700
```

### Credit Aging Buckets

| Bucket   | Days Overdue | Risk Level |
| -------- | ------------ | ---------- |
| Current  | 0–30 days    | Low        |
| Aging    | 31–60 days   | Medium     |
| Overdue  | 61–90 days   | High       |
| Critical | 90+ days     | Critical   |

### Credit Risk Scoring

| Utilization % | Risk Level | Color  |
| ------------- | ---------- | ------ |
| 0%            | None       | Green  |
| 1–50%         | Low        | Blue   |
| 51–80%        | Medium     | Orange |
| > 80%         | High       | Red    |

Formula: `Utilization = (current_balance / credit_limit) × 100`

---

## Customer Analytics

### Top Customers by Revenue

- Ranked by total purchase amount
- Shows: total bills, total revenue, average bill value, last purchase date
- Date range filterable

### Purchase Frequency Analysis

- Tracks visit frequency per customer
- Calculates average days between visits
- Categorizes: Regular, Occasional, Rare

### Credit Risk Assessment

- All customers with credit limits
- Current utilization percentage
- Risk level categorization
- Oldest unpaid bill age

---

## WhatsApp Integration

Three message templates available:

### 1. Bill Receipt

Sends a formatted bill receipt to the customer's WhatsApp:

```
🧾 *KRISHNAPRIYA TEXTILES*
Bill: KPT/25-26/0147
Date: 27-Feb-2026

Items:
1. Cotton Saree × 2 = ₹3,400
2. Blouse Piece × 1 = ₹450

Subtotal: ₹3,850
Discount: -₹200
Tax: ₹365
*Total: ₹4,015*

Payment: Cash
Thank you for shopping! 🙏
```

### 2. Credit Reminder

Sends a payment reminder for overdue credits:

```
🔔 *Payment Reminder*

Dear [Customer Name],

Your outstanding balance at KRISHNAPRIYA TEXTILES is *₹4,700*.

Kindly clear the dues at your earliest convenience.

For queries: [Shop Phone]
Thank you! 🙏
```

### 3. Payment Confirmation

Confirms a credit payment received:

```
✅ *Payment Received*

Dear [Customer Name],

We received your payment of *₹2,000*.
Remaining balance: *₹2,700*

Thank you!
KRISHNAPRIYA TEXTILES
```

### How It Works

- Opens `wa.me/{phone}?text={encoded_message}` URL
- Phone numbers prefixed with `+91` (India)
- Message is URL-encoded and pre-filled in WhatsApp
- Available from: Customer detail view, Credit Aging report
- WhatsApp reminder buttons are wrapped in `FeatureGate feature="whatsappIntegration"` and are hidden when the active plan does not include WhatsApp integration

---

## Customers Page Features

### Customer List

- Paginated table with search
- Shows: name, phone, city, type, credit balance
- Color-coded balance (red for outstanding)

### Customer Detail View

- Full customer information
- Credit summary: limit, balance, utilization
- Bill history table
- Credit ledger
- Record payment button
- WhatsApp action buttons

### Credit Filters

- All customers
- With outstanding balance
- High credit utilization

---

## Dashboard Integration

Customer-related dashboard widgets:

- **Pending Credits Card** — Total outstanding with customer count
- **Today's Collections Badge** — Amount collected today
- **Credit Sales Today Section** — Credit issued vs. collected comparison

---

_Developed by [Sultan Kabadi](https://sultanbk.com) — KPT Billing v1.0.0_
