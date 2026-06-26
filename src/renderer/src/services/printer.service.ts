export interface PrinterService {
  getAvailable: () => Promise<string[]>
  testPrint: () => Promise<boolean>
  diagnostics: (printerName?: string) => Promise<{
    selectedPrinter: string
    configuredPrinter: string
    availablePrinters: string[]
    windowsDetails: {
      name: string
      printerStatus: number | null
      workOffline: boolean | null
      portName: string | null
      driverName: string | null
      isDefault: boolean | null
    } | null
    checks: {
      printerSelected: boolean
      serviceBoundToSelection: boolean
      selectedExistsInSystem: boolean
      windowsReportsOffline: boolean
    }
    recommendations: string[]
    checkedAt: string
  }>
  printPaymentDetails: (paymentMethod: unknown) => Promise<boolean>
  downloadPaymentDetailsPdf: (paymentMethod: unknown) => Promise<boolean>
}

export const printerService: PrinterService = {
  getAvailable: () => window.api.printer.getAvailable(),
  testPrint: () => window.api.printer.testPrint(),
  diagnostics: (printerName) => window.api.printer.diagnostics(printerName),
  printPaymentDetails: (paymentMethod) => window.api.printer.printPaymentDetails(paymentMethod),
  downloadPaymentDetailsPdf: (paymentMethod) =>
    window.api.printer.downloadPaymentDetailsPdf(paymentMethod)
}
