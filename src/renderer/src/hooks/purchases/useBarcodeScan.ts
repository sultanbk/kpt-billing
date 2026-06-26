import { useEffect, useRef } from 'react'
import type { RefObject } from 'react'

type UseBarcodeScanOptions = {
  onScan: (barcode: string) => void
  enabled?: boolean
  minLength?: number
  thresholdMs?: number
  resetDelayMs?: number
  allowedInputRef?: RefObject<HTMLInputElement | null>
}

export function useBarcodeScan({
  onScan,
  enabled = true,
  minLength = 4,
  thresholdMs = 80,
  resetDelayMs = 300,
  allowedInputRef
}: UseBarcodeScanOptions): void {
  const scanBufferRef = useRef('')
  const scanTimerRef = useRef<NodeJS.Timeout | null>(null)
  const lastKeypressRef = useRef(0)

  useEffect(() => {
    if (!enabled) return

    const handler = (e: KeyboardEvent): void => {
      const target = e.target as HTMLElement
      const isAllowedInput = allowedInputRef?.current === target
      const isFormInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA'

      if (!isAllowedInput && isFormInput) {
        return
      }

      const now = Date.now()

      if (e.key === 'Enter' && scanBufferRef.current.length >= minLength) {
        e.preventDefault()
        const barcode = scanBufferRef.current.trim()
        scanBufferRef.current = ''
        onScan(barcode)
        return
      }

      if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
        const timeSinceLastKey = now - lastKeypressRef.current
        lastKeypressRef.current = now

        if (timeSinceLastKey > thresholdMs * 3) {
          scanBufferRef.current = ''
        }

        scanBufferRef.current += e.key

        if (scanTimerRef.current) clearTimeout(scanTimerRef.current)

        scanTimerRef.current = setTimeout(() => {
          scanBufferRef.current = ''
        }, resetDelayMs)
      }
    }

    window.addEventListener('keydown', handler, true)
    return () => window.removeEventListener('keydown', handler, true)
  }, [allowedInputRef, enabled, minLength, onScan, resetDelayMs, thresholdMs])
}
