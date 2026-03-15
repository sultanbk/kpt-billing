// ============================================================================
// KPT Billing - Export IPC Handlers (secured with validation)
// ============================================================================
import { exportService } from '../services/export.service'
import { safeHandle, validate } from './ipc-guard'
import { dateSchema } from './validation'

export function registerExportIpc(): void {
  safeHandle('export:dailyReport', async (_event, date) => {
    const validDate = validate(dateSchema, date)
    const path = await exportService.exportDailyReport(validDate)
    return { success: true, path }
  })

  safeHandle('export:billHistory', async (_event, dateFrom, dateTo) => {
    const validFrom = validate(dateSchema, dateFrom)
    const validTo = validate(dateSchema, dateTo)
    const path = await exportService.exportBillHistory(validFrom, validTo)
    return { success: true, path }
  })

  safeHandle('export:stockReport', async () => {
    const path = await exportService.exportStockReport()
    return { success: true, path }
  })

  safeHandle('export:customerReport', async () => {
    const path = await exportService.exportCustomerReport()
    return { success: true, path }
  })

  safeHandle('export:fullData', async () => {
    const path = await exportService.exportFullData()
    return { success: true, path }
  })
}
