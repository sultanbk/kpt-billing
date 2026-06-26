import { useCallback, useMemo, useState } from 'react'
import type { Product, Supplier } from '@shared/types'
import {
  computePurchaseTotals,
  recalcPurchaseItem,
  type PurchaseLineItem
} from '../../lib/purchases/purchaseCalculations'

function uid(): string {
  return Math.random().toString(36).substring(2, 10)
}

export function usePurchaseForm(): {
  items: PurchaseLineItem[]
  supplierId: number | null
  supplierName: string
  city: string
  invoiceNo: string
  invoiceDate: string
  paymentMode: string
  paymentStatus: string
  amountPaid: number
  notes: string
  subtotal: number
  totalGst: number
  grandTotal: number
  totalQty: number
  addProductToItems: (product: Product) => void
  addManualItem: () => void
  updateItemNumeric: (
    uid: string,
    field: 'qty' | 'purchaseRate' | 'mrp' | 'sellingRate' | 'gstRate',
    value: number
  ) => void
  updateItemName: (uid: string, name: string) => void
  removeItem: (uid: string) => void
  setSupplier: (supplier: Supplier) => void
  clearSupplier: () => void
  resetForm: () => void
  setCity: (city: string) => void
  setInvoiceNo: (invoiceNo: string) => void
  setInvoiceDate: (invoiceDate: string) => void
  setPaymentMode: (paymentMode: string) => void
  setPaymentStatus: (paymentStatus: string) => void
  setAmountPaid: (amountPaid: number) => void
  setNotes: (notes: string) => void
} {
  const [items, setItems] = useState<PurchaseLineItem[]>([])
  const [supplierId, setSupplierId] = useState<number | null>(null)
  const [supplierName, setSupplierName] = useState('')
  const [city, setCity] = useState('')
  const [invoiceNo, setInvoiceNo] = useState('')
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0])
  const [paymentMode, setPaymentMode] = useState('cash')
  const [paymentStatus, setPaymentStatus] = useState('paid')
  const [amountPaid, setAmountPaid] = useState(0)
  const [notes, setNotes] = useState('')

  const { subtotal, totalGst, grandTotal, totalQty } = useMemo(
    () => computePurchaseTotals(items),
    [items]
  )

  const addProductToItems = useCallback((product: Product): void => {
    setItems((current) => {
      const existing = current.find((item) => item.productId === product.id)
      if (existing) {
        return current.map((item) =>
          item._uid === existing._uid ? recalcPurchaseItem({ ...item, qty: item.qty + 1 }) : item
        )
      }

      const newItem: PurchaseLineItem = recalcPurchaseItem({
        _uid: uid(),
        productId: product.id,
        productName: product.name,
        barcode: product.barcode,
        hsnCode: product.hsnCode,
        qty: 1,
        purchaseRate: product.costPrice || 0,
        sellingRate: product.sellingPrice || 0,
        mrp: product.mrp || product.sellingPrice || 0,
        gstRate: product.gstRate || 0,
        gstAmount: 0,
        amount: 0
      })

      return [...current, newItem]
    })
  }, [])

  const updateItemNumeric = useCallback(
    (
      itemUid: string,
      field: 'qty' | 'purchaseRate' | 'mrp' | 'sellingRate' | 'gstRate',
      value: number
    ): void => {
      setItems((current) =>
        current.map((item) => {
          if (item._uid !== itemUid) return item
          const updated = { ...item, [field]: value }
          return recalcPurchaseItem(updated)
        })
      )
    },
    []
  )

  const updateItemName = useCallback((itemUid: string, name: string): void => {
    setItems((current) =>
      current.map((item) => (item._uid === itemUid ? { ...item, productName: name } : item))
    )
  }, [])

  const removeItem = useCallback((itemUid: string): void => {
    setItems((current) => current.filter((item) => item._uid !== itemUid))
  }, [])

  const addManualItem = useCallback((): void => {
    const newItem: PurchaseLineItem = {
      _uid: uid(),
      productId: null,
      productName: '',
      barcode: null,
      hsnCode: null,
      qty: 1,
      purchaseRate: 0,
      sellingRate: 0,
      mrp: 0,
      gstRate: 5,
      gstAmount: 0,
      amount: 0
    }
    setItems((current) => [...current, newItem])
  }, [])

  const setSupplier = useCallback((supplier: Supplier): void => {
    setSupplierId(supplier.id)
    setSupplierName(supplier.name)
    setCity(supplier.city || '')
  }, [])

  const clearSupplier = useCallback((): void => {
    setSupplierId(null)
    setSupplierName('')
  }, [])

  const resetForm = useCallback((): void => {
    setItems([])
    setSupplierId(null)
    setSupplierName('')
    setCity('')
    setInvoiceNo('')
    setInvoiceDate(new Date().toISOString().split('T')[0])
    setPaymentMode('cash')
    setPaymentStatus('paid')
    setAmountPaid(0)
    setNotes('')
  }, [])

  return {
    items,
    supplierId,
    supplierName,
    city,
    invoiceNo,
    invoiceDate,
    paymentMode,
    paymentStatus,
    amountPaid,
    notes,
    subtotal,
    totalGst,
    grandTotal,
    totalQty,
    addProductToItems,
    addManualItem,
    updateItemNumeric,
    updateItemName,
    removeItem,
    setSupplier,
    clearSupplier,
    resetForm,
    setCity,
    setInvoiceNo,
    setInvoiceDate,
    setPaymentMode,
    setPaymentStatus,
    setAmountPaid,
    setNotes
  }
}
