// ============================================================================
// KPT Billing - Audit Logging Utility
// Writes to the audit_log table for security and compliance tracking
// ============================================================================
import { getSqlite } from './connection'
import { getCurrentUser } from '../ipc/ipc-context'
import log from 'electron-log'

export interface AuditEntry {
  userId?: number
  userName?: string
  action: string
  entityType: string
  entityId?: number
  oldValue?: unknown
  newValue?: unknown
}

/**
 * Write an entry to the audit_log table.
 * Automatically populates userId/userName from IPC context if not explicitly provided.
 * Silently catches errors to avoid disrupting the main flow.
 */
export function writeAuditLog(entry: AuditEntry): void {
  try {
    // Auto-populate user context from IPC session if not provided
    const user = getCurrentUser()
    const userId = entry.userId ?? user?.id ?? null
    const userName = entry.userName ?? user?.name ?? null

    const db = getSqlite()
    db.prepare(
      `INSERT INTO audit_log (user_id, user_name, action, entity_type, entity_id, old_value, new_value)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(
      userId,
      userName,
      entry.action,
      entry.entityType,
      entry.entityId ?? null,
      entry.oldValue != null ? JSON.stringify(entry.oldValue) : null,
      entry.newValue != null ? JSON.stringify(entry.newValue) : null
    )
  } catch (err) {
    log.error('Failed to write audit log:', err)
  }
}
