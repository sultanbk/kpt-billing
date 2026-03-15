import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  test: {
    name: 'web',
    environment: 'jsdom',
    include: ['src/renderer/**/*.test.{ts,tsx}'],
    globals: true,
    setupFiles: ['./src/renderer/src/__tests__/setup.ts'],
    alias: {
      '@renderer': resolve(__dirname, 'src/renderer/src'),
      '@shared': resolve(__dirname, 'src/shared')
    }
  }
})
