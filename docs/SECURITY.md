# KPT Billing — Security & Authentication

> Detailed documentation of PIN-based authentication, user roles, lock screen, and access control.

Developed by **[Sultan Kabadi](https://sultanbk.com)**

---

## Overview

KPT Billing uses a PIN-based authentication system designed for fast point-of-sale login without keyboards. The system supports multiple user roles with different access levels.

---

## Authentication System

### PIN-Based Login

| Feature | Description |
|---------|-------------|
| **PIN Length** | 4–8 digits |
| **Input Method** | On-screen number pad + keyboard |
| **Hash Algorithm** | Stored securely (not plain text) |
| **Auto-submit** | Automatically submits after correct length |
| **Visual Feedback** | Dot indicators for entered digits |

### Login Flow

```
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│   Login Screen   │────▶│  Verify PIN      │────▶│   Dashboard      │
│   Enter PIN      │     │  Check Role      │     │   (Home Page)    │
└──────────────────┘     └──────────────────┘     └──────────────────┘
        │                        │
        │  Invalid PIN           │  Locked out
        │◀───────────────────────│
```

### Default Credentials

| User | Role | PIN |
|------|------|-----|
| Puneet | Owner | `1234` |

> ⚠️ **Change the default PIN immediately after first login!**

---

## User Roles

### Role Hierarchy

| Role | Level | Description |
|------|-------|-------------|
| **Owner** | Highest | Full access to all features |
| **Manager** | Mid | Most features except sensitive settings |
| **Cashier** | Basic | Billing and basic customer operations |

### Access Control Matrix

| Feature | Owner | Manager | Cashier |
|---------|:-----:|:-------:|:-------:|
| Billing / POS | ✅ | ✅ | ✅ |
| View Products | ✅ | ✅ | ✅ |
| Add/Edit Products | ✅ | ✅ | ❌ |
| Delete Products | ✅ | ❌ | ❌ |
| View Customers | ✅ | ✅ | ✅ |
| Manage Customers | ✅ | ✅ | ❌ |
| Record Credit Payments | ✅ | ✅ | ❌ |
| View Reports | ✅ | ✅ | ❌ |
| Purchases | ✅ | ✅ | ❌ |
| Suppliers | ✅ | ✅ | ❌ |
| Expenses | ✅ | ✅ | ❌ |
| Settings | ✅ | ❌ | ❌ |
| User Management | ✅ | ❌ | ❌ |
| Backup & Restore | ✅ | ❌ | ❌ |
| Delete Bills | ✅ | ❌ | ❌ |

---

## PinGate Component

The `PinGate` component wraps the entire application and enforces authentication:

```
App
 └── PinGate
      ├── (Not authenticated) → LoginScreen
      └── (Authenticated) → AppLayout
                               ├── Sidebar
                               └── Page Content
```

### Behavior

1. On app launch, checks if a user session exists
2. If no session → shows full-screen login form
3. On successful PIN entry → stores user in state, renders main app
4. On lock → clears active view, shows login again
5. Session persists until manual lock or app close

---

## Lock Screen

### Triggering Lock

| Method | Description |
|--------|-------------|
| **Lock Button** | Click the lock icon in the sidebar |
| **Ctrl+L** | Global keyboard shortcut |
| **Alt+L** | Alternative keyboard shortcut |
| **Inactivity** | (If configured) Auto-lock after timeout |

### Lock Button UI

The sidebar lock button features:
- Gradient background (indigo to purple)
- Lock icon with user badge
- Current user's name display
- "Alt+L" shortcut hint text
- Hover animation

### Lock Behavior

1. Current user session is cleared from state
2. PinGate detects no session → renders LoginScreen
3. All in-memory billing state is preserved (held bills remain)
4. User must re-enter PIN to continue

---

## Security Settings

Located in **Settings → Security** tab:

```
┌──────────────────────────────────────────────────────┐
│  🔒 Security Settings                                │
│  ┌────────────────────────────────────────────────┐  │
│  │  Change PIN                                    │  │
│  │  Current PIN: [····]                           │  │
│  │  New PIN:     [····]                           │  │
│  │  Confirm PIN: [····]                           │  │
│  │                          [Update PIN]          │  │
│  ├────────────────────────────────────────────────┤  │
│  │  User Management (Owner Only)                  │  │
│  │  ┌────┬──────────┬─────────┬────────────────┐  │  │
│  │  │ #  │ Name     │ Role    │ Actions        │  │  │
│  │  ├────┼──────────┼─────────┼────────────────┤  │  │
│  │  │ 1  │ Puneet   │ Owner   │ [Edit] [Del]   │  │  │
│  │  │ 2  │ Staff    │ Cashier │ [Edit] [Del]   │  │  │
│  │  └────┴──────────┴─────────┴────────────────┘  │  │
│  │                          [Add User]            │  │
│  └────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────┘
```

### PIN Change

1. Enter current PIN for verification
2. Enter new PIN (4–8 digits)
3. Confirm new PIN
4. Click Update — PIN is hashed and stored

### User Management

Owner can:
- Add new users with name, role, and PIN
- Edit existing user details and roles
- Delete users (cannot delete last owner)
- Reset user PINs

---

## Audit Trail

All significant actions are logged to the `audit_log` table:

| Field | Description |
|-------|-------------|
| `user_id` | Who performed the action |
| `action` | What was done (e.g., `bill_created`, `product_updated`) |
| `entity_type` | Entity type (bill, product, customer, etc.) |
| `entity_id` | ID of the affected entity |
| `details` | JSON with additional context |
| `created_at` | Timestamp of the action |

### Tracked Actions

| Action | Description |
|--------|-------------|
| `login` | User logged in |
| `logout` | User locked screen / logged out |
| `bill_created` | New bill created |
| `bill_deleted` | Bill deleted |
| `product_created` | Product added |
| `product_updated` | Product details changed |
| `product_deleted` | Product removed |
| `customer_created` | Customer added |
| `credit_payment` | Credit payment recorded |
| `settings_updated` | Settings changed |
| `backup_created` | Backup created |
| `backup_restored` | Backup restored |

---

## Protected vs. Unprotected Routes

| Route | Protection |
|-------|-----------|
| `/` | Dashboard — requires login |
| `/billing` | POS — requires login |
| `/products` | Products — requires login |
| `/customers` | Customers — requires login |
| `/reports` | Reports — requires login + role check |
| `/settings` | Settings — requires login + owner role |
| `/purchases` | Purchases — requires login + role check |
| `/suppliers` | Suppliers — requires login + role check |
| `/expenses` | Expenses — requires login + role check |
| `/estimates` | Estimates — requires login |

---

## Security Best Practices

1. **Change default PIN** immediately after installation
2. **Use unique PINs** for each user
3. **Assign minimum role** needed for each staff member
4. **Lock when away** — Use Alt+L before leaving the terminal
5. **Regular PIN rotation** — Change PINs periodically
6. **Enable auto-backup** — Protects against data loss
7. **Review audit logs** — Monitor for unusual activity

---

*Developed by [Sultan Kabadi](https://sultanbk.com) — KPT Billing v1.0.0*
