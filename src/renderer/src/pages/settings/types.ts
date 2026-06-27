import type { LucideIcon } from 'lucide-react'

export type SettingsMap = Record<string, string>

export type SettingsTabId =
  | 'subscription'
  | 'general'
  | 'payments'
  | 'printer'
  | 'barcode'
  | 'receipt'
  | 'backup'
  | 'security'
  | 'shortcuts'
  | 'updates'

export interface SettingsTab {
  id: SettingsTabId
  label: string
  description: string
  icon: LucideIcon
}

export interface PaymentMethod {
  id: string
  type: 'bank' | 'upi' | 'scanner'
  name: string
  isDefaultBilling?: boolean
  details: {
    bankName?: string
    accountNo?: string
    ifscCode?: string
    branch?: string
    upiVpa?: string
    payeeName?: string
    scannerType?: string
    accountName?: string
  }
}

export interface PrinterDiagnostics {
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
}

export type UpdateSetting = (key: string, value: string) => void
