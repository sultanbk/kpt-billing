// ============================================================================
// KPT Billing - Settings Repository
// ============================================================================
import { getSqlite } from '../connection'

export class SettingsRepository {
  get(key: string): string | null {
    const db = getSqlite()
    const result = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as
      | { value: string }
      | undefined
    return result?.value ?? null
  }

  set(key: string, value: string): void {
    const db = getSqlite()
    db.prepare(
      "INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, datetime('now','localtime'))"
    ).run(key, value)
  }

  getAll(): Record<string, string> {
    const db = getSqlite()
    const rows = db.prepare('SELECT key, value FROM settings').all() as {
      key: string
      value: string
    }[]
    const result: Record<string, string> = {}
    for (const row of rows) {
      result[row.key] = row.value
    }
    return result
  }

  setMany(settings: Record<string, string>): void {
    const db = getSqlite()
    const stmt = db.prepare(
      "INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, datetime('now','localtime'))"
    )
    const setAll = db.transaction((entries: [string, string][]) => {
      for (const [key, value] of entries) {
        stmt.run(key, value)
      }
    })
    setAll(Object.entries(settings))
  }
}

export const settingsRepo = new SettingsRepository()
