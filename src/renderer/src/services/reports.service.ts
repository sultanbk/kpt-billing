export interface ReportsService {
  getGstReport: (dateFrom: string, dateTo: string) => Promise<unknown>
  getProfitLoss: (dateFrom: string, dateTo: string) => Promise<unknown>
  getDashboardData: (date: string) => Promise<{
    pendingCredits: number
    pendingCreditCustomers: number
    outOfStockCount: number
    todayExpenses: number
    todayCollections: number
    yesterdaySales: number
  }>
}

export const reportsService: ReportsService = {
  getGstReport: (dateFrom, dateTo) => window.api.reports.getGstReport(dateFrom, dateTo),
  getProfitLoss: (dateFrom, dateTo) => window.api.reports.getProfitLoss(dateFrom, dateTo),
  getDashboardData: (date) => window.api.reports.getDashboardData(date)
}
