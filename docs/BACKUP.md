# KPT Billing — Backup & Restore

> Detailed documentation of local backup, cloud backup (Google Drive), auto-backup, and restore procedures.

Developed by **[Sultan Kabadi](https://sultanbk.com)**

---

## Overview

KPT Billing supports two backup strategies:

| Strategy | Storage | Automation | Internet Required |
|----------|---------|------------|-------------------|
| **Local Backup** | User-selected folder | Manual + Auto | No |
| **Cloud Backup** | Google Drive | Manual | Yes |

All backups are full SQL dumps of the SQLite database, ensuring data integrity and easy restoration.

---

## Local Backup

### How It Works

1. The system executes a SQL dump of the entire database
2. The dump is saved to a `.sql` file in the configured backup directory
3. File is named with a timestamp: `kpt_backup_YYYY-MM-DD_HH-mm-ss.sql`

### Configuration

| Setting | Description | Default |
|---------|-------------|---------|
| `backup_path` | Directory to store backups | Not set (user must configure) |
| `auto_backup` | Enable automatic backup on exit | `true` |
| `backup_retention_days` | Days to keep old backups | `30` |

### Manual Backup

1. Navigate to **Settings → Backup** tab
2. Click **Backup Now**
3. Choose a directory (if not previously configured)
4. Backup file is created immediately
5. Success notification with file path

### Auto Backup

When enabled:
- Triggers automatically when the application is closed
- Uses the configured `backup_path`
- Silent operation — no user interaction required
- Old backups beyond retention period are automatically cleaned up

### Backup Retention

- Backups older than `backup_retention_days` are automatically deleted
- Retention check runs during each backup operation
- Default retention period: 30 days

---

## Cloud Backup (Google Drive)

### OAuth2 Setup

Cloud backup uses Google Drive API with OAuth2 authentication.

#### Connection Flow

```
┌───────────────────┐     ┌────────────────────┐     ┌──────────────┐
│  Click "Connect   │────▶│  Google OAuth2      │────▶│  Access      │
│  Google Drive"    │     │  Consent Screen     │     │  Token Saved │
└───────────────────┘     └────────────────────┘     └──────────────┘
```

1. User clicks **Connect Google Drive** in Settings → Backup
2. Browser opens Google OAuth2 consent screen
3. User grants permission to access Google Drive
4. Access token and refresh token are stored securely in the database
5. Connection status shows as "Connected" with account info

### Cloud Backup Operations

| Operation | Description |
|-----------|-------------|
| **Upload Backup** | Create local backup then upload to Google Drive |
| **List Cloud Backups** | Show all KPT backups on Google Drive |
| **Download Backup** | Download a specific backup from Google Drive |
| **Disconnect** | Revoke Google Drive access and remove tokens |

### Upload to Google Drive

1. A local SQL dump is created first
2. The file is uploaded to a dedicated `KPT_Backups` folder on Google Drive
3. File naming follows the same timestamp convention
4. Upload progress is shown in the UI

### Download from Google Drive

1. Lists available backups from the `KPT_Backups` folder
2. User selects a backup to download
3. File is downloaded to the local backup directory
4. Can then be used for restore

---

## Restore

### Restore Flow

```
┌──────────┐     ┌───────────────┐     ┌───────────────┐     ┌──────────────┐
│  Select  │────▶│  Safety       │────▶│  Execute SQL  │────▶│  Restart     │
│  Backup  │     │  Backup First │     │  Restore      │     │  Application │
└──────────┘     └───────────────┘     └───────────────┘     └──────────────┘
```

### Restore Steps

1. Navigate to **Settings → Backup** tab
2. Click **Restore from Backup**
3. Select a `.sql` backup file (from local or downloaded cloud backup)
4. **Safety backup is automatically created** before restoring
5. Selected backup is applied to the database
6. Application restarts to apply changes

### Safety Measures

| Safety Feature | Description |
|----------------|-------------|
| **Pre-restore backup** | Automatic backup created before any restore |
| **File validation** | Backup file is validated before restoration |
| **Atomic operation** | Restore runs in a transaction — all or nothing |
| **Restart prompt** | Application restarts after successful restore |

---

## Backup Settings UI

Located in **Settings → Backup** tab:

```
┌──────────────────────────────────────────────────────┐
│  📁 Local Backup                                     │
│  ┌────────────────────────────────────────────────┐  │
│  │  Backup Directory: D:\KPT_Backups   [Browse]   │  │
│  │  Auto Backup on Exit: [✓]                      │  │
│  │  Retention: [30] days                          │  │
│  ├────────────────────────────────────────────────┤  │
│  │  [Backup Now]        [Restore from Backup]     │  │
│  └────────────────────────────────────────────────┘  │
│                                                      │
│  ☁️  Cloud Backup (Google Drive)                      │
│  ┌────────────────────────────────────────────────┐  │
│  │  Status: Connected ✓                           │  │
│  │  [Upload to Drive]   [Download from Drive]     │  │
│  │  [Disconnect Google Drive]                     │  │
│  └────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────┘
```

---

## IPC Channels

| Channel | Direction | Description |
|---------|-----------|-------------|
| `backup:create` | Renderer → Main | Create local backup |
| `backup:restore` | Renderer → Main | Restore from file |
| `backup:get-path` | Renderer → Main | Get configured backup path |
| `backup:set-path` | Renderer → Main | Set backup directory |
| `gdrive:connect` | Renderer → Main | Start OAuth2 flow |
| `gdrive:disconnect` | Renderer → Main | Revoke Google Drive access |
| `gdrive:upload` | Renderer → Main | Upload backup to Drive |
| `gdrive:download` | Renderer → Main | Download backup from Drive |
| `gdrive:list` | Renderer → Main | List Drive backups |
| `gdrive:status` | Renderer → Main | Check connection status |

---

## Best Practices

1. **Configure auto-backup** — Ensure `auto_backup` is enabled so data is saved on every exit
2. **Set a dedicated folder** — Use a folder on a separate drive if possible
3. **Connect Google Drive** — Cloud backup adds off-site protection
4. **Regular manual backups** — Before major operations (bulk imports, data cleanup)
5. **Test restores** — Periodically verify backups can be restored successfully
6. **Keep retention reasonable** — 30–90 days balances storage and safety

---

*Developed by [Sultan Kabadi](https://sultanbk.com) — KPT Billing v1.0.0*
