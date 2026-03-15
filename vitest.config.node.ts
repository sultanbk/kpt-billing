import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  test: {
    name: 'node',
    environment: 'node',
    include: ['src/main/**/*.test.ts', 'src/shared/**/*.test.ts'],
    globals: true,
    alias: {
      '@shared': resolve(__dirname, 'src/shared')
    }
  }
})
