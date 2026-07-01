// ============================================================================
// KPT Billing - Bulk Stock Update Dialog
// Import stock from CSV/Excel for inventory counts
// ============================================================================
import { useState, useRef } from 'react'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { ScrollArea } from '../ui/scroll-area'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription
} from '../ui/dialog'
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle, Download, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { productsService } from '../../services/products.service'

interface ParsedRow {
  sku: string
  barcode: string
  stock: number
  raw: string
}

interface BulkStockUpdateDialogProps {
  open: boolean
  onClose: () => void
  onComplete: () => void
}

function parseCSV(text: string): ParsedRow[] {
  const lines = text.trim().split(/\r?\n/)
  if (lines.length < 2) return []

  // Detect header
  const header = lines[0].toLowerCase()
  const sep = header.includes('\t') ? '\t' : ','

  const cols = parseDelimitedLine(header, sep).map((c) => c.trim().toLowerCase())
  const skuIdx = cols.findIndex((c) => c === 'sku' || c === 'sku_code' || c === 'product_code')
  const barcodeIdx = cols.findIndex((c) => c === 'barcode' || c === 'bar_code' || c === 'ean')
  const stockIdx = cols.findIndex(
    (c) =>
      c === 'stock' || c === 'quantity' || c === 'qty' || c === 'current_stock' || c === 'count'
  )

  if (stockIdx === -1) return []

  const rows: ParsedRow[] = []
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue
    const values = parseDelimitedLine(line, sep)
    const stock = parseFloat(values[stockIdx])
    if (isNaN(stock)) continue

    rows.push({
      sku: skuIdx >= 0 ? values[skuIdx] || '' : '',
      barcode: barcodeIdx >= 0 ? values[barcodeIdx] || '' : '',
      stock,
      raw: line
    })
  }
  return rows
}

function parseDelimitedLine(line: string, sep: string): string[] {
  const values: string[] = []
  let current = ''
  let quote: '"' | "'" | null = null

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    const next = line[i + 1]

    if (quote) {
      if (char === quote && next === quote) {
        current += char
        i++
      } else if (char === quote) {
        quote = null
      } else {
        current += char
      }
      continue
    }

    if (char === '"' || char === "'") {
      quote = char
    } else if (char === sep) {
      values.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }

  values.push(current.trim())
  return values
}

