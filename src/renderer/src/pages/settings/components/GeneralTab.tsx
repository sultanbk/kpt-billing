import { Building2, FileText } from 'lucide-react'
import { Input } from '../../../components/ui/input'
import { Field, SettingsSection } from './SettingsFields'
import { settingValue } from '../settings-model'
import type { SettingsMap, UpdateSetting } from '../types'

export function GeneralTab({
  settings,
  updateSetting
}: {
  settings: SettingsMap
  updateSetting: UpdateSetting
}): React.JSX.Element {
  return (
    <div className="space-y-6">
      <SettingsSection
        title="Shop Identity"
        description="Your shop name, contact details, and address appear on receipts and labels."
        icon={<Building2 className="h-4 w-4" />}
      >
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Shop Name">
            <Input
              value={settingValue(settings, 'shopName')}
              onChange={(event) => updateSetting('shopName', event.target.value)}
              placeholder="Enter shop name"
            />
          </Field>
          <Field label="Phone">
            <Input
              value={settingValue(settings, 'shopPhone')}
              onChange={(event) => updateSetting('shopPhone', event.target.value)}
              placeholder="Shop phone number"
            />
          </Field>
          <Field label="Email">
            <Input
              value={settingValue(settings, 'shopEmail')}
              onChange={(event) => updateSetting('shopEmail', event.target.value)}
              placeholder="contact@shop.com"
            />
          </Field>
          <div className="md:col-span-2">
            <Field label="Shop Address">
              <textarea
                className="min-h-20 w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm transition-colors focus:border-primary/50 focus:ring-1 focus:ring-primary/20"
                value={settingValue(settings, 'shopAddress')}
                onChange={(event) => updateSetting('shopAddress', event.target.value)}
                placeholder="Full shop address"
              />
            </Field>
          </div>
        </div>
      </SettingsSection>

      <SettingsSection
        title="Tax & Billing"
        description="Tax registration, bill numbering, and default payment configuration."
        icon={<FileText className="h-4 w-4" />}
      >
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="GSTIN">
            <Input
              value={settingValue(settings, 'gstin')}
              onChange={(event) => updateSetting('gstin', event.target.value.toUpperCase())}
              placeholder="22AAAAA0000A1Z5"
              className="font-mono tracking-wide"
            />
          </Field>
          <Field label="PAN">
            <Input
              value={settingValue(settings, 'pan')}
              onChange={(event) => updateSetting('pan', event.target.value.toUpperCase())}
              placeholder="AAAAA1234A"
              className="font-mono tracking-wide"
            />
          </Field>
          <Field label="State Code">
            <Input
              value={settingValue(settings, 'stateCode')}
              onChange={(event) => updateSetting('stateCode', event.target.value)}
              placeholder="e.g. 27"
            />
          </Field>
          <Field label="Bill Prefix" hint="Existing bills keep their original numbers.">
            <Input
              value={settingValue(settings, 'billPrefix')}
              onChange={(event) => updateSetting('billPrefix', event.target.value.toUpperCase())}
              placeholder="e.g. KPT"
              className="font-mono tracking-wide"
            />
          </Field>
          <Field label="Default Payment Mode">
            <select
              className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm transition-colors focus:border-primary/50 focus:ring-1 focus:ring-primary/20"
              value={settingValue(settings, 'defaultPaymentMode')}
              onChange={(event) => updateSetting('defaultPaymentMode', event.target.value)}
            >
              <option value="cash">Cash</option>
              <option value="upi">UPI</option>
              <option value="card">Card</option>
              <option value="credit">Credit</option>
            </select>
          </Field>
          <div className="md:col-span-2">
            <Field label="Bank Details" hint="Displayed on receipts when bank payment is selected.">
              <textarea
                className="min-h-20 w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm transition-colors focus:border-primary/50 focus:ring-1 focus:ring-primary/20"
                value={settingValue(settings, 'bankDetails')}
                onChange={(event) => updateSetting('bankDetails', event.target.value)}
                placeholder="Bank name, account number, IFSC..."
              />
            </Field>
          </div>
        </div>
      </SettingsSection>
    </div>
  )
}
