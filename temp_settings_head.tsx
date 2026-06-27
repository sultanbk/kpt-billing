import { useEffect, useState, useCallback } from 'react'
import type { CSSProperties } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Badge } from '../../components/ui/badge'
import { Separator } from '../../components/ui/separator'
import { toast } from 'sonner'
import { Zap, Package, BarChart3, Handshake } from 'lucide-react'
import {
  Save,
  Printer,
  Database,
  Store,
  Cloud,
  CloudUpload,
  CloudDownload,
  FolderOpen,
  FileText,
  Link,
  Unlink,
  Loader2,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  Shield,
  Keyboard,
  Barcode,
  Info,
  Phone,
  Mail,
  Globe,
  Lock,
  HelpCircle,
  Layers,
  UserCheck,
  History,
  Users,
  Sparkles,
  Truck,
  FileSpreadsheet,
  CreditCard,
  Plus,
  ChevronDown,
  Trash2,
  Edit,
  Sliders
} from 'lucide-react'
import { authService } from '../../services/auth.service'
import { backupService } from '../../services/backup.service'
import { billingService } from '../../services/billing.service'
import { cloudService } from '../../services/cloud.service'
import { dialogService } from '../../services/dialog.service'
import { printerService } from '../../services/printer.service'
import { reportService } from '../../services/report.service'
import { settingsService } from '../../services/settings.service'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '../../components/ui/dialog'

function toTextAlign(
  value: string | undefined,
  fallback: CSSProperties['textAlign']
): CSSProperties['textAlign'] {
  return value === 'left' || value === 'right' || value === 'center' ? value : fallback
}

type PrinterDiagnostics = {
  selectedPrinter: string
  configuredPrinter: string
  availablePrinters: string[]
  windowsDetails: {
    name: string
    printerStatus: number | null
    workOffline: boolean | null
    portName: string | null
    driverName: string | null
    isDefault: boolean | null
  } | null
  checks: {
    printerSelected: boolean
    serviceBoundToSelection: boolean
    selectedExistsInSystem: boolean
    windowsReportsOffline: boolean
  }
  recommendations: string[]
  checkedAt: string
}

interface PaymentMethod {
  id: string
  type: 'bank' | 'upi' | 'scanner'
  name: string
  isDefaultBilling?: boolean
  details: {
    bankName?: string
    accountNo?: string
    ifscCode?: string
    branch?: string
    upiVpa?: string
    payeeName?: string
    scannerType?: string
    accountName?: string
  }
}

const TABS = [
  { id: 'general', label: 'General', icon: Store, description: 'Shop details & info' },
  { id: 'payments', label: 'Payments', icon: CreditCard, description: 'Payment modes & UPI' },
  { id: 'printer', label: 'Printers', icon: Printer, description: 'Manage print devices' },
  { id: 'barcode', label: 'Barcode', icon: Barcode, description: 'Label customization' },
  { id: 'receipt', label: 'Receipt', icon: FileText, description: 'Receipt format & footer' },
  { id: 'backup', label: 'Backup', icon: Database, description: 'Local & cloud backups' },
  { id: 'security', label: 'Security', icon: Shield, description: 'PIN & access control' },
  { id: 'shortcuts', label: 'Shortcuts', icon: Keyboard, description: 'Keyboard shortcuts' },
  { id: 'guide', label: 'User Guide', icon: HelpCircle, description: 'Understand all features' },
  { id: 'about', label: 'About', icon: Info, description: 'About SarvaOne' }
] as const
type TabId = (typeof TABS)[number]['id']

