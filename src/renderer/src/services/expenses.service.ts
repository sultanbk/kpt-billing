export interface ExpensesService {
  getByDate: (date: string) => Promise<unknown>
}

export const expensesService: ExpensesService = {
  getByDate: (date) => window.api.expenses.getByDate(date)
}
