import { useCallback, useEffect, useState } from 'react'
import { Save, Settings2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '../../components/ui/button'
import { settingsService } from '../../services/settings.service'
import { printerService } from '../../services/printer.service'
import { withSettingsDefaults } from './settings-model'
import { SETTINGS_TABS } from './tabs'
import type { SettingsMap, SettingsTabId } from './types'

// Import Tab Components
import { GeneralTab } from './components/GeneralTab'
import { PaymentsTab } from './components/PaymentsTab'
import { PrintersTab } from './components/PrintersTab'
import { BarcodeTab } from './components/BarcodeTab'
import { ReceiptTab } from './components/ReceiptTab'
import { BackupTab } from './components/BackupTab'
import { SecurityTab } from './components/SecurityTab'
import { ShortcutsTab } from './components/ShortcutsTab'
import { SubscriptionTab } from './components/SubscriptionTab'
import { UpdatesTab } from './components/UpdatesTab'

export default function SettingsPage(): React.JSX.Element {
  const [settings, setSettings] = useState<SettingsMap>({})
  const [activeTab, setActiveTab] = useState<SettingsTabId>('subscription')
  const [printers, setPrinters] = useState<string[]>([])
  const [saving, setSaving] = useState(false)

  const loadSettings = useCallback(async () => {
    try {
      const all = await settingsService.getAll()
      setSettings(withSettingsDefaults(all))
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
  }, [loadSettings, loadPrinters])

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
    } finally {
      setSaving(false)
    }
  }

  const activeTabMeta = SETTINGS_TABS.find((t) => t.id === activeTab)

  return (
    <div className="h-full overflow-hidden page-enter flex flex-col">
      {/* Premium Header */}
      <div className="relative overflow-hidden border-b border-border/60 bg-card/80 backdrop-blur-sm">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-primary/3" />
        <div className="relative flex items-center justify-between px-6 py-5">
          <div className="flex items-center gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 shadow-inner">
              <Settings2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">Settings</h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                Configure your billing system
              </p>
            </div>
          </div>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="gap-2 rounded-xl shadow-sm h-10 px-5"
          >
            <Save className="h-4 w-4" />
            {saving ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Tab Navigation — Left Sidebar */}
        <div className="w-56 shrink-0 overflow-y-auto border-r border-border/50 bg-card/40 p-3 space-y-1">
          {SETTINGS_TABS.map((tab, idx) => {
            const isActive = activeTab === tab.id
            const isSubscription = tab.id === 'subscription'
            return (
              <div key={tab.id}>
                {/* Separator after subscription tab */}
                {idx === 1 && (
                  <div className="my-2 mx-3 border-t border-border/40" />
                )}
                <button
                  onClick={() => setActiveTab(tab.id)}
                  className={`relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all duration-200 group ${
                    isActive
                      ? isSubscription
                        ? 'bg-gradient-to-r from-primary/12 to-primary/5 text-primary shadow-sm'
                        : 'bg-primary/8 text-primary shadow-sm'
                      : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground'
                  }`}
                >
                  {/* Active indicator */}
                  {isActive && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-[3px] rounded-r-full bg-primary" />
                  )}
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors duration-200 ${
                      isActive
                        ? 'bg-primary/15 text-primary'
                        : 'bg-muted/40 text-muted-foreground group-hover:bg-accent group-hover:text-foreground'
                    }`}
                  >
                    <tab.icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div
                      className={`text-[13px] font-medium truncate ${isActive ? 'font-semibold' : ''}`}
                    >
                      {tab.label}
                    </div>
                    <div className="text-[10px] text-muted-foreground/70 truncate leading-tight">
                      {tab.description}
                    </div>
                  </div>
                </button>
              </div>
            )
          })}
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-auto">
          {/* Tab Content Header */}
          {activeTabMeta && (
            <div className="sticky top-0 z-10 border-b border-border/40 bg-background/80 backdrop-blur-sm px-8 py-3">
              <div className="flex items-center gap-2">
                <activeTabMeta.icon className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-semibold text-foreground">{activeTabMeta.label}</h2>
                <span className="text-xs text-muted-foreground">— {activeTabMeta.description}</span>
              </div>
            </div>
          )}
          <div className="p-8">
            <div className="max-w-[900px] mx-auto space-y-6">
              {activeTab === 'subscription' && <SubscriptionTab />}
              {activeTab === 'general' && (
                <GeneralTab settings={settings} updateSetting={updateSetting} />
              )}
              {activeTab === 'payments' && (
                <PaymentsTab settings={settings} updateSetting={updateSetting} />
              )}
              {activeTab === 'printer' && (
                <PrintersTab
                  settings={settings}
                  printers={printers}
                  loadPrinters={loadPrinters}
                  updateSetting={updateSetting}
                />
              )}
              {activeTab === 'barcode' && (
                <BarcodeTab settings={settings} updateSetting={updateSetting} />
              )}
              {activeTab === 'receipt' && (
                <ReceiptTab settings={settings} updateSetting={updateSetting} />
              )}
              {activeTab === 'backup' && (
                <BackupTab settings={settings} updateSetting={updateSetting} />
              )}
              {activeTab === 'security' && <SecurityTab />}
              {activeTab === 'shortcuts' && (
                <ShortcutsTab settings={settings} updateSetting={updateSetting} />
              )}
              {activeTab === 'updates' && <UpdatesTab />}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
