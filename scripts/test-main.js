const cp = require('child_process')
const path = require('path')

// Resolve Electron binary path
let electronPath
try {
  electronPath = require('electron')
} catch {
  electronPath = path.join(__dirname, '..', 'node_modules', 'electron', 'dist', 'electron')
  if (process.platform === 'win32') {
    electronPath += '.exe'
  }
}

const vitestMjs = path.join(__dirname, '..', 'node_modules', 'vitest', 'vitest.mjs')
const args = ['--config', 'vitest.config.node.ts', ...process.argv.slice(2)]

console.log(`Running Main process tests via Electron: ${electronPath}`)

const result = cp.spawnSync(electronPath, [vitestMjs, ...args], {
  stdio: 'inherit',
  env: {
    ...process.env,
    ELECTRON_RUN_AS_NODE: '1'
  }
})

process.exit(result.status ?? 0)
