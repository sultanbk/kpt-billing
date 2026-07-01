import { useState } from 'react'
import { Activity, CheckCircle2, Printer, RefreshCw, Tag, XCircle } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '../../../components/ui/button'
import { Badge } from '../../../components/ui/badge'
import { printerService } from '../../../services/printer.service'
import { Field, SettingsSection } from './SettingsFields'
import { settingValue } from '../settings-model'
import type { PrinterDiagnostics, SettingsMap, UpdateSetting } from '../types'

export function PrintersTab({
  settings,
  printers,
  loadPrinters,
  updateSetting
}: {
  settings: SettingsMap
  printers: string[]
  loadPrinters: () => Promise<void>
  updateSetting: UpdateSetting
}): React.JSX.Element {
  const [diagnostics, setDiagnostics] = useState<PrinterDiagnostics | null>(null)
  const [checking, setChecking] = useState(false)
  const [printing, setPrinting] = useState(false)
  const [printingLabel, setPrintingLabel] = useState(false)

  const runDiagnostics = async (): Promise<void> => {
    setChecking(true)
    try {
      const result = await printerService.diagnostics(settingValue(settings, 'receiptPrinterName'))
      setDiagnostics(result)
      toast[result.recommendations.length ? 'error' : 'success'](
        result.recommendations.length
          ? 'Printer diagnostics found issues'
          : 'Printer diagnostics passed'
      )
    } catch {
      toast.error('Could not run diagnostics')
    } finally {
      setChecking(false)
    }
  }

  const testReceipt = async (): Promise<void> => {
    setPrinting(true)
    try {
      const ok = await printerService.testPrint()
      toast[ok ? 'success' : 'error'](ok ? 'Test receipt sent' : 'Test receipt failed')
    } catch {
      toast.error('Printer error')
    } finally {
      setPrinting(false)
    }
  }

  const testLabel = async (): Promise<void> => {
    setPrintingLabel(true)
    try {
      const result = await window.api.products.printTestLabel({
        printerName:
          settingValue(settings, 'labelPrinterName') ||
          settingValue(settings, 'receiptPrinterName') ||
          undefined,
        labelSize: settingValue(settings, 'barcodeLabelSize') === '60x40' ? '60x40' : '46x25',
        barcodeNudgeX: settingValue(settings, 'barcodeNudgeX'),
        barcodeNudgeY: settingValue(settings, 'barcodeNudgeY'),
        barcodeWidth: settingValue(settings, 'barcodeWidth'),
        barcodeHeight: settingValue(settings, 'barcodeHeight')
      })
      toast[result?.success ? 'success' : 'error'](
        result?.success ? `Test label sent to ${result.printerName}` : 'Test label failed'
      )
    } catch {
      toast.error('Label printer error')
    } finally {
      setPrintingLabel(false)
    }
  }

  const receiptPrinter = settingValue(settings, 'receiptPrinterName')
  const labelPrinter = settingValue(settings, 'labelPrinterName')

  return (
    <div className="space-y-6">
      <SettingsSection
        title="Printer Selection"
        description="Choose the exact Windows printer names used for receipts and barcode labels."
        icon={<Printer className="h-4 w-4" />}
        action={
          <Button variant="outline" onClick={loadPrinters} className="rounded-xl">
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        }
      >
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Receipt Printer">
            <div className="relative">
              <PrinterSelect
                value={receiptPrinter}
                printers={printers}
                onChange={(value) => updateSetting('receiptPrinterName', value)}
              />
              {receiptPrinter && (
                <div className="absolute right-9 top-1/2 -translate-y-1/2">
                  <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50" />
                </div>
              )}
            </div>
          </Field>
          <Field label="Label Printer">
            <div className="relative">
              <PrinterSelect
                value={labelPrinter}
                printers={printers}
                onChange={(value) => updateSetting('labelPrinterName', value)}
              />
              {labelPrinter && (
                <div className="absolute right-9 top-1/2 -translate-y-1/2">
                  <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50" />
                </div>
              )}
            </div>
          </Field>
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          <Button onClick={testReceipt} disabled={printing} className="rounded-xl">
            <Printer className="h-4 w-4" />
            {printing ? 'Printing...' : 'Test Receipt'}
          </Button>
          <Button
            variant="outline"
            onClick={testLabel}
            disabled={printingLabel}
            className="rounded-xl"
          >
            <Tag className="h-4 w-4" />
            {printingLabel ? 'Printing...' : 'Test Label'}
          </Button>
          <Button
            variant="outline"
            onClick={runDiagnostics}
            disabled={checking}
            className="rounded-xl"
          >
            <Activity className="h-4 w-4" />
            {checking ? 'Checking...' : 'Run Diagnostics'}
          </Button>
        </div>
      </SettingsSection>

      {diagnostics && (
        <SettingsSection title="Diagnostics Result" icon={<Activity className="h-4 w-4" />}>
          <div className="grid gap-3 md:grid-cols-2">
            <StatusCard label="Printer selected" ok={diagnostics.checks.printerSelected} />
            <StatusCard label="Exists in Windows" ok={diagnostics.checks.selectedExistsInSystem} />
            <StatusCard label="Service bound" ok={diagnostics.checks.serviceBoundToSelection} />
            <StatusCard label="Windows online" ok={!diagnostics.checks.windowsReportsOffline} />
          </div>
          {diagnostics.recommendations.length > 0 && (
            <div className="mt-4 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm space-y-1">
              {diagnostics.recommendations.map((item) => (
                <p key={item} className="flex items-start gap-2">
                  <XCircle className="h-4 w-4 shrink-0 text-destructive mt-0.5" />
                  <span>{item}</span>
                </p>
              ))}
            </div>
          )}
        </SettingsSection>
      )}
    </div>
  )
}

function PrinterSelect({
  value,
  printers,
  onChange
}: {
  value: string
  printers: string[]
  onChange: (value: string) => void
}): React.JSX.Element {
  return (
    <select
      className="h-9 w-full rounded-lg border border-input bg-background px-3 pr-12 text-sm transition-colors focus:border-primary/50 focus:ring-1 focus:ring-primary/20"
      value={value}
      onChange={(event) => onChange(event.target.value)}
    >
      <option value="">No printer selected</option>
      {printers.map((printer) => (
        <option key={printer} value={printer}>
          {printer}
        </option>
      ))}
    </select>
  )
}

function StatusCard({ label, ok }: { label: string; ok: boolean }): React.JSX.Element {
  return (
    <div
      className={`flex items-center justify-between rounded-xl border p-4 text-sm transition-colors ${
        ok ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-destructive/20 bg-destructive/5'
      }`}
    >
      <span className="flex items-center gap-2">
        {ok ? (
          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
        ) : (
          <XCircle className="h-4 w-4 text-destructive" />
        )}
        {label}
      </span>
      <Badge variant={ok ? 'secondary' : 'destructive'} className="text-[10px]">
        {ok ? 'OK' : 'Needs attention'}
      </Badge>
    </div>
  )
}
