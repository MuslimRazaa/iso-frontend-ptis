import * as pdfjsLib from 'pdfjs-dist'
// Vite resolves this to the correct bundled worker URL (pdfjs-dist v5 uses .mjs)
import workerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc

// Heuristics for detecting field type from surrounding text
const guessType = (label, nearby) => {
  const l = label.toLowerCase()
  if (/date|tarikh/.test(l)) return 'date'
  if (/description|detail|reason|remarks|comments|notes/.test(l)) return 'textarea'
  if (/status|type|category|priority|level/.test(l)) return 'dropdown'
  // If the row contains multiple short items separated by spaces (checkbox-like)
  if (nearby && nearby.length >= 2 && nearby.every(t => t.length < 30)) return 'checkbox-group'
  return 'text'
}

// Group text items into rows by Y coordinate (within 6pt = same row)
const groupByRow = (items) => {
  const rows = []
  const used = new Set()
  const sorted = [...items].sort((a, b) => a.y - b.y)

  for (const item of sorted) {
    if (used.has(item)) continue
    const row = [item]
    used.add(item)
    for (const other of sorted) {
      if (!used.has(other) && Math.abs(other.y - item.y) < 8) {
        row.push(other)
        used.add(other)
      }
    }
    row.sort((a, b) => a.x - b.x)
    rows.push(row)
  }
  return rows.sort((a, b) => a[0].y - b[0].y)
}

// Decides if a text looks like a field label vs. a heading/value
const isLabelLike = (text) => {
  const t = text.trim()
  if (!t || t.length > 80) return false
  // Ends with colon, or is short & title-case/upper-case (typical for form labels)
  if (t.endsWith(':')) return true
  if (t === t.toUpperCase() && t.length > 2 && t.length < 60) return true
  if (/^[A-Z][a-z]/.test(t) && t.split(' ').length <= 6) return true
  return false
}

// Skip obvious non-field text (company names, form titles, revision info etc.)
const isNoise = (text) => {
  const t = text.trim().toLowerCase()
  return (
    !t ||
    /^(premier|ptis|fm-|issue|code|title|rev|page \d|the strongest link)/i.test(t) ||
    /^\d+$/.test(t) ||                   // pure numbers
    t.length < 2
  )
}

/**
 * Extracts text items (with page-space coordinates) from a PDF File object.
 * Returns: { pages, fields }
 *   pages  — raw text items per page for overlaying text later
 *   fields — detected candidate field definitions for the import review UI
 */
export async function parsePdf(file) {
  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
  const pages = []

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum)
    const vp = page.getViewport({ scale: 1 })
    const content = await page.getTextContent()

    const items = content.items
      .filter(item => item.str.trim())
      .map(item => {
        const [, , , , tx, ty] = item.transform
        return {
          text: item.str.trim(),
          x: Math.round(tx),
          // Convert pdfjs (bottom-left origin) → top-left origin for display;
          // keep pdfY (original) for pdf-lib which uses bottom-left.
          y: Math.round(vp.height - ty),
          pdfY: Math.round(ty),
          width: Math.round(item.width),
          height: Math.round(item.height || 10),
          page: pageNum - 1,
          pageWidth: Math.round(vp.width),
          pageHeight: Math.round(vp.height),
        }
      })

    pages.push(items)
  }

  // Build candidate fields from all pages
  const allItems = pages.flat()
  const rows = groupByRow(allItems)
  const fields = []

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    // Left-most item in the row as the label candidate
    const firstItem = row[0]
    if (isNoise(firstItem.text)) continue

    if (isLabelLike(firstItem.text)) {
      // Remaining items in the same row (after the label) look like options
      const options = row.slice(1).map(r => r.text).filter(t => t.length > 0)
      const label = firstItem.text.replace(/:$/, '').trim()
      const type = guessType(label, options.length >= 2 ? options : null)

      fields.push({
        id: `f_imported_${Date.now()}_${fields.length}`,
        label,
        type,
        required: false,
        owner: 'requester',
        options: (type === 'checkbox-group' || type === 'dropdown')
          ? options.join(', ')
          : '',
        // Coordinates used later by pdf-lib to overlay the filled value
        pdfCoords: {
          page: firstItem.page,
          // Value area = to the right of the label, same row
          x: firstItem.x + firstItem.width + 8,
          pdfY: firstItem.pdfY,
          pageWidth: firstItem.pageWidth,
          pageHeight: firstItem.pageHeight,
        },
      })
    }
  }

  return { pages, fields }
}

/**
 * Converts a PDF File to a base64 string for storage alongside the template.
 */
export async function pdfToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const base64 = reader.result.split(',')[1]
      resolve(base64)
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}
