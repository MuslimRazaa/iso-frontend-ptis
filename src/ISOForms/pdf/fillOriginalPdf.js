import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'

// Maps a field type + value to a printable string for overlay
const displayValue = (field, value) => {
  if (field.type === 'checkbox') return value ? 'Yes' : ''
  if (field.type === 'checkbox-group') {
    if (!Array.isArray(value) || !value.length) return ''
    // Show selected options with checkmark prefix
    return value.map(v => `✓ ${v}`).join('  ')
  }
  if (field.type === 'date') {
    if (!value) return ''
    try { return new Date(value).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) }
    catch { return value }
  }
  return value != null && value !== '' ? String(value) : ''
}

/**
 * Overlays form field values on the original PDF (stored as a base64 string
 * alongside the template) and returns a Uint8Array of the filled PDF.
 *
 * For each field that has pdfCoords (set during PDF import), we draw the
 * value string at the stored (x, pdfY) position on the correct page.
 * Fields without pdfCoords are appended in a summary at the end of the last page.
 */
export async function fillOriginalPdf(base64, fields, formValues, approverValues, employees = []) {
  const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0))
  const doc = await PDFDocument.load(bytes)
  const font = await doc.embedFont(StandardFonts.Helvetica)
  const pages = doc.getPages()

  const resolveEmployeeName = (id) => {
    const emp = employees.find(e => String(e.id) === String(id))
    return emp ? (emp.full_name || emp.name) : (id || '')
  }

  const allValues = { ...formValues, ...approverValues }
  const fieldsWithCoords = fields.filter(f => f.pdfCoords)
  const fieldsWithout    = fields.filter(f => !f.pdfCoords)

  // ── Overlay fields that have coordinates ──────────────────────────────
  for (const field of fieldsWithCoords) {
    const { page: pageIdx, x, pdfY, pageWidth } = field.pdfCoords
    const page = pages[pageIdx]
    if (!page) continue

    let rawVal = allValues[field.id]
    if (field.type === 'employee') rawVal = resolveEmployeeName(rawVal)
    const text = displayValue(field, rawVal)
    if (!text) continue

    const fontSize = 9
    const maxWidth = pageWidth - x - 10
    // Truncate if too wide
    let display = text
    let w = font.widthOfTextAtSize(display, fontSize)
    while (w > maxWidth && display.length > 1) {
      display = display.slice(0, -1)
      w = font.widthOfTextAtSize(display + '…', fontSize)
    }
    if (display !== text) display = display + '…'

    page.drawText(display, {
      x: x + 2,
      y: pdfY + 2,   // slightly above baseline
      size: fontSize,
      font,
      color: rgb(0, 0, 0),
    })
  }

  // ── Append fields without coordinates as a summary block at the bottom ─
  if (fieldsWithout.length > 0) {
    const lastPage = pages[pages.length - 1]
    const { height } = lastPage.getSize()
    let y = 60
    const fontSize = 8

    for (const field of [...fieldsWithout].reverse()) {
      let rawVal = allValues[field.id]
      if (field.type === 'employee') rawVal = resolveEmployeeName(rawVal)
      const text = displayValue(field, rawVal)
      if (!text) continue

      const label = `${field.label}: ${text}`
      lastPage.drawText(label.slice(0, 90), {
        x: 28, y,
        size: fontSize, font,
        color: rgb(0.3, 0.3, 0.3),
      })
      y += fontSize + 4
      if (y > height - 30) break
    }
  }

  return doc.save()
}

/**
 * Convenience: calls fillOriginalPdf and triggers a browser download.
 */
export async function downloadFilledPdf(base64, fields, formValues, approverValues, employees, filename) {
  const filledBytes = await fillOriginalPdf(base64, fields, formValues, approverValues, employees)
  const blob = new Blob([filledBytes], { type: 'application/pdf' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
