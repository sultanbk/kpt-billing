import React, { useState, useEffect } from 'react'
import { FileText, FolderOpen, Receipt } from 'lucide-react'
import { toast } from 'sonner'
import QRCode from 'qrcode'
import { Button } from '../../../components/ui/button'
import { Input } from '../../../components/ui/input'
import { Textarea } from '../../../components/ui/textarea'
import { billingService } from '../../../services/billing.service'
import { dialogService } from '../../../services/dialog.service'
import { Field, SettingsSection, ToggleField } from './SettingsFields'
import { settingBool, settingValue } from '../settings-model'
import type { SettingsMap, UpdateSetting } from '../types'

interface ReceiptTabProps {
  settings: SettingsMap
  updateSetting: UpdateSetting
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

export function ReceiptTab({ settings, updateSetting }: ReceiptTabProps): React.JSX.Element {
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('')

  const openReceipts = async (): Promise<void> => {
    try {
      const dir = await billingService.getReceiptsDir()
      await dialogService.openFolder(dir)
    } catch {
      toast.error('Could not open receipts folder')
    }
  }

  useEffect(() => {
    const upiVpa = settingValue(settings, 'upiVpa') || 'krishnapriya@okaxis'
    const payeeName = settingValue(settings, 'upiPayeeName') || 'Krishnapriya Textiles'
    const upiUrl = `upi://pay?pa=${upiVpa}&pn=${encodeURIComponent(payeeName)}&am=1799.00&cu=INR`

    QRCode.toDataURL(upiUrl, {
      errorCorrectionLevel: 'M',
      margin: 1,
      width: 140
    })
      .then((url) => {
        setQrCodeUrl(url)
      })
      .catch((err) => {
        console.error('Failed to generate preview QR code:', err)
      })
  }, [settings])

  const shopName = settingValue(settings, 'shopName') || 'KRISHNAPRIYA TEXTILES'
  const shopPhone = settingValue(settings, 'shopPhone') || '9108455006'
  const shopAddress =
    settingValue(settings, 'shopAddress') ||
    'Shidling Complex, Opposite Bus Stand, Shirahatti 582120, Karnataka'
  const gstin = settingValue(settings, 'gstin') || '29NPTS9811E1ZT'

  return (
    <div className="grid gap-6 lg:grid-cols-12 items-start">
      {/* Left Column: Configuration Settings Grid */}
      <div className="lg:col-span-7 space-y-6">
        {/* Minimalist Top Actions Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-muted/40 border border-border/40 p-4 rounded-xl shadow-sm">
          <div>
            <h3 className="text-xs font-semibold text-foreground tracking-wide uppercase">
              Receipt Controls
            </h3>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Manage output folders and template settings
            </p>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-auto text-xs font-medium">
            <Button
              variant="outline"
              size="sm"
              onClick={openReceipts}
              className="rounded-xl text-xs h-9 px-3.5 gap-1.5 hover:bg-accent/40"
            >
              <FolderOpen className="h-4 w-4" />
              Receipts Folder
            </Button>
          </div>
        </div>

        {/* Paper & Print Card */}
        <CardSection
          title="Paper Size & Automation"
          description="Configure thermal receipt sizes and auto-printing settings."
          icon={<Receipt className="h-4 w-4" />}
        >
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Paper Width">
              <select
                className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm focus:border-primary/50 focus:ring-1 focus:ring-primary/20"
                value={settingValue(settings, 'receiptPaperWidthMm')}
                onChange={(event) => updateSetting('receiptPaperWidthMm', event.target.value)}
              >
                <option value="58">58 mm (Standard)</option>
                <option value="72">72 mm (Medium)</option>
                <option value="80">80 mm (Wide)</option>
              </select>
            </Field>
            <Field label="Receipt Copies">
              <Input
                type="number"
                min="1"
                max="3"
                value={settingValue(settings, 'receiptCopies')}
                onChange={(event) => updateSetting('receiptCopies', event.target.value)}
                className="h-9 rounded-lg bg-background text-sm"
              />
            </Field>
            <div className="md:col-span-2 pt-1">
              <ToggleField
                label="Auto-print receipt"
                hint="Print receipt automatically immediately after checkout."
                checked={settingBool(settings, 'autoPrintReceipt')}
                onCheckedChange={(checked) => updateSetting('autoPrintReceipt', String(checked))}
              />
            </div>
          </div>
        </CardSection>

        {/* Footer Configuration Card */}
        <CardSection
          title="Receipt Footer customization"
          description="Edit message policies printed at the bottom of customer receipts."
          icon={<FileText className="h-4 w-4" />}
        >
          <div className="space-y-4">
            <Field label="Footer Mode">
              <select
                className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm focus:border-primary/50 focus:ring-1 focus:ring-primary/20"
                value={settingValue(settings, 'receiptFooterType')}
                onChange={(event) => updateSetting('receiptFooterType', event.target.value)}
              >
                <option value="default">Default return policy</option>
                <option value="custom">Custom text policy</option>
                <option value="none">No footer text</option>
              </select>
            </Field>
            <Field label="Custom Footer Text">
              <Textarea
                value={settingValue(settings, 'receiptFooter')}
                onChange={(event) => updateSetting('receiptFooter', event.target.value)}
                disabled={settingValue(settings, 'receiptFooterType') !== 'custom'}
                className="rounded-lg bg-background min-h-[90px] text-sm"
                placeholder="e.g. Items can be returned within 7 days with original tag."
              />
            </Field>
          </div>
        </CardSection>
      </div>

      {/* Right Column: Sticky Thermal Receipt Live Preview */}
      <div className="lg:col-span-5 lg:sticky lg:top-[90px] self-start space-y-4">
        <SettingsSection title="Live Preview" icon={<FileText className="h-4 w-4" />}>
          <div className="flex flex-col justify-center items-center rounded-xl border border-border/40 bg-muted/10 p-8 shadow-inner min-h-[480px] relative overflow-hidden bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] dark:bg-[radial-gradient(#27272a_1px,transparent_1px)]">
            {/* Paper Container */}
            <div className="w-full max-w-[230px] drop-shadow-md transition-all duration-300 hover:drop-shadow-lg select-none">
              {/* Torn top edge */}
              <svg
                className="w-full h-3 block text-white fill-current drop-shadow-sm"
                viewBox="0 0 100 10"
                preserveAspectRatio="none"
              >
                <polygon points="0,10 5,0 10,10 15,0 20,10 25,0 30,10 35,0 40,10 45,0 50,10 55,0 60,10 65,0 70,10 75,0 80,10 85,0 90,10 95,0 100,10" />
              </svg>

              {/* Receipt Body */}
              <div className="w-full bg-white text-black px-4 py-3 font-mono text-[9px] border-x border-neutral-100/50">
                {/* Shop Title */}
                <div className="text-center font-bold text-xs tracking-wide uppercase leading-tight">
                  {shopName}
                </div>

                {/* Shop Address */}
                <div className="mt-1.5 text-center text-[8px] leading-relaxed text-neutral-700 font-medium whitespace-pre-line px-1">
                  {shopAddress}
                </div>

                {/* Contact and Tax Details */}
                <div className="mt-1 text-center text-[8px] text-neutral-800 leading-normal">
                  <div>Ph: {shopPhone}</div>
                  {gstin && <div className="tracking-wide">GSTIN: {gstin}</div>}
                </div>

                <div className="my-2 border-t border-dashed border-neutral-300" />

                {/* Invoice Details */}
                <div className="flex flex-col gap-0.5 text-[8px] text-neutral-800 leading-normal">
                  <div>Bill No: KPT/2026-27/00023</div>
                  <div>Date: 2026-06-25 Time: 00:39:52</div>
                  <div>Customer: Walk-in Customer</div>
                </div>

                <div className="my-2 border-t border-dashed border-neutral-300" />

                {/* Table Header */}
                <div className="grid grid-cols-[1fr_30px_50px_50px] text-[8px] font-bold text-black leading-normal">
                  <span>Item</span>
                  <span className="text-center">Qty</span>
                  <span className="text-right">Rate</span>
                  <span className="text-right">Amt</span>
                </div>
                <div className="my-1 border-t border-dashed border-neutral-200" />

                {/* Table Row */}
                <div className="grid grid-cols-[1fr_30px_50px_50px] text-[8px] text-neutral-800 leading-relaxed">
                  <span className="truncate">Cotton Saree</span>
                  <span className="text-center">1</span>
                  <span className="text-right">1799.00</span>
                  <span className="text-right">1799.00</span>
                </div>

                <div className="my-2 border-t border-dashed border-neutral-300" />

                {/* Subtotal */}
                <div className="flex justify-between text-[8px] text-neutral-800">
                  <span>Subtotal</span>
                  <span>1799.00</span>
                </div>

                <div className="my-1.5 border-t border-dashed border-neutral-300" />

                {/* TOTAL */}
                <div className="flex justify-between text-[11px] font-bold text-black leading-none">
                  <span>TOTAL</span>
                  <span>Rs.1799.00</span>
                </div>

                <div className="my-1.5 border-t border-dashed border-neutral-300" />

                {/* Payment and Qty Details */}
                <div className="flex flex-col gap-0.5 text-[8px] text-neutral-800 leading-normal">
                  <div>Payment: UPI</div>
                  <div>Items: 1 | Qty: 1</div>
                </div>

                <div className="my-2 border-t border-dashed border-neutral-300" />

                {/* UPI QR Code */}
                {qrCodeUrl && (
                  <div className="mt-2.5 flex flex-col items-center select-none">
                    <img
                      src={qrCodeUrl}
                      alt="UPI QR Code"
                      className="w-[100px] h-[100px] border border-neutral-200 p-1 bg-white"
                    />
                    <div className="mt-1 text-[8px] font-bold text-center uppercase tracking-wider text-black">
                      Scan to Pay
                    </div>
                  </div>
                )}

                {/* Footer Text */}
                {settingValue(settings, 'receiptFooterType') !== 'none' && (
                  <div className="mt-3.5 text-center text-[8px] text-neutral-600 leading-relaxed font-semibold italic">
                    {settingValue(settings, 'receiptFooterType') === 'custom'
                      ? settingValue(settings, 'receiptFooter') || 'Custom footer text'
                      : 'Thank you, visit again'}
                  </div>
                )}

                {/* Brand watermark */}
                <div className="mt-2 text-center text-[8px] text-neutral-500 tracking-wide">
                  --- Powered by SarvaOne ---
                </div>
              </div>

              {/* Torn bottom edge */}
              <svg
                className="w-full h-3 block text-white fill-current drop-shadow-sm"
                viewBox="0 0 100 10"
                preserveAspectRatio="none"
              >
                <polygon points="0,0 5,10 10,0 15,10 20,0 25,10 30,0 35,10 40,0 45,10 50,0 55,10 60,0 65,10 70,0 75,10 80,0 85,10 90,0 95,10 100,0" />
              </svg>
            </div>
          </div>
        </SettingsSection>
      </div>
    </div>
  )
}
