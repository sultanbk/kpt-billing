/**
 * afterPack hook — embeds the KPT custom icon into KPT-Billing.exe using rcedit.
 * Runs after electron-builder packs the app directory but before the NSIS installer is created.
 * Uses the rcedit-x64.exe already cached by electron-builder (no internet needed).
 */

const { execFileSync } = require('child_process')
const fs = require('fs')
const path = require('path')
const os = require('os')

module.exports = async function afterPack(context) {
  // Only applies to Windows builds
  if (context.electronPlatformName !== 'win32') return

  const exePath = path.join(context.appOutDir, 'KPT-Billing.exe')
  const iconPath = path.resolve(__dirname, '..', 'build', 'icon.ico')

  if (!fs.existsSync(exePath)) {
    console.error('[afterPack] KPT-Billing.exe not found at:', exePath)
    return
  }
  if (!fs.existsSync(iconPath)) {
    console.error('[afterPack] icon.ico not found at:', iconPath)
    return
  }

  // Find rcedit in the electron-builder cache
  const cacheRoot = path.join(os.homedir(), 'AppData', 'Local', 'electron-builder', 'Cache', 'winCodeSign')
  let rceditPath = null

  if (fs.existsSync(cacheRoot)) {
    const dirs = fs.readdirSync(cacheRoot).sort().reverse() // newest first
    for (const dir of dirs) {
      const candidate = path.join(cacheRoot, dir, 'rcedit-x64.exe')
      if (fs.existsSync(candidate)) {
        rceditPath = candidate
        break
      }
    }
  }

  // Fallback: check node_modules
  if (!rceditPath) {
    const localRcedit = path.resolve(__dirname, '..', 'node_modules', 'rcedit', 'bin', 'rcedit.exe')
    if (fs.existsSync(localRcedit)) rceditPath = localRcedit
  }

  if (!rceditPath) {
    console.warn('[afterPack] rcedit not found — icon will not be embedded in exe.')
    return
  }

  console.log('[afterPack] Embedding icon into exe...')
  console.log('  rcedit :', rceditPath)
  console.log('  exe    :', exePath)
  console.log('  icon   :', iconPath)

  try {
    execFileSync(rceditPath, [
      exePath,
      '--set-icon', iconPath,
      '--set-file-version', '1.0.0.0',
      '--set-product-version', '1.0.0.0',
      '--set-version-string', 'ProductName', 'KPT Billing',
      '--set-version-string', 'FileDescription', 'KPT Billing - Krishnapriya Textiles',
      '--set-version-string', 'CompanyName', 'Krishnapriya Textiles',
      '--set-version-string', 'LegalCopyright', 'Sultan Kabadi',
    ], { stdio: 'inherit' })
    console.log('[afterPack] Icon embedded successfully.')
  } catch (err) {
    console.error('[afterPack] rcedit failed:', err.message)
  }
}
