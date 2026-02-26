// ============================================================================
// KPT Billing - Export IPC Handlers
// ============================================================================
import { ipcMain } from 'electron'
import { exportService } from '../services/export.service'
import log from 'electron-log'

export function registerExportIpc(): void {
  ipcMain.handle('export:dailyReport', async (_event, date: string) => {
    try {
      const path = await exportService.exportDailyReport(date)
      return { success: true, path }
    } catch (err) {
      log.error('Export daily report failed:', err)
      return { success: false, error: String(err) }
    }
  })

  ipcMain.handle('export:billHistory', async (_event, dateFrom: string, dateTo: string) => {
    try {
      const path = await exportService.exportBillHistory(dateFrom, dateTo)
      return { success: true, path }
    } catch (err) {
      log.error('Export bill history failed:', err)
      return { success: false, error: String(err) }
    }
  })

  ipcMain.handle('export:stockReport', async () => {
    try {
      const path = await exportService.exportStockReport()
      return { success: true, path }
    } catch (err) {
      log.error('Export stock report failed:', err)
      return { success: false, error: String(err) }
    }
  })

  ipcMain.handle('export:customerReport', async () => {
    try {
      const path = await exportService.exportCustomerReport()
      return { success: true, path }
    } catch (err) {
      log.error('Export customer report failed:', err)
      return { success: false, error: String(err) }
    }
  })

  ipcMain.handle('export:fullData', async () => {
    try {
      const path = await exportService.exportFullData()
      return { success: true, path }
    } catch (err) {
      log.error('Full data export failed:', err)
      return { success: false, error: String(err) }
    }
  })
}
