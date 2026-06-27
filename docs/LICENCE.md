# Sarva One Billing Licence Guide

Sarva One Billing uses a local-first licence system. The app keeps shop data in local SQLite, while
licence state controls which premium screens, actions, and usage limits are available for the active
plan.

## What The Licence Controls

The licence state includes:

| Field             | Meaning                                                                                 |
| ----------------- | --------------------------------------------------------------------------------------- |
| `status`          | `not_activated`, `trial`, `active`, `grace`, `expired`, `suspended`, or `grace_expired` |
| `plan`            | `starter`, `growth`, `pro`, or `custom`                                                 |
| `expiresAt`       | Plan expiry timestamp from the licence server                                           |
| `daysRemaining`   | Derived days until expiry                                                               |
| `gracePeriodDays` | Offline/expired grace window, defaulting to 7 days                                      |
| `features`        | Boolean feature flags and numeric limits for the plan                                   |

Activated working states are `trial`, `active`, and `grace`. Expired, suspended, grace-expired, and
not-activated states should block gated features.

## Plan-Gated Features

The renderer reads `FeatureFlags` from `src/shared/licenseTypes.ts`. Current feature flags are:

| Flag                  | Type    | Current UI usage                                        |
| --------------------- | ------- | ------------------------------------------------------- |
| `profitLossReport`    | boolean | Gates the Profit & Loss tab in Reports                  |
| `customerAnalytics`   | boolean | Gates the Customer Analytics page                       |
| `creditAging`         | boolean | Gates the Credit Aging page                             |
| `dataExport`          | boolean | Gates the Data Export page                              |
| `whatsappIntegration` | boolean | Hides WhatsApp reminder buttons when disabled           |
| `maxBillsPerMonth`    | number  | Warns/blocks limit-gated billing actions                |
| `maxProducts`         | number  | Warns/blocks Add Product when the plan limit is reached |
| `maxCustomers`        | number  | Available for customer count limits                     |
| `creditManagement`    | boolean | Available for credit-related gates                      |
| `expenseTracking`     | boolean | Available for expense gates                             |
| `estimates`           | boolean | Available for estimate gates                            |
| `returnExchange`      | boolean | Available for return/exchange gates                     |
| `barcodeLabels`       | boolean | Available for barcode label gates                       |
| `googleDriveBackup`   | boolean | Available for cloud backup gates                        |
| `auditTrail`          | boolean | Available for audit trail gates                         |
| `gstReports`          | boolean | Available for GST report gates                          |
| `multiUser`           | boolean | Available for user/team gates                           |
| `maxUsers`            | number  | Available for user limits                               |

Use `-1` for unlimited numeric limits.

## UI Components

Licence UI components live in `src/renderer/src/components/license`.

| Component          | Purpose                                                               |
| ------------------ | --------------------------------------------------------------------- |
| `FeatureGate`      | Renders children only when a boolean feature is enabled               |
| `UpgradePrompt`    | Helpful locked-feature card or compact locked badge                   |
| `LimitGate`        | Shows 80% usage warnings and disables actions once a limit is reached |
| `UpgradeDialog`    | Growth, Pro, and Custom plan comparison with WhatsApp CTA             |
| `LicenseStatusBar` | Shows trial, active, grace, expired, or suspended status text         |
| `ActivationScreen` | Full-screen licence key activation flow                               |

`FeatureGate` uses `useLicense().isFeatureEnabled(feature)`. Disabled features render a custom
fallback, render nothing when `silent` is true, or show `UpgradePrompt`.

`LimitGate` compares the current count with `features[limitKey]`. At 80% usage it shows a warning
banner. At the limit it shows an error banner and disables direct child actions.

## Activation Flow

The activation screen accepts keys in this format:

```text
SARVA-XXXX-XXXX-XXXX-XXXX
```

The desktop app must be pointed at the licence/admin server before activation can work. Create a
local `.env` file from `.env.example` and set:

```text
VITE_LICENSE_SERVER_URL=https://your-license-server.example.com
VITE_LICENSE_API_KEY=replace-with-license-api-key
```

Do not include the trailing `/api` path. The app adds `/api/license/activate`,
`/api/license/validate`, and `/api/license/heartbeat` automatically.

The input auto-formats as the user types. On submit, `window.license.activate(key)` calls the
validated `license:activate` IPC handler. Known activation error messages are:

| Code                | User message                                                            |
| ------------------- | ----------------------------------------------------------------------- |
| `MACHINE_MISMATCH`  | This license is already activated on another device. Contact Sarva One. |
| `LICENSE_NOT_FOUND` | Invalid license key. Please check and try again.                        |
| `LICENSE_EXPIRED`   | This license has expired. Contact Sarva One to renew.                   |
| `LICENSE_SUSPENDED` | This license has been suspended. Contact Sarva One.                     |

## Offline Behaviour

`LicenseManager` stores the last valid licence response in the local `license_cache` table. On app
startup it tries to validate with the licence server. If the server is unavailable, it falls back to
the cache.

The cache remains usable inside the configured grace period. If the last validation is older than
the grace period, the state becomes `grace_expired`.

The main process also sends a heartbeat every 6 hours for active online states. Heartbeat payloads
include app version and usage counts for bills, customers, and products.

## IPC And Preload API

The preload bridge exposes both `window.license` and `window.api.license`.

| Method                      | IPC channel                  | Description                                   |
| --------------------------- | ---------------------------- | --------------------------------------------- |
| `getState()`                | `license:get-state`          | Return current cached/validated licence state |
| `activate(key)`             | `license:activate`           | Activate a licence key for this machine       |
| `isFeatureEnabled(feature)` | `license:is-feature-enabled` | Check a feature flag in the main process      |
| `checkLimit(key, count)`    | `license:check-limit`        | Check a numeric plan limit                    |

Main-process handlers validate inputs with Zod schemas from `src/main/ipc/validation.ts`.

## Adding A New Gated Feature

1. Add the flag to `FeatureFlags` in `src/shared/licenseTypes.ts`.
2. Add validation support in `src/main/ipc/validation.ts`.
3. Add plan metadata in `src/renderer/src/components/license/planMetadata.ts`.
4. Wrap the renderer surface with `FeatureGate` or `LimitGate`.
5. Add focused tests for the enabled, disabled, and limit states.
6. Update this document and any affected feature docs.

## Upgrade Contact

Upgrade prompts open WhatsApp with:

```text
Hi, I want to upgrade my Sarva One plan to [Plan Name]
```

The placeholder contact number currently lives in `planMetadata.ts` as `+91XXXXXXXXXX` and should be
replaced with the production Sarva One WhatsApp number before release.
