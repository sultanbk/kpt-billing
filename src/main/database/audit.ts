// ============================================================================
// KPT Billing - Audit Logging Utility
// Writes to the audit_log table for security and compliance tracking
// ============================================================================
import { getSqlite } from './connection'
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
 * Silently catches errors to avoid disrupting the main flow.
 */
export function writeAuditLog(entry: AuditEntry): void {
  try {
    const db = getSqlite()
    db.prepare(
      `INSERT INTO audit_log (user_id, user_name, action, entity_type, entity_id, old_value, new_value)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(
      entry.userId ?? null,
      entry.userName ?? null,
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
