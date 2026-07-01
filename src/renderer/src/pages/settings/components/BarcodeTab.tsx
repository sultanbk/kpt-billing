import React, { useState } from 'react'
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Barcode,
  RotateCcw,
  SlidersHorizontal,
  Tag,
  Type
} from 'lucide-react'
import { Button } from '../../../components/ui/button'
import { Input } from '../../../components/ui/input'
import { Field, SettingsSection, ToggleField } from './SettingsFields'
import { settingBool, settingValue } from '../settings-model'
import type { SettingsMap, UpdateSetting } from '../types'
import { toast } from 'sonner'

const BARCODE_DEFAULTS: Record<string, string> = {
  barcodeLabelSize: '46x25',
  barcodeWidth: '75',
  barcodeHeight: '5.5',
  barcodeNudgeX: '0.0',
  barcodeNudgeY: '0.0',
  barcodePaddingX: 'default',
  barcodePaddingY: 'default',
  barcodeGap: 'default',
  barcodeShowShopName: 'true',
  barcodeShowSaleName: 'false',
  barcodeSaleNameText: '',
  barcodeShowName: 'true',
  barcodeShowMrp: 'true',
  barcodeShowSellingPrice: 'true',
  barcodeStrikeMrp: 'true',
  barcodeShowDiscount: 'true',
  barcodeShopFontSize: 'default',
  barcodeNameFontSize: 'default',
  barcodePriceFontSize: 'default',
  barcodeCodeFontSize: 'default',
  barcodeShopAlign: 'right',
  barcodeNameAlign: 'left',
  barcodePriceAlign: 'left',
  barcodeCodeAlign: 'center',
  barcodeShowCode: 'true'
}

interface AlignmentSelectorProps {
  value: string
  onChange: (val: string) => void
}

