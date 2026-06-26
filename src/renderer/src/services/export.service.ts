import type { ExportResult } from '@shared/types'

export interface ExportService {
  stockReport: () => Promise<ExportResult>
  customerReport: () => Promise<ExportResult>
  dailyReport: (date: string) => Promise<ExportResult>
  billHistory: (dateFrom: string, dateTo: string) => Promise<ExportResult>
  fullData: () => Promise<ExportResult>
}

export const exportService: ExportService = {
  stockReport: () => window.api.export.stockReport(),
  customerReport: () => window.api.export.customerReport(),
  dailyReport: (date) => window.api.export.dailyReport(date),
  billHistory: (dateFrom, dateTo) => window.api.export.billHistory(dateFrom, dateTo),
  fullData: () => window.api.export.fullData()
}
