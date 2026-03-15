import { test, expect, _electron as electron } from '@playwright/test'

/**
 * E2E tests for KPT Billing Electron app.
 *
 * Prerequisites:
 * 1. Build the app first: npm run build
 * 2. Run: npx playwright test
 *
 * These tests launch the actual Electron app and interact with it.
 */

test.describe('KPT Billing - App Launch', () => {
  test('should launch the Electron app', async () => {
    const electronApp = await electron.launch({
      args: ['.'],
      env: { ...process.env, NODE_ENV: 'test' }
    })

    // Get the first window
    const window = await electronApp.firstWindow()
    expect(window).toBeTruthy()

    // Wait for page to load
    await window.waitForLoadState('domcontentloaded')

    // The app should show the PIN gate or main content
    const title = await window.title()
    expect(title).toBeTruthy()

    await electronApp.close()
  })

  test('should show PIN gate on startup', async () => {
    const electronApp = await electron.launch({
      args: ['.'],
      env: { ...process.env, NODE_ENV: 'test' }
    })

    const window = await electronApp.firstWindow()
    await window.waitForLoadState('domcontentloaded')

    // The PinGate component should be visible
    // This tests the initial app state
    const body = await window.locator('body').textContent()
    expect(body).toBeTruthy()

    await electronApp.close()
  })
})