function AlignmentSelector({ value, onChange }: AlignmentSelectorProps): React.JSX.Element {
  return (
    <div className="flex rounded-lg border border-border/50 bg-background/50 p-1 shrink-0">
      <button
        type="button"
        title="Align Left"
        onClick={() => onChange('left')}
        className={`flex h-7 w-8 items-center justify-center rounded-md transition-all duration-200 ${
          value === 'left'
            ? 'bg-primary text-primary-foreground shadow-sm'
            : 'text-muted-foreground hover:bg-accent/45 hover:text-foreground'
        }`}
      >
        <AlignLeft className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        title="Align Center"
        onClick={() => onChange('center')}
        className={`flex h-7 w-8 items-center justify-center rounded-md transition-all duration-200 ${
          value === 'center'
            ? 'bg-primary text-primary-foreground shadow-sm'
            : 'text-muted-foreground hover:bg-accent/45 hover:text-foreground'
        }`}
      >
        <AlignCenter className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        title="Align Right"
        onClick={() => onChange('right')}
        className={`flex h-7 w-8 items-center justify-center rounded-md transition-all duration-200 ${
          value === 'right'
            ? 'bg-primary text-primary-foreground shadow-sm'
            : 'text-muted-foreground hover:bg-accent/45 hover:text-foreground'
        }`}
      >
        <AlignRight className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}

interface NumericOrDefaultInputProps {
  value: string
  onChange: (val: string) => void
  placeholder: string
  min?: string
  max?: string
  step?: string
}

function NumericOrDefaultInput({
  value,
  onChange,
  placeholder,
  min,
  max,
  step
}: NumericOrDefaultInputProps): React.JSX.Element {
  const displayValue = value === 'default' ? '' : value
  return (
    <Input
      type="number"
      min={min}
      max={max}
      step={step}
      placeholder={placeholder}
      value={displayValue}
      onChange={(e) => {
        const val = e.target.value
        onChange(val === '' ? 'default' : val)
      }}
      className="h-9 w-full rounded-lg bg-background text-sm"
    />
  )
}

const CODE39_WIDTHS: Record<string, number[]> = {
  '0': [1, 1, 1, 3, 3, 1, 3, 1, 1],
  '1': [3, 1, 1, 3, 1, 1, 1, 1, 3],
  '2': [1, 1, 3, 3, 1, 1, 1, 1, 3],
  '3': [3, 1, 3, 3, 1, 1, 1, 1, 1],
  '4': [1, 1, 1, 3, 3, 1, 1, 1, 3],
  '5': [3, 1, 1, 3, 3, 1, 1, 1, 1],
  '6': [1, 1, 3, 3, 3, 1, 1, 1, 1],
  '7': [1, 1, 1, 3, 1, 1, 3, 1, 3],
  '8': [3, 1, 1, 3, 1, 1, 3, 1, 1],
  '9': [1, 1, 3, 3, 1, 1, 3, 1, 1],
  A: [3, 1, 1, 1, 1, 3, 1, 1, 3],
  B: [1, 1, 3, 1, 1, 3, 1, 1, 3],
  C: [3, 1, 3, 1, 1, 3, 1, 1, 1],
  D: [1, 1, 1, 1, 3, 3, 1, 1, 3],
  E: [3, 1, 1, 1, 3, 3, 1, 1, 1],
  F: [1, 1, 3, 1, 3, 3, 1, 1, 1],
  G: [1, 1, 1, 1, 1, 3, 3, 1, 3],
  H: [3, 1, 1, 1, 1, 3, 3, 1, 1],
  I: [1, 1, 3, 1, 1, 3, 3, 1, 1],
  J: [1, 1, 1, 1, 3, 3, 3, 1, 1],
  K: [3, 1, 1, 1, 1, 1, 1, 3, 3],
  L: [1, 1, 3, 1, 1, 1, 1, 3, 3],
  M: [3, 1, 3, 1, 1, 1, 1, 3, 1],
  N: [1, 1, 1, 1, 3, 1, 1, 3, 3],
  O: [3, 1, 1, 1, 3, 1, 1, 3, 1],
  P: [1, 1, 3, 1, 3, 1, 1, 3, 1],
  Q: [1, 1, 1, 1, 1, 1, 3, 3, 3],
  R: [3, 1, 1, 1, 1, 1, 3, 3, 1],
  S: [1, 1, 3, 1, 1, 1, 3, 3, 1],
  T: [1, 1, 1, 1, 3, 1, 3, 3, 1],
  U: [3, 3, 1, 1, 1, 1, 1, 1, 3],
  V: [1, 3, 3, 1, 1, 1, 1, 1, 3],
  W: [3, 3, 3, 1, 1, 1, 1, 1, 1],
  X: [1, 3, 1, 1, 3, 1, 1, 1, 3],
  Y: [3, 3, 1, 1, 3, 1, 1, 1, 1],
  Z: [1, 3, 3, 1, 3, 1, 1, 1, 1],
  '-': [1, 3, 1, 1, 1, 1, 3, 1, 3],
  '.': [3, 3, 1, 1, 1, 1, 3, 1, 1],
  ' ': [1, 3, 3, 1, 1, 1, 3, 1, 1],
  '*': [1, 3, 1, 1, 3, 1, 3, 1, 1],
  $: [1, 3, 1, 3, 1, 3, 1, 1, 1],
  '/': [1, 3, 1, 3, 1, 1, 1, 3, 1],
  '+': [1, 3, 1, 1, 1, 3, 1, 3, 1],
  '%': [1, 1, 1, 3, 1, 3, 1, 3, 1]
}

function generateBarcodeSvg(value: string): React.JSX.Element {
  const cleanValue = `*${value.toUpperCase().replace(/[^*A-Z0-9\-.$/+% ]/g, '')}*`

  const elements: React.JSX.Element[] = []
  let x = 0

  for (let c = 0; c < cleanValue.length; c++) {
    const char = cleanValue[c]
    const widths = CODE39_WIDTHS[char] || CODE39_WIDTHS[' ']

    for (let i = 0; i < widths.length; i++) {
      const w = widths[i]
      const isBar = i % 2 === 0

      if (isBar) {
        elements.push(<rect key={`${c}-${i}`} x={x} y={0} width={w} height={100} fill="black" />)
      }
      x += w
    }

    if (c < cleanValue.length - 1) {
      x += 1
    }
  }

  return (
    <svg
      viewBox={`0 0 ${x} 100`}
      width="100%"
      height="100%"
      preserveAspectRatio="none"
      className="select-none"
    >
      {elements}
    </svg>
  )
}

interface BarcodeStickerPreviewProps {
  settings: SettingsMap
  labelSize: '46x25' | '60x40'
}

function BarcodeStickerPreview({
  settings,
  labelSize
}: BarcodeStickerPreviewProps): React.JSX.Element {
  const showShopName = settingBool(settings, 'barcodeShowShopName')
  const showSaleName = settingBool(settings, 'barcodeShowSaleName')
  const saleNameText = settingValue(settings, 'barcodeSaleNameText')
  const shopName = settingValue(settings, 'shopName')
  const showName = settingBool(settings, 'barcodeShowName')
  const showMrp = settingBool(settings, 'barcodeShowMrp')
  const showSellingPrice = settingBool(settings, 'barcodeShowSellingPrice')
  const strikeMrp = settingBool(settings, 'barcodeStrikeMrp')
  const showDiscount = settingBool(settings, 'barcodeShowDiscount')
  const showCode = settingBool(settings, 'barcodeShowCode')

  const paddingXStr = settingValue(settings, 'barcodePaddingX')
  const paddingYStr = settingValue(settings, 'barcodePaddingY')
  const gapStr = settingValue(settings, 'barcodeGap')
  const shopFontSizeStr = settingValue(settings, 'barcodeShopFontSize')
  const nameFontSizeStr = settingValue(settings, 'barcodeNameFontSize')
  const priceFontSizeStr = settingValue(settings, 'barcodePriceFontSize')
  const codeFontSizeStr = settingValue(settings, 'barcodeCodeFontSize')

  const shopAlign = settingValue(settings, 'barcodeShopAlign') || 'right'
  const nameAlign = settingValue(settings, 'barcodeNameAlign') || 'left'
  const priceAlign = settingValue(settings, 'barcodePriceAlign') || 'left'
  const codeAlign = settingValue(settings, 'barcodeCodeAlign') || 'center'

  const nudgeX = Number(settingValue(settings, 'barcodeNudgeX')) || 0
  const nudgeY = Number(settingValue(settings, 'barcodeNudgeY')) || 0
  const barcodeWidth = Number(settingValue(settings, 'barcodeWidth')) || 75
  const barcodeHeightMm =
    Number(settingValue(settings, 'barcodeHeight')) || (labelSize === '46x25' ? 5.5 : 13.0)

  const isSmall = labelSize === '46x25'
  const scale = 5.2

  const padX =
    (paddingXStr !== 'default' && paddingXStr ? parseFloat(paddingXStr) : isSmall ? 1.5 : 3.0) *
    scale
  const padY =
    (paddingYStr !== 'default' && paddingYStr ? parseFloat(paddingYStr) : isSmall ? 1.0 : 2.0) *
    scale
  const elementGap =
    (gapStr !== 'default' && gapStr ? parseFloat(gapStr) : isSmall ? 0.8 : 1.5) * scale

  const ptToPx = 0.3528 * scale
  const shopFS =
    (shopFontSizeStr !== 'default' && shopFontSizeStr
      ? parseFloat(shopFontSizeStr)
      : isSmall
        ? 8.5
        : 11.0) * ptToPx
  const nameFS =
    (nameFontSizeStr !== 'default' && nameFontSizeStr
      ? parseFloat(nameFontSizeStr)
      : isSmall
        ? 10.5
        : 14.0) * ptToPx
  const priceFS =
    (priceFontSizeStr !== 'default' && priceFontSizeStr
      ? parseFloat(priceFontSizeStr)
      : isSmall
        ? 9.5
        : 13.0) * ptToPx
  const codeFS =
    (codeFontSizeStr !== 'default' && codeFontSizeStr
      ? parseFloat(codeFontSizeStr)
      : isSmall
        ? 8.5
        : 11.0) * ptToPx

  const widthMm = isSmall ? 46 : 60
  const heightMm = isSmall ? 25 : 40

  const widthPx = widthMm * scale
  const heightPx = heightMm * scale

  const headerText = showSaleName && saleNameText ? saleNameText : shopName || 'ASHAD SALE'

  const dummyMrp = 400
  const dummySp = 350
  const discountPercent = Math.round(((dummyMrp - dummySp) / dummyMrp) * 100)

  const getPriceJustify = (): string => {
    if (priceAlign === 'center') return 'center'
    if (priceAlign === 'right') return 'flex-end'
    return 'flex-start'
  }

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Label Sticker Container */}
      <div
        className="relative border border-neutral-200/85 bg-white text-black shadow-[0_8px_30px_rgb(0,0,0,0.06),0_1px_3px_rgb(0,0,0,0.02)] overflow-hidden transition-all duration-300 rounded-[6px]"
        style={{
          width: `${widthPx}px`,
          height: `${heightPx}px`
        }}
      >
        {/* Printable Area Wrapper */}
        <div
          className="w-full h-full flex flex-col justify-start items-start"
          style={{
            padding: `${padY}px ${padX}px`,
            gap: `${elementGap}px`,
            transform: `translate(${nudgeX * scale}px, ${nudgeY * scale}px)`
          }}
        >
          {/* Shop Name */}
          {showShopName && (
            <div
              className="w-full truncate font-extrabold uppercase tracking-wider select-none leading-none shrink-0"
              style={{
                fontSize: `${shopFS}px`,
                textAlign: shopAlign as 'left' | 'center' | 'right'
              }}
            >
              {headerText}
            </div>
          )}

          {/* Product Name */}
          {showName && (
            <div
              className="w-full font-bold select-none leading-tight shrink-0 line-clamp-1 font-sans"
              style={{
                fontSize: `${nameFS}px`,
                textAlign: nameAlign as 'left' | 'center' | 'right'
              }}
            >
              ALFINE NIGHTY
            </div>
          )}

          {/* Prices Row */}
          {(showMrp || showSellingPrice) && (
            <div
              className="w-full flex items-baseline select-none leading-none shrink-0"
              style={{
                fontSize: `${priceFS}px`,
                justifyContent: getPriceJustify(),
                gap: '8px'
              }}
            >
              {showMrp && (
                <span
                  className="font-semibold shrink-0 text-neutral-600"
                  style={{
                    fontSize: `${priceFS * 0.85}px`,
                    textDecoration: strikeMrp ? 'line-through' : 'none'
                  }}
                >
                  ₹{dummyMrp.toFixed(2)}
                </span>
              )}
              {showSellingPrice && (
                <span
                  className="font-extrabold shrink-0"
                  style={{ fontSize: `${priceFS * 1.15}px` }}
                >
                  ₹{dummySp.toFixed(2)}
                </span>
              )}
              {showDiscount && (
                <span className="font-bold shrink-0 text-[0.82em]">({discountPercent}% OFF)</span>
              )}
            </div>
          )}

          {/* Barcode Image */}
          <div
            className="w-full flex items-center justify-center shrink-0 overflow-hidden"
            style={{
              height: `${barcodeHeightMm * scale}px`
            }}
          >
            <div
              className="h-full"
              style={{
                width: `${barcodeWidth}%`
              }}
            >
              {generateBarcodeSvg('000025')}
            </div>
          </div>

          {/* SKU Code Text */}
          {showCode && (
            <div
              className="w-full font-mono font-semibold select-none leading-none shrink-0 tracking-[0.15em]"
              style={{
                fontSize: `${codeFS}px`,
                textAlign: codeAlign as 'left' | 'center' | 'right'
              }}
            >
              000025
            </div>
          )}
        </div>
      </div>

      <span className="text-xs text-muted-foreground font-mono bg-background/80 px-2.5 py-1 rounded-full border border-border/40 select-none shadow-sm">
        Sticker Area: {widthMm}mm x {heightMm}mm
      </span>
    </div>
  )
}

