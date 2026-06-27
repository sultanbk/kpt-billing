import type { ReactNode } from 'react'
import { Label } from '../../../components/ui/label'
import { Switch } from '@radix-ui/react-switch'

export function SettingsSection({
  title,
  description,
  children,
  action,
  icon
}: {
  title: string
  description?: string
  children: ReactNode
  action?: ReactNode
  icon?: ReactNode
}): React.JSX.Element {
  return (
    <section className="group/section relative rounded-xl border border-border/60 bg-card shadow-sm hover:shadow-md transition-shadow duration-300 overflow-hidden">
      {/* Gradient top accent */}
      <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-primary/60 via-primary/20 to-transparent" />
      <div className="p-6">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
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
          {action}
        </div>
        {children}
      </div>
    </section>
  )
}

export function Field({
  label,
  hint,
  children
}: {
  label: string
  hint?: string
  children: ReactNode
}): React.JSX.Element {
  return (
    <div className="group/field space-y-2 rounded-lg transition-colors duration-150">
      <Label className="text-sm font-medium text-foreground/80 group-focus-within/field:text-primary transition-colors duration-150">
        {label}
      </Label>
      {children}
      {hint && (
        <p className="text-xs text-muted-foreground/70 leading-relaxed">{hint}</p>
      )}
    </div>
  )
}

export function ToggleField({
  label,
  hint,
  checked,
  onCheckedChange
}: {
  label: string
  hint?: string
  checked: boolean
  onCheckedChange: (checked: boolean) => void
}): React.JSX.Element {
  return (
    <label className="flex items-center justify-between gap-4 rounded-xl border border-border/60 bg-background/80 p-4 cursor-pointer hover:bg-accent/40 hover:border-border transition-all duration-200 group/toggle">
      <span>
        <span className="block text-sm font-medium text-foreground/90 group-hover/toggle:text-foreground transition-colors">
          {label}
        </span>
        {hint && (
          <span className="mt-1 block text-xs text-muted-foreground/70 leading-relaxed">
            {hint}
          </span>
        )}
      </span>
      <Switch
        checked={checked}
        onCheckedChange={onCheckedChange}
        className="relative h-6 w-11 shrink-0 rounded-full bg-muted/80 border border-border/40 transition-all duration-200 data-[state=checked]:bg-primary data-[state=checked]:border-primary/60"
      >
        <span className="block h-5 w-5 translate-x-0.5 rounded-full bg-white shadow-sm ring-1 ring-black/5 transition-transform duration-200 data-[state=checked]:translate-x-[22px]" />
      </Switch>
    </label>
  )
}
