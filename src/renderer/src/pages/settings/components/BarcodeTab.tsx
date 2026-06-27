import { Barcode, RotateCcw, SlidersHorizontal, Tag } from 'lucide-react'
import { Button } from '../../../components/ui/button'
import { Input } from '../../../components/ui/input'
import { Field, SettingsSection, ToggleField } from './SettingsFields'
import { settingBool, settingValue } from '../settings-model'
import type { SettingsMap, UpdateSetting } from '../types'

const BARCODE_DEFAULTS: Record<string, string> = {
  barcodeWidth: '75',
  barcodeHeight: '5.5',
  barcodeNudgeX: '0.0',
  barcodeNudgeY: '0.0',
  barcodePaddingX: 'default',
  barcodePaddingY: 'default',
  barcodeGap: 'default'
}

export function BarcodeTab({
  settings,
  updateSetting
}: {
  settings: SettingsMap
  updateSetting: UpdateSetting
}): React.JSX.Element {
  const resetCalibration = (): void => {
    for (const [key, value] of Object.entries(BARCODE_DEFAULTS)) {
      updateSetting(key, value)
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
      <div className="space-y-6">
        <SettingsSection
          title="Barcode Label Content"
          description="Choose what appears on product stickers."
          icon={<Barcode className="h-4 w-4" />}
        >
          <div className="grid gap-3 md:grid-cols-2">
            <ToggleField
              label="Show shop name"
              checked={settingBool(settings, 'barcodeShowShopName')}
              onCheckedChange={(checked) => updateSetting('barcodeShowShopName', String(checked))}
            />
            <ToggleField
              label="Use sale name"
              checked={settingBool(settings, 'barcodeShowSaleName')}
              onCheckedChange={(checked) => updateSetting('barcodeShowSaleName', String(checked))}
            />
            <ToggleField
              label="Show product name"
              checked={settingBool(settings, 'barcodeShowName')}
              onCheckedChange={(checked) => updateSetting('barcodeShowName', String(checked))}
            />
            <ToggleField
              label="Show MRP"
              checked={settingBool(settings, 'barcodeShowMrp')}
              onCheckedChange={(checked) => updateSetting('barcodeShowMrp', String(checked))}
            />
            <ToggleField
              label="Show selling price"
              checked={settingBool(settings, 'barcodeShowSellingPrice')}
              onCheckedChange={(checked) =>
                updateSetting('barcodeShowSellingPrice', String(checked))
              }
            />
            <ToggleField
              label="Strike MRP"
              checked={settingBool(settings, 'barcodeStrikeMrp')}
              onCheckedChange={(checked) => updateSetting('barcodeStrikeMrp', String(checked))}
            />
            <ToggleField
              label="Show discount"
              checked={settingBool(settings, 'barcodeShowDiscount')}
              onCheckedChange={(checked) => updateSetting('barcodeShowDiscount', String(checked))}
            />
            <ToggleField
              label="Show SKU code"
              checked={settingBool(settings, 'barcodeShowCode')}
              onCheckedChange={(checked) => updateSetting('barcodeShowCode', String(checked))}
            />
          </div>
          {settingBool(settings, 'barcodeShowSaleName') && (
            <div className="mt-4">
              <Field label="Sale Name">
                <Input
                  value={settingValue(settings, 'barcodeSaleNameText')}
                  onChange={(event) => updateSetting('barcodeSaleNameText', event.target.value)}
                />
              </Field>
            </div>
          )}
        </SettingsSection>

        <SettingsSection
          title="Label Size and Calibration"
          description="Use small adjustments after printing a test label."
          icon={<SlidersHorizontal className="h-4 w-4" />}
          action={
            <Button variant="outline" onClick={resetCalibration} className="rounded-xl">
              <RotateCcw className="h-4 w-4" />
              Reset
            </Button>
          }
        >
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Label Size">
              <select
                className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm transition-colors focus:border-primary/50 focus:ring-1 focus:ring-primary/20"
                value={settingValue(settings, 'barcodeLabelSize')}
                onChange={(event) => updateSetting('barcodeLabelSize', event.target.value)}
              >
                <option value="46x25">46 x 25 mm</option>
                <option value="60x40">60 x 40 mm</option>
              </select>
            </Field>
            <Field label="Barcode Width (%)">
              <Input
                type="number"
                min="50"
                max="100"
                value={settingValue(settings, 'barcodeWidth')}
                onChange={(event) => updateSetting('barcodeWidth', event.target.value)}
              />
            </Field>
            <Field label="Barcode Height (mm)">
              <Input
                type="number"
                min="3"
                max="15"
                step="0.5"
                value={settingValue(settings, 'barcodeHeight')}
                onChange={(event) => updateSetting('barcodeHeight', event.target.value)}
              />
            </Field>
            <Field label="Nudge X (mm)">
              <Input
                type="number"
                min="-5"
                max="5"
                step="0.1"
                value={settingValue(settings, 'barcodeNudgeX')}
                onChange={(event) => updateSetting('barcodeNudgeX', event.target.value)}
              />
            </Field>
            <Field label="Nudge Y (mm)">
              <Input
                type="number"
                min="-5"
                max="5"
                step="0.1"
                value={settingValue(settings, 'barcodeNudgeY')}
                onChange={(event) => updateSetting('barcodeNudgeY', event.target.value)}
              />
            </Field>
          </div>
        </SettingsSection>
      </div>

      {/* Live Preview */}
      <SettingsSection title="Live Preview" icon={<Tag className="h-4 w-4" />}>
        <div className="mx-auto flex min-h-[210px] w-full max-w-[280px] flex-col justify-between rounded-xl border-2 border-dashed border-border/60 bg-gradient-to-b from-background to-muted/20 p-5 text-center shadow-inner">
          {settingBool(settings, 'barcodeShowShopName') && (
            <div className="text-xs font-bold uppercase tracking-wider text-foreground/70">
              {settingBool(settings, 'barcodeShowSaleName')
                ? settingValue(settings, 'barcodeSaleNameText') || 'SALE'
                : settingValue(settings, 'shopName')}
            </div>
          )}
          {settingBool(settings, 'barcodeShowName') && (
            <div className="text-sm font-semibold mt-1">Kanjivaram Saree</div>
          )}
          <div className="mx-auto my-3 flex h-12 w-44 items-center justify-center rounded-lg bg-muted/60 border border-border/40">
            <Tag className="h-7 w-7 text-muted-foreground/50" />
          </div>
          {settingBool(settings, 'barcodeShowCode') && (
            <div className="font-mono text-xs text-muted-foreground">KPT00001</div>
          )}
          <div className="text-sm font-bold mt-1">
            {settingBool(settings, 'barcodeShowMrp') && (
              <span
                className={
                  settingBool(settings, 'barcodeStrikeMrp')
                    ? 'mr-2 line-through text-muted-foreground'
                    : 'mr-2'
                }
              >
                MRP 1499
              </span>
            )}
            {settingBool(settings, 'barcodeShowSellingPrice') && <span>Rs. 999</span>}
          </div>
        </div>
      </SettingsSection>
    </div>
  )
}
