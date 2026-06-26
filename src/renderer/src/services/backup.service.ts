import type { BackupResult } from '@shared/types'

export interface BackupService {
  create: () => Promise<BackupResult>
  restore: () => Promise<{ success: boolean; error?: string; safetyBackupPath?: string }>
  getDir: () => Promise<string>
}

export const backupService: BackupService = {
  create: () => window.api.backup.create(),
  restore: () => window.api.backup.restore(),
  getDir: () => window.api.backup.getDir()
}
