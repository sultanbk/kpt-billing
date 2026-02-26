// ============================================================================
// KPT Billing - Cloud Backup Service (Google Drive)
// Uses Google Drive REST API v3 with OAuth2 for desktop app
// ============================================================================
import { BrowserWindow, app } from 'electron'
import { existsSync, readFileSync, writeFileSync, statSync } from 'fs'
import { join, basename } from 'path'
import log from 'electron-log'
import { getBackupDir } from '../database/connection'
import { backupService } from './backup.service'

// Google OAuth2 Configuration
// Users must create their own OAuth credentials at https://console.cloud.google.com
const SCOPES = 'https://www.googleapis.com/auth/drive.file'
const REDIRECT_URI = 'http://localhost'

interface TokenData {
  access_token: string
  refresh_token: string
  token_type: string
  expires_in: number
  expiry_date: number
  scope: string
}

interface CloudConfig {
  clientId: string
  clientSecret: string
}

function getTokenPath(): string {
  return join(app.getPath('userData'), 'cloud_token.json')
}

function getConfigPath(): string {
  return join(app.getPath('userData'), 'cloud_config.json')
}

export class CloudBackupService {
  private token: TokenData | null = null
  private config: CloudConfig | null = null

  constructor() {
    this.loadToken()
    this.loadConfig()
  }

  private loadToken(): void {
    const tokenPath = getTokenPath()
    if (existsSync(tokenPath)) {
      try {
        this.token = JSON.parse(readFileSync(tokenPath, 'utf-8'))
      } catch {
        this.token = null
      }
    }
  }

  private saveToken(token: TokenData): void {
    this.token = token
    writeFileSync(getTokenPath(), JSON.stringify(token, null, 2))
  }

  private loadConfig(): void {
    const configPath = getConfigPath()
    if (existsSync(configPath)) {
      try {
        this.config = JSON.parse(readFileSync(configPath, 'utf-8'))
      } catch {
        this.config = null
      }
    }
  }

  saveConfig(clientId: string, clientSecret: string): void {
    this.config = { clientId, clientSecret }
    writeFileSync(getConfigPath(), JSON.stringify(this.config, null, 2))
  }

  getConfig(): CloudConfig | null {
    return this.config
  }

  isConfigured(): boolean {
    return !!(this.config?.clientId && this.config?.clientSecret)
  }

  isAuthenticated(): boolean {
    return !!(this.token?.access_token && this.isConfigured())
  }

