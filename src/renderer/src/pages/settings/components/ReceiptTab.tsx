import { FileText, FolderOpen, Receipt } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '../../../components/ui/button'
import { Input } from '../../../components/ui/input'
import { Textarea } from '../../../components/ui/textarea'
import { billingService } from '../../../services/billing.service'
import { dialogService } from '../../../services/dialog.service'
import { Field, SettingsSection, ToggleField } from './SettingsFields'
import { settingBool, settingValue } from '../settings-model'
import type { SettingsMap, UpdateSetting } from '../types'

export function ReceiptTab({
  settings,
  updateSetting
}: {
  settings: SettingsMap
  updateSetting: UpdateSetting
}): React.JSX.Element {
  const openReceipts = async (): Promise<void> => {
    try {
      const dir = await billingService.getReceiptsDir()
      await dialogService.openFolder(dir)
    } catch {
      toast.error('Could not open receipts folder')
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
      <SettingsSection
        title="Receipt Format"
        description="Configure thermal receipt paper, automation, and customer footer text."
        icon={<Receipt className="h-4 w-4" />}
        action={
          <Button variant="outline" onClick={openReceipts} className="rounded-xl">
            <FolderOpen className="h-4 w-4" />
            Receipts Folder
          </Button>
        }
      >
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Paper Width">
            <select
              className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm transition-colors focus:border-primary/50 focus:ring-1 focus:ring-primary/20"
              value={settingValue(settings, 'receiptPaperWidthMm')}
              onChange={(event) => updateSetting('receiptPaperWidthMm', event.target.value)}
            >
              <option value="58">58 mm</option>
              <option value="72">72 mm</option>
              <option value="80">80 mm</option>
            </select>
          </Field>
          <Field label="Receipt Copies">
            <Input
              type="number"
              min="1"
              max="3"
              value={settingValue(settings, 'receiptCopies')}
              onChange={(event) => updateSetting('receiptCopies', event.target.value)}
            />
          </Field>
          <ToggleField
            label="Auto-print receipt"
            hint="Print automatically after checkout."
            checked={settingBool(settings, 'autoPrintReceipt')}
            onCheckedChange={(checked) => updateSetting('autoPrintReceipt', String(checked))}
          />
          <Field label="Footer Mode">
            <select
              className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm transition-colors focus:border-primary/50 focus:ring-1 focus:ring-primary/20"
              value={settingValue(settings, 'receiptFooterType')}
              onChange={(event) => updateSetting('receiptFooterType', event.target.value)}
            >
              <option value="default">Default policy</option>
              <option value="custom">Custom footer</option>
              <option value="none">No footer</option>
            </select>
          </Field>
          <div className="md:col-span-2">
            <Field label="Custom Footer">
              <Textarea
                value={settingValue(settings, 'receiptFooter')}
                onChange={(event) => updateSetting('receiptFooter', event.target.value)}
                disabled={settingValue(settings, 'receiptFooterType') !== 'custom'}
              />
            </Field>
          </div>
        </div>
      </SettingsSection>

      {/* Thermal Receipt Preview */}
      <SettingsSection title="Preview" icon={<FileText className="h-4 w-4" />}>
        <div className="mx-auto w-full max-w-[240px]">
          {/* Torn top edge */}
          <div className="h-3 w-full bg-gradient-to-b from-transparent to-white dark:to-zinc-900 rounded-t-md" />
          <div className="w-full rounded-b-md border border-t-0 border-border/40 bg-gradient-to-b from-white to-stone-50 dark:from-zinc-900 dark:to-zinc-950 p-5 font-mono text-xs shadow-md shadow-black/5">
            <div className="text-center font-bold text-foreground">
              {settingValue(settings, 'shopName')}
            </div>
            <div className="mt-1 text-center text-[10px] text-muted-foreground">
              {settingValue(settings, 'shopPhone')}
            </div>
            <div className="my-3 border-t border-dashed border-border/60" />
            <div className="flex justify-between">
              <span>2 x Saree</span>
              <span className="font-medium">1998.00</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Discount</span>
              <span>-100.00</span>
            </div>
            <div className="my-3 border-t border-dashed border-border/60" />
            <div className="flex justify-between font-bold text-foreground">
              <span>Total</span>
              <span>1898.00</span>
            </div>
            <div className="mt-4 flex justify-center">
              <FileText className="h-5 w-5 text-muted-foreground/40" />
            </div>
            {settingValue(settings, 'receiptFooterType') !== 'none' && (
              <div className="mt-3 text-center text-[10px] text-muted-foreground/80 italic">
                {settingValue(settings, 'receiptFooterType') === 'custom'
                  ? settingValue(settings, 'receiptFooter') || 'Custom footer'
                  : 'Thank you, visit again'}
              </div>
            )}
          </div>
          {/* Torn bottom edge */}
          <div className="h-3 w-full bg-gradient-to-t from-transparent to-white dark:to-zinc-900 rounded-b-md" />
        </div>
      </SettingsSection>
    </div>
  )
}
