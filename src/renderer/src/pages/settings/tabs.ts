import {
  Barcode,
  CreditCard,
  Crown,
  Database,
  Download,
  FileText,
  Keyboard,
  Printer,
  Shield,
  Store
} from 'lucide-react'
import type { SettingsTab } from './types'

export const SETTINGS_TABS: SettingsTab[] = [
  {
    id: 'subscription',
    label: 'Subscription',
    icon: Crown,
    description: 'Plan, billing & license'
  },
  { id: 'general', label: 'General', icon: Store, description: 'Shop and billing identity' },
  { id: 'payments', label: 'Payments', icon: CreditCard, description: 'UPI and bank details' },
  { id: 'printer', label: 'Printers', icon: Printer, description: 'Receipt and label printers' },
  { id: 'barcode', label: 'Barcode', icon: Barcode, description: 'Label layout and calibration' },
  { id: 'receipt', label: 'Receipt', icon: FileText, description: 'Paper, copies, footer' },
  { id: 'backup', label: 'Backup', icon: Database, description: 'Local and cloud backups' },
  { id: 'security', label: 'Security', icon: Shield, description: 'Owner PIN management' },
  { id: 'shortcuts', label: 'Shortcuts', icon: Keyboard, description: 'Billing shortcuts' },
  { id: 'updates', label: 'Updates', icon: Download, description: 'App version & auto-updates' }
]
