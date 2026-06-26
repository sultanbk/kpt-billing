export interface CloudService {
  getStatus: () => Promise<{
    configured: boolean
    authenticated: boolean
    hasRefreshToken: boolean
  }>
  getConfig: () => Promise<{ clientId: string; clientSecret: string }>
  listBackups: () => Promise<{ id: string; name: string; modifiedTime: string; size: string }[]>
  saveConfig: (clientId: string, clientSecret: string) => Promise<boolean>
  authenticate: () => Promise<{ success: boolean; error?: string }>
  disconnect: () => Promise<boolean>
  backup: () => Promise<{ success: boolean; error?: string }>
  downloadBackup: (
    fileId: string,
    fileName: string
  ) => Promise<{ success: boolean; path?: string; error?: string }>
}

export const cloudService: CloudService = {
  getStatus: () => window.api.cloud.getStatus(),
  getConfig: () => window.api.cloud.getConfig(),
  listBackups: () => window.api.cloud.listBackups(),
  saveConfig: (clientId, clientSecret) => window.api.cloud.saveConfig(clientId, clientSecret),
  authenticate: () => window.api.cloud.authenticate(),
  disconnect: () => window.api.cloud.disconnect(),
  backup: () => window.api.cloud.backup(),
  downloadBackup: (fileId, fileName) => window.api.cloud.downloadBackup(fileId, fileName)
}
