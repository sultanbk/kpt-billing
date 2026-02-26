// ============================================================================
// KPT Billing - Keyboard Shortcuts Help (F12)
// ============================================================================
import { X, Keyboard } from 'lucide-react'

interface ShortcutsHelpProps {
  open: boolean
  onClose: () => void
}

const sections = [
  {
    title: 'Navigation',
    shortcuts: [
      { keys: ['F1'], action: 'Dashboard' },
      { keys: ['F2'], action: 'Billing (New Bill)' },
      { keys: ['F3'], action: 'Products' },
      { keys: ['F4'], action: 'Purchases / Stock-In' },
      { keys: ['F5'], action: 'Customers' },
      { keys: ['F7'], action: 'Reports' },
      { keys: ['F10'], action: 'Settings' }
    ]
  },
  {
    title: 'Billing Page',
    shortcuts: [
      { keys: ['Esc'], action: 'Focus product search' },
      { keys: ['Alt', 'O'], action: 'Add Other (custom) item' },
      { keys: ['Alt', 'N'], action: 'Quick add new customer' },
      { keys: ['F6'], action: 'Hold current bill' },
      { keys: ['F8'], action: 'Recall held bill' },
      { keys: ['F9'], action: 'Clear cart' },
      { keys: ['F11'], action: 'Pay & Print' }
    ]
  },
  {
    title: 'Quick Actions',
    shortcuts: [
      { keys: ['Ctrl', 'K'], action: 'Quick Bill Search' },
      { keys: ['Alt', 'L'], action: 'Lock Screen' },
      { keys: ['Ctrl', 'L'], action: 'Lock Screen (alt)' },
      { keys: ['Ctrl', 'N'], action: 'New Bill (go to Billing)' },
      { keys: ['Ctrl', 'Shift', 'D'], action: 'Go to Dashboard' },
      { keys: ['Ctrl', 'Shift', 'R'], action: 'Go to Reports' },
      { keys: ['F12'], action: 'Show this help' }
    ]
  }
]

export function ShortcutsHelp({ open, onClose }: ShortcutsHelpProps): React.JSX.Element | null {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="relative z-10 w-full max-w-lg rounded-xl border border-border bg-popover shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="flex items-center gap-2">
            <Keyboard className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-bold">Keyboard Shortcuts</h2>
          </div>
          <button onClick={onClose} className="rounded-md p-1.5 hover:bg-accent">
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        {/* Sections */}
        <div className="space-y-5 p-5 max-h-[60vh] overflow-auto">
          {sections.map((section) => (
            <div key={section.title}>
              <h3 className="text-xs font-semibold uppercase text-muted-foreground mb-2">
                {section.title}
              </h3>
              <div className="space-y-1.5">
                {section.shortcuts.map((s) => (
                  <div
                    key={s.action}
                    className="flex items-center justify-between rounded-md px-2 py-1.5 hover:bg-accent/50"
                  >
                    <span className="text-sm">{s.action}</span>
                    <div className="flex items-center gap-1">
                      {s.keys.map((key, ki) => (
                        <span key={ki}>
                          {ki > 0 && <span className="text-muted-foreground mx-0.5">+</span>}
                          <kbd className="inline-flex h-6 min-w-6 items-center justify-center rounded border border-border bg-muted px-1.5 text-[11px] font-mono font-medium text-foreground shadow-sm">
                            {key}
                          </kbd>
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="border-t border-border px-5 py-3 text-center text-xs text-muted-foreground">
          Press <kbd className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px]">Esc</kbd> or{' '}
          <kbd className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px]">F12</kbd> to close
        </div>
      </div>
    </div>
  )
}
