import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Badge } from '../components/ui/badge'
import { Separator } from '../components/ui/separator'
import { toast } from 'sonner'
import {
  Save,
  Printer,
  Database,
  Store,
  Cloud,
  CloudUpload,
  CloudDownload,
  FolderOpen,
  Link,
  Unlink,
  Loader2,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  Shield,
  Keyboard
} from 'lucide-react'

export default function SettingsPage(): React.JSX.Element {
  const [settings, setSettings] = useState<Record<string, string>>({})
  const [printers, setPrinters] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [restoring, setRestoring] = useState(false)

  const loadSettings = useCallback(async () => {
    try {
      const all = await window.api.settings.getAll()
      setSettings(all)
    } catch (err) {
      console.error('Failed to load settings:', err)
    }
  }, [])

  const loadPrinters = useCallback(async () => {
    try {
      const list = await window.api.printer.getAvailable()
      setPrinters(list)
    } catch {
      /* ignore */
    }
  }, [])

  useEffect(() => {
    loadSettings()
    loadPrinters()
  }, [loadSettings, loadPrinters])

  const updateSetting = (key: string, value: string): void => {
    setSettings((prev) => ({ ...prev, [key]: value }))
  }

  const handleSave = async (): Promise<void> => {
    setSaving(true)
    try {
      await window.api.settings.setMany(settings)
      toast.success('Settings saved successfully')
    } catch (err) {
      toast.error('Failed to save settings')
    }
    setSaving(false)
  }

  const handleBackup = async (): Promise<void> => {
    try {
      const result = await window.api.backup.create()
      if (result.success) {
        toast.success(`Backup created: ${result.path}`)
      } else {
        toast.error(result.error || 'Backup failed')
      }
    } catch {
      toast.error('Backup failed')
    }
  }

  const handleTestPrint = async (): Promise<void> => {
    try {
      const success = await window.api.printer.testPrint()
      if (success) {
        toast.success('Test print sent')
      } else {
        toast.error('Test print failed')
      }
    } catch {
      toast.error('Printer error')
    }
  }

  // ---- Cloud Backup State & Handlers ----
  const [cloudStatus, setCloudStatus] = useState<{ configured: boolean; authenticated: boolean; hasRefreshToken: boolean }>({ configured: false, authenticated: false, hasRefreshToken: false })
  const [cloudClientId, setCloudClientId] = useState('')
  const [cloudClientSecret, setCloudClientSecret] = useState('')
  const [cloudLoading, setCloudLoading] = useState(false)
  const [cloudBackups, setCloudBackups] = useState<{ id: string; name: string; modifiedTime: string; size: string }[]>([])

  const loadCloudStatus = useCallback(async () => {
    try {
      const status = await window.api.cloud.getStatus()
      setCloudStatus(status)
      if (status.configured) {
        const config = await window.api.cloud.getConfig()
        setCloudClientId(config.clientId || '')
        setCloudClientSecret(config.clientSecret || '')
      }
      if (status.authenticated) {
        try {
          const backups = await window.api.cloud.listBackups()
          setCloudBackups(backups)
        } catch { /* ignore */ }
      }
    } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    loadCloudStatus()
  }, [loadCloudStatus])

  const handleSaveCloudConfig = async (): Promise<void> => {
    if (!cloudClientId.trim() || !cloudClientSecret.trim()) {
      toast.error('Enter both Client ID and Client Secret')
      return
    }
    try {
      await window.api.cloud.saveConfig(cloudClientId.trim(), cloudClientSecret.trim())
      toast.success('Google Drive config saved')
      loadCloudStatus()
    } catch { toast.error('Failed to save config') }
  }

  const handleCloudAuth = async (): Promise<void> => {
    setCloudLoading(true)
    try {
      const result = await window.api.cloud.authenticate()
      if (result.success) {
        toast.success('Connected to Google Drive!')
        loadCloudStatus()
      } else {
        toast.error(result.error || 'Authentication failed')
      }
    } catch { toast.error('Authentication failed') }
    setCloudLoading(false)
  }

  const handleCloudDisconnect = async (): Promise<void> => {
    try {
      await window.api.cloud.disconnect()
      toast.success('Disconnected from Google Drive')
      setCloudBackups([])
      loadCloudStatus()
    } catch { toast.error('Disconnect failed') }
  }

  const handleCloudBackup = async (): Promise<void> => {
    setCloudLoading(true)
    try {
      const result = await window.api.cloud.backup()
      if (result.success) {
        toast.success('Backup uploaded to Google Drive!')
        loadCloudStatus()
      } else {
        toast.error(result.error || 'Cloud backup failed')
      }
    } catch { toast.error('Cloud backup failed') }
    setCloudLoading(false)
  }

  const handleCloudDownload = async (fileId: string, fileName: string): Promise<void> => {
    setCloudLoading(true)
    try {
      const result = await window.api.cloud.downloadBackup(fileId, fileName)
      if (result.success) {
        toast.success(`Downloaded to: ${result.path}`)
      } else {
        toast.error(result.error || 'Download failed')
      }
    } catch { toast.error('Download failed') }
    setCloudLoading(false)
  }

  const handleOpenReceipts = async (): Promise<void> => {
    try {
      const dir = await window.api.billing.getReceiptsDir()
      await window.api.dialog.openFolder(dir)
    } catch { toast.error('Could not open folder') }
  }

  const handleOpenBackups = async (): Promise<void> => {
    try {
      const dir = await window.api.backup.getDir()
      await window.api.dialog.openFolder(dir)
    } catch { toast.error('Could not open folder') }
  }

  const handleRestore = async (): Promise<void> => {
    // Confirmation
    const confirmed = window.confirm(
      'WARNING: Restoring from a backup will REPLACE all current data with the backup data.\n\n' +
      'A safety backup of your current data will be created automatically before restoring.\n\n' +
      'The app will reload after restoration.\n\n' +
      'Are you sure you want to continue?'
    )
    if (!confirmed) return

    setRestoring(true)
    try {
      const result = await window.api.backup.restore()
      if (result.success) {
        toast.success('Database restored successfully! The app will reload now.', {
          description: result.safetyBackupPath
            ? `Safety backup saved at: ${result.safetyBackupPath}`
            : undefined,
          duration: 5000
        })
      } else {
        if (result.error !== 'No file selected') {
          toast.error(result.error || 'Restore failed')
        }
      }
    } catch (err) {
      toast.error('Restore failed unexpectedly')
    }
    setRestoring(false)
  }

  const handleOpenReports = async (): Promise<void> => {
    try {
      const dir = await window.api.report.getReportsDir()
      await window.api.dialog.openFolder(dir)
    } catch { toast.error('Could not open folder') }
  }

  // ---- PIN Change State & Handlers ----
  const [currentPin, setCurrentPin] = useState('')
  const [newPin, setNewPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [pinChanging, setPinChanging] = useState(false)

  const handleChangePin = async (): Promise<void> => {
    if (!currentPin || currentPin.length < 4) {
      toast.error('Enter your current PIN (min 4 digits)')
      return
    }
    if (!newPin || newPin.length < 4) {
      toast.error('New PIN must be at least 4 digits')
      return
    }
    if (newPin !== confirmPin) {
      toast.error('New PIN and confirmation do not match')
      return
    }
    setPinChanging(true)
    try {
      const result = await window.api.auth.changePin(currentPin, newPin)
      if (result.success) {
        toast.success('PIN changed successfully')
        setCurrentPin('')
        setNewPin('')
        setConfirmPin('')
      } else {
        toast.error(result.error || 'Failed to change PIN')
      }
    } catch {
      toast.error('Failed to change PIN')
    }
    setPinChanging(false)
  }

  const TABS = [
    { id: 'general', label: 'General', icon: Store, description: 'Shop details & printer' },
    { id: 'backup', label: 'Backup', icon: Database, description: 'Local & cloud backups' },
    { id: 'security', label: 'Security', icon: Shield, description: 'PIN & access control' },
    { id: 'shortcuts', label: 'Shortcuts', icon: Keyboard, description: 'Keyboard shortcuts' },
  ] as const
  type TabId = typeof TABS[number]['id']
  const [activeTab, setActiveTab] = useState<TabId>('general')

  return (
    <div className="h-full overflow-hidden page-enter flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-card/50">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
          <p className="text-sm text-muted-foreground">Configure your billing system</p>
        </div>
        <Button onClick={handleSave} disabled={saving} className="gap-2 shadow-sm">
          <Save className="h-4 w-4" />
          {saving ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Tab Navigation — Left Sidebar */}
        <div className="w-52 shrink-0 border-r border-border bg-card/30 p-3 space-y-1">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-all duration-150 ${
                activeTab === tab.id
                  ? 'bg-primary/10 text-primary shadow-sm'
                  : 'text-muted-foreground hover:bg-accent/70 hover:text-foreground'
              }`}
            >
              <tab.icon className={`h-4 w-4 shrink-0 ${activeTab === tab.id ? 'text-primary' : ''}`} />
              <div className="min-w-0">
                <div className="text-sm font-medium truncate">{tab.label}</div>
                <div className="text-[10px] text-muted-foreground truncate">{tab.description}</div>
              </div>
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-auto p-6">
          <div className="max-w-[800px] mx-auto space-y-6">

          {/* ===================== GENERAL TAB ===================== */}
          {activeTab === 'general' && (
            <>
              {/* Shop Details */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Store className="h-5 w-5" />
                    Shop Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Shop Name</Label>
                    <Input
                      value={settings.shopName || ''}
                      onChange={(e) => updateSetting('shopName', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>GSTIN</Label>
                    <Input
                      value={settings.gstin || ''}
                      onChange={(e) => updateSetting('gstin', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2 col-span-2">
                    <Label>Address</Label>
                    <Input
                      value={settings.shopAddress || ''}
                      onChange={(e) => updateSetting('shopAddress', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Phone</Label>
                    <Input
                      value={settings.shopPhone || ''}
                      onChange={(e) => updateSetting('shopPhone', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Receipt Footer</Label>
                    <Input
                      value={settings.receiptFooter || ''}
                      onChange={(e) => updateSetting('receiptFooter', e.target.value)}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Printer Settings */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Printer className="h-5 w-5" />
                    Printer Settings
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Receipt Printer</Label>
                    <div className="flex gap-2">
                      <select
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        value={settings.receiptPrinterName || ''}
                        onChange={(e) => updateSetting('receiptPrinterName', e.target.value)}
                      >
                        <option value="">Select printer...</option>
                        {printers.map((p) => (
                          <option key={p} value={p}>{p}</option>
                        ))}
                      </select>
                      <Button variant="outline" onClick={handleTestPrint}>
                        Test Print
                      </Button>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="autoPrint"
                      checked={settings.autoPrintReceipt === 'true'}
                      onChange={(e) => updateSetting('autoPrintReceipt', e.target.checked ? 'true' : 'false')}
                      className="h-4 w-4 rounded border-input"
                    />
                    <Label htmlFor="autoPrint">Auto-print receipt after billing</Label>
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {/* ===================== BACKUP TAB ===================== */}
          {activeTab === 'backup' && (
            <>
              {/* Local Backup */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Database className="h-5 w-5" />
                    Local Backup & Data
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    <Button variant="outline" onClick={handleBackup} className="gap-2 h-auto py-3 flex-col">
                      <Database className="h-4 w-4" />
                      <span className="text-xs">Create Backup</span>
                    </Button>
                    <Button variant="outline" onClick={handleRestore} disabled={restoring} className="gap-2 h-auto py-3 flex-col text-amber-700 border-amber-300 hover:bg-amber-50">
                      {restoring ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
                      <span className="text-xs">{restoring ? 'Restoring...' : 'Restore Backup'}</span>
                    </Button>
                    <Button variant="outline" onClick={handleOpenBackups} className="gap-2 h-auto py-3 flex-col">
                      <FolderOpen className="h-4 w-4" />
                      <span className="text-xs">Backups Folder</span>
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Button variant="outline" onClick={handleOpenReceipts} className="gap-2">
                      <FolderOpen className="h-4 w-4" />
                      Open Receipts Folder
                    </Button>
                    <Button variant="outline" onClick={handleOpenReports} className="gap-2">
                      <FolderOpen className="h-4 w-4" />
                      Open Reports Folder
                    </Button>
                  </div>
                  <Separator />
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Auto-Backup Frequency</Label>
                      <select
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        value={settings.backupFrequency || '4hours'}
                        onChange={(e) => updateSetting('backupFrequency', e.target.value)}
                      >
                        <option value="hourly">Every Hour</option>
                        <option value="4hours">Every 4 Hours</option>
                        <option value="daily">Daily</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label>Keep Backups (days)</Label>
                      <Input
                        type="number"
                        value={settings.backupRetention || '30'}
                        onChange={(e) => updateSetting('backupRetention', e.target.value)}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Cloud Backup (Google Drive) */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Cloud className="h-5 w-5" />
                    Cloud Backup (Google Drive)
                    {cloudStatus.authenticated ? (
                      <Badge className="ml-2 gap-1 bg-green-100 text-green-700"><CheckCircle2 className="h-3 w-3" />Connected</Badge>
                    ) : cloudStatus.configured ? (
                      <Badge variant="secondary" className="ml-2 gap-1"><AlertCircle className="h-3 w-3" />Not Connected</Badge>
                    ) : null}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Google OAuth Client ID</Label>
                      <Input
                        value={cloudClientId}
                        onChange={(e) => setCloudClientId(e.target.value)}
                        placeholder="xxxxxxxxxx.apps.googleusercontent.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Google OAuth Client Secret</Label>
                      <Input
                        type="password"
                        value={cloudClientSecret}
                        onChange={(e) => setCloudClientSecret(e.target.value)}
                        placeholder="GOCSPX-..."
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={handleSaveCloudConfig}>
                      <Save className="mr-2 h-4 w-4" />Save Config
                    </Button>
                    {cloudStatus.configured && !cloudStatus.authenticated && (
                      <Button size="sm" onClick={handleCloudAuth} disabled={cloudLoading}>
                        {cloudLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Link className="mr-2 h-4 w-4" />}
                        Connect to Google Drive
                      </Button>
                    )}
                    {cloudStatus.authenticated && (
                      <>
                        <Button size="sm" onClick={handleCloudBackup} disabled={cloudLoading} className="gap-2">
                          {cloudLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CloudUpload className="h-4 w-4" />}
                          Backup to Cloud
                        </Button>
                        <Button variant="outline" size="sm" onClick={handleCloudDisconnect} className="gap-2 text-destructive">
                          <Unlink className="h-4 w-4" />Disconnect
                        </Button>
                      </>
                    )}
                  </div>
                  {cloudBackups.length > 0 && (
                    <>
                      <Separator />
                      <div className="space-y-1">
                        <Label className="text-sm font-medium">Cloud Backups</Label>
                        <div className="rounded-md border max-h-48 overflow-auto">
                          {cloudBackups.map((b) => (
                            <div key={b.id} className="flex items-center justify-between px-3 py-2 border-b last:border-b-0 text-sm">
                              <div>
                                <span className="font-medium">{b.name}</span>
                                <span className="text-muted-foreground ml-2">({b.size})</span>
                                <span className="text-muted-foreground ml-2 text-xs">{new Date(b.modifiedTime).toLocaleString()}</span>
                              </div>
                              <Button variant="ghost" size="sm" onClick={() => handleCloudDownload(b.id, b.name)}>
                                <CloudDownload className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                  <p className="text-xs text-muted-foreground">
                    To set up Google Drive backup: create a project in Google Cloud Console, enable the Drive API,
                    create OAuth 2.0 Desktop credentials, and enter the Client ID & Secret above.
                  </p>
                </CardContent>
              </Card>
            </>
          )}

          {/* ===================== SECURITY TAB ===================== */}
          {activeTab === 'security' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Shield className="h-5 w-5" />
                  Change PIN
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-lg bg-muted/50 p-3">
                  <p className="text-sm text-muted-foreground">
                    This PIN is required to access Dashboard, Products, Purchases, Customers, Reports and Settings.
                    The Billing page is always accessible without a PIN.
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Current PIN</Label>
                    <Input
                      type="password"
                      inputMode="numeric"
                      maxLength={8}
                      value={currentPin}
                      onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, ''))}
                      placeholder="••••"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>New PIN</Label>
                    <Input
                      type="password"
                      inputMode="numeric"
                      maxLength={8}
                      value={newPin}
                      onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
                      placeholder="Min 4 digits"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Confirm New PIN</Label>
                    <Input
                      type="password"
                      inputMode="numeric"
                      maxLength={8}
                      value={confirmPin}
                      onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
                      placeholder="Re-enter new PIN"
                    />
                  </div>
                </div>
                <Button onClick={handleChangePin} disabled={pinChanging} variant="outline" className="gap-2">
                  <Shield className="h-4 w-4" />
                  {pinChanging ? 'Changing...' : 'Change PIN'}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* ===================== SHORTCUTS TAB ===================== */}
          {activeTab === 'shortcuts' && (
            <KeyboardShortcutsCard settings={settings} updateSetting={updateSetting} />
          )}

          </div>
        </div>
      </div>
    </div>
  )
}

// ---- System-reserved shortcuts that cannot be reassigned ----
const SYSTEM_SHORTCUTS = new Set([
  'F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11', 'F12',
  'Ctrl+K', 'Ctrl+L', 'Ctrl+N', 'Ctrl+B',
  'Ctrl+Shift+R', 'Ctrl+Shift+D',
  'Escape'
])

// Available shortcut options for customization
const AVAILABLE_SHORTCUTS = [
  { value: 'Alt+O', label: 'Alt + O' },
  { value: 'Alt+N', label: 'Alt + N' },
  { value: 'Alt+C', label: 'Alt + C' },
  { value: 'Alt+P', label: 'Alt + P' },
  { value: 'Alt+A', label: 'Alt + A' },
  { value: 'Alt+I', label: 'Alt + I' },
  { value: 'Alt+Q', label: 'Alt + Q' },
  { value: 'Alt+S', label: 'Alt + S' },
  { value: 'Alt+X', label: 'Alt + X' },
  { value: 'Alt+M', label: 'Alt + M' },
  { value: 'Alt+1', label: 'Alt + 1' },
  { value: 'Alt+2', label: 'Alt + 2' },
  { value: 'Alt+3', label: 'Alt + 3' },
  { value: 'Alt+4', label: 'Alt + 4' },
  { value: 'Alt+5', label: 'Alt + 5' },
]

const CONFIGURABLE_SHORTCUTS = [
  {
    key: 'shortcut_addOther',
    label: 'Add Other (custom) item',
    description: 'Quick add a miscellaneous item to the cart',
    defaultValue: 'Alt+O'
  },
  {
    key: 'shortcut_newCustomer',
    label: 'Quick add new customer',
    description: 'Open the inline customer creation form',
    defaultValue: 'Alt+N'
  }
]

function KeyboardShortcutsCard({
  settings,
  updateSetting
}: {
  settings: Record<string, string>
  updateSetting: (key: string, value: string) => void
}): React.JSX.Element {
  // Get currently assigned shortcuts to prevent duplicates
  const getAssignedShortcuts = (excludeKey: string): Set<string> => {
    const assigned = new Set<string>()
    for (const sc of CONFIGURABLE_SHORTCUTS) {
      if (sc.key !== excludeKey) {
        assigned.add(settings[sc.key] || sc.defaultValue)
      }
    }
    return assigned
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Keyboard className="h-5 w-5" />
          Keyboard Shortcuts
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Customize billing page shortcuts. Navigation shortcuts (F1–F10) and system shortcuts are fixed.
        </p>

        {/* Fixed shortcuts reference */}
        <div className="rounded-lg bg-muted/50 p-3 space-y-1.5">
          <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">System Shortcuts (Fixed)</Label>
          <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs text-muted-foreground">
            <div className="flex justify-between"><span>Dashboard</span><kbd className="font-mono bg-background px-1.5 rounded border text-[10px]">F1</kbd></div>
            <div className="flex justify-between"><span>Billing</span><kbd className="font-mono bg-background px-1.5 rounded border text-[10px]">F2</kbd></div>
            <div className="flex justify-between"><span>Products</span><kbd className="font-mono bg-background px-1.5 rounded border text-[10px]">F3</kbd></div>
            <div className="flex justify-between"><span>Purchases</span><kbd className="font-mono bg-background px-1.5 rounded border text-[10px]">F4</kbd></div>
            <div className="flex justify-between"><span>Customers</span><kbd className="font-mono bg-background px-1.5 rounded border text-[10px]">F5</kbd></div>
            <div className="flex justify-between"><span>Hold Bill</span><kbd className="font-mono bg-background px-1.5 rounded border text-[10px]">F6</kbd></div>
            <div className="flex justify-between"><span>Reports</span><kbd className="font-mono bg-background px-1.5 rounded border text-[10px]">F7</kbd></div>
            <div className="flex justify-between"><span>Recall Bill</span><kbd className="font-mono bg-background px-1.5 rounded border text-[10px]">F8</kbd></div>
            <div className="flex justify-between"><span>Clear Cart</span><kbd className="font-mono bg-background px-1.5 rounded border text-[10px]">F9</kbd></div>
            <div className="flex justify-between"><span>Settings</span><kbd className="font-mono bg-background px-1.5 rounded border text-[10px]">F10</kbd></div>
            <div className="flex justify-between"><span>Pay & Print</span><kbd className="font-mono bg-background px-1.5 rounded border text-[10px]">F11</kbd></div>
            <div className="flex justify-between"><span>Shortcuts Help</span><kbd className="font-mono bg-background px-1.5 rounded border text-[10px]">F12</kbd></div>
          </div>
        </div>

        <Separator />

        {/* Configurable shortcuts */}
        <div className="space-y-4">
          <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Customizable Shortcuts</Label>
          {CONFIGURABLE_SHORTCUTS.map((sc) => {
            const currentValue = settings[sc.key] || sc.defaultValue
            const assigned = getAssignedShortcuts(sc.key)
            return (
              <div key={sc.key} className="flex items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="text-sm font-medium">{sc.label}</div>
                  <div className="text-xs text-muted-foreground">{sc.description}</div>
                </div>
                <select
                  className="h-9 w-40 rounded-md border border-input bg-background px-3 text-sm"
                  value={currentValue}
                  onChange={(e) => updateSetting(sc.key, e.target.value)}
                >
                  {AVAILABLE_SHORTCUTS.map((opt) => {
                    const isAssigned = assigned.has(opt.value)
                    const isSystem = SYSTEM_SHORTCUTS.has(opt.value)
                    const disabled = isAssigned || isSystem
                    return (
                      <option
                        key={opt.value}
                        value={opt.value}
                        disabled={disabled}
                      >
                        {opt.label}{isAssigned ? ' (in use)' : ''}{isSystem ? ' (system)' : ''}
                      </option>
                    )
                  })}
                </select>
              </div>
            )
          })}
        </div>

        <p className="text-xs text-muted-foreground mt-2">
          Changes take effect after saving settings. Only Alt-key combinations are available to avoid conflicts with system shortcuts.
        </p>
      </CardContent>
    </Card>
  )
}