  /**
   * Start OAuth2 flow in a popup window
   */
  async authenticate(): Promise<boolean> {
    if (!this.config) {
      throw new Error('Google Drive not configured. Please set Client ID and Client Secret first.')
    }

    const authUrl =
      `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${encodeURIComponent(this.config.clientId)}` +
      `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
      `&response_type=code` +
      `&scope=${encodeURIComponent(SCOPES)}` +
      `&access_type=offline` +
      `&prompt=consent`

    return new Promise((resolve, reject) => {
      const authWindow = new BrowserWindow({
        width: 500,
        height: 700,
        show: true,
        title: 'Sign in to Google Drive',
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true
        }
      })

      authWindow.loadURL(authUrl)

      authWindow.webContents.on('will-redirect', async (_event, url) => {
        try {
          const parsed = new URL(url)
          const code = parsed.searchParams.get('code')
          const error = parsed.searchParams.get('error')

          if (error) {
            authWindow.destroy()
            reject(new Error(`Auth error: ${error}`))
            return
          }

          if (code) {
            authWindow.destroy()
            await this.exchangeCode(code)
            resolve(true)
          }
        } catch (err) {
          // Not a redirect we care about
        }
      })

      // Also handle navigation events
      authWindow.webContents.on('will-navigate', async (_event, url) => {
        try {
          if (url.startsWith(REDIRECT_URI)) {
            const parsed = new URL(url)
            const code = parsed.searchParams.get('code')
            if (code) {
              authWindow.destroy()
              await this.exchangeCode(code)
              resolve(true)
            }
          }
        } catch {
          // ignore
        }
      })

      authWindow.on('closed', () => {
        resolve(false)
      })
    })
  }

  private async exchangeCode(code: string): Promise<void> {
    if (!this.config) throw new Error('Not configured')

    const body = new URLSearchParams({
      code,
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      redirect_uri: REDIRECT_URI,
      grant_type: 'authorization_code'
    })

    const response = await this.httpPost(
      'https://oauth2.googleapis.com/token',
      body.toString(),
      'application/x-www-form-urlencoded'
    )

    const data = JSON.parse(response)
    if (data.error) {
      throw new Error(data.error_description || data.error)
    }

    this.saveToken({
      ...data,
      expiry_date: Date.now() + data.expires_in * 1000
    })
  }

  private async refreshAccessToken(): Promise<void> {
    if (!this.config || !this.token?.refresh_token) {
      throw new Error('No refresh token available. Please re-authenticate.')
    }

    const body = new URLSearchParams({
      refresh_token: this.token.refresh_token,
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      grant_type: 'refresh_token'
    })

    const response = await this.httpPost(
      'https://oauth2.googleapis.com/token',
      body.toString(),
      'application/x-www-form-urlencoded'
    )

    const data = JSON.parse(response)
    if (data.error) {
      throw new Error(data.error_description || data.error)
    }

    this.saveToken({
      ...this.token,
      access_token: data.access_token,
      expires_in: data.expires_in,
      expiry_date: Date.now() + data.expires_in * 1000
    })
  }

  private async getAccessToken(): Promise<string> {
    if (!this.token?.access_token) throw new Error('Not authenticated')
    if (!this.config?.clientId || !this.config?.clientSecret) throw new Error('Google Drive not configured')

    // Refresh if expired (with 5 min buffer)
    if (Date.now() >= (this.token.expiry_date - 300000)) {
      await this.refreshAccessToken()
    }

    if (!this.token?.access_token) throw new Error('Failed to obtain access token')
    return this.token.access_token
  }

  /**
   * Find or create the "KPT_Backups" folder in Google Drive
   */
  private async getOrCreateFolder(): Promise<string> {
    const token = await this.getAccessToken()

    // Search for existing folder
    const query = encodeURIComponent(
      "name='KPT_Backups' and mimeType='application/vnd.google-apps.folder' and trashed=false"
    )
    const searchResp = await this.httpGet(
      `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name)`,
      token
    )
    const searchData = JSON.parse(searchResp)

    if (searchData.files && searchData.files.length > 0) {
      return searchData.files[0].id
    }

    // Create folder
    const metadata = JSON.stringify({
      name: 'KPT_Backups',
      mimeType: 'application/vnd.google-apps.folder'
    })

    const createResp = await this.httpPost(
      'https://www.googleapis.com/drive/v3/files',
      metadata,
      'application/json',
      token
    )
    const createData = JSON.parse(createResp)
    return createData.id
  }

  /**
   * Upload a file to Google Drive
   */
  async uploadFile(filePath: string, folderId: string): Promise<{ id: string; name: string }> {
    const token = await this.getAccessToken()
    const fileName = basename(filePath)
    const fileStats = statSync(filePath)
    const fileContent = readFileSync(filePath)

    // Use multipart upload for files < 5MB, resumable for larger
    const boundary = '-------314159265358979323846'
    const metadata = JSON.stringify({
      name: fileName,
      parents: [folderId]
    })

    const multipartBody = Buffer.concat([
      Buffer.from(
        `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n--${boundary}\r\nContent-Type: application/octet-stream\r\n\r\n`
      ),
      fileContent,
      Buffer.from(`\r\n--${boundary}--`)
    ])

    const response = await this.httpPostBuffer(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,size',
      multipartBody,
      `multipart/related; boundary=${boundary}`,
      token
    )
    const data = JSON.parse(response)

    log.info(`Uploaded to Google Drive: ${fileName} (${fileStats.size} bytes) -> ${data.id}`)
    return { id: data.id, name: data.name }
  }

  /**
   * Create a backup and upload to Google Drive
   */
  async backupToCloud(): Promise<{
    success: boolean
    localPath: string
    driveFileId?: string
    driveFileName?: string
    error?: string
  }> {
    try {
      // First create a local backup
      const backup = await backupService.createBackup()
      if (!backup.success) {
        return { success: false, localPath: '', error: 'Local backup failed' }
      }

      // Upload to Google Drive
      const folderId = await this.getOrCreateFolder()
      const result = await this.uploadFile(backup.path, folderId)

      log.info(`Cloud backup successful: ${result.name} (Drive ID: ${result.id})`)

      return {
        success: true,
        localPath: backup.path,
        driveFileId: result.id,
        driveFileName: result.name
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      log.error(`Cloud backup failed: ${msg}`)
      return { success: false, localPath: '', error: msg }
    }
  }

  /**
   * List backups stored in Google Drive
   */
  async listCloudBackups(): Promise<
    { id: string; name: string; size: string; modifiedTime: string }[]
  > {
    try {
      const token = await this.getAccessToken()
      const folderId = await this.getOrCreateFolder()

      const query = encodeURIComponent(
        `'${folderId}' in parents and trashed=false`
      )
      const resp = await this.httpGet(
        `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,size,modifiedTime)&orderBy=modifiedTime desc&pageSize=50`,
        token
      )
      const data = JSON.parse(resp)
      return data.files || []
    } catch (err) {
      log.error('Failed to list cloud backups:', err)
      return []
    }
  }

  /**
   * Download a backup from Google Drive
   */
  async downloadBackup(
    fileId: string,
    fileName: string
  ): Promise<{ success: boolean; path: string }> {
    try {
      const token = await this.getAccessToken()
      const backupDir = getBackupDir()
      const filePath = join(backupDir, fileName)

      const resp = await this.httpGetBuffer(
        `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
        token
      )

      writeFileSync(filePath, resp)
      log.info(`Downloaded cloud backup: ${fileName}`)
      return { success: true, path: filePath }
    } catch (err) {
      log.error('Failed to download cloud backup:', err)
      return { success: false, path: '' }
    }
  }

  /**
   * Disconnect / logout
   */
  disconnect(): void {
    this.token = null
    const tokenPath = getTokenPath()
    if (existsSync(tokenPath)) {
      try {
        writeFileSync(tokenPath, '')
      } catch { /* ignore */ }
    }
  }

  getStatus(): {
    configured: boolean
    authenticated: boolean
    hasRefreshToken: boolean
  } {
    return {
      configured: this.isConfigured(),
      authenticated: this.isAuthenticated(),
      hasRefreshToken: !!(this.token?.refresh_token)
    }
  }

  // ---- HTTP Helpers using native fetch ----

  private async httpGet(url: string, token: string): Promise<string> {
    if (!url || !token) throw new Error('Invalid URL or token for HTTP request')

    const response = await fetch(url, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` }
    })
    const body = await response.text()
    if (!response.ok) throw new Error(`HTTP ${response.status}: ${body}`)
    return body
  }

  private async httpGetBuffer(url: string, token: string): Promise<Buffer> {
    if (!url || !token) throw new Error('Invalid URL or token for HTTP request')

    const response = await fetch(url, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` }
    })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const arrayBuf = await response.arrayBuffer()
    return Buffer.from(arrayBuf)
  }

  private async httpPost(
    url: string,
    body: string,
    contentType: string,
    token?: string
  ): Promise<string> {
    if (!url) throw new Error('Invalid URL for HTTP request')

    const headers: Record<string, string> = { 'Content-Type': contentType }
    if (token) headers['Authorization'] = `Bearer ${token}`

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body
    })
    const responseBody = await response.text()
    if (!response.ok) throw new Error(`HTTP ${response.status}: ${responseBody}`)
    return responseBody
  }

  private async httpPostBuffer(
    url: string,
    body: Buffer,
    contentType: string,
    token?: string
  ): Promise<string> {
    if (!url) throw new Error('Invalid URL for HTTP request')

    const headers: Record<string, string> = {
      'Content-Type': contentType,
      'Content-Length': body.length.toString()
    }
    if (token) headers['Authorization'] = `Bearer ${token}`

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: body as unknown as BodyInit
    })
    const responseBody = await response.text()
    if (!response.ok) throw new Error(`HTTP ${response.status}: ${responseBody}`)
    return responseBody
  }
}

export const cloudBackupService = new CloudBackupService()
