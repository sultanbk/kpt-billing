// ============================================================================
// KPT Billing - IPC Guard Middleware
// Provides safe handler wrapping with try-catch, validation, and auth checks
// ============================================================================
import { ipcMain, type IpcMainInvokeEvent } from 'electron'
import { ZodSchema, ZodError } from 'zod'
import log from 'electron-log'

/**
 * IPC error result returned to the renderer on failure.
 */
export interface IpcError {
  success: false
  error: string
  code: 'VALIDATION_ERROR' | 'AUTH_ERROR' | 'NOT_FOUND' | 'INTERNAL_ERROR'
}

/**
 * Create an IPC error response.
 */
function ipcError(message: string, code: IpcError['code'] = 'INTERNAL_ERROR'): IpcError {
  return { success: false, error: message, code }
}

/**
 * Register a safe IPC handler that wraps the callback with try-catch.
 * Logs errors and returns structured error responses instead of crashing.
 */
export function safeHandle<T>(
  channel: string,
  handler: (event: IpcMainInvokeEvent, ...args: unknown[]) => T | Promise<T>
): void {
  ipcMain.handle(channel, async (event, ...args) => {
    try {
      return await handler(event, ...args)
    } catch (err) {
      if (err instanceof ZodError) {
        const messages = err.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join('; ')
        log.warn(`[IPC] Validation error on ${channel}: ${messages}`)
        return ipcError(messages, 'VALIDATION_ERROR')
      }
      const message = err instanceof Error ? err.message : String(err)
      log.error(`[IPC] Error on ${channel}:`, err)
      return ipcError(message)
    }
  })
}

/**
 * Validate a single argument against a Zod schema.
 * Throws a ZodError if validation fails (caught by safeHandle).
 */
export function validate<T>(schema: ZodSchema<T>, data: unknown): T {
  return schema.parse(data)
}