export default function SettingsPage(): React.JSX.Element {
  const [settings, setSettings] = useState<Record<string, string>>({})
  const [activeTab, setActiveTab] = useState<TabId>('general')
  const [barcodeAccordion, setBarcodeAccordion] = useState<
    'visibility' | 'dimensions' | 'typography' | 'calibration' | null
  >('visibility')
  const [printers, setPrinters] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [restoring, setRestoring] = useState(false)
  const [runningDiagnostics, setRunningDiagnostics] = useState(false)
  const [printerDiagnostics, setPrinterDiagnostics] = useState<PrinterDiagnostics | null>(null)

  // UPI security states
  const [upiVerifyPinOpen, setUpiVerifyPinOpen] = useState(false)
  const [upiPinInput, setUpiPinInput] = useState('')
  const [upiPinError, setUpiPinError] = useState('')
  const [verifyingUpiPin, setVerifyingUpiPin] = useState(false)

  // Payments security states and form states
  const [isPaymentsUnlocked, setIsPaymentsUnlocked] = useState(false)
  const [editingMethod, setEditingMethod] = useState<PaymentMethod | null>(null)
  const [isAddingNew, setIsAddingNew] = useState(false)
  const [printingMethodId, setPrintingMethodId] = useState<string | null>(null)
  const [downloadingMethodId, setDownloadingMethodId] = useState<string | null>(null)

  const [formName, setFormName] = useState('')
  const [formType, setFormType] = useState<'bank' | 'upi' | 'scanner'>('upi')
  const [formIsDefaultBilling, setFormIsDefaultBilling] = useState(false)

  const [formBankName, setFormBankName] = useState('')
  const [formAccountNo, setFormAccountNo] = useState('')
  const [formIfscCode, setFormIfscCode] = useState('')
  const [formBranch, setFormBranch] = useState('')
  const [formAccountName, setFormAccountName] = useState('')

  const [formUpiVpa, setFormUpiVpa] = useState('')
  const [formPayeeName, setFormPayeeName] = useState('')
  const [formScannerType, setFormScannerType] = useState('Google Pay')

  const getPaymentMethods = (): PaymentMethod[] => {
    try {
      if (settings.paymentMethods) {
        return JSON.parse(settings.paymentMethods)
      }
    } catch (e) {
      console.error('Failed to parse payment methods:', e)
    }

    const legacyVpa = settings.upiVpa || ''
    const legacyPayee = settings.upiPayeeName || ''
    if (legacyVpa || legacyPayee) {
      return [
        {
          id: 'legacy-default',
          type: 'upi',
          name: 'Default UPI (Migrated)',
          isDefaultBilling: true,
          details: {
            upiVpa: legacyVpa,
            payeeName: legacyPayee
          }
        }
      ]
    }
    return []
  }

  const savePaymentMethods = (methods: PaymentMethod[]): void => {
    const jsonStr = JSON.stringify(methods)
    updateSetting('paymentMethods', jsonStr)

    const defaultUpi = methods.find(
      (m) => m.isDefaultBilling && (m.type === 'upi' || m.type === 'scanner')
    )
    if (defaultUpi) {
      updateSetting('upiVpa', defaultUpi.details?.upiVpa || '')
      updateSetting('upiPayeeName', defaultUpi.details?.payeeName || '')
    } else {
      const upiMethods = methods.filter((m) => m.type === 'upi' || m.type === 'scanner')
      if (upiMethods.length === 0) {
        updateSetting('upiVpa', '')
        updateSetting('upiPayeeName', '')
      }
    }
  }

  const handleSaveMethod = (): void => {
    if (!formName.trim()) {
      toast.error('Payment method name is required')
      return
    }

    if (formType === 'bank') {
      if (!formBankName.trim()) {
        toast.error('Bank name is required')
        return
      }
      if (!formAccountNo.trim()) {
        toast.error('Account number is required')
        return
      }
    } else {
      if (!formUpiVpa.trim()) {
        toast.error('UPI VPA (ID) is required')
        return
      }
    }

    const currentMethods = getPaymentMethods()
    const methodDetails: Record<string, string> = {}

    if (formType === 'bank') {
      methodDetails.bankName = formBankName
      methodDetails.accountNo = formAccountNo
      methodDetails.ifscCode = formIfscCode
      methodDetails.branch = formBranch
      methodDetails.accountName = formAccountName
    } else {
      methodDetails.upiVpa = formUpiVpa
      methodDetails.payeeName = formPayeeName
      if (formType === 'scanner') {
        methodDetails.scannerType = formScannerType
      }
    }

    const newMethod: PaymentMethod = {
      id: editingMethod ? editingMethod.id : `pm-${Date.now()}`,
      name: formName.trim(),
      type: formType,
      isDefaultBilling: formType === 'upi' || formType === 'scanner' ? formIsDefaultBilling : false,
      details: methodDetails
    }

    let updatedMethods: PaymentMethod[] = []

    if (editingMethod) {
      updatedMethods = currentMethods.map((m) => (m.id === editingMethod.id ? newMethod : m))
    } else {
      updatedMethods = [...currentMethods, newMethod]
    }

    if (newMethod.isDefaultBilling) {
      updatedMethods = updatedMethods.map((m) =>
        m.id !== newMethod.id ? { ...m, isDefaultBilling: false } : m
      )
    }

    savePaymentMethods(updatedMethods)
    setEditingMethod(null)
    setIsAddingNew(false)
    toast.success('Payment method saved. Click "Save Settings" to persist all changes.')
  }

  const handleStartEdit = (method: PaymentMethod): void => {
    setEditingMethod(method)
    setFormName(method.name)
    setFormType(method.type)
    setFormIsDefaultBilling(!!method.isDefaultBilling)

    if (method.type === 'bank') {
      setFormBankName(method.details.bankName || '')
      setFormAccountNo(method.details.accountNo || '')
      setFormIfscCode(method.details.ifscCode || '')
      setFormBranch(method.details.branch || '')
      setFormAccountName(method.details.accountName || '')
      setFormUpiVpa('')
      setFormPayeeName('')
      setFormScannerType('Google Pay')
    } else {
      setFormBankName('')
      setFormAccountNo('')
      setFormIfscCode('')
      setFormBranch('')
      setFormAccountName('')
      setFormUpiVpa(method.details.upiVpa || '')
      setFormPayeeName(method.details.payeeName || '')
      setFormScannerType(method.details.scannerType || 'Google Pay')
    }
  }

  const handleStartAdd = (): void => {
    setIsAddingNew(true)
    setEditingMethod(null)
    setFormName('')
    setFormType('upi')
    setFormIsDefaultBilling(false)
    setFormBankName('')
    setFormAccountNo('')
    setFormIfscCode('')
    setFormBranch('')
    setFormAccountName('')
    setFormUpiVpa('')
    setFormPayeeName('')
    setFormScannerType('Google Pay')
  }

  const handleDeleteMethod = (id: string): void => {
    if (!window.confirm('Are you sure you want to delete this payment method?')) return
    const current = getPaymentMethods()
    const updated = current.filter((m) => m.id !== id)
    savePaymentMethods(updated)
    toast.success('Payment method removed')
  }

  const handlePrintMethod = async (method: PaymentMethod): Promise<void> => {
    setPrintingMethodId(method.id)
    try {
      const success = await printerService.printPaymentDetails(method)
      if (success) {
        toast.success('Payment details sent to printer')
      } else {
        toast.error('Failed to print payment details')
      }
    } catch (err) {
      console.error(err)
      toast.error('Printer error')
    }
    setPrintingMethodId(null)
  }

  const handleDownloadMethodPdf = async (method: PaymentMethod): Promise<void> => {
    setDownloadingMethodId(method.id)
    try {
      const success = await printerService.downloadPaymentDetailsPdf(method)
      if (success) {
        toast.success('Payment slip PDF downloaded successfully')
      } else {
        toast.error('Failed to download payment slip PDF')
      }
    } catch (err) {
      console.error(err)
      toast.error('Download error')
    }
    setDownloadingMethodId(null)
  }

  // Interactive user guide active feature
  const [selectedFeature, setSelectedFeature] = useState('billing')

  const paperWidth = settings.receiptPaperWidthMm || '58'
  const previewWidthClass =
    paperWidth === '80' ? 'w-[320px]' : paperWidth === '72' ? 'w-[290px]' : 'w-[260px]'

  const handleUnlockUpi = async (): Promise<void> => {
    if (!upiPinInput || upiPinInput.length < 4) {
      setUpiPinError('Enter your PIN (min 4 digits)')
      return
    }
    setVerifyingUpiPin(true)
    setUpiPinError('')
    try {
      const result = await authService.verifyPin(upiPinInput)
      if (result.success) {
        if (result.user?.role === 'owner') {
          setIsPaymentsUnlocked(true)
          setUpiVerifyPinOpen(false)
          setUpiPinInput('')
          setUpiPinError('')
          toast.success('Settings unlocked successfully')
        } else {
          setUpiPinError('Access denied: Owner role required')
          setUpiPinInput('')
        }
      } else {
        setUpiPinError(result.error || 'Incorrect PIN')
        setUpiPinInput('')
      }
    } catch {
      setUpiPinError('Failed to verify PIN')
    }
    setVerifyingUpiPin(false)
  }

  const loadSettings = useCallback(async () => {
    try {
      const all = await settingsService.getAll()
      setSettings(all)
    } catch (err) {
      console.error('Failed to load settings:', err)
    }
  }, [])

  const loadPrinters = useCallback(async () => {
    try {
      const list = await printerService.getAvailable()
      setPrinters(list)
    } catch {
      /* ignore */
    }
  }, [])

  useEffect(() => {
    loadSettings()
    loadPrinters()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Auto-lock payments settings when tab transitions
  useEffect(() => {
    setIsPaymentsUnlocked(false)
  }, [activeTab])

  const updateSetting = (key: string, value: string): void => {
    setSettings((prev) => ({ ...prev, [key]: value }))
  }

  const handleSave = async (): Promise<void> => {
    setSaving(true)
    try {
      await settingsService.setMany(settings)
      toast.success('Settings saved successfully')
    } catch {
      toast.error('Failed to save settings')
    }
    setSaving(false)
  }

  const handleBackup = async (): Promise<void> => {
    try {
      const result = await backupService.create()
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
      const success = await printerService.testPrint()
      if (success) {
        toast.success('Test print sent')
      } else {
        toast.error('Test print failed')
      }
    } catch {
      toast.error('Printer error')
    }
  }

  const [printingTestLabel, setPrintingTestLabel] = useState(false)

  const handleTestPrintLabel = async (): Promise<void> => {
    setPrintingTestLabel(true)
    try {
      const result = await window.api.products.printTestLabel({
        printerName: settings.labelPrinterName || settings.receiptPrinterName || undefined,
        labelSize: settings.barcodeLabelSize === '60x40' ? '60x40' : '46x25',
        barcodeNudgeX: settings.barcodeNudgeX,
        barcodeNudgeY: settings.barcodeNudgeY,
        barcodeWidth: settings.barcodeWidth,
        barcodeHeight: settings.barcodeHeight
      })
      if (result?.success) {
        toast.success(`Test label sent to ${result.printerName}`)
      } else {
        toast.error('Test label print failed')
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Label printer error'
      toast.error(msg)
    }
    setPrintingTestLabel(false)
  }

  const handleRunPrinterDiagnostics = async (): Promise<void> => {
    setRunningDiagnostics(true)
    try {
      const result = await printerService.diagnostics(settings.receiptPrinterName || undefined)
      setPrinterDiagnostics(result)
      if (result.recommendations.length === 0) {
        toast.success('Printer diagnostics passed')
      } else {
        toast.error('Printer diagnostics found issues')
      }
    } catch {
      toast.error('Failed to run printer diagnostics')
    }
    setRunningDiagnostics(false)
  }

  // ---- Cloud Backup State & Handlers ----
  const [cloudStatus, setCloudStatus] = useState<{
    configured: boolean
    authenticated: boolean
    hasRefreshToken: boolean
  }>({ configured: false, authenticated: false, hasRefreshToken: false })
  const [cloudClientId, setCloudClientId] = useState('')
  const [cloudClientSecret, setCloudClientSecret] = useState('')
  const [cloudLoading, setCloudLoading] = useState(false)
  const [cloudBackups, setCloudBackups] = useState<
    { id: string; name: string; modifiedTime: string; size: string }[]
  >([])

  const loadCloudStatus = useCallback(async () => {
    try {
      const status = await cloudService.getStatus()
      setCloudStatus(status)
      if (status.configured) {
        const config = await cloudService.getConfig()
        setCloudClientId(config.clientId || '')
        setCloudClientSecret(config.clientSecret || '')
      }
      if (status.authenticated) {
        try {
          const backups = await cloudService.listBackups()
          setCloudBackups(backups)
        } catch {
          /* ignore */
        }
      }
    } catch {
      /* ignore */
    }
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
      await cloudService.saveConfig(cloudClientId.trim(), cloudClientSecret.trim())
      toast.success('Google Drive config saved')
      loadCloudStatus()
    } catch {
      toast.error('Failed to save config')
    }
  }

  const handleCloudAuth = async (): Promise<void> => {
    setCloudLoading(true)
    try {
      const result = await cloudService.authenticate()
      if (result.success) {
        toast.success('Connected to Google Drive!')
        loadCloudStatus()
      } else {
        toast.error(result.error || 'Authentication failed')
      }
    } catch {
      toast.error('Authentication failed')
    }
    setCloudLoading(false)
  }

  const handleCloudDisconnect = async (): Promise<void> => {
    try {
      await cloudService.disconnect()
      toast.success('Disconnected from Google Drive')
      setCloudBackups([])
      loadCloudStatus()
    } catch {
      toast.error('Disconnect failed')
    }
  }

  const handleCloudBackup = async (): Promise<void> => {
    setCloudLoading(true)
    try {
      const result = await cloudService.backup()
      if (result.success) {
        toast.success('Backup uploaded to Google Drive!')
        loadCloudStatus()
      } else {
        toast.error(result.error || 'Cloud backup failed')
      }
    } catch {
      toast.error('Cloud backup failed')
    }
    setCloudLoading(false)
  }

  const handleCloudDownload = async (fileId: string, fileName: string): Promise<void> => {
    setCloudLoading(true)
    try {
      const result = await cloudService.downloadBackup(fileId, fileName)
      if (result.success) {
        toast.success(`Downloaded to: ${result.path}`)
      } else {
        toast.error(result.error || 'Download failed')
      }
    } catch {
      toast.error('Download failed')
    }
    setCloudLoading(false)
  }

  const handleOpenReceipts = async (): Promise<void> => {
    try {
      const dir = await billingService.getReceiptsDir()
      await dialogService.openFolder(dir)
    } catch {
      toast.error('Could not open folder')
    }
  }

  const handleOpenBackups = async (): Promise<void> => {
    try {
      const dir = await backupService.getDir()
      await dialogService.openFolder(dir)
    } catch {
      toast.error('Could not open folder')
    }
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
      const result = await backupService.restore()
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
    } catch {
      toast.error('Restore failed unexpectedly')
    }
    setRestoring(false)
  }

  const handleOpenReports = async (): Promise<void> => {
    try {
      const dir = await reportService.getReportsDir()
      await dialogService.openFolder(dir)
    } catch {
      toast.error('Could not open folder')
    }
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
      const result = await authService.changePin(currentPin, newPin)
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
        {/* Tab Navigation â€” Left Sidebar */}
        <div className="w-52 shrink-0 overflow-y-auto border-r border-border bg-card/30 p-3 space-y-1">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-all duration-150 ${activeTab === tab.id
                  ? 'bg-primary/10 text-primary shadow-sm'
                  : 'text-muted-foreground hover:bg-accent/70 hover:text-foreground'
                }`}
            >
              <tab.icon
                className={`h-4 w-4 shrink-0 ${activeTab === tab.id ? 'text-primary' : ''}`}
              />
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
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
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
                    <div className="space-y-2 col-span-2">
                      <Label>Phone</Label>
                      <Input
                        value={settings.shopPhone || ''}
                        onChange={(e) => updateSetting('shopPhone', e.target.value)}
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* ===================== PAYMENTS TAB ===================== */}
            {activeTab === 'payments' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <Card className="border-border/50 shadow-sm overflow-hidden">
                  <CardHeader className="bg-muted/20 border-b border-border/50 pb-4 flex flex-row items-center justify-between space-y-0">
                    <div>
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <CreditCard className="h-5 w-5 text-primary" />
                        Payment Methods (Owner Only)
                      </CardTitle>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Manage shop bank accounts, default billing UPI, and QR scanner codes.
                      </p>
                    </div>
                    {isPaymentsUnlocked ? (
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="default"
                          className="bg-green-500 hover:bg-green-600 text-white border-0 text-xs font-semibold"
                        >
                          Unlocked
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setIsPaymentsUnlocked(false)}
                          className="h-7 text-xs text-muted-foreground hover:text-foreground gap-1 px-2"
                        >
                          <Lock className="h-3 w-3" />
                          Lock Details
                        </Button>
                      </div>
                    ) : (
                      <Badge
                        variant="secondary"
                        className="bg-amber-500/10 text-amber-700 hover:bg-amber-500/20 font-medium"
                      >
                        Protected
                      </Badge>
                    )}
                  </CardHeader>
                  <CardContent className="p-6">
                    {isPaymentsUnlocked ? (
                      <div className="space-y-6">
                        <div className="flex items-center justify-between">
                          <h3 className="text-sm font-semibold">Configured Accounts</h3>
                          <Button onClick={handleStartAdd} size="sm" className="gap-1.5 h-8">
                            <Plus className="h-4 w-4" /> Add Account
                          </Button>
                        </div>

                        {getPaymentMethods().length === 0 ? (
                          <div className="flex flex-col items-center justify-center py-10 border-2 border-dashed rounded-xl bg-muted/10 text-center p-6">
                            <CreditCard className="h-8 w-8 text-muted-foreground/60 mb-2" />
                            <p className="text-sm font-medium text-muted-foreground">
                              No payment methods configured yet
                            </p>
                            <p className="text-xs text-muted-foreground/80 mt-0.5">
                              Add bank details or UPI codes to print or use in billing receipts.
                            </p>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {getPaymentMethods().map((method) => (
                              <Card
                                key={method.id}
                                className="border border-border/80 shadow-sm hover:border-primary/30 transition-all flex flex-col justify-between overflow-hidden"
                              >
                                <div className="p-4 space-y-3 flex-1">
                                  <div className="flex items-start justify-between gap-2">
                                    <div>
                                      <h4 className="text-sm font-bold text-foreground truncate max-w-[200px]">
                                        {method.name}
                                      </h4>
                                      <div className="flex items-center gap-1.5 mt-0.5">
                                        <span className="text-[10px] uppercase font-bold text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                                          {method.type}
                                        </span>
                                        {method.isDefaultBilling && (
                                          <Badge className="text-[9px] bg-primary/10 border-primary/20 text-primary px-1.5 py-0">
                                            Billing Default
                                          </Badge>
                                        )}
                                      </div>
                                    </div>
                                  </div>

                                  <Separator className="my-2 bg-border/40" />

                                  <div className="text-xs space-y-1 text-muted-foreground font-medium">
                                    {method.type === 'bank' ? (
                                      <>
                                        {method.details.accountName && (
                                          <div>
                                            <span className="text-foreground/70">A/C Holder:</span>{' '}
                                            {method.details.accountName}
                                          </div>
                                        )}
                                        <div>
                                          <span className="text-foreground/70">Bank:</span>{' '}
                                          {method.details.bankName}
                                        </div>
                                        <div>
                                          <span className="text-foreground/70">A/C:</span>{' '}
                                          {method.details.accountNo}
                                        </div>
                                        <div>
                                          <span className="text-foreground/70">IFSC:</span>{' '}
                                          {method.details.ifscCode}
                                        </div>
                                        {method.details.branch && (
                                          <div>
                                            <span className="text-foreground/70">Branch:</span>{' '}
                                            {method.details.branch}
                                          </div>
                                        )}
                                      </>
                                    ) : (
                                      <>
                                        <div>
                                          <span className="text-foreground/70">VPA:</span>{' '}
                                          {method.details.upiVpa}
                                        </div>
                                        <div>
                                          <span className="text-foreground/70">Payee:</span>{' '}
                                          {method.details.payeeName}
                                        </div>
                                        {method.type === 'scanner' &&
                                          method.details.scannerType && (
                                            <div>
                                              <span className="text-foreground/70">Scanner:</span>{' '}
                                              {method.details.scannerType}
                                            </div>
                                          )}
                                      </>
                                    )}
                                  </div>
                                </div>
                                <div className="bg-muted/30 border-t border-border/40 px-4 py-2 flex items-center justify-between gap-2">
                                  <div className="flex gap-2">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handlePrintMethod(method)}
                                      disabled={printingMethodId === method.id}
                                      className="h-7 text-xs gap-1 hover:bg-primary/5 hover:text-primary transition-colors"
                                    >
                                      {printingMethodId === method.id ? (
                                        <Loader2 className="h-3 w-3 animate-spin" />
                                      ) : (
                                        <Printer className="h-3 w-3" />
                                      )}
                                      Print Slip
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleDownloadMethodPdf(method)}
                                      disabled={downloadingMethodId === method.id}
                                      className="h-7 text-xs gap-1 hover:bg-primary/5 hover:text-primary transition-colors"
                                    >
                                      {downloadingMethodId === method.id ? (
                                        <Loader2 className="h-3 w-3 animate-spin" />
                                      ) : (
                                        <FileText className="h-3 w-3" />
                                      )}
                                      Download Slip
                                    </Button>
                                  </div>
                                  <div className="flex gap-1.5">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => handleStartEdit(method)}
                                      className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                    >
                                      <Edit className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => handleDeleteMethod(method.id)}
                                      className="h-7 w-7 text-destructive hover:bg-destructive/10 hover:text-destructive"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                  </div>
                                </div>
                              </Card>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-10 text-center bg-muted/20 rounded-xl border-2 border-dashed border-border p-6 animate-in fade-in duration-200">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 mb-3 shadow-inner">
                          <Lock className="h-6 w-6 text-primary" />
                        </div>
                        <h3 className="text-sm font-semibold text-foreground">
                          Payments Settings Protected
                        </h3>
                        <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                          Verification is required to view or edit payment methods.
                        </p>
                        <Button
                          onClick={() => setUpiVerifyPinOpen(true)}
                          variant="outline"
                          size="sm"
                          className="mt-4 gap-2 hover:bg-primary/5 hover:text-primary transition-colors border-2"
                        >
                          <Shield className="h-4 w-4" />
                          Unlock to View &amp; Edit
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            {/* ===================== PRINTER TAB ===================== */}
            {activeTab === 'printer' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <Card className="border-border/50 shadow-sm overflow-hidden">
                  <CardHeader className="bg-muted/20 border-b border-border/50 pb-4">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Printer className="h-5 w-5 text-primary" />
                      Printer Configuration
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 space-y-8">
                    {/* Select Printer */}
                    <div className="space-y-3">
                      <Label className="text-base font-semibold">Active Receipt Printer</Label>
                      <div className="flex flex-col sm:flex-row gap-3">
                        <select
                          className="flex h-10 w-full flex-1 rounded-lg border-2 border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none transition-colors"
                          value={settings.receiptPrinterName || ''}
                          onChange={(e) => updateSetting('receiptPrinterName', e.target.value)}
                        >
                          <option value="">-- Select a printer --</option>
                          {printers.map((p) => (
                            <option key={p} value={p}>
                              {p}
                            </option>
                          ))}
                        </select>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            onClick={handleTestPrint}
                            className="border-2 hover:bg-primary/5 hover:text-primary transition-colors"
                          >
                            Test Print
                          </Button>
                          <Button
                            variant="secondary"
                            onClick={handleRunPrinterDiagnostics}
                            disabled={runningDiagnostics}
                            className="bg-primary/10 text-primary hover:bg-primary/20 font-medium transition-colors"
                          >
                            {runningDiagnostics ? (
                              <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            ) : null}
                            {runningDiagnostics ? 'Checking...' : 'Diagnostics'}
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Select Label Printer */}
                    <div className="space-y-3">
                      <Label className="text-base font-semibold">Active Label Printer</Label>
                      <div className="flex flex-col sm:flex-row gap-3">
                        <select
                          className="flex h-10 w-full flex-1 rounded-lg border-2 border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none transition-colors"
                          value={settings.labelPrinterName || ''}
                          onChange={(e) => updateSetting('labelPrinterName', e.target.value)}
                        >
                          <option value="">-- Select a printer --</option>
                          {printers.map((p) => (
                            <option key={p} value={p}>
                              {p}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {printerDiagnostics && <Separator className="bg-border/50" />}

                    {printerDiagnostics && (
                      <div className="animate-in fade-in slide-in-from-top-2 rounded-xl border-2 border-primary/20 bg-primary/5 p-5 space-y-4 text-sm shadow-sm">
                        <div className="flex items-center justify-between gap-2">
                          <div className="font-medium text-primary">Diagnostics Result</div>
                          <div className="text-xs text-muted-foreground font-mono">
                            {new Date(printerDiagnostics.checkedAt).toLocaleString('en-IN')}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                          <div className="bg-background/80 p-3 rounded-lg border border-primary/10">
                            <div className="text-xs text-muted-foreground mb-1">
                              Selected (Settings)
                            </div>
                            <div className="font-medium">
                              {printerDiagnostics.selectedPrinter || 'Not set'}
                            </div>
                          </div>
                          <div className="bg-background/80 p-3 rounded-lg border border-primary/10">
                            <div className="text-xs text-muted-foreground mb-1">
                              Active (Runtime Service)
                            </div>
                            <div className="font-medium">
                              {printerDiagnostics.configuredPrinter || 'Not set'}
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2 pt-2">
                          <Badge
                            variant={
                              printerDiagnostics.checks.printerSelected ? 'default' : 'destructive'
                            }
                            className="px-2 py-1"
                          >
                            {printerDiagnostics.checks.printerSelected
                              ? 'Printer selected'
                              : 'No printer selected'}
                          </Badge>
                          <Badge
                            variant={
                              printerDiagnostics.checks.serviceBoundToSelection
                                ? 'default'
                                : 'destructive'
                            }
                            className="px-2 py-1"
                          >
                            {printerDiagnostics.checks.serviceBoundToSelection
                              ? 'Runtime bound'
                              : 'Runtime mismatch'}
                          </Badge>
                          <Badge
                            variant={
                              printerDiagnostics.checks.selectedExistsInSystem
                                ? 'default'
                                : 'destructive'
                            }
                            className="px-2 py-1"
                          >
                            {printerDiagnostics.checks.selectedExistsInSystem
                              ? 'Found in Windows'
                              : 'Not in Windows list'}
                          </Badge>
                          <Badge
                            variant={
                              printerDiagnostics.checks.windowsReportsOffline
                                ? 'destructive'
                                : 'default'
                            }
                            className="px-2 py-1"
                          >
                            {printerDiagnostics.checks.windowsReportsOffline
                              ? 'Windows says offline'
                              : 'Windows not offline'}
                          </Badge>
                        </div>

                        {printerDiagnostics.windowsDetails && (
                          <div className="rounded-lg border border-border bg-background/50 p-3 text-xs space-y-2 mt-4">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Driver:</span>
                              <span className="font-medium">
                                {printerDiagnostics.windowsDetails.driverName || 'Unknown'}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Port:</span>
                              <span className="font-medium">
                                {printerDiagnostics.windowsDetails.portName || 'Unknown'}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Default Printer:</span>
                              <span className="font-medium">
                                {printerDiagnostics.windowsDetails.isDefault ? 'Yes' : 'No'}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Printer Status Code:</span>
                              <span className="font-medium">
                                {printerDiagnostics.windowsDetails.printerStatus ?? 'Unknown'}
                              </span>
                            </div>
                          </div>
                        )}

                        {printerDiagnostics.recommendations.length > 0 && (
                          <div className="rounded-lg border-2 border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 space-y-2 mt-4 shadow-sm">
                            <div className="font-semibold flex items-center gap-2">
                              <AlertCircle className="h-4 w-4" /> Recommended Actions
                            </div>
                            <ul className="list-disc list-inside space-y-1 ml-1 text-amber-800">
                              {printerDiagnostics.recommendations.map((tip, idx) => (
                                <li key={idx}>{tip}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            {/* ===================== BARCODE TAB ===================== */}
            {activeTab === 'barcode' && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Barcode className="h-5 w-5" />
                    Barcode Label Layout
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Left Panel: Options */}
                    <div className="space-y-4">
                      {/* SECTION 1: Content Visibility */}
                      <div className="border border-border/80 rounded-xl overflow-hidden shadow-sm bg-card transition-all">
                        <button
                          type="button"
                          onClick={() =>
                            setBarcodeAccordion(
                              barcodeAccordion === 'visibility' ? null : 'visibility'
                            )
                          }
                          className="flex items-center justify-between w-full p-4 font-semibold text-sm hover:bg-accent/40 text-left transition-colors"
                        >
                          <div className="flex items-center gap-2.5">
                            <Barcode className="h-4.5 w-4.5 text-primary" />
                            <span>1. Label Content Visibility</span>
                          </div>
                          <span
                            className={`text-xs text-muted-foreground transition-transform duration-200 ${barcodeAccordion === 'visibility' ? 'rotate-180' : ''}`}
                          >
                            <ChevronDown className="h-4 w-4" />
                          </span>
                        </button>
                        {barcodeAccordion === 'visibility' && (
                          <div className="p-4 border-t border-border/40 bg-muted/5 space-y-4 animate-in slide-in-from-top-2 duration-200">
                            <p className="text-xs text-muted-foreground">
                              Select which fields are displayed on the printed sticky labels.
                            </p>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              {/* Shop Name Switch Card */}
                              <div
                                onClick={() => {
                                  if (settings.barcodeShowSaleName !== 'true') {
                                    updateSetting(
                                      'barcodeShowShopName',
                                      (settings.barcodeShowShopName ?? 'true') === 'true'
                                        ? 'false'
                                        : 'true'
                                    )
                                  }
                                }}
                                className={`flex items-center justify-between p-3 rounded-lg border-2 cursor-pointer transition-all ${settings.barcodeShowSaleName === 'true'
                                    ? 'border-border opacity-50 cursor-not-allowed bg-muted/10'
                                    : (settings.barcodeShowShopName ?? 'true') === 'true'
                                      ? 'border-primary bg-primary/5 shadow-sm'
                                      : 'border-border bg-transparent hover:bg-accent/30'
                                  }`}
                              >
                                <div className="space-y-0.5 select-none">
                                  <div className="text-xs font-bold">Shop Name</div>
                                  <div className="text-[10px] text-muted-foreground">
                                    Print store title
                                  </div>
                                </div>
                                <div
                                  className={`w-8 h-4 rounded-full p-0.5 transition-colors duration-200 flex items-center ${settings.barcodeShowSaleName === 'true'
                                      ? 'bg-muted-foreground/20'
                                      : (settings.barcodeShowShopName ?? 'true') === 'true'
                                        ? 'bg-primary'
                                        : 'bg-muted-foreground/30'
                                    }`}
                                >
                                  <div
                                    className={`w-3 h-3 rounded-full bg-white shadow transition-transform duration-200 ${settings.barcodeShowSaleName !== 'true' &&
                                        (settings.barcodeShowShopName ?? 'true') === 'true'
                                        ? 'translate-x-4'
                                        : 'translate-x-0'
                                      }`}
                                  />
                                </div>
                              </div>

                              {/* Product Name Switch Card */}
                              <div
                                onClick={() =>
                                  updateSetting(
                                    'barcodeShowName',
                                    (settings.barcodeShowName ?? 'true') === 'true'
                                      ? 'false'
                                      : 'true'
                                  )
                                }
                                className={`flex items-center justify-between p-3 rounded-lg border-2 cursor-pointer transition-all ${(settings.barcodeShowName ?? 'true') === 'true'
                                    ? 'border-primary bg-primary/5 shadow-sm'
                                    : 'border-border bg-transparent hover:bg-accent/30'
                                  }`}
                              >
                                <div className="space-y-0.5 select-none">
                                  <div className="text-xs font-bold">Product Name</div>
                                  <div className="text-[10px] text-muted-foreground">
                                    Print product name
                                  </div>
                                </div>
                                <div
                                  className={`w-8 h-4 rounded-full p-0.5 transition-colors duration-200 flex items-center ${(settings.barcodeShowName ?? 'true') === 'true'
                                      ? 'bg-primary'
                                      : 'bg-muted-foreground/30'
                                    }`}
                                >
                                  <div
                                    className={`w-3 h-3 rounded-full bg-white shadow transition-transform duration-200 ${(settings.barcodeShowName ?? 'true') === 'true'
                                        ? 'translate-x-4'
                                        : 'translate-x-0'
                                      }`}
                                  />
                                </div>
                              </div>

                              {/* MRP Switch Card */}
                              <div
                                onClick={() =>
                                  updateSetting(
                                    'barcodeShowMrp',
                                    (settings.barcodeShowMrp ?? 'true') === 'true'
                                      ? 'false'
                                      : 'true'
                                  )
                                }
                                className={`flex items-center justify-between p-3 rounded-lg border-2 cursor-pointer transition-all ${(settings.barcodeShowMrp ?? 'true') === 'true'
                                    ? 'border-primary bg-primary/5 shadow-sm'
                                    : 'border-border bg-transparent hover:bg-accent/30'
                                  }`}
                              >
                                <div className="space-y-0.5 select-none">
                                  <div className="text-xs font-bold">Show MRP</div>
                                  <div className="text-[10px] text-muted-foreground">
                                    Print MRP details
                                  </div>
                                </div>
                                <div
                                  className={`w-8 h-4 rounded-full p-0.5 transition-colors duration-200 flex items-center ${(settings.barcodeShowMrp ?? 'true') === 'true'
                                      ? 'bg-primary'
                                      : 'bg-muted-foreground/30'
                                    }`}
                                >
                                  <div
                                    className={`w-3 h-3 rounded-full bg-white shadow transition-transform duration-200 ${(settings.barcodeShowMrp ?? 'true') === 'true'
                                        ? 'translate-x-4'
                                        : 'translate-x-0'
                                      }`}
                                  />
                                </div>
                              </div>

                              {/* Selling Price Switch Card */}
                              <div
                                onClick={() =>
                                  updateSetting(
                                    'barcodeShowSellingPrice',
                                    (settings.barcodeShowSellingPrice ?? 'true') === 'true'
                                      ? 'false'
                                      : 'true'
                                  )
                                }
                                className={`flex items-center justify-between p-3 rounded-lg border-2 cursor-pointer transition-all ${(settings.barcodeShowSellingPrice ?? 'true') === 'true'
                                    ? 'border-primary bg-primary/5 shadow-sm'
                                    : 'border-border bg-transparent hover:bg-accent/30'
                                  }`}
                              >
                                <div className="space-y-0.5 select-none">
                                  <div className="text-xs font-bold">Selling Price</div>
                                  <div className="text-[10px] text-muted-foreground">
                                    Print active rate
                                  </div>
                                </div>
                                <div
                                  className={`w-8 h-4 rounded-full p-0.5 transition-colors duration-200 flex items-center ${(settings.barcodeShowSellingPrice ?? 'true') === 'true'
                                      ? 'bg-primary'
                                      : 'bg-muted-foreground/30'
                                    }`}
                                >
                                  <div
                                    className={`w-3 h-3 rounded-full bg-white shadow transition-transform duration-200 ${(settings.barcodeShowSellingPrice ?? 'true') === 'true'
                                        ? 'translate-x-4'
                                        : 'translate-x-0'
                                      }`}
                                  />
                                </div>
                              </div>

                              {/* Strike MRP Switch Card */}
                              <div
                                onClick={() => {
                                  if ((settings.barcodeShowMrp ?? 'true') === 'true') {
                                    updateSetting(
                                      'barcodeStrikeMrp',
                                      (settings.barcodeStrikeMrp ?? 'true') === 'true'
                                        ? 'false'
                                        : 'true'
                                    )
                                  }
                                }}
                                className={`flex items-center justify-between p-3 rounded-lg border-2 cursor-pointer transition-all ${(settings.barcodeShowMrp ?? 'true') !== 'true'
                                    ? 'border-border opacity-50 cursor-not-allowed bg-muted/10'
                                    : (settings.barcodeStrikeMrp ?? 'true') === 'true'
                                      ? 'border-primary bg-primary/5 shadow-sm'
                                      : 'border-border bg-transparent hover:bg-accent/30'
                                  }`}
                              >
                                <div className="space-y-0.5 select-none">
                                  <div className="text-xs font-bold">Strike MRP</div>
                                  <div className="text-[10px] text-muted-foreground">
                                    Cross out MRP price
                                  </div>
                                </div>
                                <div
                                  className={`w-8 h-4 rounded-full p-0.5 transition-colors duration-200 flex items-center ${(settings.barcodeShowMrp ?? 'true') !== 'true'
                                      ? 'bg-muted-foreground/20'
                                      : (settings.barcodeStrikeMrp ?? 'true') === 'true'
                                        ? 'bg-primary'
                                        : 'bg-muted-foreground/30'
                                    }`}
                                >
                                  <div
                                    className={`w-3 h-3 rounded-full bg-white shadow transition-transform duration-200 ${(settings.barcodeShowMrp ?? 'true') === 'true' &&
                                        (settings.barcodeStrikeMrp ?? 'true') === 'true'
                                        ? 'translate-x-4'
                                        : 'translate-x-0'
                                      }`}
                                  />
                                </div>
                              </div>

                              {/* Discount % Switch Card */}
                              <div
                                onClick={() =>
                                  updateSetting(
                                    'barcodeShowDiscount',
                                    (settings.barcodeShowDiscount ?? 'true') === 'true'
                                      ? 'false'
                                      : 'true'
                                  )
                                }
                                className={`flex items-center justify-between p-3 rounded-lg border-2 cursor-pointer transition-all ${(settings.barcodeShowDiscount ?? 'true') === 'true'
                                    ? 'border-primary bg-primary/5 shadow-sm'
                                    : 'border-border bg-transparent hover:bg-accent/30'
                                  }`}
                              >
                                <div className="space-y-0.5 select-none">
                                  <div className="text-xs font-bold">Show Discount</div>
                                  <div className="text-[10px] text-muted-foreground">
                                    Print % discount
                                  </div>
                                </div>
                                <div
                                  className={`w-8 h-4 rounded-full p-0.5 transition-colors duration-200 flex items-center ${(settings.barcodeShowDiscount ?? 'true') === 'true'
                                      ? 'bg-primary'
                                      : 'bg-muted-foreground/30'
                                    }`}
                                >
                                  <div
                                    className={`w-3 h-3 rounded-full bg-white shadow transition-transform duration-200 ${(settings.barcodeShowDiscount ?? 'true') === 'true'
                                        ? 'translate-x-4'
                                        : 'translate-x-0'
                                      }`}
                                  />
                                </div>
                              </div>
                            </div>

                            {/* Custom Sale Header Override */}
                            <div className="space-y-2 border-l-2 border-primary/20 pl-4 py-2 mt-2">
                              <div
                                onClick={() =>
                                  updateSetting(
                                    'barcodeShowSaleName',
                                    settings.barcodeShowSaleName === 'true' ? 'false' : 'true'
                                  )
                                }
                                className="flex items-center gap-2.5 cursor-pointer select-none"
                              >
                                <div
                                  className={`w-4 h-4 rounded flex items-center justify-center border ${settings.barcodeShowSaleName === 'true'
                                      ? 'bg-primary border-primary text-white'
                                      : 'border-input bg-transparent'
                                    }`}
                                >
                                  {settings.barcodeShowSaleName === 'true' && (
                                    <span className="text-[10px]">âœ“</span>
                                  )}
                                </div>
                                <Label className="text-xs font-medium cursor-pointer">
                                  Override Shop Name with Custom Sale Name
                                </Label>
                              </div>
                              {settings.barcodeShowSaleName === 'true' && (
                                <div className="pl-6 animate-in slide-in-from-left-2 duration-150 mt-1.5">
                                  <Input
                                    placeholder="e.g. DIWALI SALE"
                                    value={settings.barcodeSaleNameText || ''}
                                    onChange={(e) =>
                                      updateSetting('barcodeSaleNameText', e.target.value)
                                    }
                                    className="h-8 max-w-[220px] text-xs"
                                  />
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* SECTION 2: Dimensions */}
                      <div className="border border-border/80 rounded-xl overflow-hidden shadow-sm bg-card transition-all">
                        <button
                          type="button"
                          onClick={() =>
                            setBarcodeAccordion(
                              barcodeAccordion === 'dimensions' ? null : 'dimensions'
                            )
                          }
                          className="flex items-center justify-between w-full p-4 font-semibold text-sm hover:bg-accent/40 text-left transition-colors"
                        >
                          <div className="flex items-center gap-2.5">
                            <Sliders className="h-4.5 w-4.5 text-primary" />
                            <span>2. Label &amp; Barcode Dimensions</span>
                          </div>
                          <span
                            className={`text-xs text-muted-foreground transition-transform duration-200 ${barcodeAccordion === 'dimensions' ? 'rotate-180' : ''}`}
                          >
                            <ChevronDown className="h-4 w-4" />
                          </span>
                        </button>
                        {barcodeAccordion === 'dimensions' && (
                          <div className="p-4 border-t border-border/40 bg-muted/5 space-y-4 animate-in slide-in-from-top-2 duration-200">
                            <p className="text-xs text-muted-foreground">
                              Configure the physical label preset size and customize scannable
                              barcode lines.
                            </p>

                            {/* Label size */}
                            <div className="space-y-1.5 max-w-[260px]">
                              <Label htmlFor="barcodeLabelSize" className="text-xs font-semibold">
                                Default Label Size
                              </Label>
                              <select
                                id="barcodeLabelSize"
                                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-xs shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                value={settings.barcodeLabelSize || '46x25'}
                                onChange={(e) => {
                                  const val = e.target.value
                                  updateSetting('barcodeLabelSize', val)
                                  updateSetting('barcodeHeight', val === '60x40' ? '12.0' : '5.5')
                                }}
                              >
                                <option value="46x25">LP46 Standard (46 x 25 mm)</option>
                                <option value="60x40">Large (60 x 40 mm)</option>
                              </select>
                            </div>

                            <Separator className="bg-border/30 my-2" />

                            {/* Barcode Width */}
                            <div className="space-y-1.5 max-w-[280px]">
                              <div className="flex items-center justify-between text-xs font-medium">
                                <Label htmlFor="barcodeWidthSlider">Barcode Width (%)</Label>
                                <span className="font-mono text-primary font-bold">
                                  {settings.barcodeWidth || '75'}%
                                </span>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="text-[10px] text-muted-foreground font-semibold">
                                  50%
                                </span>
                                <input
                                  id="barcodeWidthSlider"
                                  type="range"
                                  min="50"
                                  max="100"
                                  step="5"
                                  value={parseInt(settings.barcodeWidth || '75')}
                                  onChange={(e) => updateSetting('barcodeWidth', e.target.value)}
                                  className="w-full h-1.5 bg-accent rounded-lg appearance-none cursor-pointer accent-primary"
                                />
                                <span className="text-[10px] text-muted-foreground font-semibold">
                                  100%
                                </span>
                              </div>
                            </div>

                            {/* Barcode Height */}
                            <div className="space-y-1.5 max-w-[280px]">
                              <div className="flex items-center justify-between text-xs font-medium">
                                <Label htmlFor="barcodeHeightSlider">Barcode Height (mm)</Label>
                                <span className="font-mono text-primary font-bold">
                                  {parseFloat(settings.barcodeHeight || '5.5').toFixed(1)} mm
                                </span>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="text-[10px] text-muted-foreground font-semibold">
                                  3.0 mm
                                </span>
                                <input
                                  id="barcodeHeightSlider"
                                  type="range"
                                  min="3.0"
                                  max="15.0"
                                  step="0.5"
                                  value={parseFloat(settings.barcodeHeight || '5.5')}
                                  onChange={(e) => updateSetting('barcodeHeight', e.target.value)}
                                  className="w-full h-1.5 bg-accent rounded-lg appearance-none cursor-pointer accent-primary"
                                />
                                <span className="text-[10px] text-muted-foreground font-semibold">
                                  15.0 mm
                                </span>
                              </div>
                            </div>

                            {/* Reset Dimensions */}
                            {(settings.barcodeWidth !== '75' ||
                              settings.barcodeHeight !==
                              (settings.barcodeLabelSize === '60x40' ? '12.0' : '5.5')) && (
                                <Button
                                  variant="ghost"
                                  type="button"
                                  size="sm"
                                  onClick={() => {
                                    updateSetting('barcodeWidth', '75')
                                    updateSetting(
                                      'barcodeHeight',
                                      settings.barcodeLabelSize === '60x40' ? '12.0' : '5.5'
                                    )
                                  }}
                                  className="h-7 text-[11px] text-muted-foreground hover:text-foreground hover:bg-accent px-2 py-0 mt-1 gap-1"
                                >
                                  <RotateCcw className="h-3 w-3" />
                                  Reset Dimensions
                                </Button>
                              )}
                          </div>
                        )}
                      </div>

                      {/* SECTION 3: Advanced Layout & Typography */}
                      <div className="border border-border/80 rounded-xl overflow-hidden shadow-sm bg-card transition-all">
                        <button
                          type="button"
                          onClick={() =>
                            setBarcodeAccordion(
                              barcodeAccordion === 'typography' ? null : 'typography'
                            )
                          }
                          className="flex items-center justify-between w-full p-4 font-semibold text-sm hover:bg-accent/40 text-left transition-colors"
                        >
                          <div className="flex items-center gap-2.5">
                            <Plus className="h-4.5 w-4.5 text-primary" />
                            <span>3. Advanced Layout &amp; Typography</span>
                          </div>
                          <span
                            className={`text-xs text-muted-foreground transition-transform duration-200 ${barcodeAccordion === 'typography' ? 'rotate-180' : ''}`}
                          >
                            <ChevronDown className="h-4 w-4" />
                          </span>
                        </button>
                        {barcodeAccordion === 'typography' && (
                          <div className="p-4 border-t border-border/40 bg-muted/5 space-y-4 animate-in slide-in-from-top-2 duration-200">
                            <p className="text-xs text-muted-foreground">
                              Fine-tune alignments, font sizes, margins, and gaps for each printed
                              label element.
                            </p>

                            {/* 1. Toggle SKU Code */}
                            <div className="flex items-center gap-2.5 py-1">
                              <div
                                onClick={() =>
                                  updateSetting(
                                    'barcodeShowCode',
                                    (settings.barcodeShowCode ?? 'true') === 'true'
                                      ? 'false'
                                      : 'true'
                                  )
                                }
                                className="flex items-center gap-2.5 cursor-pointer select-none"
                              >
                                <div
                                  className={`w-4 h-4 rounded flex items-center justify-center border ${(settings.barcodeShowCode ?? 'true') === 'true'
                                      ? 'bg-primary border-primary text-white'
                                      : 'border-input bg-transparent'
                                    }`}
                                >
                                  {(settings.barcodeShowCode ?? 'true') === 'true' && (
                                    <span className="text-[10px]">✓</span>
                                  )}
                                </div>
                                <Label className="text-xs cursor-pointer">
                                  Show SKU Code beneath Barcode
                                </Label>
                              </div>
                            </div>

                            <Separator className="bg-border/30 my-2" />

                            {/* Alignments section */}
                            <div className="space-y-2.5 max-w-[280px]">
                              <h4 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                                Alignments
                              </h4>

                              {/* Shop Name Align */}
                              <div className="flex items-center justify-between gap-4">
                                <Label className="text-xs">Shop Name</Label>
                                <select
                                  className="h-7 rounded border bg-background px-2 text-[11px] outline-none"
                                  value={settings.barcodeShopAlign || 'right'}
                                  onChange={(e) =>
                                    updateSetting('barcodeShopAlign', e.target.value)
                                  }
                                >
                                  <option value="left">Left</option>
                                  <option value="center">Center</option>
                                  <option value="right">Right</option>
                                </select>
                              </div>

                              {/* Product Name Align */}
                              <div className="flex items-center justify-between gap-4">
                                <Label className="text-xs">Product Name</Label>
                                <select
                                  className="h-7 rounded border bg-background px-2 text-[11px] outline-none"
                                  value={settings.barcodeNameAlign || 'left'}
                                  onChange={(e) =>
                                    updateSetting('barcodeNameAlign', e.target.value)
                                  }
                                >
                                  <option value="left">Left</option>
                                  <option value="center">Center</option>
                                  <option value="right">Right</option>
                                </select>
                              </div>

                              {/* Price Row Align */}
                              <div className="flex items-center justify-between gap-4">
                                <Label className="text-xs">Price Row</Label>
                                <select
                                  className="h-7 rounded border bg-background px-2 text-[11px] outline-none"
                                  value={settings.barcodePriceAlign || 'left'}
                                  onChange={(e) =>
                                    updateSetting('barcodePriceAlign', e.target.value)
                                  }
                                >
                                  <option value="left">Left</option>
                                  <option value="center">Center</option>
                                  <option value="right">Right</option>
                                </select>
                              </div>

                              {/* SKU Align */}
                              <div className="flex items-center justify-between gap-4">
                                <Label className="text-xs">SKU Code</Label>
                                <select
                                  className="h-7 rounded border bg-background px-2 text-[11px] outline-none"
                                  value={settings.barcodeCodeAlign || 'center'}
                                  onChange={(e) =>
                                    updateSetting('barcodeCodeAlign', e.target.value)
                                  }
                                >
                                  <option value="left">Left</option>
                                  <option value="center">Center</option>
                                  <option value="right">Right</option>
                                </select>
                              </div>
                            </div>

                            <Separator className="bg-border/30 my-2" />

                            {/* Font Sizes section */}
                            <div className="space-y-2.5 max-w-[280px]">
                              <h4 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                                Font Sizes (pt)
                              </h4>

                              {/* Shop Name Font Size */}
                              <div className="flex items-center justify-between gap-4">
                                <Label className="text-xs">Shop Name</Label>
                                <div className="flex items-center gap-1.5">
                                  <input
                                    type="text"
                                    placeholder="Default"
                                    className="w-16 h-7 text-center rounded border text-[11px] bg-background"
                                    value={
                                      settings.barcodeShopFontSize === 'default'
                                        ? ''
                                        : settings.barcodeShopFontSize || ''
                                    }
                                    onChange={(e) => {
                                      const val = e.target.value.trim()
                                      updateSetting(
                                        'barcodeShopFontSize',
                                        val === '' ? 'default' : val
                                      )
                                    }}
                                  />
                                  <span className="text-[10px] text-muted-foreground">pt</span>
                                </div>
                              </div>

                              {/* Product Name Font Size */}
                              <div className="flex items-center justify-between gap-4">
                                <Label className="text-xs">Product Name</Label>
                                <div className="flex items-center gap-1.5">
                                  <input
                                    type="text"
                                    placeholder="Default"
                                    className="w-16 h-7 text-center rounded border text-[11px] bg-background"
                                    value={
                                      settings.barcodeNameFontSize === 'default'
                                        ? ''
                                        : settings.barcodeNameFontSize || ''
                                    }
                                    onChange={(e) => {
                                      const val = e.target.value.trim()
                                      updateSetting(
                                        'barcodeNameFontSize',
                                        val === '' ? 'default' : val
                                      )
                                    }}
                                  />
                                  <span className="text-[10px] text-muted-foreground">pt</span>
                                </div>
                              </div>

                              {/* Price Row Font Size */}
                              <div className="flex items-center justify-between gap-4">
                                <Label className="text-xs">Price Row</Label>
                                <div className="flex items-center gap-1.5">
                                  <input
                                    type="text"
                                    placeholder="Default"
                                    className="w-16 h-7 text-center rounded border text-[11px] bg-background"
                                    value={
                                      settings.barcodePriceFontSize === 'default'
                                        ? ''
                                        : settings.barcodePriceFontSize || ''
                                    }
                                    onChange={(e) => {
                                      const val = e.target.value.trim()
                                      updateSetting(
                                        'barcodePriceFontSize',
                                        val === '' ? 'default' : val
                                      )
                                    }}
                                  />
                                  <span className="text-[10px] text-muted-foreground">pt</span>
                                </div>
                              </div>

                              {/* SKU Code Font Size */}
                              <div className="flex items-center justify-between gap-4">
                                <Label className="text-xs">SKU Code</Label>
                                <div className="flex items-center gap-1.5">
                                  <input
                                    type="text"
                                    placeholder="Default"
                                    className="w-16 h-7 text-center rounded border text-[11px] bg-background"
                                    value={
                                      settings.barcodeCodeFontSize === 'default'
                                        ? ''
                                        : settings.barcodeCodeFontSize || ''
                                    }
                                    onChange={(e) => {
                                      const val = e.target.value.trim()
                                      updateSetting(
                                        'barcodeCodeFontSize',
                                        val === '' ? 'default' : val
                                      )
                                    }}
                                  />
                                  <span className="text-[10px] text-muted-foreground">pt</span>
                                </div>
                              </div>
                            </div>

                            <Separator className="bg-border/30 my-2" />

                            {/* Margins & Gaps section */}
                            <div className="space-y-2.5 max-w-[280px]">
                              <h4 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                                Margins &amp; Spacing
                              </h4>

                              {/* Horizontal Padding */}
                              <div className="space-y-1">
                                <div className="flex items-center justify-between text-xs">
                                  <Label>Horiz. Padding (X)</Label>
                                  <span className="font-mono font-bold text-primary text-[10px]">
                                    {settings.barcodePaddingX === 'default' ||
                                      !settings.barcodePaddingX
                                      ? 'Default'
                                      : `${settings.barcodePaddingX} mm`}
                                  </span>
                                </div>
                                <input
                                  type="range"
                                  min="0.0"
                                  max="8.0"
                                  step="0.5"
                                  value={
                                    settings.barcodePaddingX === 'default' ||
                                      !settings.barcodePaddingX
                                      ? 0
                                      : parseFloat(settings.barcodePaddingX)
                                  }
                                  onChange={(e) =>
                                    updateSetting(
                                      'barcodePaddingX',
                                      e.target.value === '0' ? 'default' : e.target.value
                                    )
                                  }
                                  className="w-full h-1 bg-accent rounded-lg appearance-none cursor-pointer accent-primary"
                                />
                              </div>

                              {/* Vertical Padding */}
                              <div className="space-y-1">
                                <div className="flex items-center justify-between text-xs">
                                  <Label>Vert. Padding (Y)</Label>
                                  <span className="font-mono font-bold text-primary text-[10px]">
                                    {settings.barcodePaddingY === 'default' ||
                                      !settings.barcodePaddingY
                                      ? 'Default'
                                      : `${settings.barcodePaddingY} mm`}
                                  </span>
                                </div>
                                <input
                                  type="range"
                                  min="0.0"
                                  max="8.0"
                                  step="0.5"
                                  value={
                                    settings.barcodePaddingY === 'default' ||
                                      !settings.barcodePaddingY
                                      ? 0
                                      : parseFloat(settings.barcodePaddingY)
                                  }
                                  onChange={(e) =>
                                    updateSetting(
                                      'barcodePaddingY',
                                      e.target.value === '0' ? 'default' : e.target.value
                                    )
                                  }
                                  className="w-full h-1 bg-accent rounded-lg appearance-none cursor-pointer accent-primary"
                                />
                              </div>

                              {/* Element Gap */}
                              <div className="space-y-1">
                                <div className="flex items-center justify-between text-xs">
                                  <Label>Element Gap</Label>
                                  <span className="font-mono font-bold text-primary text-[10px]">
                                    {settings.barcodeGap === 'default' || !settings.barcodeGap
                                      ? 'Default'
                                      : `${settings.barcodeGap} mm`}
                                  </span>
                                </div>
                                <input
                                  type="range"
                                  min="0.0"
                                  max="6.0"
                                  step="0.5"
                                  value={
                                    settings.barcodeGap === 'default' || !settings.barcodeGap
                                      ? 0
                                      : parseFloat(settings.barcodeGap)
                                  }
                                  onChange={(e) =>
                                    updateSetting(
                                      'barcodeGap',
                                      e.target.value === '0' ? 'default' : e.target.value
                                    )
                                  }
                                  className="w-full h-1 bg-accent rounded-lg appearance-none cursor-pointer accent-primary"
                                />
                              </div>
                            </div>

                            {/* Reset button */}
                            <Button
                              variant="ghost"
                              type="button"
                              size="sm"
                              onClick={() => {
                                updateSetting('barcodeShopFontSize', 'default')
                                updateSetting('barcodeNameFontSize', 'default')
                                updateSetting('barcodePriceFontSize', 'default')
                                updateSetting('barcodeCodeFontSize', 'default')
                                updateSetting('barcodeShopAlign', 'right')
                                updateSetting('barcodeNameAlign', 'left')
                                updateSetting('barcodePriceAlign', 'left')
                                updateSetting('barcodeCodeAlign', 'center')
                                updateSetting('barcodePaddingX', 'default')
                                updateSetting('barcodePaddingY', 'default')
                                updateSetting('barcodeGap', 'default')
                                updateSetting('barcodeShowCode', 'true')
                              }}
                              className="w-full h-7 text-[10px] text-muted-foreground hover:text-foreground hover:bg-accent border mt-2 gap-1"
                            >
                              <RotateCcw className="h-3 w-3" />
                              Reset Advanced Styles
                            </Button>
                          </div>
                        )}
                      </div>

                      {/* SECTION 4: Calibration */}
                      <div className="border border-border/80 rounded-xl overflow-hidden shadow-sm bg-card transition-all">
                        <button
                          type="button"
                          onClick={() =>
                            setBarcodeAccordion(
                              barcodeAccordion === 'calibration' ? null : 'calibration'
                            )
                          }
                          className="flex items-center justify-between w-full p-4 font-semibold text-sm hover:bg-accent/40 text-left transition-colors"
                        >
                          <div className="flex items-center gap-2.5">
                            <Edit className="h-4.5 w-4.5 text-primary" />
                            <span>4. Printer Alignment Calibration</span>
                          </div>
                          <span
                            className={`text-xs text-muted-foreground transition-transform duration-200 ${barcodeAccordion === 'calibration' ? 'rotate-180' : ''}`}
                          >
                            <ChevronDown className="h-4 w-4" />
                          </span>
                        </button>
                        {barcodeAccordion === 'calibration' && (
                          <div className="p-4 border-t border-border/40 bg-muted/5 space-y-4 animate-in slide-in-from-top-2 duration-200">
                            <p className="text-xs text-muted-foreground">
                              Fine-tune printing position in millimeters if the printed label is cut
                              off or misaligned.
                            </p>

                            {/* Horizontal Nudge (X) */}
                            <div className="space-y-1.5 max-w-[280px]">
                              <div className="flex items-center justify-between text-xs font-medium">
                                <Label htmlFor="nudgeXSlider">Horizontal Nudge (X-Axis)</Label>
                                <span className="font-mono text-primary font-bold">
                                  {(() => {
                                    const val = parseFloat(settings.barcodeNudgeX || '0.0')
                                    if (val === 0) return '0.0 mm (Centered)'
                                    return `${val > 0 ? '+' : ''}${val.toFixed(1)} mm`
                                  })()}
                                </span>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="text-[10px] text-muted-foreground font-semibold">
                                  Left
                                </span>
                                <input
                                  id="nudgeXSlider"
                                  type="range"
                                  min="-5.0"
                                  max="5.0"
                                  step="0.5"
                                  value={parseFloat(settings.barcodeNudgeX || '0.0')}
                                  onChange={(e) => updateSetting('barcodeNudgeX', e.target.value)}
                                  className="w-full h-1.5 bg-accent rounded-lg appearance-none cursor-pointer accent-primary"
                                />
                                <span className="text-[10px] text-muted-foreground font-semibold">
                                  Right
                                </span>
                              </div>
                            </div>

                            {/* Vertical Nudge (Y) */}
                            <div className="space-y-1.5 max-w-[280px]">
                              <div className="flex items-center justify-between text-xs font-medium">
                                <Label htmlFor="nudgeYSlider">Vertical Nudge (Y-Axis)</Label>
                                <span className="font-mono text-primary font-bold">
                                  {(() => {
                                    const val = parseFloat(settings.barcodeNudgeY || '0.0')
                                    if (val === 0) return '0.0 mm (Centered)'
                                    return `${val > 0 ? '+' : ''}${val.toFixed(1)} mm`
                                  })()}
                                </span>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="text-[10px] text-muted-foreground font-semibold">
                                  Up
                                </span>
                                <input
                                  id="nudgeYSlider"
                                  type="range"
                                  min="-5.0"
                                  max="5.0"
                                  step="0.5"
                                  value={parseFloat(settings.barcodeNudgeY || '0.0')}
                                  onChange={(e) => updateSetting('barcodeNudgeY', e.target.value)}
                                  className="w-full h-1.5 bg-accent rounded-lg appearance-none cursor-pointer accent-primary"
                                />
                                <span className="text-[10px] text-muted-foreground font-semibold">
                                  Down
                                </span>
                              </div>
                            </div>

                            {/* Reset Calibration */}
                            {(settings.barcodeNudgeX !== '0.0' ||
                              settings.barcodeNudgeY !== '0.0') && (
                                <Button
                                  variant="ghost"
                                  type="button"
                                  size="sm"
                                  onClick={() => {
                                    updateSetting('barcodeNudgeX', '0.0')
                                    updateSetting('barcodeNudgeY', '0.0')
                                  }}
                                  className="h-7 text-[11px] text-muted-foreground hover:text-foreground hover:bg-accent px-2 py-0 mt-1 gap-1"
                                >
                                  <RotateCcw className="h-3 w-3" />
                                  Reset Calibration
                                </Button>
                              )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right Panel: Live Preview Card */}
                    <div className="flex flex-col items-center justify-center p-6 bg-muted/30 border border-dashed rounded-xl gap-3">
                      <Label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                        Live Barcode Preview
                      </Label>{' '}
                      {(() => {
                        const isLargeLabel = settings.barcodeLabelSize === '60x40'
                        const nudgeX = parseFloat(settings.barcodeNudgeX || '0.0') || 0
                        const nudgeY = parseFloat(settings.barcodeNudgeY || '0.0') || 0
                        const shiftX = nudgeX * 3.5
                        const shiftY = nudgeY * 3.5

                        // Map barcode width settings to standard Tailwind classes to ensure they are compiled
                        const widthClassMap: Record<string, string> = {
                          '50': 'w-[50%]',
                          '55': 'w-[55%]',
                          '60': 'w-[60%]',
                          '65': 'w-[65%]',
                          '70': 'w-[70%]',
                          '75': 'w-[75%]',
                          '80': 'w-[80%]',
                          '85': 'w-[85%]',
                          '90': 'w-[90%]',
                          '95': 'w-[95%]',
                          '100': 'w-[100%]'
                        }
                        const widthClass = widthClassMap[settings.barcodeWidth || '75'] || 'w-[75%]'

                        // Calculate dynamic paddings & gaps for high-fidelity screen emulation (1mm ~ 6.5px)
                        const scale = 300 / (isLargeLabel ? 60 : 46) // px per mm
                        const padX =
                          settings.barcodePaddingX && settings.barcodePaddingX !== 'default'
                            ? parseFloat(settings.barcodePaddingX) * scale
                            : isLargeLabel
                              ? 3 * scale
                              : 1.5 * scale
                        const padY =
                          settings.barcodePaddingY && settings.barcodePaddingY !== 'default'
                            ? parseFloat(settings.barcodePaddingY) * scale
                            : isLargeLabel
                              ? 2 * scale
                              : 1 * scale
                        const gapPx =
                          settings.barcodeGap && settings.barcodeGap !== 'default'
                            ? parseFloat(settings.barcodeGap) * scale
                            : isLargeLabel
                              ? 1.5 * scale
                              : 0.8 * scale

                        // Calculate dynamic font sizes (default scaling maps pt to px)
                        const fontScale = isLargeLabel ? 13 / 11 : 1.0
                        const shopFontSize =
                          settings.barcodeShopFontSize && settings.barcodeShopFontSize !== 'default'
                            ? `${parseFloat(settings.barcodeShopFontSize) * 1.3 * fontScale}px`
                            : isLargeLabel
                              ? '13px'
                              : '11px'
                        const nameFontSize =
                          settings.barcodeNameFontSize && settings.barcodeNameFontSize !== 'default'
                            ? `${parseFloat(settings.barcodeNameFontSize) * 1.3 * fontScale}px`
                            : isLargeLabel
                              ? '18px'
                              : '14.5px'
                        const priceRowFontSize =
                          settings.barcodePriceFontSize &&
                            settings.barcodePriceFontSize !== 'default'
                            ? `${parseFloat(settings.barcodePriceFontSize) * 1.3 * fontScale}px`
                            : isLargeLabel
                              ? '14px'
                              : '12px'
                        const mrpFontSize =
                          settings.barcodePriceFontSize &&
                            settings.barcodePriceFontSize !== 'default'
                            ? `${parseFloat(settings.barcodePriceFontSize) * 1.3 * fontScale * 0.85}px`
                            : isLargeLabel
                              ? '13px'
                              : '11px'
                        const spFontSize =
                          settings.barcodePriceFontSize &&
                            settings.barcodePriceFontSize !== 'default'
                            ? `${parseFloat(settings.barcodePriceFontSize) * 1.3 * fontScale * 1.15}px`
                            : isLargeLabel
                              ? '17px'
                              : '14.5px'
                        const discountFontSize =
                          settings.barcodePriceFontSize &&
                            settings.barcodePriceFontSize !== 'default'
                            ? `${parseFloat(settings.barcodePriceFontSize) * 1.3 * fontScale * 0.85}px`
                            : isLargeLabel
                              ? '13px'
                              : '11px'
                        const codeFontSize =
                          settings.barcodeCodeFontSize && settings.barcodeCodeFontSize !== 'default'
                            ? `${parseFloat(settings.barcodeCodeFontSize) * 1.3 * fontScale}px`
                            : isLargeLabel
                              ? '12px'
                              : '10.5px'

                        return (
                          <div className="relative border border-muted-foreground/20 rounded-lg p-2 bg-muted/20 shadow-inner">
                            <div
                              className="overflow-hidden border border-muted-foreground/30 rounded bg-white shadow-sm"
                              style={{
                                width: '302px',
                                height: isLargeLabel ? '202px' : '165px'
                              }}
                            >
                              <div
                                className="w-[300px] bg-white text-black flex flex-col justify-between select-none font-sans transition-all duration-300"
                                style={{
                                  height: isLargeLabel ? '200px' : '163px',
                                  padding: `${padY}px ${padX}px`,
                                  gap: `${gapPx}px`,
                                  transform: `translate(${shiftX}px, ${shiftY}px)`
                                }}
                              >
                                {/* 1. Header (Shop Name or Sale Name) */}
                                {settings.barcodeShowSaleName === 'true' ||
                                  (settings.barcodeShowShopName ?? 'true') === 'true' ? (
                                  <div
                                    className="font-black uppercase tracking-wider truncate max-w-full"
                                    style={{
                                      fontSize: shopFontSize,
                                      textAlign: toTextAlign(settings.barcodeShopAlign, 'right')
                                    }}
                                  >
                                    {settings.barcodeShowSaleName === 'true'
                                      ? settings.barcodeSaleNameText || 'DIWALI SALE'
                                      : settings.shopName || 'KRISHNAPRIYA TEXTILES'}
                                  </div>
                                ) : (
                                  <div style={{ height: shopFontSize }} />
                                )}

                                {/* 2. Product Name */}
                                {(settings.barcodeShowName ?? 'true') === 'true' ? (
                                  <div
                                    className="font-bold leading-tight tracking-tight truncate max-w-full"
                                    style={{
                                      fontSize: nameFontSize,
                                      textAlign: toTextAlign(settings.barcodeNameAlign, 'left'),
                                      marginTop: isLargeLabel ? '0px' : '-2px'
                                    }}
                                  >
                                    Cotton Saree
                                  </div>
                                ) : (
                                  <div style={{ height: nameFontSize }} />
                                )}

                                {/* 3. Pricing details */}
                                <div
                                  className="flex flex-row items-center gap-2 whitespace-nowrap overflow-hidden"
                                  style={{
                                    fontSize: priceRowFontSize,
                                    justifyContent:
                                      settings.barcodePriceAlign === 'center'
                                        ? 'center'
                                        : settings.barcodePriceAlign === 'right'
                                          ? 'flex-end'
                                          : 'flex-start'
                                  }}
                                >
                                  {(settings.barcodeShowMrp ?? 'true') === 'true' && (
                                    <span
                                      className={`relative inline-flex items-center text-black ${(settings.barcodeStrikeMrp ?? 'true') === 'true'
                                          ? 'font-semibold'
                                          : 'font-bold'
                                        }`}
                                      style={{ fontSize: mrpFontSize }}
                                    >
                                      <span>â‚¹2000.00</span>
                                      {(settings.barcodeStrikeMrp ?? 'true') === 'true' && (
                                        <span
                                          className="absolute left-0 right-0 bg-black pointer-events-none"
                                          style={{ height: '1px', top: '50%' }}
                                        />
                                      )}
                                    </span>
                                  )}
                                  {(settings.barcodeShowSellingPrice ?? 'true') === 'true' && (
                                    <span
                                      className="font-black text-black"
                                      style={{ fontSize: spFontSize }}
                                    >
                                      â‚¹1799.00
                                    </span>
                                  )}
                                  {(settings.barcodeShowDiscount ?? 'true') === 'true' && (
                                    <span
                                      className="font-bold text-black"
                                      style={{ fontSize: discountFontSize }}
                                    >
                                      (10% OFF)
                                    </span>
                                  )}
                                </div>

                                {/* 4. Barcode graphic */}
                                <div className="flex flex-col items-center justify-center mt-auto">
                                  <div
                                    className={`flex items-end justify-center gap-[1px] px-1 ${widthClass}`}
                                    style={{
                                      height: `${parseFloat(settings.barcodeHeight || '5.5') * 5}px`
                                    }}
                                  >
                                    {[
                                      2, 1, 3, 1, 2, 4, 1, 2, 1, 3, 2, 1, 4, 1, 2, 3, 1, 2, 1, 3, 1,
                                      2, 1, 2, 1, 3, 1, 2, 4, 1, 2, 1, 3, 2, 1, 4, 1, 2, 3, 1, 2, 1,
                                      3, 1
                                    ].map((w, idx) => (
                                      <div
                                        key={idx}
                                        className="bg-black h-full"
                                        style={{ width: `${w}px` }}
                                      />
                                    ))}
                                  </div>
                                  {(settings.barcodeShowCode ?? 'true') === 'true' && (
                                    <div
                                      className="font-mono tracking-widest font-bold text-center"
                                      style={{
                                        fontSize: codeFontSize,
                                        textAlign: toTextAlign(settings.barcodeCodeAlign, 'center'),
                                        marginTop: isLargeLabel ? '5px' : '3px'
                                      }}
                                    >
                                      KPT-GEN-00004
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        )
                      })()}
                      <p className="text-[10px] text-muted-foreground text-center max-w-[240px]">
                        This represents a standard{' '}
                        {settings.barcodeLabelSize === '60x40'
                          ? '60x40mm large'
                          : '46x25mm sticky thermal'}{' '}
                        barcode label preview.
                      </p>
                      <Button
                        variant="outline"
                        onClick={handleTestPrintLabel}
                        className="w-full max-w-[240px] border-2 hover:bg-primary/5 hover:text-primary transition-colors mt-2"
                        disabled={printingTestLabel}
                      >
                        {printingTestLabel ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <Printer className="h-4 w-4 mr-2" />
                        )}
                        Test Print Label
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* ===================== RECEIPT TAB ===================== */}
            {activeTab === 'receipt' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <Card className="border-border/50 shadow-sm overflow-hidden">
                  <CardHeader className="bg-muted/20 border-b border-border/50 pb-4">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <FileText className="h-5 w-5 text-primary" />
                      Receipt Customization
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                      {/* Left Column: Footer Selection Controls & Preferences */}
                      <div className="lg:col-span-7 space-y-6">
                        {/* Footer Config */}
                        <div className="space-y-4">
                          <div className="space-y-1">
                            <Label className="text-base font-bold text-foreground">
                              Exchange Policy &amp; Footer
                            </Label>
                            <p className="text-xs text-muted-foreground">
                              Customize the footer policy printed at the bottom of customer
                              receipts.
                            </p>
                          </div>

                          {/* Segmented Control */}
                          <div className="grid grid-cols-3 gap-1 bg-muted/60 p-1 rounded-xl border border-border/40">
                            <button
                              type="button"
                              onClick={() => {
                                updateSetting('receiptFooterType', 'default')
                                updateSetting(
                                  'receiptFooter',
                                  'Exchange Policy: Goods can be exchanged\nwithin 7 days if accompanied by bill.\nThank You! Come Again.'
                                )
                              }}
                              className={`py-2 text-xs font-semibold rounded-lg transition-all duration-200 ${settings.receiptFooterType !== 'custom' &&
                                  settings.receiptFooterType !== 'none'
                                  ? 'bg-background text-foreground shadow-sm'
                                  : 'text-muted-foreground hover:text-foreground hover:bg-background/30'
                                }`}
                            >
                              Standard Policy
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                updateSetting('receiptFooterType', 'custom')
                                if (
                                  settings.receiptFooter ===
                                  'Exchange Policy: Goods can be exchanged\nwithin 7 days if accompanied by bill.\nThank You! Come Again.'
                                ) {
                                  updateSetting('receiptFooter', '')
                                }
                              }}
                              className={`py-2 text-xs font-semibold rounded-lg transition-all duration-200 ${settings.receiptFooterType === 'custom'
                                  ? 'bg-background text-foreground shadow-sm'
                                  : 'text-muted-foreground hover:text-foreground hover:bg-background/30'
                                }`}
                            >
                              Custom Text
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                updateSetting('receiptFooterType', 'none')
                                updateSetting('receiptFooter', '')
                              }}
                              className={`py-2 text-xs font-semibold rounded-lg transition-all duration-200 ${settings.receiptFooterType === 'none'
                                  ? 'bg-background text-foreground shadow-sm'
                                  : 'text-muted-foreground hover:text-foreground hover:bg-background/30'
                                }`}
                            >
                              No Footer
                            </button>
                          </div>

                          {/* Conditional Options Content */}
                          <div className="pt-1">
                            {settings.receiptFooterType !== 'custom' &&
                              settings.receiptFooterType !== 'none' && (
                                <div className="space-y-3 animate-in fade-in duration-200">
                                  <div className="flex justify-between items-center">
                                    <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                      Standard Exchange Policy (Preview)
                                    </Label>
                                    <Badge className="bg-primary/10 text-primary border-0 text-[10px] font-semibold px-2 py-0.5">
                                      Recommended
                                    </Badge>
                                  </div>
                                  <div className="text-xs text-foreground/80 whitespace-pre-line leading-relaxed bg-muted/30 border border-border p-3.5 rounded-xl font-mono select-all">
                                    Exchange Policy: Goods can be exchanged{'\n'}within 7 days if
                                    accompanied by bill.{'\n'}Thank You! Come Again.
                                  </div>
                                  <p className="text-[11px] text-muted-foreground">
                                    Prints standard store rules containing a 7-day exchange clause.
                                  </p>
                                </div>
                              )}

                            {settings.receiptFooterType === 'custom' && (
                              <div className="space-y-3 animate-in fade-in duration-200">
                                <div className="flex justify-between items-center">
                                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                    Custom Footer Text
                                  </Label>
                                  <span className="text-[10px] text-muted-foreground">
                                    {(settings.receiptFooter || '').length} characters
                                  </span>
                                </div>
                                <textarea
                                  className="w-full min-h-[90px] p-3 text-xs border-2 rounded-xl bg-background border-border/80 focus:border-primary focus:outline-none transition-colors resize-y font-mono"
                                  value={settings.receiptFooter || ''}
                                  onChange={(e) => updateSetting('receiptFooter', e.target.value)}
                                  placeholder="e.g. Thank you for your support! Have a wonderful day!"
                                />
                                {/* Quick Preset Templates */}
                                <div className="space-y-1.5">
                                  <Label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                                    Quick Preset Templates
                                  </Label>
                                  <div className="flex flex-wrap gap-1.5">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      type="button"
                                      className="h-7 text-[10px] px-2.5 rounded-lg border-2 hover:border-primary/50 hover:bg-primary/5 hover:text-primary transition-all duration-200"
                                      onClick={() => {
                                        updateSetting(
                                          'receiptFooter',
                                          'Wishing You & Your Family a Joyful Festive Season!\nThank You for Shopping with Us.'
                                        )
                                      }}
                                    >
                                      ðŸŽ‰ Festive Greetings
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      type="button"
                                      className="h-7 text-[10px] px-2.5 rounded-lg border-2 hover:border-primary/50 hover:bg-primary/5 hover:text-primary transition-all duration-200"
                                      onClick={() => {
                                        updateSetting(
                                          'receiptFooter',
                                          'Thank You for Your Patronage!\nWe Hope to Serve You Again Soon.'
                                        )
                                      }}
                                    >
                                      ðŸ¤ Simple Thank You
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      type="button"
                                      className="h-7 text-[10px] px-2.5 rounded-lg border-2 hover:border-primary/50 hover:bg-primary/5 hover:text-primary transition-all duration-200"
                                      onClick={() => {
                                        updateSetting(
                                          'receiptFooter',
                                          'Items Sold Under Clearance Offer Cannot Be Exchanged.\nThank You for Your Cooperation!'
                                        )
                                      }}
                                    >
                                      Clearance Offer Rules
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            )}

                            {settings.receiptFooterType === 'none' && (
                              <div className="rounded-xl border border-border/60 bg-muted/20 p-4 space-y-1 animate-in fade-in duration-200">
                                <div className="text-xs font-semibold text-foreground">
                                  Footer Disabled
                                </div>
                                <p className="text-[11px] text-muted-foreground leading-relaxed">
                                  No footer notes or policies will be printed. This makes receipts
                                  shorter and saves thermal paper.
                                </p>
                              </div>
                            )}
                          </div>
                        </div>

                        <Separator className="bg-border/50" />

                        {/* Receipt Layout & Behavior Preferences */}
                        <div className="space-y-4 pt-1">
                          <div className="space-y-1">
                            <Label className="text-base font-bold text-foreground">
                              Receipt Format &amp; Automation
                            </Label>
                            <p className="text-xs text-muted-foreground">
                              Configure receipt print sizing and automated print actions.
                            </p>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Paper Width Select */}
                            <div className="space-y-2">
                              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                Paper Width Profile
                              </Label>
                              <select
                                className="flex h-9 w-full rounded-lg border-2 border-input bg-background px-3 py-1 text-xs focus:border-primary focus:outline-none transition-colors"
                                value={settings.receiptPaperWidthMm || '58'}
                                onChange={(e) =>
                                  updateSetting('receiptPaperWidthMm', e.target.value)
                                }
                              >
                                <option value="58">58mm (Standard / Most stable)</option>
                                <option value="72">72mm (Wide Profile)</option>
                                <option value="80">80mm (Maximum Width)</option>
                              </select>
                            </div>

                            {/* Auto Print Toggle */}
                            <div className="flex flex-col justify-end">
                              <label className="flex items-center justify-between h-9 px-3 border-2 rounded-lg border-input hover:bg-accent/40 cursor-pointer transition-colors group">
                                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider group-hover:text-primary transition-colors">
                                  Auto-Print Receipt
                                </span>
                                <div
                                  className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${(settings.autoPrint || 'true') === 'true' ? 'bg-primary' : 'bg-muted-foreground/30'}`}
                                >
                                  <input
                                    type="checkbox"
                                    className="sr-only"
                                    checked={(settings.autoPrint || 'true') === 'true'}
                                    onChange={(e) =>
                                      updateSetting(
                                        'autoPrint',
                                        e.target.checked ? 'true' : 'false'
                                      )
                                    }
                                  />
                                  <span
                                    className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${(settings.autoPrint || 'true') === 'true' ? 'translate-x-4' : 'translate-x-0.5'}`}
                                  />
                                </div>
                              </label>
                            </div>
                          </div>
                          <p className="text-[11px] text-muted-foreground leading-normal">
                            Keep paper width at 58mm if the printout is clipped. Auto-print
                            automatically starts printing immediately when checking out a bill.
                          </p>
                        </div>
                      </div>

                      {/* Right Column: Premium Live Receipt Preview in a Clipboard */}
                      {/* Right Column: Premium Live Receipt Preview */}
                      <div className="lg:col-span-5 flex flex-col items-center justify-start p-2 gap-4">
                        {/* Thermal paper container with jagged rip edge */}
                        <div className="relative drop-shadow-[0_10px_25px_rgba(0,0,0,0.08)] border border-border/80 rounded-t-sm animate-in slide-in-from-top-6 duration-500 ease-out">
                          <div
                            className={`bg-white text-zinc-950 p-5 pb-2 flex flex-col font-mono text-[9.5px] leading-relaxed select-none rounded-t-sm transition-all duration-300 ${previewWidthClass}`}
                          >
                            {/* Header Block */}
                            <div className="text-center space-y-0.5">
                              <div className="font-extrabold text-[12.5px] tracking-wide uppercase">
                                {settings.shopName || 'KRISHNAPRIYA TEXTILES'}
                              </div>
                              <div className="text-[8.5px] leading-tight whitespace-pre-line text-zinc-700 font-medium">
                                {settings.shopAddress ||
                                  'Shidling Complex, Opposite Bus Stand,\nShirahatti 582120, Karnataka'}
                              </div>
                              <div className="text-[8.5px] text-zinc-700 font-medium">
                                Ph: {settings.shopPhone || '9108455006'}
                              </div>
                              {settings.gstin && (
                                <div className="text-[8.5px] text-zinc-700 font-semibold">
                                  GSTIN: {settings.gstin}
                                </div>
                              )}
                            </div>

                            {/* Dashed Separator */}
                            <div className="text-center tracking-[2px] text-zinc-400 select-none py-1 overflow-hidden h-3">
                              ------------------------------
                            </div>

                            {/* Bill details */}
                            <div className="space-y-0.5 text-zinc-800 font-medium">
                              <div>Bill No: KPT/2026-27/00023</div>
                              <div className="flex justify-between">
                                <span>Date: 2026-06-25</span>
                                <span>Time: 00:39:52</span>
                              </div>
                              <div>Customer: Walk-in Customer</div>
                            </div>

                            {/* Dashed Separator */}
                            <div className="text-center tracking-[2px] text-zinc-400 select-none py-1 overflow-hidden h-3">
                              ------------------------------
                            </div>

                            {/* Items Table */}
                            <div className="text-zinc-800 font-medium">
                              <div className="flex justify-between font-bold text-zinc-950">
                                <span className="w-1/2 text-left">Item</span>
                                <span className="w-1/12 text-right">Qty</span>
                                <span className="w-3/12 text-right">Rate</span>
                                <span className="w-3/12 text-right">Amt</span>
                              </div>
                              <div className="flex justify-between mt-1">
                                <span className="w-1/2 truncate text-left">Cotton Saree</span>
                                <span className="w-1/12 text-right">1</span>
                                <span className="w-3/12 text-right">1799.00</span>
                                <span className="w-3/12 text-right">1799.00</span>
                              </div>
                            </div>

                            {/* Dashed Separator */}
                            <div className="text-center tracking-[2px] text-zinc-400 select-none py-1 overflow-hidden h-3">
                              ------------------------------
                            </div>

                            {/* Subtotal */}
                            <div className="flex justify-between font-bold text-zinc-800">
                              <span>Subtotal</span>
                              <span>1799.00</span>
                            </div>

                            {/* Dashed Separator */}
                            <div className="text-center tracking-[2px] text-zinc-400 select-none py-1 overflow-hidden h-3">
                              ------------------------------
                            </div>

                            {/* TOTAL */}
                            <div className="flex justify-between font-black text-zinc-950 text-[12.5px] uppercase">
                              <span>TOTAL</span>
                              <span>Rs.1799.00</span>
                            </div>

                            {/* Dashed Separator */}
                            <div className="text-center tracking-[2px] text-zinc-400 select-none py-1 overflow-hidden h-3">
                              ------------------------------
                            </div>

                            {/* Payment details */}
                            <div className="space-y-0.5 text-zinc-800 font-medium">
                              <div>Payment: UPI</div>
                              <div>Items: 1 | Qty: 1</div>
                            </div>

                            {/* Dashed Separator */}
                            <div className="text-center tracking-[2px] text-zinc-400 select-none py-1 overflow-hidden h-3">
                              ------------------------------
                            </div>

                            {/* QR Code */}
                            <div className="text-center py-1 select-none">
                              <svg
                                width="85"
                                height="85"
                                viewBox="0 0 29 29"
                                className="mx-auto my-1"
                              >
                                <rect x="0" y="0" width="7" height="7" fill="black" />
                                <rect x="1" y="1" width="5" height="5" fill="white" />
                                <rect x="2" y="2" width="3" height="3" fill="black" />
                                <rect x="22" y="0" width="7" height="7" fill="black" />
                                <rect x="23" y="1" width="5" height="5" fill="white" />
                                <rect x="24" y="2" width="3" height="3" fill="black" />
                                <rect x="0" y="22" width="7" height="7" fill="black" />
                                <rect x="1" y="23" width="5" height="5" fill="white" />
                                <rect x="2" y="24" width="3" height="3" fill="black" />
                                <rect x="9" y="1" width="1" height="1" fill="black" />
                                <rect x="11" y="0" width="2" height="1" fill="black" />
                                <rect x="15" y="2" width="1" height="2" fill="black" />
                                <rect x="18" y="1" width="3" height="1" fill="black" />
                                <rect x="8" y="5" width="2" height="2" fill="black" />
                                <rect x="12" y="4" width="1" height="3" fill="black" />
                                <rect x="16" y="6" width="3" height="1" fill="black" />
                                <rect x="20" y="4" width="1" height="2" fill="black" />
                                <rect x="2" y="9" width="3" height="1" fill="black" />
                                <rect x="6" y="8" width="1" height="3" fill="black" />
                                <rect x="9" y="10" width="4" height="2" fill="black" />
                                <rect x="14" y="8" width="2" height="1" fill="black" />
                                <rect x="18" y="9" width="2" height="3" fill="black" />
                                <rect x="23" y="10" width="3" height="1" fill="black" />
                                <rect x="1" y="13" width="2" height="2" fill="black" />
                                <rect x="5" y="14" width="3" height="1" fill="black" />
                                <rect x="10" y="13" width="2" height="3" fill="black" />
                                <rect x="15" y="15" width="4" height="1" fill="black" />
                                <rect x="21" y="13" width="1" height="3" fill="black" />
                                <rect x="25" y="14" width="2" height="2" fill="black" />
                                <rect x="9" y="19" width="2" height="1" fill="black" />
                                <rect x="13" y="18" width="3" height="2" fill="black" />
                                <rect x="19" y="19" width="1" height="3" fill="black" />
                                <rect x="24" y="18" width="4" height="2" fill="black" />
                                <rect x="8" y="24" width="3" height="2" fill="black" />
                                <rect x="13" y="23" width="2" height="1" fill="black" />
                                <rect x="17" y="25" width="4" height="2" fill="black" />
                                <rect x="23" y="22" width="2" height="3" fill="black" />
                              </svg>
                              <div className="text-[10px] font-bold text-zinc-950 mt-1">
                                Scan to Pay
                              </div>
                            </div>

                            {/* Footer / Store Policy */}
                            {settings.receiptFooterType !== 'none' && settings.receiptFooter && (
                              <div className="text-center text-[9px] leading-snug whitespace-pre-line mt-2 text-zinc-700 bg-zinc-50 border border-zinc-150 p-2 rounded-xl">
                                {settings.receiptFooter}
                              </div>
                            )}

                            <div className="text-center text-[9px] text-zinc-400 mt-2 font-sans tracking-tight">
                              --- Powered by SarvaOne ---
                            </div>
                          </div>

                          {/* SVG Jagged ripped paper tear effect at bottom */}
                          <div
                            className={`h-[6px] text-white fill-white select-none overflow-hidden -mt-[1px] shadow-[0_5px_10px_rgba(0,0,0,0.15)] transition-all duration-300 ${previewWidthClass}`}
                          >
                            <svg
                              viewBox="0 0 280 6"
                              preserveAspectRatio="none"
                              className="w-full h-full text-white fill-current"
                            >
                              <polygon points="0,0 5,6 10,0 15,6 20,0 25,6 30,0 35,6 40,0 45,6 50,0 55,6 60,0 65,6 70,0 75,6 80,0 85,6 90,0 95,6 100,0 105,6 110,0 115,6 120,0 125,6 130,0 135,6 140,0 145,6 150,0 155,6 160,0 165,6 170,0 175,6 180,0 185,6 190,0 195,6 200,0 205,6 210,0 215,6 220,0 225,6 230,0 235,6 240,0 245,6 250,0 255,6 260,0 265,6 270,0 275,6 280,0" />
                            </svg>
                          </div>
                        </div>

                        <p className="text-[10px] text-zinc-500 font-semibold mt-2">
                          {paperWidth}mm Thermal Print Layout
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
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
                      <Button
                        variant="outline"
                        onClick={handleBackup}
                        className="gap-2 h-auto py-3 flex-col"
                      >
                        <Database className="h-4 w-4" />
                        <span className="text-xs">Create Backup</span>
                      </Button>
                      <Button
                        variant="outline"
                        onClick={handleRestore}
                        disabled={restoring}
                        className="gap-2 h-auto py-3 flex-col text-amber-700 border-amber-300 hover:bg-amber-50"
                      >
                        {restoring ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <RotateCcw className="h-4 w-4" />
                        )}
                        <span className="text-xs">
                          {restoring ? 'Restoring...' : 'Restore Backup'}
                        </span>
                      </Button>
                      <Button
                        variant="outline"
                        onClick={handleOpenBackups}
                        className="gap-2 h-auto py-3 flex-col"
                      >
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
                        <Badge className="ml-2 gap-1 bg-green-100 text-green-700">
                          <CheckCircle2 className="h-3 w-3" />
                          Connected
                        </Badge>
                      ) : cloudStatus.configured ? (
                        <Badge variant="secondary" className="ml-2 gap-1">
                          <AlertCircle className="h-3 w-3" />
                          Not Connected
                        </Badge>
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
                        <Save className="mr-2 h-4 w-4" />
                        Save Config
                      </Button>
                      {cloudStatus.configured && !cloudStatus.authenticated && (
                        <Button size="sm" onClick={handleCloudAuth} disabled={cloudLoading}>
                          {cloudLoading ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <Link className="mr-2 h-4 w-4" />
                          )}
                          Connect to Google Drive
                        </Button>
                      )}
                      {cloudStatus.authenticated && (
                        <>
                          <Button
                            size="sm"
                            onClick={handleCloudBackup}
                            disabled={cloudLoading}
                            className="gap-2"
                          >
                            {cloudLoading ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <CloudUpload className="h-4 w-4" />
                            )}
                            Backup to Cloud
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleCloudDisconnect}
                            className="gap-2 text-destructive"
                          >
                            <Unlink className="h-4 w-4" />
                            Disconnect
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
                              <div
                                key={b.id}
                                className="flex items-center justify-between px-3 py-2 border-b last:border-b-0 text-sm"
                              >
                                <div>
                                  <span className="font-medium">{b.name}</span>
                                  <span className="text-muted-foreground ml-2">({b.size})</span>
                                  <span className="text-muted-foreground ml-2 text-xs">
                                    {new Date(b.modifiedTime).toLocaleString()}
                                  </span>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleCloudDownload(b.id, b.name)}
                                >
                                  <CloudDownload className="h-4 w-4" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      </>
                    )}
                    <p className="text-xs text-muted-foreground">
                      To set up Google Drive backup: create a project in Google Cloud Console,
                      enable the Drive API, create OAuth 2.0 Desktop credentials, and enter the
                      Client ID & Secret above.
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
                      This PIN is required to access Dashboard, Products, Purchases, Customers,
                      Reports and Settings. The Billing page is always accessible without a PIN.
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
                        placeholder="â€¢â€¢â€¢â€¢"
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
                  <Button
                    onClick={handleChangePin}
                    disabled={pinChanging}
                    variant="outline"
                    className="gap-2"
                  >
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

            {/* ===================== USER GUIDE TAB ===================== */}
            {activeTab === 'guide' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                {/* Intro banner */}
                <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15">
                      <HelpCircle className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-foreground">
                        KPT Billing Interactive Guide
                      </h2>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Simple explanations and visual walkthroughs to help you master all the
                        features of KPT Billing.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Dropdown Selector */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4 mb-4">
                  <div className="space-y-1">
                    <Label className="text-sm font-semibold">Select Feature Topic</Label>
                    <p className="text-[11px] text-muted-foreground">
                      Choose a module from the dropdown to see detailed explanations.
                    </p>
                  </div>
                  <select
                    value={selectedFeature}
                    onChange={(e) => setSelectedFeature(e.target.value)}
                    className="h-9 w-64 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary shadow-sm rounded-lg"
                  >
                    <option value="billing">Point of Sale &amp; Billing</option>
                    <option value="tabs">Multi-Cart Tabs (Parallel Billing)</option>
                    <option value="returns">Return &amp; Exchange System</option>
                    <option value="estimates">Estimates &amp; Quotations</option>
                    <option value="credit">Credit, Aging &amp; Collections</option>
                    <option value="expenses">Expense Tracking &amp; Profit/Loss</option>
                    <option value="backup">Backups &amp; Google Drive Sync</option>
                    <option value="security">Security Roles &amp; Owner PIN Gates</option>
                    <option value="shortcuts">Shortcuts &amp; Command Search (Ctrl+K)</option>
                    <option value="ledger">Product History Ledgers</option>
                    <option value="dashboard">Business Dashboard &amp; Analytics</option>
                    <option value="inventory">Product Catalog &amp; Barcoding</option>
                    <option value="purchases">Purchases &amp; Suppliers</option>
                    <option value="customers">Customer Directory &amp; Accounts</option>
                    <option value="reports">GST Ledger &amp; Financial Reports</option>
                    <option value="customer_analytics">Customer Analytics &amp; Loyalty</option>
                    <option value="data_export">Data Export &amp; Portability</option>
                  </select>
                </div>

                {/* Display active feature card */}
                <div className="space-y-4">
                  {selectedFeature === 'billing' && (
                    <Card className="border-border/50 hover:border-primary/20 hover:shadow-md transition-all duration-300">
                      <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-2 text-sm font-bold">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-500 dark:bg-blue-900/20">
                            <Store className="h-5 w-5" />
                          </div>
                          Point of Sale &amp; Billing
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          The main billing dashboard is designed for rapid checkout, supporting
                          alphanumeric query searches, automatic barcode scanning, and multi-mode
                          payment checkouts.
                        </p>
                        <ul className="text-xs text-foreground/80 space-y-2 bg-muted/30 p-3 rounded-lg font-medium list-disc list-inside">
                          <li>
                            <span className="font-bold">Product Search:</span> Search products by
                            name, SKU, or category. Select from the auto-dropdown or hit Enter.
                          </li>
                          <li>
                            <span className="font-bold">Barcode Scanning:</span> Auto-detects
                            scanning hardware. Even if focus is lost, typing redirects
                            automatically.
                          </li>
                          <li>
                            <span className="font-bold">Other Items:</span> Click{' '}
                            <span className="font-semibold text-primary">+ Other</span> (or Alt+O)
                            to add custom prices for stitching, alterations, or unlisted items.
                          </li>
                          <li>
                            <span className="font-bold">Tax Split:</span> Receipts automatically
                            partition GST 50/50 into CGST and SGST for compliance.
                          </li>
                          <li>
                            <span className="font-bold">Cash Tendered:</span> Enter the exact cash
                            received. The system prints correct change calculations.
                          </li>
                        </ul>
                      </CardContent>
                    </Card>
                  )}

                  {selectedFeature === 'tabs' && (
                    <Card className="border-border/50 hover:border-primary/20 hover:shadow-md transition-all duration-300">
                      <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-2 text-sm font-bold">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-500 dark:bg-blue-900/20">
                            <Layers className="h-5 w-5" />
                          </div>
                          Multi-Cart Tabs (Parallel Customer Billing)
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          Serve multiple customers in parallel without losing progress or clearing
                          carts.
                        </p>
                        <ul className="text-xs text-foreground/80 space-y-2 bg-muted/30 p-3 rounded-lg font-medium list-disc list-inside">
                          <li>
                            <span className="font-bold">Multi-Cart Tabs:</span> Click the{' '}
                            <span className="font-semibold text-primary">+</span> button to open a
                            new tab and start checking out another customer.
                          </li>
                          <li>
                            <span className="font-bold">Dynamic Naming:</span> Carts automatically
                            update their labels to the customer&apos;s name once linked.
                          </li>
                          <li>
                            <span className="font-bold">Real-Time Badges:</span> Tabs show circular
                            counters (primary for active, grey for inactive) representing active
                            items.
                          </li>
                          <li>
                            <span className="font-bold">State Persistence:</span> Cart details are
                            serialized dynamically. Carts recover automatically if the app shuts
                            down.
                          </li>
                          <li>
                            <span className="font-bold">Lanes Limit:</span> Click the close (
                            <span className="font-semibold text-destructive">x</span>) button on a
                            tab to clear it. The last remaining tab cannot be closed.
                          </li>
                        </ul>
                      </CardContent>
                    </Card>
                  )}

                  {selectedFeature === 'returns' && (
                    <Card className="border-border/50 hover:border-primary/20 hover:shadow-md transition-all duration-300">
                      <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-2 text-sm font-bold">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-500/10 text-red-500 dark:bg-red-900/20">
                            <RotateCcw className="h-5 w-5" />
                          </div>
                          Return &amp; Exchange System
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          Process refunds and replacements smoothly while keeping stock ledgers and
                          tax records fully in sync.
                        </p>
                        <ul className="text-xs text-foreground/80 space-y-2 bg-muted/30 p-3 rounded-lg font-medium list-disc list-inside">
                          <li>
                            <span className="font-bold">Access Points:</span> Click
                            &quot;Return/Exchange&quot; from Reports, Bill Detail, or search palette
                            (Ctrl+K).
                          </li>
                          <li>
                            <span className="font-bold">Stock Restoration:</span> Stock counts are
                            automatically restocked in the database upon return.
                          </li>
                          <li>
                            <span className="font-bold">Refund Options:</span> Return credit can be
                            paid back in cash, adjusted against outstanding balance, or exchanged.
                          </li>
                          <li>
                            <span className="font-bold">Exchanges Flow:</span> Add replacement
                            items. The system calculates the payment difference or remaining credit.
                          </li>
                          <li>
                            <span className="font-bold">Recalculation:</span> The original bill
                            totals, proportional discounts, and taxes adjust to reflect returned
                            quantities.
                          </li>
                        </ul>
                      </CardContent>
                    </Card>
                  )}

                  {selectedFeature === 'estimates' && (
                    <Card className="border-border/50 hover:border-primary/20 hover:shadow-md transition-all duration-300">
                      <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-2 text-sm font-bold">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-500 dark:bg-indigo-900/20">
                            <FileText className="h-5 w-5" />
                          </div>
                          Estimates &amp; Quotations
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          Generate quotations for customer selection. Estimates do not affect stock
                          quantities or balances until finalized.
                        </p>
                        <ul className="text-xs text-foreground/80 space-y-2 bg-muted/30 p-3 rounded-lg font-medium list-disc list-inside">
                          <li>
                            <span className="font-bold">Estimate Quotes:</span> Create quotes with
                            sequential numbers using the standard POS cart interface.
                          </li>
                          <li>
                            <span className="font-bold">Validity Limits:</span> Quotes are set with
                            an active period (default: 15 days) before automatically expiring.
                          </li>
                          <li>
                            <span className="font-bold">Convert to Bill:</span> Open an estimate and
                            click &quot;Convert to Bill&quot; to instantly load items into the
                            checkout cart.
                          </li>
                          <li>
                            <span className="font-bold">Customer Records:</span> Customer names and
                            phones are saved directly to the quote references.
                          </li>
                        </ul>
                      </CardContent>
                    </Card>
                  )}

                  {selectedFeature === 'credit' && (
                    <Card className="border-border/50 hover:border-primary/20 hover:shadow-md transition-all duration-300">
                      <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-2 text-sm font-bold">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500 dark:bg-amber-900/20">
                            <UserCheck className="h-5 w-5" />
                          </div>
                          Credit, Aging &amp; Collections
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          Provide credit options to wholesale/regular accounts and track outstanding
                          collections.
                        </p>
                        <ul className="text-xs text-foreground/80 space-y-2 bg-muted/30 p-3 rounded-lg font-medium list-disc list-inside">
                          <li>
                            <span className="font-bold">Credit Checkout:</span> Sales checked out as
                            credit are automatically billed to customer accounts.
                          </li>
                          <li>
                            <span className="font-bold">Credit Limits:</span> Warns the cashier if
                            credit totals exceed the customer&apos;s limit during payment.
                          </li>
                          <li>
                            <span className="font-bold">Credit Aging:</span> Classifies overdue
                            balances into 30, 60, 90, and 90+ day categories.
                          </li>
                          <li>
                            <span className="font-bold">WhatsApp Reminders:</span> Send instant
                            outstanding reminder messages from the Credit Aging table.
                          </li>
                          <li>
                            <span className="font-bold">Detailed Ledgers:</span> Track payments,
                            cost differences, and running balance credits.
                          </li>
                        </ul>
                      </CardContent>
                    </Card>
                  )}

                  {selectedFeature === 'expenses' && (
                    <Card className="border-border/50 hover:border-primary/20 hover:shadow-md transition-all duration-300">
                      <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-2 text-sm font-bold">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-500/10 text-rose-500 dark:bg-rose-900/20">
                            <Database className="h-5 w-5" />
                          </div>
                          Expense Tracking &amp; Profitability
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          Log store overheads to monitor profit margins and maintain a clear Profit
                          &amp; Loss ledger.
                        </p>
                        <ul className="text-xs text-foreground/80 space-y-2 bg-muted/30 p-3 rounded-lg font-medium list-disc list-inside">
                          <li>
                            <span className="font-bold">Log Expenses:</span> Record expenses under
                            electricity, transport, salary, packaging, food, rent, or logistics.
                          </li>
                          <li>
                            <span className="font-bold">Profit Calculation:</span> Today&apos;s Net
                            Income calculates daily sales revenue minus expenses.
                          </li>
                          <li>
                            <span className="font-bold">P&amp;L Statements:</span> Provides detailed
                            breakdowns of Gross Profits, COGS, expenses, and net profit margins.
                          </li>
                          <li>
                            <span className="font-bold">Filtering:</span> Sort and filter overhead
                            records by dates, categories, or payment types.
                          </li>
                        </ul>
                      </CardContent>
                    </Card>
                  )}

                  {selectedFeature === 'backup' && (
                    <Card className="border-border/50 hover:border-primary/20 hover:shadow-md transition-all duration-300">
                      <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-2 text-sm font-bold">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-500/10 text-teal-500 dark:bg-teal-900/20">
                            <Cloud className="h-5 w-5" />
                          </div>
                          Backups &amp; Google Drive Sync
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          Secure your business database against computer failures with local backups
                          and automated Google Drive sync.
                        </p>
                        <ul className="text-xs text-foreground/80 space-y-2 bg-muted/30 p-3 rounded-lg font-medium list-disc list-inside">
                          <li>
                            <span className="font-bold">SQL Database Dumps:</span> Export schema and
                            data as portable `.sql` files.
                          </li>
                          <li>
                            <span className="font-bold">Automated Intervals:</span> Schedules
                            automatic backups hourly, every 4 hours, or daily on startup.
                          </li>
                          <li>
                            <span className="font-bold">Auto Retention:</span> Automatically sweeps
                            and deletes older backups based on your configuration (e.g. 30 days).
                          </li>
                          <li>
                            <span className="font-bold">Google Cloud Sync:</span> Save Client
                            ID/Secrets to upload backups to your Google Drive folder.
                          </li>
                          <li>
                            <span className="font-bold">Restore Protection:</span> Restores require
                            a confirmation. A safety backup of current data is created first.
                          </li>
                        </ul>
                      </CardContent>
                    </Card>
                  )}

                  {selectedFeature === 'security' && (
                    <Card className="border-border/50 hover:border-primary/20 hover:shadow-md transition-all duration-300">
                      <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-2 text-sm font-bold">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500 dark:bg-amber-900/20">
                            <Lock className="h-5 w-5" />
                          </div>
                          Security Roles &amp; Owner PIN Gates
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          Define cashier access privileges to prevent mistakes and block sensitive
                          dashboard records.
                        </p>
                        <ul className="text-xs text-foreground/80 space-y-2 bg-muted/30 p-3 rounded-lg font-medium list-disc list-inside">
                          <li>
                            <span className="font-bold">Limited Cashier View:</span> Sidebar hides
                            Dashboards, Reports, and Settings automatically for cashiers.
                          </li>
                          <li>
                            <span className="font-bold">Security Gates:</span> Direct navigations or
                            hotkeys trigger the Owner PIN gate keypad overlay.
                          </li>
                          <li>
                            <span className="font-bold">Action Guards:</span> Writing products,
                            editing prices, or adjustments requires owner verification.
                          </li>
                          <li>
                            <span className="font-bold">PIN Manager:</span> Configure staff and
                            owner roles under{' '}
                            <span className="font-semibold text-primary">
                              Settings âž” Security
                            </span>
                            .
                          </li>
                          <li>
                            <span className="font-bold">Default Owner PIN:</span> The default
                            username is &quot;Puneet&quot; and PIN is{' '}
                            <span className="font-bold font-mono px-1 rounded bg-background border">
                              1234
                            </span>
                            .
                          </li>
                        </ul>
                      </CardContent>
                    </Card>
                  )}

                  {selectedFeature === 'shortcuts' && (
                    <Card className="border-border/50 hover:border-primary/20 hover:shadow-md transition-all duration-300">
                      <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-2 text-sm font-bold">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-500 dark:bg-indigo-900/20">
                            <Keyboard className="h-5 w-5" />
                          </div>
                          Shortcuts &amp; Command Search (Ctrl+K)
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          Execute standard workflows mouse-free. Search invoices and print receipts
                          using quick actions.
                        </p>
                        <ul className="text-xs text-foreground/80 space-y-2 bg-muted/30 p-3 rounded-lg font-medium list-disc list-inside">
                          <li>
                            <span className="font-bold">Keyboard Navigation:</span> Press F1
                            (Dashboard), F2 (Billing), F3 (Products), F7 (Reports), F10 (Settings).
                          </li>
                          <li>
                            <span className="font-bold">Help Drawer:</span> Press F12 (help drawer
                            slides out). Electron F12 is disabled to prevent DevTools from popping.
                          </li>
                          <li>
                            <span className="font-bold">Billing Shortcuts:</span> Use Esc to focus
                            search, F6 to hold cart, F8 to recall, F9 to clear, and F11 to checkout.
                          </li>
                          <li>
                            <span className="font-bold">Command Search:</span> Press Ctrl+K to open
                            Quick Bill Search. List recent bills or search customer names.
                          </li>
                          <li>
                            <span className="font-bold">Palette Quick Keys:</span> Use V to View
                            bill, P to print, D to PDF, W for WhatsApp, and R to Return items.
                          </li>
                        </ul>
                      </CardContent>
                    </Card>
                  )}

                  {selectedFeature === 'ledger' && (
                    <Card className="border-border/50 hover:border-primary/20 hover:shadow-md transition-all duration-300">
                      <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-2 text-sm font-bold">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-500/10 text-rose-500 dark:bg-rose-900/20">
                            <History className="h-5 w-5" />
                          </div>
                          Product History Ledgers
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          Audit stock changes and pricing adjustments. Check who made updates and
                          reference invoice numbers.
                        </p>
                        <ul className="text-xs text-foreground/80 space-y-2 bg-muted/30 p-3 rounded-lg font-medium list-disc list-inside">
                          <li>
                            <span className="font-bold">Product History:</span> Accessed via product
                            action lists in the Products page dropdown.
                          </li>
                          <li>
                            <span className="font-bold">Stock Movements:</span> Timelines showing
                            sales invoices, restocks, adjustments, and returns.
                          </li>
                          <li>
                            <span className="font-bold">Price Variations:</span> Price timelines
                            showing Cost, Retail, and Wholesale rates changes.
                          </li>
                          <li>
                            <span className="font-bold">Arrow Directions:</span> Displays green
                            arrows for cost/selling drops and red arrows for increases.
                          </li>
                          <li>
                            <span className="font-bold">User Tracking:</span> Displays staff
                            usernames and timestamps for every database adjustment.
                          </li>
                        </ul>
                      </CardContent>
                    </Card>
                  )}

                  {selectedFeature === 'dashboard' && (
                    <Card className="border-border/50 hover:border-primary/20 hover:shadow-md transition-all duration-300">
                      <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-2 text-sm font-bold">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-500/10 text-green-500 dark:bg-green-900/20">
                            <BarChart3 className="h-5 w-5" />
                          </div>
                          Business Dashboard &amp; Analytics
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          The dashboard offers an instant business overview, compiling sales
                          summaries, payment mode totals, and key performance metrics in one
                          centralized view.
                        </p>
                        <ul className="text-xs text-foreground/80 space-y-2 bg-muted/30 p-3 rounded-lg font-medium list-disc list-inside">
                          <li>
                            <span className="font-bold">Quick Stats:</span> Review total sales,
                            number of bills, average ticket value, and daily expenses in real time.
                          </li>
                          <li>
                            <span className="font-bold">Payment Split:</span> Visualize exactly how
                            much revenue came from Cash, UPI, Cards, and Credit options today.
                          </li>
                          <li>
                            <span className="font-bold">Low Stock Warnings:</span> Automatically
                            flags items that are running low or completely out of stock.
                          </li>
                          <li>
                            <span className="font-bold">Growth Tracking:</span> Monitors sales
                            percentage growth or decline compared directly with yesterday&apos;s
                            totals.
                          </li>
                        </ul>
                      </CardContent>
                    </Card>
                  )}

                  {selectedFeature === 'inventory' && (
                    <Card className="border-border/50 hover:border-primary/20 hover:shadow-md transition-all duration-300">
                      <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-2 text-sm font-bold">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-500 dark:bg-blue-900/20">
                            <Package className="h-5 w-5" />
                          </div>
                          Product Catalog &amp; Barcoding
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          Manage your inventory catalog, configure customized barcode label layouts,
                          and adjust pricing profiles dynamically.
                        </p>
                        <ul className="text-xs text-foreground/80 space-y-2 bg-muted/30 p-3 rounded-lg font-medium list-disc list-inside">
                          <li>
                            <span className="font-bold">Product Directory:</span> Manage products by
                            SKU, search query, category, and track cost vs retail/wholesale prices.
                          </li>
                          <li>
                            <span className="font-bold">Barcode Print Engine:</span> Print sheet
                            barcodes with customizable layout parameters directly from the inventory
                            list.
                          </li>
                          <li>
                            <span className="font-bold">Label Customization:</span> Enable or
                            disable shop name, product name, discount percentages, and selling
                            prices on barcodes.
                          </li>
                          <li>
                            <span className="font-bold">Pricing Tiers:</span> Set separate margins
                            for retail, wholesale, and special discount groups.
                          </li>
                        </ul>
                      </CardContent>
                    </Card>
                  )}

                  {selectedFeature === 'purchases' && (
                    <Card className="border-border/50 hover:border-primary/20 hover:shadow-md transition-all duration-300">
                      <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-2 text-sm font-bold">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500 dark:bg-amber-900/20">
                            <Truck className="h-5 w-5" />
                          </div>
                          Purchases &amp; Supplier Invoices
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          Stock-in inventory directly from wholesale partners. Document supplier
                          bills, logistics details, and automate product count updates.
                        </p>
                        <ul className="text-xs text-foreground/80 space-y-2 bg-muted/30 p-3 rounded-lg font-medium list-disc list-inside">
                          <li>
                            <span className="font-bold">Restocking Orders:</span> Record new bulk
                            shipments, link them to specific suppliers, and log reference invoices.
                          </li>
                          <li>
                            <span className="font-bold">Auto-Increment Stock:</span> Once checked
                            out, purchases dynamically add directly to your active inventory counts.
                          </li>
                          <li>
                            <span className="font-bold">Supplier History:</span> Keep a running list
                            of suppliers (Surat, Bengaluru, etc.) and audit past purchase costs.
                          </li>
                          <li>
                            <span className="font-bold">Security Approval:</span> Modifying purchase
                            histories or deleting entries is guarded behind Owner PIN verification.
                          </li>
                        </ul>
                      </CardContent>
                    </Card>
                  )}

                  {selectedFeature === 'customers' && (
                    <Card className="border-border/50 hover:border-primary/20 hover:shadow-md transition-all duration-300">
                      <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-2 text-sm font-bold">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-500 dark:bg-indigo-900/20">
                            <Users className="h-5 w-5" />
                          </div>
                          Customer Directory &amp; Accounts
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          Maintain accounts for regular customers, track outstanding balance sheets,
                          and review purchase counts.
                        </p>
                        <ul className="text-xs text-foreground/80 space-y-2 bg-muted/30 p-3 rounded-lg font-medium list-disc list-inside">
                          <li>
                            <span className="font-bold">Credit &amp; Contact:</span> Save mobile
                            numbers, address details, and custom credit limits for each customer.
                          </li>
                          <li>
                            <span className="font-bold">Quick Association:</span> Search and link
                            customers during cart checkout to associate invoices directly to
                            profiles.
                          </li>
                          <li>
                            <span className="font-bold">Account History:</span> Review total orders,
                            average tickets, and customer lifetime value metrics instantly.
                          </li>
                          <li>
                            <span className="font-bold">Payment Log:</span> Keep track of paid
                            credits, dates, and current credit utilization statistics.
                          </li>
                        </ul>
                      </CardContent>
                    </Card>
                  )}

                  {selectedFeature === 'reports' && (
                    <Card className="border-border/50 hover:border-primary/20 hover:shadow-md transition-all duration-300">
                      <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-2 text-sm font-bold">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-500/10 text-teal-500 dark:bg-teal-900/20">
                            <FileText className="h-5 w-5" />
                          </div>
                          GST &amp; Financial Reports
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          Access standard accounting ledgers, audit daily sales journals, and export
                          GST summaries with CGST/SGST breakdowns.
                        </p>
                        <ul className="text-xs text-foreground/80 space-y-2 bg-muted/30 p-3 rounded-lg font-medium list-disc list-inside">
                          <li>
                            <span className="font-bold">Sales Journal:</span> Audit a full
                            chronological feed of all generated bills, payment modes, and cashier
                            signatures.
                          </li>
                          <li>
                            <span className="font-bold">GST Tax Split:</span> View automatic GST
                            calculations split 50/50 between Central (CGST) and State (SGST) taxes.
                          </li>
                          <li>
                            <span className="font-bold">Daily Closing:</span> Run physical cash
                            checks at the end of every cashier shift to count till drawers.
                          </li>
                          <li>
                            <span className="font-bold">Expense Breakdown:</span> View itemized
                            lists of store overheads by category (salary, rent, travel,
                            electricity).
                          </li>
                        </ul>
                      </CardContent>
                    </Card>
                  )}

                  {selectedFeature === 'customer_analytics' && (
                    <Card className="border-border/50 hover:border-primary/20 hover:shadow-md transition-all duration-300">
                      <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-2 text-sm font-bold">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/10 text-purple-500 dark:bg-purple-900/20">
                            <Sparkles className="h-5 w-5" />
                          </div>
                          Customer Analytics &amp; Loyalty
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          Understand customer retention patterns, rank high-value VIP accounts, and
                          score credit default risks.
                        </p>
                        <ul className="text-xs text-foreground/80 space-y-2 bg-muted/30 p-3 rounded-lg font-medium list-disc list-inside">
                          <li>
                            <span className="font-bold">VIP Rankings:</span> Ranks customer records
                            based on total revenue contributions and frequency of visits.
                          </li>
                          <li>
                            <span className="font-bold">Visit Intervals:</span> Classify customers
                            into Weekly, Bi-weekly, Monthly, or Rare visitors automatically.
                          </li>
                          <li>
                            <span className="font-bold">Risk Scoring:</span> Flags accounts as High,
                            Medium, or Low risk depending on credit limit utilization and payment
                            delays.
                          </li>
                          <li>
                            <span className="font-bold">Loyalty Insight:</span> Review overall
                            customer average transaction size and item counts to target promotions.
                          </li>
                        </ul>
                      </CardContent>
                    </Card>
                  )}

                  {selectedFeature === 'data_export' && (
                    <Card className="border-border/50 hover:border-primary/20 hover:shadow-md transition-all duration-300">
                      <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-2 text-sm font-bold">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-500/10 text-rose-500 dark:bg-rose-900/20">
                            <FileSpreadsheet className="h-5 w-5" />
                          </div>
                          Data Export &amp; Auditing
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          Export raw database tables and financial ledgers into standard formats to
                          run offline audits or share with accountants.
                        </p>
                        <ul className="text-xs text-foreground/80 space-y-2 bg-muted/30 p-3 rounded-lg font-medium list-disc list-inside">
                          <li>
                            <span className="font-bold">Excel-Ready Sheets:</span> Export bills,
                            products, customers, and purchases as clean, tabular `.csv` files.
                          </li>
                          <li>
                            <span className="font-bold">System Backups:</span> Export raw `.json`
                            databases to move information between computers easily.
                          </li>
                          <li>
                            <span className="font-bold">PDF Generation:</span> Save print-ready PDF
                            invoice logs directly to your local computer folders.
                          </li>
                          <li>
                            <span className="font-bold">Export Sweep:</span> Clear out files or back
                            up safely with local file explorer shortcut folders.
                          </li>
                        </ul>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </div>
            )}

            {/* ===================== ABOUT TAB ===================== */}
            {activeTab === 'about' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                {/* SarvaOne Brand Card */}
                <Card className="border-border/50 shadow-sm overflow-hidden">
                  <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border-b border-border/50 px-6 py-8 flex flex-col items-center text-center gap-3">
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary/70 shadow-lg shadow-primary/25">
                      <span className="text-2xl font-black text-white tracking-tighter">S1</span>
                    </div>
                    <div>
                      <h2 className="text-2xl font-black tracking-tight text-primary">Sarva One</h2>
                      <p className="text-sm text-muted-foreground mt-1 font-medium">
                        Professional Software. Personal Support.
                      </p>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 border border-primary/20 px-3 py-1 text-xs font-semibold text-primary">
                        <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                        Built for Local Businesses
                      </span>
                    </div>
                  </div>

                  <CardContent className="p-6 space-y-4">
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      At Sarva One, we help local businesses run smarter. We build easy-to-use
                      billing and inventory software made specifically for shops like yours. No
                      technical knowledge needed, no complicated setup.
                    </p>

                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { icon: Zap, label: 'Fast Billing' },
                        { icon: Package, label: 'Stock Management' },
                        { icon: BarChart3, label: 'GST Reports' },
                        { icon: Handshake, label: 'Dedicated Support' }
                      ].map((item) => (
                        <div
                          key={item.label}
                          className="flex items-center gap-2.5 rounded-lg bg-muted/50 border border-border/50 px-3 py-2.5"
                        >
                          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10">
                            <item.icon className="h-3.5 w-3.5 text-primary" />
                          </div>
                          <span className="text-xs font-medium text-foreground/70">
                            {item.label}
                          </span>
                        </div>
                      ))}
                    </div>

                    <p className="text-xs text-muted-foreground/60 text-center leading-relaxed border-t border-border/40 pt-3">
                      From your first bill to your yearly reports â€”
                      <br />
                      <span className="font-semibold text-primary/60">
                        Sarva One is with you every step.
                      </span>
                    </p>
                  </CardContent>
                </Card>

                {/* Contact Info Card */}
                <Card className="border-border/50 shadow-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Info className="h-4 w-4 text-primary" />
                      Contact &amp; Support
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-4 p-3 rounded-xl bg-muted/30 border border-border/40 hover:bg-accent/50 transition-colors">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                        <Phone className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                          Mobile
                        </div>
                        <div className="text-sm font-semibold text-foreground">+91 9886718288</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 p-3 rounded-xl bg-muted/30 border border-border/40 hover:bg-accent/50 transition-colors">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                        <Mail className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                          Email
                        </div>
                        <div className="text-sm font-semibold text-foreground">
                          support@sarvaone.com
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 p-3 rounded-xl bg-muted/30 border border-border/40 hover:bg-accent/50 transition-colors">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                        <Globe className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                          Website
                        </div>
                        <div className="text-sm font-semibold text-foreground">sarvaone.com</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Tagline Footer */}
                <div className="flex flex-col items-center gap-1.5 py-4 text-center">
                  <p className="text-xs text-muted-foreground/60">
                    Made with â¤ï¸ for local businesses across India
                  </p>
                  <p className="text-[10px] text-muted-foreground/40 font-mono">
                    KPT Billing â€” powered by SarvaOne
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Dialog for verifying PIN to unlock UPI */}
      <Dialog
        open={upiVerifyPinOpen}
        onOpenChange={(open) => {
          setUpiVerifyPinOpen(open)
          if (!open) {
            setUpiPinInput('')
            setUpiPinError('')
          }
        }}
      >
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Verify Owner PIN
            </DialogTitle>
            <DialogDescription>
              Enter your owner PIN code to access payment settings.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="upi-pin">Owner PIN</Label>
              <Input
                id="upi-pin"
                type="password"
                inputMode="numeric"
                maxLength={8}
                value={upiPinInput}
                onChange={(e) => {
                  setUpiPinInput(e.target.value.replace(/\D/g, ''))
                  setUpiPinError('')
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && upiPinInput.length >= 4 && !verifyingUpiPin) {
                    handleUnlockUpi()
                  }
                }}
                placeholder="â€¢â€¢â€¢â€¢"
                className="text-center font-bold tracking-[0.5em] text-lg"
                autoFocus
              />
              {upiPinError && (
                <p className="text-xs text-destructive font-medium mt-1 text-center">
                  {upiPinError}
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setUpiVerifyPinOpen(false)
                setUpiPinInput('')
                setUpiPinError('')
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleUnlockUpi} disabled={verifyingUpiPin || upiPinInput.length < 4}>
              {verifyingUpiPin ? 'Verifying...' : 'Unlock'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog for Add/Edit Payment Method */}
      <Dialog
        open={isAddingNew || editingMethod !== null}
        onOpenChange={(open) => {
          if (!open) {
            setEditingMethod(null)
            setIsAddingNew(false)
          }
        }}
      >
        <DialogContent className="sm:max-w-[425px] overflow-y-auto max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" />
              {isAddingNew ? 'Add Payment Method' : 'Edit Payment Method'}
            </DialogTitle>
            <DialogDescription>
              Configure details for bank accounts, UPI, or QR scanners.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Method Name</Label>
              <Input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="e.g. Shop Main Account, UPI QR"
              />
            </div>

            <div className="space-y-2">
              <Label>Type</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                value={formType}
                onChange={(e) => setFormType(e.target.value as 'bank' | 'upi' | 'scanner')}
              >
                <option value="upi">UPI ID</option>
                <option value="scanner">UPI QR Scanner</option>
                <option value="bank">Bank Account</option>
              </select>
            </div>

            {formType === 'bank' && (
              <div className="space-y-3 animate-in fade-in duration-200">
                <div className="space-y-1.5">
                  <Label>Account Holder Name</Label>
                  <Input
                    value={formAccountName}
                    onChange={(e) => setFormAccountName(e.target.value)}
                    placeholder="e.g. John Doe / Krishnapriya Textiles"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Bank Name</Label>
                  <Input
                    value={formBankName}
                    onChange={(e) => setFormBankName(e.target.value)}
                    placeholder="e.g. State Bank of India"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Account Number</Label>
                  <Input
                    value={formAccountNo}
                    onChange={(e) => setFormAccountNo(e.target.value)}
                    placeholder="Enter account number"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>IFSC Code</Label>
                  <Input
                    value={formIfscCode}
                    onChange={(e) => setFormIfscCode(e.target.value.toUpperCase())}
                    placeholder="e.g. SBIN0001234"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Branch</Label>
                  <Input
                    value={formBranch}
                    onChange={(e) => setFormBranch(e.target.value)}
                    placeholder="Enter branch name"
                  />
                </div>
              </div>
            )}

            {(formType === 'upi' || formType === 'scanner') && (
              <div className="space-y-3 animate-in fade-in duration-200">
                {formType === 'scanner' && (
                  <div className="space-y-1.5">
                    <Label>Scanner Vendor / Brand</Label>
                    <select
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
                      value={formScannerType}
                      onChange={(e) => setFormScannerType(e.target.value)}
                    >
                      <option value="Google Pay">Google Pay</option>
                      <option value="PhonePe">PhonePe</option>
                      <option value="Paytm">Paytm</option>
                      <option value="BHIM UPI">BHIM UPI</option>
                      <option value="Other">Other Scanner</option>
                    </select>
                  </div>
                )}
                <div className="space-y-1.5">
                  <Label>UPI VPA (ID)</Label>
                  <Input
                    value={formUpiVpa}
                    onChange={(e) => setFormUpiVpa(e.target.value)}
                    placeholder="e.g. yourname@okaxis"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>UPI Payee Name</Label>
                  <Input
                    value={formPayeeName}
                    onChange={(e) => setFormPayeeName(e.target.value)}
                    placeholder="Shop or Owner Name"
                  />
                </div>

                <label className="flex items-center gap-2.5 p-2.5 border rounded-lg hover:bg-accent/40 cursor-pointer mt-3">
                  <input
                    type="checkbox"
                    checked={formIsDefaultBilling}
                    onChange={(e) => setFormIsDefaultBilling(e.target.checked)}
                    className="h-4 w-4 rounded border-input"
                  />
                  <div>
                    <div className="text-xs font-semibold">Use for Billing Receipt QR Codes</div>
                    <div className="text-[10px] text-muted-foreground">
                      Sets this UPI method as default for prints & PDFs.
                    </div>
                  </div>
                </label>
              </div>
            )}
          </div>
          <DialogFooter className="mt-4">
            <Button
              variant="outline"
              onClick={() => {
                setEditingMethod(null)
                setIsAddingNew(false)
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleSaveMethod} disabled={!formName.trim()}>
              Save Method
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ---- System-reserved shortcuts that cannot be reassigned ----
const SYSTEM_SHORTCUTS = new Set([
  'F1',
  'F2',
  'F3',
  'F4',
  'F5',
  'F6',
  'F7',
  'F8',
  'F9',
  'F10',
  'F11',
  'F12',
  'Ctrl+K',
  'Ctrl+L',
  'Ctrl+N',
  'Ctrl+B',
  'Ctrl+Shift+R',
  'Ctrl+Shift+D',
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
  { value: 'Alt+5', label: 'Alt + 5' }
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
          Customize billing page shortcuts. Navigation shortcuts (F1â€“F10) and system shortcuts are
          fixed.
        </p>

        {/* Fixed shortcuts reference */}
        <div className="rounded-lg bg-muted/50 p-3 space-y-1.5">
          <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            System Shortcuts (Fixed)
          </Label>
          <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs text-muted-foreground">
            <div className="flex justify-between">
              <span>Dashboard</span>
              <kbd className="font-mono bg-background px-1.5 rounded border text-[10px]">F1</kbd>
            </div>
            <div className="flex justify-between">
              <span>Billing</span>
              <kbd className="font-mono bg-background px-1.5 rounded border text-[10px]">F2</kbd>
            </div>
            <div className="flex justify-between">
              <span>Products</span>
              <kbd className="font-mono bg-background px-1.5 rounded border text-[10px]">F3</kbd>
            </div>
            <div className="flex justify-between">
              <span>Purchases</span>
              <kbd className="font-mono bg-background px-1.5 rounded border text-[10px]">F4</kbd>
            </div>
            <div className="flex justify-between">
              <span>Customers</span>
              <kbd className="font-mono bg-background px-1.5 rounded border text-[10px]">F5</kbd>
            </div>
            <div className="flex justify-between">
              <span>Hold Bill</span>
              <kbd className="font-mono bg-background px-1.5 rounded border text-[10px]">F6</kbd>
            </div>
            <div className="flex justify-between">
              <span>Reports</span>
              <kbd className="font-mono bg-background px-1.5 rounded border text-[10px]">F7</kbd>
            </div>
            <div className="flex justify-between">
              <span>Recall Bill</span>
              <kbd className="font-mono bg-background px-1.5 rounded border text-[10px]">F8</kbd>
            </div>
            <div className="flex justify-between">
              <span>Clear Cart</span>
              <kbd className="font-mono bg-background px-1.5 rounded border text-[10px]">F9</kbd>
            </div>
            <div className="flex justify-between">
              <span>Settings</span>
              <kbd className="font-mono bg-background px-1.5 rounded border text-[10px]">F10</kbd>
            </div>
            <div className="flex justify-between">
              <span>Pay & Print</span>
              <kbd className="font-mono bg-background px-1.5 rounded border text-[10px]">F11</kbd>
            </div>
            <div className="flex justify-between">
              <span>Shortcuts Help</span>
              <kbd className="font-mono bg-background px-1.5 rounded border text-[10px]">F12</kbd>
            </div>
          </div>
        </div>

        <Separator />

        {/* Configurable shortcuts */}
        <div className="space-y-4">
          <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Customizable Shortcuts
          </Label>
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
                      <option key={opt.value} value={opt.value} disabled={disabled}>
                        {opt.label}
                        {isAssigned ? ' (in use)' : ''}
                        {isSystem ? ' (system)' : ''}
                      </option>
                    )
                  })}
                </select>
              </div>
            )
          })}
        </div>

        <p className="text-xs text-muted-foreground mt-2">
          Changes take effect after saving settings. Only Alt-key combinations are available to
          avoid conflicts with system shortcuts.
        </p>
      </CardContent>
    </Card>
  )
}
