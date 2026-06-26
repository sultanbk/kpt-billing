import type { ExportResult } from '@shared/types'

export interface ReportService {
  generateDailyPdf: (date: string) => Promise<ExportResult>
  generateWeeklyPdf: (weekEndDate: string) => Promise<ExportResult>
  generateMonthlyPdf: (yearMonth: string) => Promise<ExportResult>
  generateYearlyPdf: (year: number) => Promise<ExportResult>
  openFile: (filePath: string) => Promise<boolean>
  getReportsDir: () => Promise<string>
}

export const reportService: ReportService = {
  generateDailyPdf: (date) => window.api.report.generateDailyPdf(date),
  generateWeeklyPdf: (weekEndDate) => window.api.report.generateWeeklyPdf(weekEndDate),
  generateMonthlyPdf: (yearMonth) => window.api.report.generateMonthlyPdf(yearMonth),
  generateYearlyPdf: (year) => window.api.report.generateYearlyPdf(year),
  openFile: (filePath) => window.api.report.openFile(filePath),
  getReportsDir: () => window.api.report.getReportsDir()
}
