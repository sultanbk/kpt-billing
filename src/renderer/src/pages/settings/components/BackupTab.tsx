import {
  CheckCircle2,
  Cloud,
  CloudDownload,
  Database,
  FolderOpen,
  HardDrive,
  RotateCcw,
  UploadCloud,
  XCircle
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '../../../components/ui/button'
import { Input } from '../../../components/ui/input'
import { Badge } from '../../../components/ui/badge'
import { backupService } from '../../../services/backup.service'
import { cloudService } from '../../../services/cloud.service'
import { dialogService } from '../../../services/dialog.service'
import { Field, SettingsSection } from './SettingsFields'
import { settingValue } from '../settings-model'
import type { SettingsMap, UpdateSetting } from '../types'

export function BackupTab({
  settings,
  updateSetting
}: {
  settings: SettingsMap
  updateSetting: UpdateSetting
}): React.JSX.Element {
  const [busy, setBusy] = useState(false)
  const [cloudBusy, setCloudBusy] = useState(false)
  const [cloudStatus, setCloudStatus] = useState({
    configured: false,
    authenticated: false,
    hasRefreshToken: false
  })
  const [cloudConfig, setCloudConfig] = useState({ clientId: '', clientSecret: '' })
  const [cloudBackups, setCloudBackups] = useState<
    { id: string; name: string; modifiedTime: string; size: string }[]
  >([])

  const loadCloud = async (): Promise<void> => {
    try {
      const status = await cloudService.getStatus()
      setCloudStatus(status)
      if (status.configured) setCloudConfig(await cloudService.getConfig())
      if (status.authenticated) setCloudBackups(await cloudService.listBackups())
    } catch {
      setCloudBackups([])
    }
  }

  useEffect(() => {
    loadCloud()
  }, [])

  const createBackup = async (): Promise<void> => {
    setBusy(true)
    try {
      const result = await backupService.create()
      toast[result.success ? 'success' : 'error'](
        result.success ? `Backup created: ${result.path}` : result.error || 'Backup failed'
      )
    } catch {
      toast.error('Backup failed')
    } finally {
      setBusy(false)
    }
  }

  const restoreBackup = async (): Promise<void> => {
    setBusy(true)
    try {
      const result = await backupService.restore()
      toast[result.success ? 'success' : 'error'](
        result.success ? 'Backup restored. The app will reload.' : result.error || 'Restore failed'
      )
    } catch {
      toast.error('Restore failed')
    } finally {
      setBusy(false)
    }
  }

  const openBackups = async (): Promise<void> => {
    try {
      await dialogService.openFolder(await backupService.getDir())
    } catch {
      toast.error('Could not open backups folder')
    }
  }

  const saveCloudConfig = async (): Promise<void> => {
    if (!cloudConfig.clientId.trim() || !cloudConfig.clientSecret.trim()) {
      toast.error('Enter Google client ID and secret')
      return
    }
    setCloudBusy(true)
    try {
      await cloudService.saveConfig(cloudConfig.clientId.trim(), cloudConfig.clientSecret.trim())
      toast.success('Google Drive config saved')
      await loadCloud()
    } catch {
      toast.error('Could not save Google Drive config')
    } finally {
      setCloudBusy(false)
    }
  }

  const authenticateCloud = async (): Promise<void> => {
    setCloudBusy(true)
    try {
      const result = await cloudService.authenticate()
      toast[result.success ? 'success' : 'error'](
        result.success ? 'Connected to Google Drive' : result.error || 'Authentication failed'
      )
      await loadCloud()
    } catch {
      toast.error('Authentication failed')
    } finally {
      setCloudBusy(false)
    }
  }

  const backupToCloud = async (): Promise<void> => {
    setCloudBusy(true)
    try {
      const result = await cloudService.backup()
      toast[result.success ? 'success' : 'error'](
        result.success ? 'Backup uploaded to Google Drive' : result.error || 'Cloud backup failed'
      )
      await loadCloud()
    } catch {
      toast.error('Cloud backup failed')
    } finally {
      setCloudBusy(false)
    }
  }

  return (
    <div className="space-y-6">
      <SettingsSection
        title="Local Backup"
        description="Create, restore, and retain local SQL backups."
        icon={<Database className="h-4 w-4" />}
      >
        <div className="flex flex-wrap gap-2">
          <Button onClick={createBackup} disabled={busy} className="rounded-xl">
            <Database className="h-4 w-4" />
            Create Backup
          </Button>
          <Button variant="outline" onClick={restoreBackup} disabled={busy} className="rounded-xl">
            <RotateCcw className="h-4 w-4" />
            Restore Backup
          </Button>
          <Button variant="outline" onClick={openBackups} className="rounded-xl">
            <FolderOpen className="h-4 w-4" />
            Backups Folder
          </Button>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <Field label="Auto-backup Frequency">
            <select
              className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm transition-colors focus:border-primary/50 focus:ring-1 focus:ring-primary/20"
              value={settingValue(settings, 'backupFrequency')}
              onChange={(event) => updateSetting('backupFrequency', event.target.value)}
            >
              <option value="hourly">Hourly</option>
              <option value="4hours">Every 4 hours</option>
              <option value="daily">Daily</option>
            </select>
          </Field>
          <Field label="Keep Backups">
            <Input
              type="number"
              min="1"
              max="365"
              value={settingValue(settings, 'backupRetention')}
              onChange={(event) => updateSetting('backupRetention', event.target.value)}
            />
          </Field>
          <Field label="Backup Path">
            <Input
              value={settingValue(settings, 'backupPath')}
              onChange={(event) => updateSetting('backupPath', event.target.value)}
              placeholder="Default app backup folder"
            />
          </Field>
        </div>
      </SettingsSection>

      <SettingsSection
        title="Google Drive Backup"
        description="Optional cloud backup using your Google OAuth client."
        icon={<Cloud className="h-4 w-4" />}
      >
        {/* Connection Status Card */}
        <div
          className={`mb-5 flex items-center gap-3 rounded-xl border p-4 text-sm ${
            cloudStatus.authenticated
              ? 'border-emerald-500/20 bg-emerald-500/5'
              : cloudStatus.configured
                ? 'border-amber-500/20 bg-amber-500/5'
                : 'border-border/60 bg-muted/20'
          }`}
        >
          {cloudStatus.authenticated ? (
            <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
          ) : cloudStatus.configured ? (
            <Cloud className="h-5 w-5 text-amber-500 shrink-0" />
          ) : (
            <XCircle className="h-5 w-5 text-muted-foreground shrink-0" />
          )}
          <div>
            <div className="font-medium">
              {cloudStatus.authenticated
                ? 'Connected to Google Drive'
                : cloudStatus.configured
                  ? 'Configured, not connected'
                  : 'Not configured'}
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">
              {cloudStatus.authenticated
                ? 'Ready to backup and restore from cloud'
                : 'Set up Google OAuth credentials below'}
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Client ID">
            <Input
              value={cloudConfig.clientId}
              onChange={(event) => setCloudConfig({ ...cloudConfig, clientId: event.target.value })}
            />
          </Field>
          <Field label="Client Secret">
            <Input
              type="password"
              value={cloudConfig.clientSecret}
              onChange={(event) =>
                setCloudConfig({ ...cloudConfig, clientSecret: event.target.value })
              }
            />
          </Field>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button variant="outline" onClick={saveCloudConfig} disabled={cloudBusy} className="rounded-xl">
            <HardDrive className="h-4 w-4" />
            Save Config
          </Button>
          <Button variant="outline" onClick={authenticateCloud} disabled={cloudBusy} className="rounded-xl">
            <Cloud className="h-4 w-4" />
            Connect
          </Button>
          <Button onClick={backupToCloud} disabled={cloudBusy || !cloudStatus.authenticated} className="rounded-xl">
            <UploadCloud className="h-4 w-4" />
            Backup to Cloud
          </Button>
        </div>
        {cloudBackups.length > 0 && (
          <div className="mt-5 space-y-2">
            {cloudBackups.map((backup) => (
              <div
                key={backup.id}
                className="flex items-center justify-between rounded-xl border border-border/60 bg-background/60 p-4 text-sm hover:border-border hover:shadow-sm transition-all duration-200"
              >
                <div className="flex items-center gap-3">
                  <Cloud className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div>
                    <span className="font-medium">{backup.name}</span>
                    {backup.size && (
                      <Badge variant="secondary" className="ml-2 text-[10px]">
                        {backup.size}
                      </Badge>
                    )}
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-lg"
                  onClick={() =>
                    cloudService
                      .downloadBackup(backup.id, backup.name)
                      .then(() => toast.success('Cloud backup downloaded'))
                  }
                >
                  <CloudDownload className="h-4 w-4" />
                  Download
                </Button>
              </div>
            ))}
          </div>
        )}
      </SettingsSection>
    </div>
  )
}
