import * as pdfjsLib from 'pdfjs-dist'
// Vite's `?worker&inline` suffix bundles the worker as a base64 data URL
// directly inside the built JS — no separate .mjs file is ever fetched over
// the network, so it can't be broken by a host serving the wrong (or no)
// Content-Type for .mjs files, and there's no manual blob/Worker plumbing
// that can silently hang.
import PdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?worker&inline'

pdfjsLib.GlobalWorkerOptions.workerPort = new PdfWorker()

// ── Type guesser ─────────────────────────────────────────────────────────────
const guessType = (label) => {
  const l = label.toLowerCase()
  if (/\bdate\b|tarikh/.test(l)) return 'date'
  if (/\b(name|personnel|by|inspector|assigned|responsible|verified|reported|concerned)\b/.test(l)) return 'employee'
  if (/department|dept\b/.test(l)) return 'text'
  if (/\b(description|detail|reason|remark|comment|note|action|cause|correction|nonconform|non-conform)\b/.test(l)) return 'textarea'
  if (/\b(status|type|category|priority|level|approval|decision|impact)\b/.test(l)) return 'dropdown'
  return 'text'
}

// ── Owner guesser ─────────────────────────────────────────────────────────────
const guessOwner = (label, sectionHint) => {
  const l = label.toLowerCase()
  if (/\b(impact|approval|approved|rejected|root cause|correction|corrective|follow.?up|closing|closed|category|decision|verified)\b/.test(l)) return 'approver'
  if (sectionHint === 'approver') return 'approver'
  return 'requester'
}