export function BulkStockUpdateDialog({
  open,
  onClose,
  onComplete
}: BulkStockUpdateDialogProps): React.JSX.Element {
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([])
  const [fileName, setFileName] = useState('')
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<{
    total: number
    imported: number
    skipped: number
    errors: string[]
  } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const reset = (): void => {
    setParsedRows([])
    setFileName('')
    setResult(null)
  }

  const handleClose = (): void => {
    reset()
    onClose()
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const file = e.target.files?.[0]
    if (!file) return

    setFileName(file.name)
    setResult(null)

    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target?.result as string
      if (!text) return
      const rows = parseCSV(text)
      if (rows.length === 0) {
        toast.error(
          'No valid rows found. Ensure the file has a header row with "sku" or "barcode" and "stock" or "qty" columns.'
        )
        setParsedRows([])
        return
      }
      setParsedRows(rows)
      toast.success(`Parsed ${rows.length} rows from ${file.name}`)
    }
    reader.readAsText(file)
  }

  const handleImport = async (): Promise<void> => {
    if (parsedRows.length === 0) return
    setImporting(true)
    try {
      const items = parsedRows.map((r) => ({
        sku: r.sku || undefined,
        barcode: r.barcode || undefined,
        stock: r.stock
      }))
      const res = await productsService.bulkStockUpdate(items)
      setResult(res)
      if (res.imported > 0) {
        toast.success(`${res.imported} products updated`)
        onComplete()
      }
      if (res.skipped > 0) {
        toast.warning(`${res.skipped} rows skipped — see details below`)
      }
    } catch {
      toast.error('Bulk update failed')
    }
    setImporting(false)
  }

  const handleDownloadTemplate = (): void => {
    const csv = 'sku,barcode,stock\nKPT-SAR-00001,,100\n,8901234567890,50\n'
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'stock_update_template.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Bulk Stock Update
          </DialogTitle>
          <DialogDescription>
            Import stock counts from a CSV file. Match products by SKU or barcode.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Upload Area */}
          {!result && (
            <>
              <div
                className="flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-border p-6 cursor-pointer hover:border-primary/50 hover:bg-accent/30 transition-colors"
                onClick={() => fileRef.current?.click()}
              >
                <Upload className="h-8 w-8 text-muted-foreground" />
                <div className="text-center">
                  <p className="text-sm font-medium">{fileName || 'Click to select CSV file'}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Required columns: <code className="bg-muted px-1 rounded">sku</code> or{' '}
                    <code className="bg-muted px-1 rounded">barcode</code> +{' '}
                    <code className="bg-muted px-1 rounded">stock</code> (or qty/quantity/count)
                  </p>
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".csv,.tsv,.txt"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </div>

              <Button
                variant="link"
                size="sm"
                onClick={handleDownloadTemplate}
                className="gap-1 text-xs h-auto p-0"
              >
                <Download className="h-3 w-3" />
                Download CSV template
              </Button>
            </>
          )}

          {/* Preview */}
          {parsedRows.length > 0 && !result && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Preview ({parsedRows.length} rows)</span>
                <Badge variant="secondary">{fileName}</Badge>
              </div>
              <ScrollArea className="max-h-[250px] rounded-md border">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-muted">
                    <tr className="text-left">
                      <th className="px-3 py-2">#</th>
                      <th className="px-3 py-2">SKU</th>
                      <th className="px-3 py-2">Barcode</th>
                      <th className="px-3 py-2 text-right">New Stock</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedRows.slice(0, 100).map((row, idx) => (
                      <tr key={idx} className="border-t border-border/50">
                        <td className="px-3 py-1.5 text-muted-foreground">{idx + 1}</td>
                        <td className="px-3 py-1.5 font-mono">{row.sku || '—'}</td>
                        <td className="px-3 py-1.5 font-mono">{row.barcode || '—'}</td>
                        <td className="px-3 py-1.5 text-right font-amount">{row.stock}</td>
                      </tr>
                    ))}
                    {parsedRows.length > 100 && (
                      <tr className="border-t border-border/50">
                        <td colSpan={4} className="px-3 py-2 text-center text-muted-foreground">
                          ... and {parsedRows.length - 100} more rows
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </ScrollArea>
            </div>
          )}

          {/* Result */}
          {result && (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-lg bg-muted/50 p-3 text-center">
                  <div className="text-2xl font-bold">{result.total}</div>
                  <div className="text-xs text-muted-foreground">Total Rows</div>
                </div>
                <div className="rounded-lg bg-green-50 dark:bg-green-900/20 p-3 text-center">
                  <div className="text-2xl font-bold text-green-600">
                    <CheckCircle2 className="h-4 w-4 inline mr-1" />
                    {result.imported}
                  </div>
                  <div className="text-xs text-green-600">Updated</div>
                </div>
                <div className="rounded-lg bg-orange-50 dark:bg-orange-900/20 p-3 text-center">
                  <div className="text-2xl font-bold text-orange-600">
                    <AlertCircle className="h-4 w-4 inline mr-1" />
                    {result.skipped}
                  </div>
                  <div className="text-xs text-orange-600">Skipped</div>
                </div>
              </div>

              {result.errors.length > 0 && (
                <ScrollArea className="max-h-[150px] rounded-md border border-orange-200 bg-orange-50/50 dark:bg-orange-900/10 p-3">
                  <div className="space-y-1">
                    {result.errors.map((err, i) => (
                      <div key={i} className="text-xs text-orange-700 dark:text-orange-400">
                        {err}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          {result ? (
            <Button onClick={handleClose}>Done</Button>
          ) : (
            <>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                onClick={handleImport}
                disabled={parsedRows.length === 0 || importing}
                className="gap-2"
              >
                {importing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
                {importing ? 'Updating...' : `Update ${parsedRows.length} Products`}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
