// ============================================================================
// KPT Billing - Keyboard Shortcuts Help (F12)
// ============================================================================
import { X, Keyboard } from 'lucide-react'
import { useEffect } from 'react'

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
      { keys: ['F7'], action: 'Reports (global)' },
      { keys: ['F10'], action: 'Settings' }
    ]
  },
  {
    title: 'Billing Page Actions',
    shortcuts: [
      { keys: ['Esc'], action: 'Focus product search' },
      { keys: ['Alt', 'O'], action: 'Add Other (custom) item' },
      { keys: ['Alt', 'N'], action: 'Quick add new customer' },
      { keys: ['F6'], action: 'Hold current bill' },
      { keys: ['Ctrl', 'R'], action: 'Return / Exchange' },
      { keys: ['F8'], action: 'Recall held bill' },
      { keys: ['F9'], action: 'Clear cart' },
      { keys: ['F11'], action: 'Pay & Print' },
      { keys: ['Ctrl', 'D'], action: 'Day summary popup' }
    ]
  },
  {
    title: 'Quick Shortcuts',
    shortcuts: [
      { keys: ['Ctrl', 'K'], action: 'Quick Bill Search' },
      { keys: ['Alt', 'L'], action: 'Lock Screen' },
      { keys: ['Ctrl', 'L'], action: 'Lock Screen (alt)' },
      { keys: ['Ctrl', 'N'], action: 'New Bill (go to Billing)' },
      { keys: ['Ctrl', 'Shift', 'D'], action: 'Go to Dashboard' },
      { keys: ['Ctrl', 'Shift', 'R'], action: 'Go to Reports' },
      { keys: ['F12'], action: 'Toggle this help' }
    ]
  }
]

const cashierTips = [
  {
    title: 'Split Payments',
    text: 'Press F5 to open Payment dialog, click Cash, type amount received, then click UPI/Card for the remaining balance.'
  },
  {
    title: 'Hold & Recall Bills',
    text: "Press F6 to hold a customer's cart if they need to fetch another item, then F8 later to recall it."
  },
  {
    title: 'Digital WhatsApp Bills',
    text: "Enter the customer's 10-digit number during checkout to open WhatsApp and send their bill receipt automatically."
  }
]

export function ShortcutsHelp({ open, onClose }: ShortcutsHelpProps): React.JSX.Element {
  useEffect(() => {
    if (!open) return
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

  return (
    <div
      className={`fixed inset-0 z-[100] flex justify-end transition-all duration-300 ${
        open ? 'pointer-events-auto bg-black/25' : 'pointer-events-none'
      }`}
    >
      {/* Backdrop */}
      <div
        className={`absolute inset-0 transition-opacity duration-300 ${
          open ? 'opacity-100 backdrop-blur-xs' : 'opacity-0'
        }`}
        onClick={onClose}
      />

      {/* Drawer Panel */}
      <div
        className={`relative z-10 flex h-full w-[360px] flex-col border-l border-border bg-popover/98 shadow-2xl transition-transform duration-300 ease-in-out transform ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="flex items-center gap-2">
            <Keyboard className="h-5 w-5 text-primary" />
            <h2 className="text-base font-bold">Keyboard Shortcuts & Help</h2>
          </div>
          <button onClick={onClose} className="rounded-md p-1.5 hover:bg-accent transition-colors">
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 space-y-6 p-5 overflow-y-auto">
          {sections.map((section) => (
            <div key={section.title} className="space-y-2">
              <h3 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                {section.title}
              </h3>
              <div className="space-y-1">
                {section.shortcuts.map((s) => (
                  <div
                    key={s.action}
                    className="flex items-center justify-between rounded-lg px-2 py-1 text-xs hover:bg-accent/40 transition-colors"
                  >
                    <span className="text-muted-foreground">{s.action}</span>
                    <div className="flex items-center gap-0.5">
                      {s.keys.map((key, ki) => (
                        <span key={ki} className="inline-flex items-center">
                          {ki > 0 && (
                            <span className="text-[10px] text-muted-foreground/40 mx-0.5">+</span>
                          )}
                          <kbd className="inline-flex h-5 min-w-5 items-center justify-center rounded border border-border bg-muted px-1 text-[9px] font-mono font-medium text-foreground shadow-xs">
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

          <hr className="border-border/60" />

          {/* Quick Cashier Tips */}
          <div className="space-y-3">
            <h3 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
              Cashier Quick Tips
            </h3>
            <div className="space-y-2.5">
              {cashierTips.map((tip, idx) => (
                <div
                  key={idx}
                  className="rounded-lg border border-border/50 bg-muted/20 p-2.5 text-[11px] leading-relaxed"
                >
                  <div className="font-semibold text-foreground mb-0.5">{tip.title}</div>
                  <div className="text-muted-foreground">{tip.text}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-border px-5 py-3.5 text-center text-xs text-muted-foreground">
          Press <kbd className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px]">Esc</kbd> or{' '}
          <kbd className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px]">F12</kbd> to close
        </div>
      </div>
    </div>
  )
}