// ── Noise filter ──────────────────────────────────────────────────────────────
const isNoise = (text) => {
  const t = text.trim()
  if (!t || t.length < 2) return true
  // Page / form headers
  if (/^(premier|ptis|fm-\d|issue\s|code\s|title\s|rev\s*\d|page\s*\d|the strongest link)/i.test(t)) return true
  // Pure numbers, single chars, date strings, short codes
  if (/^\d+$/.test(t) || /^[a-z]$/i.test(t) || /^\d{2}[\/\-]\w+[\/\-]\d{4}$/.test(t) || /^0\d$/.test(t)) return true
  // Section banners
  if (/^section\s*[:\-–]/i.test(t)) return true
  // Instruction text
  if (/^to be (filled|assigned|used)\b/i.test(t) || /\(to be filled/i.test(t) || /^for use of\b/i.test(t)) return true
  // Standalone checkbox option words
  if (/^(urgent|normal|low|scheduled|unscheduled|emergency|hardware|software|network|application|environment|other|approved|rejected|postponed|closed|pending|minor|major|significant|negligible|accepted|na\b)$/i.test(t)) return true
  return false
}

// ── Label detector ────────────────────────────────────────────────────────────
const isLabelLike = (text) => {
  const t = text.trim()
  if (!t || t.length > 90 || t.length < 3) return false
  if (t.endsWith(':')) return true
  if (t === t.toUpperCase() && t.length >= 4 && t.length <= 70 && /[A-Z]/.test(t)) return true
  if (/^[A-Z][a-z]/.test(t) && t.split(/\s+/).length <= 7 && !/[.?!]$/.test(t)) return true
  return false
}

// ── Group text items into rows by Y coordinate ────────────────────────────────
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

// ── Detect section context (requester vs approver) ────────────────────────────
const detectSectionOwner = (rowText) => {
  const t = rowText.toLowerCase()
  if (/reporting personnel|initiator|section.*\ba\b/.test(t)) return 'requester'
  if (/ismr|change team|hod|functional head|qms|qhse|auditor|section.*\b[bc]\b|approver/.test(t)) return 'approver'
  return null
}

// Known PTIS form codes → matched by text inside the PDF
const KNOWN_FORMS = [
  { code: 'FM-001-04', pattern: /FM-001-04/i },
  { code: 'FM-002-01', pattern: /FM-002-01/i },
  { code: 'FM-014-09', pattern: /FM-014-09/i },
]

/**
 * Extracts text items from a PDF and builds candidate field definitions.
 * Returns: { pages, fields, detectedFormCode }
 *   pages           — raw text items per page (for pdf-lib overlay later)
 *   fields          — detected field candidates for the import review UI
 *   detectedFormCode — e.g. "FM-002-01" if a known PTIS form was recognised, else null
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

  const allItems = pages.flat()
  const rows = groupByRow(allItems)
  const fields = []
  let currentSectionOwner = 'requester'

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const rowFullText = row.map(r => r.text).join(' ')

    // Track which section we're in (requester vs approver)
    const sectionOwner = detectSectionOwner(rowFullText)
    if (sectionOwner) currentSectionOwner = sectionOwner

    const firstItem = row[0]
    if (isNoise(firstItem.text)) continue
    if (!isLabelLike(firstItem.text)) continue

    // Clean label: strip trailing colon and parenthetical suffixes
    const label = firstItem.text.replace(/:$/, '').replace(/\s*\(.*?\)\s*$/, '').trim()
    if (!label || label.length < 3) continue

    // Skip section-level headings that slipped through
    if (/^(document change request details|impact analysis|request approval|closing details|corrective action request|section [a-c])/i.test(label)) continue

    const type = guessType(label)
    const owner = guessOwner(label, currentSectionOwner)

    // Inline items to the right of the label on the same row → possible options
    const inlineOptions = row.slice(1).map(r => r.text).filter(t => t.length > 0 && t.length < 40 && !isNoise(t))

    fields.push({
      id: `f_imported_${Date.now()}_${fields.length}`,
      label,
      type,
      required: owner === 'requester',
      owner,
      options: (type === 'checkbox-group' || type === 'dropdown') && inlineOptions.length >= 2
        ? inlineOptions.join(', ')
        : '',
      pdfCoords: {
        page: firstItem.page,
        x: firstItem.x + firstItem.width + 8,
        pdfY: firstItem.pdfY,
        pageWidth: firstItem.pageWidth,
        pageHeight: firstItem.pageHeight,
      },
    })
  }

  // Deduplicate by label (table structures repeat the same label text)
  const seen = new Set()
  const deduped = fields.filter(f => {
    const key = f.label.toLowerCase()
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  // Check if this is a known PTIS form (has hand-built fields + print layout)
  const fullText = allItems.map(i => i.text).join(' ')
  const matched = KNOWN_FORMS.find(f => f.pattern.test(fullText))
  const detectedFormCode = matched ? matched.code : null

  // Even for forms we don't have bespoke handling for, PTIS's own form
  // codes all follow "FM-###-##" — capture that generically so the generic
  // print layout can still show a proper Title/Code header instead of
  // leaving the Code blank.
  const anyCodeMatch = fullText.match(/FM-\d{3}-\d{2}/i)
  const detectedAnyCode = anyCodeMatch ? anyCodeMatch[0].toUpperCase() : null

  return { pages, fields: deduped, detectedFormCode, detectedAnyCode, allItems }
}

// ── Coordinate enrichment for pre-defined seed fields ─────────────────────────
// When a recognized PTIS form is uploaded, seed fields don't have pdfCoords.
// This function matches each seed field label to the closest extracted text
// item and assigns coordinates so pdf-lib can overlay values on the original PDF.
export function enrichSeedFieldsWithCoords(seedFields, allItems) {
  const norm = (s) => s.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim()
  const toWords = (s) => norm(s).split(' ').filter(w => w.length > 2)

  const scoreMatch = (fieldLabel, itemText) => {
    const fw = toWords(fieldLabel)
    const iw = toWords(itemText)
    if (!fw.length || !iw.length) return 0
    const overlap = fw.filter(w => iw.some(iw2 => iw2.includes(w) || w.includes(iw2))).length
    return overlap / fw.length
  }

  const pageWidth = allItems[0]?.pageWidth || 595

  return seedFields.map(field => {
    if (field.pdfCoords) return field

    const fieldId = field.id || ''

    // Section C of CAR form has 3 side-by-side columns (fu1/fu2/fu3).
    // Constrain x-range so we pick the right column's label.
    let xMin = 0, xMax = pageWidth
    if (/_fu1_/.test(fieldId)) { xMax = pageWidth * 0.38 }
    else if (/_fu2_/.test(fieldId)) { xMin = pageWidth * 0.38; xMax = pageWidth * 0.68 }
    else if (/_fu3_/.test(fieldId)) { xMin = pageWidth * 0.68 }

    const candidates = allItems.filter(item => item.x >= xMin && item.x <= xMax)

    let bestMatch = null
    let bestScore = 0

    for (const item of candidates) {
      const s = scoreMatch(field.label, item.text)
      if (s > bestScore) {
        bestScore = s
        bestMatch = item
      }
    }

    if (bestMatch && bestScore >= 0.38) {
      return {
        ...field,
        pdfCoords: {
          page: bestMatch.page,
          x: bestMatch.x + bestMatch.width + 6,
          pdfY: bestMatch.pdfY,
          pageWidth: bestMatch.pageWidth,
          pageHeight: bestMatch.pageHeight,
        },
      }
    }

    return field
  })
}

/**
 * Converts a PDF File to a base64 string for storage alongside the template.
 */
export async function pdfToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result.split(',')[1])
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}