interface CardSectionProps {
  title: string
  description?: string
  icon: React.ReactNode
  children: React.ReactNode
}

function CardSection({ title, description, icon, children }: CardSectionProps): React.JSX.Element {
  return (
    <div className="relative rounded-xl border border-border/40 bg-card/65 backdrop-blur-sm shadow-sm p-5 space-y-4 transition-all duration-300 hover:border-border/60 hover:shadow-md">
      <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-primary/30 to-transparent" />
      <div className="flex items-start gap-3">
        {icon && (
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            {icon}
          </div>
        )}
        <div>
          <h3 className="text-sm font-semibold text-foreground tracking-tight">{title}</h3>
          {description && (
            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{description}</p>
          )}
        </div>
      </div>
      <div className="pt-1">{children}</div>
    </div>
  )
}

export function BarcodeTab({
  settings,
  updateSetting
}: {
  settings: SettingsMap
  updateSetting: UpdateSetting
}): React.JSX.Element {
  const [printingLabel, setPrintingLabel] = useState(false)

  const resetCalibration = (): void => {
    for (const [key, value] of Object.entries(BARCODE_DEFAULTS)) {
      updateSetting(key, value)
    }
    toast.success('Barcode options reset to defaults')
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
        barcodeHeight: settingValue(settings, 'barcodeHeight'),
        barcodeShopFontSize: settingValue(settings, 'barcodeShopFontSize'),
        barcodeNameFontSize: settingValue(settings, 'barcodeNameFontSize'),
        barcodePriceFontSize: settingValue(settings, 'barcodePriceFontSize'),
        barcodeCodeFontSize: settingValue(settings, 'barcodeCodeFontSize'),
        barcodeShopAlign: settingValue(settings, 'barcodeShopAlign'),
        barcodeNameAlign: settingValue(settings, 'barcodeNameAlign'),
        barcodePriceAlign: settingValue(settings, 'barcodePriceAlign'),
        barcodeCodeAlign: settingValue(settings, 'barcodeCodeAlign'),
        barcodePaddingX: settingValue(settings, 'barcodePaddingX'),
        barcodePaddingY: settingValue(settings, 'barcodePaddingY'),
        barcodeGap: settingValue(settings, 'barcodeGap'),
        barcodeShowCode: settingBool(settings, 'barcodeShowCode')
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

  const labelSize = settingValue(settings, 'barcodeLabelSize') === '60x40' ? '60x40' : '46x25'

  return (
    <div className="grid gap-6 lg:grid-cols-12 items-start">
      {/* Left Column: Configuration Settings Grid */}
      <div className="lg:col-span-7 space-y-6">
        {/* Minimalist Top Actions Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-muted/40 border border-border/40 p-4 rounded-xl shadow-sm">
          <div>
            <h3 className="text-xs font-semibold text-foreground tracking-wide uppercase">
              Label Controls
            </h3>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Quickly run test prints or restore standard layouts
            </p>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={resetCalibration}
              className="rounded-xl text-xs h-9 px-3.5 gap-1.5 hover:bg-accent/40"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset Defaults
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={testLabel}
              disabled={printingLabel}
              className="rounded-xl text-xs h-9 px-3.5 gap-1.5 border-primary/20 hover:border-primary/40 text-primary hover:bg-primary/5 shadow-sm font-semibold"
            >
              <Tag className="h-3.5 w-3.5" />
              {printingLabel ? 'Printing...' : 'Print Test'}
            </Button>
          </div>
        </div>

        {/* Visibility Card */}
        <CardSection
          title="Barcode Label Content"
          description="Control which layout elements are printed on the sticker label."
          icon={<Barcode className="h-4 w-4" />}
        >
          <div className="grid gap-3.5 sm:grid-cols-2">
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
            <div className="mt-4 pt-3 border-t border-border/20">
              <Field label="Sale Name Text">
                <Input
                  value={settingValue(settings, 'barcodeSaleNameText')}
                  onChange={(event) => updateSetting('barcodeSaleNameText', event.target.value)}
                  className="rounded-lg bg-background"
                  placeholder="e.g. ASHAD SALE"
                />
              </Field>
            </div>
          )}
        </CardSection>

        {/* Spacing & Sizes Card */}
        <CardSection
          title="Sticker Geometry & Spacing"
          description="Set standard physical dimensions and element spacing offsets."
          icon={<SlidersHorizontal className="h-4 w-4" />}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Label Size Preset">
              <select
                className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm focus:border-primary/50 focus:ring-1 focus:ring-primary/20"
                value={labelSize}
                onChange={(event) => updateSetting('barcodeLabelSize', event.target.value)}
              >
                <option value="46x25">46 x 25 mm (Standard)</option>
                <option value="60x40">60 x 40 mm (Large)</option>
              </select>
            </Field>
            <Field label="Horizontal Padding (mm)">
              <NumericOrDefaultInput
                value={settingValue(settings, 'barcodePaddingX')}
                onChange={(val) => updateSetting('barcodePaddingX', val)}
                placeholder="Default (1.5 / 3.0)"
                min="0"
                max="10"
                step="0.1"
              />
            </Field>
            <Field label="Vertical Padding (mm)">
              <NumericOrDefaultInput
                value={settingValue(settings, 'barcodePaddingY')}
                onChange={(val) => updateSetting('barcodePaddingY', val)}
                placeholder="Default (1.0 / 2.0)"
                min="0"
                max="10"
                step="0.1"
              />
            </Field>
            <Field label="Element Gap (mm)">
              <NumericOrDefaultInput
                value={settingValue(settings, 'barcodeGap')}
                onChange={(val) => updateSetting('barcodeGap', val)}
                placeholder="Default (0.8 / 1.5)"
                min="0"
                max="10"
                step="0.1"
              />
            </Field>
            <Field label="Barcode Width (%)">
              <Input
                type="number"
                min="50"
                max="100"
                value={settingValue(settings, 'barcodeWidth')}
                onChange={(event) => updateSetting('barcodeWidth', event.target.value)}
                className="h-9 rounded-lg bg-background text-sm"
              />
            </Field>
            <Field label="Barcode Height (mm)">
              <Input
                type="number"
                min="3"
                max="20"
                step="0.5"
                value={settingValue(settings, 'barcodeHeight')}
                onChange={(event) => updateSetting('barcodeHeight', event.target.value)}
                className="h-9 rounded-lg bg-background text-sm"
              />
            </Field>
          </div>
        </CardSection>

        {/* Alignment & Typography Card */}
        <CardSection
          title="Typography & Alignment"
          description="Adjust font sizes (pt) and content alignments for label fields."
          icon={<Type className="h-4 w-4" />}
        >
          <div className="space-y-4">
            <div className="hidden sm:grid grid-cols-[1fr_120px_110px] gap-4 text-[10px] font-bold text-muted-foreground uppercase pb-2 border-b border-border/40">
              <div>Label Item</div>
              <div>Font Size (pt)</div>
              <div className="text-right pr-2">Alignment</div>
            </div>

            {settingBool(settings, 'barcodeShowShopName') && (
              <div className="grid grid-cols-1 sm:grid-cols-[1fr_120px_110px] items-center gap-3 py-1.5 border-b border-border/10 sm:border-none">
                <span className="text-xs font-semibold text-foreground/80">Shop / Sale Name</span>
                <NumericOrDefaultInput
                  value={settingValue(settings, 'barcodeShopFontSize')}
                  onChange={(val) => updateSetting('barcodeShopFontSize', val)}
                  placeholder="Default"
                  min="6"
                  max="24"
                  step="0.5"
                />
                <div className="flex justify-end">
                  <AlignmentSelector
                    value={settingValue(settings, 'barcodeShopAlign') || 'right'}
                    onChange={(val) => updateSetting('barcodeShopAlign', val)}
                  />
                </div>
              </div>
            )}

            {settingBool(settings, 'barcodeShowName') && (
              <div className="grid grid-cols-1 sm:grid-cols-[1fr_120px_110px] items-center gap-3 py-1.5 border-b border-border/10 sm:border-none">
                <span className="text-xs font-semibold text-foreground/80">Product Name</span>
                <NumericOrDefaultInput
                  value={settingValue(settings, 'barcodeNameFontSize')}
                  onChange={(val) => updateSetting('barcodeNameFontSize', val)}
                  placeholder="Default"
                  min="6"
                  max="24"
                  step="0.5"
                />
                <div className="flex justify-end">
                  <AlignmentSelector
                    value={settingValue(settings, 'barcodeNameAlign') || 'left'}
                    onChange={(val) => updateSetting('barcodeNameAlign', val)}
                  />
                </div>
              </div>
            )}

            {(settingBool(settings, 'barcodeShowMrp') ||
              settingBool(settings, 'barcodeShowSellingPrice')) && (
              <div className="grid grid-cols-1 sm:grid-cols-[1fr_120px_110px] items-center gap-3 py-1.5 border-b border-border/10 sm:border-none">
                <span className="text-xs font-semibold text-foreground/80">Price Row</span>
                <NumericOrDefaultInput
                  value={settingValue(settings, 'barcodePriceFontSize')}
                  onChange={(val) => updateSetting('barcodePriceFontSize', val)}
                  placeholder="Default"
                  min="6"
                  max="24"
                  step="0.5"
                />
                <div className="flex justify-end">
                  <AlignmentSelector
                    value={settingValue(settings, 'barcodePriceAlign') || 'left'}
                    onChange={(val) => updateSetting('barcodePriceAlign', val)}
                  />
                </div>
              </div>
            )}

            {settingBool(settings, 'barcodeShowCode') && (
              <div className="grid grid-cols-1 sm:grid-cols-[1fr_120px_110px] items-center gap-3 py-1.5">
                <span className="text-xs font-semibold text-foreground/80">SKU Code Text</span>
                <NumericOrDefaultInput
                  value={settingValue(settings, 'barcodeCodeFontSize')}
                  onChange={(val) => updateSetting('barcodeCodeFontSize', val)}
                  placeholder="Default"
                  min="6"
                  max="24"
                  step="0.5"
                />
                <div className="flex justify-end">
                  <AlignmentSelector
                    value={settingValue(settings, 'barcodeCodeAlign') || 'center'}
                    onChange={(val) => updateSetting('barcodeCodeAlign', val)}
                  />
                </div>
              </div>
            )}
          </div>
        </CardSection>

        {/* Nudge Calibration Card */}
        <CardSection
          title="Print Position Calibration"
          description="Slightly adjust layout offsets to align text with pre-cut sticker fields."
          icon={<RotateCcw className="h-4 w-4" />}
        >
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Nudge X (mm)" hint="Positive moves right, negative moves left">
              <Input
                type="number"
                min="-5"
                max="5"
                step="0.1"
                value={settingValue(settings, 'barcodeNudgeX')}
                onChange={(event) => updateSetting('barcodeNudgeX', event.target.value)}
                className="h-9 rounded-lg bg-background text-sm"
              />
            </Field>
            <Field label="Nudge Y (mm)" hint="Positive moves down, negative moves up">
              <Input
                type="number"
                min="-5"
                max="5"
                step="0.1"
                value={settingValue(settings, 'barcodeNudgeY')}
                onChange={(event) => updateSetting('barcodeNudgeY', event.target.value)}
                className="h-9 rounded-lg bg-background text-sm"
              />
            </Field>
          </div>
        </CardSection>
      </div>

      {/* Right Column: Sticky Live Preview */}
      <div className="lg:col-span-5 lg:sticky lg:top-[90px] self-start space-y-4">
        <SettingsSection title="Live Preview" icon={<Tag className="h-4 w-4" />}>
          <div className="flex flex-col justify-center items-center rounded-xl border border-border/40 bg-muted/10 p-8 shadow-inner min-h-[380px] relative overflow-hidden bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] dark:bg-[radial-gradient(#27272a_1px,transparent_1px)]">
            <BarcodeStickerPreview settings={settings} labelSize={labelSize} />
          </div>
        </SettingsSection>
      </div>
    </div>
  )
}
