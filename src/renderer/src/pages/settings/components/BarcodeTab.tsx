import React, { useState } from 'react'
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Barcode,
  ChevronDown,
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
            : 'text-muted-foreground hover:bg-accent/40 hover:text-foreground'
        }`}
      >
        <AlignLeft className="h-4 w-4" />
      </button>
      <button
        type="button"
        title="Align Center"
        onClick={() => onChange('center')}
        className={`flex h-7 w-8 items-center justify-center rounded-md transition-all duration-200 ${
          value === 'center'
            ? 'bg-primary text-primary-foreground shadow-sm'
            : 'text-muted-foreground hover:bg-accent/40 hover:text-foreground'
        }`}
      >
        <AlignCenter className="h-4 w-4" />
      </button>
      <button
        type="button"
        title="Align Right"
        onClick={() => onChange('right')}
        className={`flex h-7 w-8 items-center justify-center rounded-md transition-all duration-200 ${
          value === 'right'
            ? 'bg-primary text-primary-foreground shadow-sm'
            : 'text-muted-foreground hover:bg-accent/40 hover:text-foreground'
        }`}
      >
        <AlignRight className="h-4 w-4" />
      </button>
    </div>
  )
}

function NumericOrDefaultInput({
  value,
  onChange,
  placeholder,
  min,
  max,
  step
}: {
  value: string
  onChange: (val: string) => void
  placeholder: string
  min?: string
  max?: string
  step?: string
}): React.JSX.Element {
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
      className="h-9 w-full rounded-lg bg-background"
    />
  )
}

function generateBarcodeSvg(value: string): React.JSX.Element {
  let hash = 0
  for (let i = 0; i < value.length; i++) {
    hash = value.charCodeAt(i) + ((hash << 5) - hash)
  }
  hash = Math.abs(hash)

  const bars: number[] = []
  let currentVal = hash
  for (let i = 0; i < 44; i++) {
    const width = (currentVal % 3) + 1
    bars.push(width)
    currentVal = Math.floor(currentVal / 3) ^ 0x12345
  }

  let x = 0
  const elements: React.JSX.Element[] = []
  bars.forEach((width, index) => {
    const isBar = index % 2 === 0
    if (isBar) {
      elements.push(<rect key={index} x={x} y={0} width={width} height={100} fill="black" />)
    }
    x += width
  })

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

function BarcodeStickerPreview({
  settings,
  labelSize
}: {
  settings: SettingsMap
  labelSize: '46x25' | '60x40'
}): React.JSX.Element {
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

  const headerText = showSaleName && saleNameText ? saleNameText : shopName || 'SHOP NAME'

  const dummyMrp = 1999
  const dummySp = 1499
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
        className="relative border border-border/80 bg-white text-black shadow-lg overflow-hidden transition-all duration-300 rounded-sm"
        style={{
          width: `${widthPx}px`,
          height: `${heightPx}px`
        }}
      >
        {/* Printable Area Wrapper (Nudged by calibration values) */}
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
              className="w-full truncate font-extrabold uppercase tracking-wide select-none leading-none shrink-0"
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
              className="w-full font-bold select-none leading-tight shrink-0 line-clamp-2"
              style={{
                fontSize: `${nameFS}px`,
                textAlign: nameAlign as 'left' | 'center' | 'right'
              }}
            >
              Cotton Silk Saree
            </div>
          )}

          {/* Prices Row */}
          {(showMrp || showSellingPrice) && (
            <div
              className="w-full flex items-baseline select-none leading-none shrink-0"
              style={{
                fontSize: `${priceFS}px`,
                justifyContent: getPriceJustify(),
                gap: '6px'
              }}
            >
              {showMrp && (
                <span
                  className="relative font-semibold shrink-0"
                  style={{
                    fontSize: `${priceFS * 0.85}px`
                  }}
                >
                  ₹{dummyMrp.toFixed(2)}
                  {strikeMrp && (
                    <span className="absolute left-0 right-0 top-[50%] h-[1px] bg-black pointer-events-none" />
                  )}
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
                <span className="font-bold shrink-0 text-[0.85em]">({discountPercent}% OFF)</span>
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
              {generateBarcodeSvg('KPT00001')}
            </div>
          </div>

          {/* SKU Code Text */}
          {showCode && (
            <div
              className="w-full font-mono font-bold select-none leading-none shrink-0"
              style={{
                fontSize: `${codeFS}px`,
                textAlign: codeAlign as 'left' | 'center' | 'right'
              }}
            >
              KPT00001
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

interface CollapsibleSectionProps {
  title: string
  description?: string
  icon: React.ReactNode
  isOpen: boolean
  onToggle: () => void
  action?: React.ReactNode
  children: React.ReactNode
}

function CollapsibleSection({
  title,
  description,
  icon,
  isOpen,
  onToggle,
  action,
  children
}: CollapsibleSectionProps): React.JSX.Element {
  return (
    <div className="group/section relative rounded-xl border border-border/60 bg-card shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden">
      {/* Gradient top accent */}
      <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-primary/60 via-primary/20 to-transparent" />

      {/* Header (clickable) */}
      <div
        onClick={onToggle}
        className="flex items-center justify-between p-5 cursor-pointer select-none hover:bg-muted/30 transition-colors duration-200"
      >
        <div className="flex items-start gap-3">
          {icon && (
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/8 text-primary mt-0.5">
              {icon}
            </div>
          )}
          <div>
            <h2 className="text-base font-semibold text-foreground tracking-tight">{title}</h2>
            {description && (
              <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{description}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
          {action}
          <button
            type="button"
            onClick={onToggle}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-all duration-200"
          >
            <ChevronDown
              className={`h-4 w-4 transition-transform duration-300 ${
                isOpen ? 'rotate-180' : 'rotate-0'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Content */}
      <div
        className={`transition-all duration-300 ease-in-out ${
          isOpen
            ? 'max-h-[1000px] opacity-100 border-t border-border/40 p-6'
            : 'max-h-0 opacity-0 pointer-events-none overflow-hidden'
        }`}
      >
        {children}
      </div>
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
  const [openSections, setOpenSections] = useState({
    content: true,
    typography: false,
    spacing: false,
    calibration: false
  })

  const toggleSection = (section: keyof typeof openSections): void => {
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }))
  }

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
    <div className="grid gap-8 lg:grid-cols-12 items-start">
      {/* Left Column: Collapsible Configuration Dropdowns */}
      <div className="lg:col-span-7 space-y-4">
        {/* Section 1: Label Content & Visibility */}
        <CollapsibleSection
          title="Barcode Label Content"
          description="Choose which text elements appear on barcode labels."
          icon={<Barcode className="h-4 w-4" />}
          isOpen={openSections.content}
          onToggle={() => toggleSection('content')}
        >
          <div className="grid gap-4 md:grid-cols-2">
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
              <Field label="Sale Name Text">
                <Input
                  value={settingValue(settings, 'barcodeSaleNameText')}
                  onChange={(event) => updateSetting('barcodeSaleNameText', event.target.value)}
                  className="rounded-lg bg-background"
                />
              </Field>
            </div>
          )}
        </CollapsibleSection>

        {/* Section 2: Typography & Alignment */}
        <CollapsibleSection
          title="Typography & Text Alignment"
          description="Adjust font size (in pt) and text alignment for each sticker field."
          icon={<Type className="h-4 w-4" />}
          isOpen={openSections.typography}
          onToggle={() => toggleSection('typography')}
        >
          <div className="space-y-4">
            <div className="hidden sm:grid grid-cols-[1fr_120px_110px] gap-4 text-xs font-semibold text-muted-foreground pb-2 border-b border-border/40">
              <div>Element Label</div>
              <div>Font Size (pt)</div>
              <div className="text-right pr-2">Alignment</div>
            </div>

            {/* Shop / Sale Name */}
            {settingBool(settings, 'barcodeShowShopName') && (
              <div className="grid grid-cols-1 sm:grid-cols-[1fr_120px_110px] items-center gap-3 py-1 border-b border-border/10 sm:border-none">
                <span className="text-sm font-medium text-foreground/80">Shop / Sale Name</span>
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

            {/* Product Name */}
            {settingBool(settings, 'barcodeShowName') && (
              <div className="grid grid-cols-1 sm:grid-cols-[1fr_120px_110px] items-center gap-3 py-1 border-b border-border/10 sm:border-none">
                <span className="text-sm font-medium text-foreground/80">Product Name</span>
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

            {/* Price Row */}
            {(settingBool(settings, 'barcodeShowMrp') ||
              settingBool(settings, 'barcodeShowSellingPrice')) && (
              <div className="grid grid-cols-1 sm:grid-cols-[1fr_120px_110px] items-center gap-3 py-1 border-b border-border/10 sm:border-none">
                <span className="text-sm font-medium text-foreground/80">Price Row</span>
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

            {/* SKU Code Text */}
            {settingBool(settings, 'barcodeShowCode') && (
              <div className="grid grid-cols-1 sm:grid-cols-[1fr_120px_110px] items-center gap-3 py-1">
                <span className="text-sm font-medium text-foreground/80">SKU Code Text</span>
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
        </CollapsibleSection>

        {/* Section 3: Margins & Spacing */}
        <CollapsibleSection
          title="Label Spacing & Dimensions"
          description="Adjust sticker paddings, element gaps, and barcode scale."
          icon={<SlidersHorizontal className="h-4 w-4" />}
          isOpen={openSections.spacing}
          onToggle={() => toggleSection('spacing')}
        >
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Label Size Preset">
              <select
                className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm transition-colors focus:border-primary/50 focus:ring-1 focus:ring-primary/20"
                value={labelSize}
                onChange={(event) => updateSetting('barcodeLabelSize', event.target.value)}
              >
                <option value="46x25">46 x 25 mm</option>
                <option value="60x40">60 x 40 mm</option>
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
                className="rounded-lg bg-background"
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
                className="rounded-lg bg-background"
              />
            </Field>
          </div>
        </CollapsibleSection>

        {/* Section 4: Print Calibration */}
        <CollapsibleSection
          title="Print Calibration & Offsets"
          description="Nudge layout offset to match pre-cut label positions."
          icon={<RotateCcw className="h-4 w-4" />}
          isOpen={openSections.calibration}
          onToggle={() => toggleSection('calibration')}
          action={
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={resetCalibration}
                className="rounded-lg text-xs h-8"
              >
                <RotateCcw className="h-3 w-3 mr-1" />
                Reset
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={testLabel}
                disabled={printingLabel}
                className="rounded-lg text-xs h-8"
              >
                <Tag className="h-3 w-3 mr-1" />
                {printingLabel ? 'Printing...' : 'Print Test'}
              </Button>
            </div>
          }
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
                className="rounded-lg bg-background"
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
                className="rounded-lg bg-background"
              />
            </Field>
          </div>
        </CollapsibleSection>
      </div>

      {/* Right Column: Sticky Live Preview */}
      <div className="lg:col-span-5 lg:sticky lg:top-[90px] self-start space-y-4">
        <SettingsSection title="Live Preview" icon={<Tag className="h-4 w-4" />}>
          <div className="flex flex-col justify-center items-center rounded-xl border border-border/60 bg-muted/20 p-8 shadow-inner min-h-[350px] relative overflow-hidden bg-[radial-gradient(#e5e7eb_1.2px,transparent_1.2px)] [background-size:16px_16px]">
            <BarcodeStickerPreview settings={settings} labelSize={labelSize} />
          </div>
        </SettingsSection>
      </div>
    </div>
  )
}
