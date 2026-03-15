// ============================================================================
// KPT Billing - Backup Service  (SQL Dump format)
// ============================================================================
import {
  getSqlite,
  getDbPath,
  getBackupDir,
  closeDatabase,
  initializeDatabase
} from '../database/connection'
import {
  existsSync,
  mkdirSync,
  readdirSync,
  unlinkSync,
  statSync,
  writeFileSync,
  readFileSync,
  copyFileSync
} from 'fs'
import { join } from 'path'
import log from 'electron-log'
import Database from 'better-sqlite3'

export class BackupService {
  /**
   * Create a full SQL dump of the database (schema + data).
   * Output is a portable `.sql` file that can recreate the entire DB.
   */
  async createBackup(
    customPath?: string
  ): Promise<{ success: boolean; path: string; timestamp: string; size: number }> {
    try {
      const sqlite = getSqlite()
      const backupDir = customPath || getBackupDir()

      if (!existsSync(backupDir)) {
        mkdirSync(backupDir, { recursive: true })
      }

      const now = new Date()
      const ts = now.toISOString().replace(/[:.]/g, '-').split('T').join('_').substring(0, 19)
      const backupFileName = `kpt_billing_${ts}.sql`
      const backupPath = join(backupDir, backupFileName)

      // ---- build SQL dump ----
      const lines: string[] = []
      lines.push('-- KPT Billing SQL Dump')
      lines.push(`-- Generated: ${now.toISOString()}`)
      lines.push('-- SQLite compatible')
      lines.push('')
      lines.push('PRAGMA foreign_keys = OFF;')
      lines.push('BEGIN TRANSACTION;')
      lines.push('')

      // 1. Collect all user tables (skip sqlite_ internal tables)
      const tables: { name: string; sql: string }[] = sqlite
        .prepare(
          "SELECT name, sql FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
        )
        .all() as { name: string; sql: string }[]

      for (const tbl of tables) {
        lines.push(`-- Table: ${tbl.name}`)
        lines.push(`DROP TABLE IF EXISTS "${tbl.name}";`)
        lines.push(`${tbl.sql};`)
        lines.push('')

        // Dump rows
        const rows = sqlite.prepare(`SELECT * FROM "${tbl.name}"`).all() as Record<
          string,
          unknown
        >[]
        for (const row of rows) {
          const cols = Object.keys(row)
          const vals = cols.map((c) => sqlEscape(row[c]))
          lines.push(
            `INSERT INTO "${tbl.name}" (${cols.map((c) => `"${c}"`).join(', ')}) VALUES (${vals.join(', ')});`
          )
        }
        if (rows.length) lines.push('')
      }

      // 2. Indexes
      const indexes: { sql: string }[] = sqlite
        .prepare(
          "SELECT sql FROM sqlite_master WHERE type='index' AND sql IS NOT NULL ORDER BY name"
        )
        .all() as { sql: string }[]

      if (indexes.length) {
        lines.push('-- Indexes')
        for (const idx of indexes) {
          lines.push(`${idx.sql};`)
        }
        lines.push('')
      }

      // 3. Triggers
      const triggers: { sql: string }[] = sqlite
        .prepare(
          "SELECT sql FROM sqlite_master WHERE type='trigger' AND sql IS NOT NULL ORDER BY name"
        )
        .all() as { sql: string }[]

      if (triggers.length) {
        lines.push('-- Triggers')
        for (const trg of triggers) {
          lines.push(`${trg.sql};`)
        }
        lines.push('')
      }

      lines.push('COMMIT;')
      lines.push('PRAGMA foreign_keys = ON;')
      lines.push('')

      const sqlDump = lines.join('\n')
      writeFileSync(backupPath, sqlDump, 'utf-8')

      const stats = statSync(backupPath)
      log.info(`SQL dump backup created: ${backupPath} (${stats.size} bytes)`)

      return {
        success: true,
        path: backupPath,
        timestamp: now.toISOString(),
        size: stats.size
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      log.error(`Backup failed: ${msg}`)
      return {
        success: false,
        path: '',
        timestamp: new Date().toISOString(),
        size: 0
      }
    }
  }

  listBackups(): { name: string; path: string; date: string; size: number }[] {
    const backupDir = getBackupDir()
    if (!existsSync(backupDir)) return []

    const files = readdirSync(backupDir)
      .filter((f) => f.startsWith('kpt_billing_') && (f.endsWith('.sql') || f.endsWith('.db')))
      .map((f) => {
        const fullPath = join(backupDir, f)
        const stats = statSync(fullPath)
        return {
          name: f,
          path: fullPath,
          date: stats.mtime.toISOString(),
          size: stats.size
        }
      })
      .sort((a, b) => b.date.localeCompare(a.date))

    return files
  }

  cleanOldBackups(retention: number = 30): void {
    const backups = this.listBackups()
    if (backups.length <= retention) return

    const toDelete = backups.slice(retention)
    for (const backup of toDelete) {
      try {
        unlinkSync(backup.path)
        log.info(`Deleted old backup: ${backup.name}`)
      } catch (err) {
        log.error(`Failed to delete backup ${backup.name}:`, err)
      }
    }
  }

  getBackupDir(): string {
    return getBackupDir()
  }

  /**
   * Restore database from a SQL dump file.
   * 1. Creates a safety backup of the current DB
   * 2. Closes the current DB connection
   * 3. Replaces the DB file by executing the SQL dump into a fresh DB
   * 4. Re-initializes the database connection
   */
  async restoreFromSqlDump(
    sqlFilePath: string
  ): Promise<{ success: boolean; error?: string; safetyBackupPath?: string }> {
    const dbPath = getDbPath()
    let safetyBackupPath = ''

    try {
      // Validate file exists and is a .sql file
      if (!existsSync(sqlFilePath)) {
        return { success: false, error: 'Backup file not found' }
      }
      if (!sqlFilePath.toLowerCase().endsWith('.sql')) {
        return { success: false, error: 'Only .sql backup files are supported' }
      }

      // Read the SQL dump
      const sqlDump = readFileSync(sqlFilePath, 'utf-8')
      if (!sqlDump.includes('KPT Billing SQL Dump') && !sqlDump.includes('CREATE TABLE')) {
        return { success: false, error: 'File does not appear to be a valid KPT Billing backup' }
      }

      log.info(`Restoring database from: ${sqlFilePath}`)

      // Step 1: Create a safety backup of the current DB file
      const ts = new Date()
        .toISOString()
        .replace(/[:.]/g, '-')
        .split('T')
        .join('_')
        .substring(0, 19)
      safetyBackupPath = join(getBackupDir(), `kpt_billing_pre_restore_${ts}.db`)

      // Close the current connection first
      closeDatabase()

      // Copy current DB as safety backup
      if (existsSync(dbPath)) {
        copyFileSync(dbPath, safetyBackupPath)
        log.info(`Safety backup created: ${safetyBackupPath}`)
      }

      // Step 2: Delete the current DB file (and WAL/SHM files)
      const walPath = dbPath + '-wal'
      const shmPath = dbPath + '-shm'
      if (existsSync(dbPath)) unlinkSync(dbPath)
      if (existsSync(walPath)) unlinkSync(walPath)
      if (existsSync(shmPath)) unlinkSync(shmPath)

      // Step 3: Create a fresh DB and execute the SQL dump
      const freshDb = new Database(dbPath)
      freshDb.pragma('journal_mode = WAL')
      freshDb.pragma('foreign_keys = OFF')

      // Execute the SQL dump — split by semicolons to handle large dumps
      // But exec() can handle multi-statement strings directly
      freshDb.exec(sqlDump)

      freshDb.pragma('foreign_keys = ON')
      freshDb.close()

      // Step 4: Re-initialize the database connection
      initializeDatabase()

      log.info('Database restored successfully from SQL dump')
      return {
        success: true,
        safetyBackupPath
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      log.error(`Restore failed: ${msg}`)

      // Try to recover — if the DB file is gone, copy the safety backup back
      try {
        if (safetyBackupPath && existsSync(safetyBackupPath) && !existsSync(dbPath)) {
          copyFileSync(safetyBackupPath, dbPath)
          log.info('Recovered original DB from safety backup')
        }
        // Re-initialize regardless
        initializeDatabase()
      } catch (recoverErr) {
        log.error('Failed to recover after restore failure:', recoverErr)
      }

      return {
        success: false,
        error: `Restore failed: ${msg}`,
        safetyBackupPath: existsSync(safetyBackupPath) ? safetyBackupPath : undefined
      }
    }
  }
}

/** Escape a JS value for a SQL INSERT literal */
function sqlEscape(value: unknown): string {
  if (value === null || value === undefined) return 'NULL'
  if (typeof value === 'number') return String(value)
  if (typeof value === 'boolean') return value ? '1' : '0'
  if (value instanceof Buffer) return `X'${value.toString('hex')}'`
  // String — escape single quotes by doubling them
  return `'${String(value).replace(/'/g, "''")}'`
}

export const backupService = new BackupService()
