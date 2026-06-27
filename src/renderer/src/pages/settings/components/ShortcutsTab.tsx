import { Keyboard, RotateCcw, Zap } from 'lucide-react'
import { Button } from '../../../components/ui/button'
import { Field, SettingsSection } from './SettingsFields'
import { settingValue } from '../settings-model'
import type { SettingsMap, UpdateSetting } from '../types'

const FIXED_SHORTCUTS = [
  ['F1', 'Dashboard'],
  ['F2', 'Billing'],
  ['F3', 'Products'],
  ['F4', 'Purchases'],
  ['F5', 'Customers'],
  ['F7', 'Reports'],
  ['F10', 'Settings'],
  ['F11', 'Pay and Print'],
  ['F12', 'Shortcuts Help'],
  ['Ctrl+K', 'Quick bill search'],
  ['Alt+L', 'Lock screen']
]

const CUSTOM_SHORTCUTS = [
  {
    key: 'shortcut_addOther',
    label: 'Add Other item',
    description: 'Quick add a miscellaneous item to the cart.',
    defaultValue: 'Alt+O'
  },
  {
    key: 'shortcut_newCustomer',
    label: 'New customer',
    description: 'Open inline customer creation from billing.',
    defaultValue: 'Alt+N'
  }
]

const OPTIONS = [
  'Alt+O',
  'Alt+N',
  'Alt+C',
  'Alt+P',
  'Alt+A',
  'Alt+I',
  'Alt+Q',
  'Alt+S',
  'Alt+X',
  'Alt+M',
  'Alt+1',
  'Alt+2',
  'Alt+3',
  'Alt+4',
  'Alt+5'
]

export function ShortcutsTab({
  settings,
  updateSetting
}: {
  settings: SettingsMap
  updateSetting: UpdateSetting
}): React.JSX.Element {
  const reset = (): void => {
    for (const shortcut of CUSTOM_SHORTCUTS) {
      updateSetting(shortcut.key, shortcut.defaultValue)
    }
  }

  return (
    <div className="space-y-6">
      <SettingsSection
        title="Custom Billing Shortcuts"
        description="Only Alt-key shortcuts can be changed here to avoid system conflicts."
        icon={<Zap className="h-4 w-4" />}
        action={
          <Button variant="outline" onClick={reset} className="rounded-xl">
            <RotateCcw className="h-4 w-4" />
            Reset
          </Button>
        }
      >
        <div className="space-y-4">
          {CUSTOM_SHORTCUTS.map((shortcut) => {
            const current = settingValue(settings, shortcut.key) || shortcut.defaultValue
            const assigned = CUSTOM_SHORTCUTS.filter((item) => item.key !== shortcut.key).map(
              (item) => settingValue(settings, item.key) || item.defaultValue
            )
            return (
              <Field key={shortcut.key} label={shortcut.label} hint={shortcut.description}>
                <select
                  className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm sm:w-48 transition-colors focus:border-primary/50 focus:ring-1 focus:ring-primary/20"
                  value={current}
                  onChange={(event) => updateSetting(shortcut.key, event.target.value)}
                >
                  {OPTIONS.map((option) => (
                    <option key={option} value={option} disabled={assigned.includes(option)}>
                      {option}
                      {assigned.includes(option) ? ' (in use)' : ''}
                    </option>
                  ))}
                </select>
              </Field>
            )
          })}
        </div>
      </SettingsSection>

      <SettingsSection
        title="Fixed Shortcuts"
        description="Navigation and global shortcuts are stable."
        icon={<Keyboard className="h-4 w-4" />}
      >
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {FIXED_SHORTCUTS.map(([shortcut, label]) => (
            <div
              key={shortcut}
              className="flex items-center justify-between rounded-xl border border-border/60 bg-background/60 p-3.5 text-sm hover:border-border hover:shadow-sm transition-all duration-200 group"
            >
              <span className="flex items-center gap-2.5">
                <Keyboard className="h-3.5 w-3.5 text-muted-foreground/60 group-hover:text-primary transition-colors" />
                <span className="text-foreground/80">{label}</span>
              </span>
              <kbd className="rounded-lg border border-border/60 bg-muted/60 px-2.5 py-1 font-mono text-[11px] text-muted-foreground shadow-sm shadow-black/5 group-hover:border-primary/30 group-hover:text-primary transition-all">
                {shortcut}
              </kbd>
            </div>
          ))}
        </div>
      </SettingsSection>
    </div>
  )
}
