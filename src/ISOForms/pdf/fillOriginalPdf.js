import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'
import { normalizePdfCoords, optionMarkBox, DEFAULT_FONT_SIZE } from '../utils/pdfCoords'
import { base64ToBytes } from '../utils/base64'

// ─────────────────────────────────────────────────────────────────────────────
// Overlay renderer.
//
// The contract for this module is: Original PDF + field values = completed PDF.
// It loads the uploaded template's own bytes and only ADDS drawing operations
// to the existing pages. It never rebuilds a layout, never rasterises a page,
// never adds or removes pages, and never touches page size. Everything the
// original PDF contains — tables, borders, logos, fonts, colours, headers,
// footers — survives byte-for-byte because it is simply never rewritten.
// ─────────────────────────────────────────────────────────────────────────────

const TEXT_COLOR = rgb(0, 0, 0)
const MIN_FONT_SIZE = 5
const PAD_X = 2

/**
 * pdf-lib's standard fonts encode WinAnsi only, and `drawText` THROWS on any
 * character outside it. That is not a cosmetic problem: a single stray glyph
 * would abort the whole download. (This is exactly what the old '✓' prefix on
 * checkbox groups did — it threw, and the caller quietly fell back to a
 * rasterised HTML recreation, which is the behaviour this work removes.)
 *
 * So every string is folded to WinAnsi-safe text before it reaches drawText.
 */
const sanitize = (str) => {
  if (str == null) return ''
  return String(str)
    .replace(/[‘’‚‹›]/g, "'")
    .replace(/[“”„]/g, '"')
    .replace(/[–—−]/g, '-')
    .replace(/[•·]/g, '-')
    .replace(/…/g, '...')
    .replace(/[\u00a0\u2000-\u200a\u202f\u205f\u3000]/g, ' ')   // nbsp / thin spaces
    .replace(/[✓✔☑]/g, 'X')   // ticks → plain X if they reach text
    .replace(/\t/g, '    ')
    // Anything still outside Latin-1 gets dropped rather than exploding.
    .replace(/[^\x20-\x7E\xA0-\xFF\r\n]/g, '')
}

/** Maps a field value to the string that should appear on the PDF. */
const displayValue = (field, value) => {
  if (field.type === 'checkbox') return value ? 'Yes' : ''
  if (field.type === 'checkbox-group') {
    if (!Array.isArray(value) || !value.length) return ''
    return value.join(', ')
  }
  if (field.type === 'date') {
    if (!value) return ''
    try {
      return new Date(value).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    } catch { return String(value) }
  }
  return value != null && value !== '' ? String(value) : ''
}

/** Greedy word wrap; falls back to hard character breaks for unbroken runs. */
const wrapLines = (text, font, size, maxWidth) => {
  const lines = []
  for (const paragraph of text.split(/\r?\n/)) {
    if (!paragraph.trim()) { lines.push(''); continue }
    let line = ''
    for (const word of paragraph.split(/\s+/)) {
      const candidate = line ? `${line} ${word}` : word
      if (font.widthOfTextAtSize(candidate, size) <= maxWidth) { line = candidate; continue }
      if (line) lines.push(line)
      // A single word wider than the box gets split across lines.
      if (font.widthOfTextAtSize(word, size) > maxWidth) {
        let chunk = ''
        for (const ch of word) {
          if (font.widthOfTextAtSize(chunk + ch, size) > maxWidth && chunk) { lines.push(chunk); chunk = ch }
          else chunk += ch
        }
        line = chunk
      } else {
        line = word
      }
    }
    lines.push(line)
  }
  return lines
}

const truncateToWidth = (text, font, size, maxWidth) => {
  if (font.widthOfTextAtSize(text, size) <= maxWidth) return text
  let out = text
  while (out.length > 1 && font.widthOfTextAtSize(`${out}...`, size) > maxWidth) out = out.slice(0, -1)
  return `${out}...`
}

const alignedX = (boxX, boxWidth, textWidth, align) => {
  if (align === 'center') return boxX + (boxWidth - textWidth) / 2
  if (align === 'right') return boxX + boxWidth - textWidth - PAD_X
  return boxX + PAD_X
}

/**
 * Draws a tick as two vector strokes rather than a glyph.
 *
 * A drawn line has no character encoding, so unlike a '✓' it cannot fail on a
 * font that lacks the glyph — which makes checkbox rendering structurally
 * incapable of breaking the download.
 */
const drawCheckMark = (page, box) => {
  const size = Math.min(box.width, box.height)
  const cx = box.x + box.width / 2
  const cy = box.y + box.height / 2
  const s = size * 0.34
  const thickness = Math.max(0.9, size * 0.09)
  const opts = { thickness, color: TEXT_COLOR }
  page.drawLine({ start: { x: cx - s, y: cy + s * 0.1 }, end: { x: cx - s * 0.25, y: cy - s * 0.75 }, ...opts })
  page.drawLine({ start: { x: cx - s * 0.25, y: cy - s * 0.75 }, end: { x: cx + s, y: cy + s * 0.8 }, ...opts })
}

/** Draws one field's value inside its box. */
const drawFieldValue = (page, coords, text, font) => {
  const { x, y, width, height, align, legacyAnchor } = coords
  const maxWidth = Math.max(4, width - PAD_X * 2)

  // Legacy anchor points carry no measured height, so they stay single-line
  // and truncate exactly as they always did. Wrapping downward into space we
  // never measured would print over the form's own artwork.
  if (legacyAnchor) {
    const size = coords.fontSize || DEFAULT_FONT_SIZE
    const display = truncateToWidth(text, font, size, maxWidth)
    page.drawText(display, { x: x + PAD_X, y: y + 2, size, font, color: TEXT_COLOR })
    return
  }

  // Boxed field: shrink to fit, then wrap within the box.
  let size = coords.fontSize || Math.min(DEFAULT_FONT_SIZE, Math.max(MIN_FONT_SIZE, height - 4))
  let lines = wrapLines(text, font, size, maxWidth)
  const fits = () => lines.length * (size * 1.15) <= height

  // Only auto-shrink when the admin didn't pin a size explicitly.
  if (!coords.fontSize) {
    while (!fits() && size > MIN_FONT_SIZE) {
      size -= 0.5
      lines = wrapLines(text, font, size, maxWidth)
    }
  }

  const lineHeight = size * 1.15
  const maxLines = Math.max(1, Math.floor(height / lineHeight))
  if (lines.length > maxLines) {
    lines = lines.slice(0, maxLines)
    lines[maxLines - 1] = truncateToWidth(lines[maxLines - 1], font, size, maxWidth)
  }

  // Lay out from the top of the box downward.
  let baseline = y + height - size
  for (const line of lines) {
    if (line) {
      const textWidth = font.widthOfTextAtSize(line, size)
      page.drawText(line, {
        x: alignedX(x, width, textWidth, align),
        y: baseline,
        size,
        font,
        color: TEXT_COLOR,
      })
    }
    baseline -= lineHeight
  }
}

/**
 * Overlays submitted values onto the original uploaded PDF.
 *
 * Returns { bytes, skipped } — `skipped` lists fields that hold a value but
 * have no position on the PDF yet. Those are deliberately NOT drawn: printing
 * them in a corner would deface the template. The caller surfaces them so an
 * admin can place them in the field position editor.
 */
export async function fillOriginalPdf(base64, fields, formValues, approverValues, employees = []) {
  const doc = await PDFDocument.load(base64ToBytes(base64))
  const font = await doc.embedFont(StandardFonts.Helvetica)
  const pages = doc.getPages()

  const resolveEmployeeName = (id) => {
    const emp = employees.find(e => String(e.id) === String(id))
    return emp ? (emp.full_name || emp.name) : (id || '')
  }

  const allValues = { ...formValues, ...approverValues }
  const skipped = []

  // If the template PDF is itself a fillable form, values go into its own
  // fields and the form is then flattened. That uses the appearance the form's
  // author defined — exact box, font and alignment — instead of us painting
  // over it, and flattening leaves a fixed record rather than a document whose
  // values can still be edited after approval.
  const form = (() => { try { return doc.getForm() } catch { return null } })()
  let usedAcroFields = 0

  // An admin-pinned size wins; otherwise fall back to the shared default.
  const coordFontSize = (field) => {
    const n = Number(field?.pdfCoords?.fontSize)
    return Number.isFinite(n) && n > 0 ? n : null
  }

  const setAcroValue = (field, rawVal) => {
    if (!form || !field.acroName) return false
    try {
      if (field.type === 'checkbox') {
        const box = form.getCheckBox(field.acroName)
        rawVal ? box.check() : box.uncheck()
        return true
      }
      if (field.type === 'checkbox-group' || field.type === 'dropdown') {
        const selected = Array.isArray(rawVal) ? rawVal : (rawVal ? [rawVal] : [])
        if (!selected.length) return true
        try {
          form.getRadioGroup(field.acroName).select(String(selected[0]))
          return true
        } catch {
          try {
            form.getDropdown(field.acroName).select(String(selected[0]))
            return true
          } catch {
            return false
          }
        }
      }
      const text = sanitize(displayValue(field, rawVal))
      const tf = form.getTextField(field.acroName)
      // Text fields default to auto-sizing, which on a multi-line box can pick
      // an enormous size and clip the value. Pin it to the same size the
      // overlay uses so filled forms read consistently either way.
      try { tf.setFontSize(coordFontSize(field) || DEFAULT_FONT_SIZE) } catch { /* keep the PDF's own size */ }
      tf.setText(text)
      return true
    } catch {
      return false   // fall through to drawing
    }
  }

  for (const field of fields || []) {
    let rawVal = allValues[field.id]
    if (field.type === 'employee') rawVal = resolveEmployeeName(rawVal)

    // The PDF's own field, when it has one, is always the better target.
    if (setAcroValue(field, rawVal)) { usedAcroFields++; continue }

    const coords = normalizePdfCoords(field.pdfCoords)

    // Choice fields whose printed options have been located get a tick next to
    // each selected option — the form already prints the option text, so
    // writing it again would just overlap it. These marks carry their own
    // positions, so they work even for a field with no value box of its own.
    const optionMarks = Array.isArray(field.pdfCoords?.optionMarks) ? field.pdfCoords.optionMarks : null
    if (optionMarks?.length && (field.type === 'checkbox-group' || field.type === 'dropdown')) {
      const markPage = pages[Number.isFinite(field.pdfCoords?.page) ? field.pdfCoords.page : (coords?.page ?? 0)]
      const selected = Array.isArray(rawVal) ? rawVal : (rawVal ? [rawVal] : [])
      if (!markPage || !selected.length) continue
      const wanted = new Set(selected.map(v => String(v).trim().toLowerCase()))
      for (const mark of optionMarks) {
        if (!wanted.has(String(mark.label).trim().toLowerCase())) continue
        const box = optionMarkBox(mark)
        if (box) drawCheckMark(markPage, box)
      }
      continue
    }

    if (!coords) {
      if (displayValue(field, rawVal)) skipped.push(field.label || field.id)
      continue
    }

    const page = pages[coords.page]
    if (!page) continue

    // A ticked checkbox becomes a drawn mark inside its box, so it lands in
    // the form's own checkbox cell instead of writing the word "Yes" over it.
    if (field.type === 'checkbox') {
      if (rawVal) drawCheckMark(page, coords)
      continue
    }

    const text = sanitize(displayValue(field, rawVal))
    if (!text) continue

    drawFieldValue(page, coords, text, font)
  }

  // Bake filled fields into the page so the download is a fixed record, not an
  // editable form. If flattening isn't possible the values still render — the
  // document just stays interactive, which is better than failing the download.
  if (usedAcroFields > 0 && form) {
    try { form.flatten() } catch (err) {
      console.warn('Could not flatten the PDF form; leaving fields interactive:', err?.message)
    }
  }

  return { bytes: await doc.save(), skipped }
}

/** Fills the original PDF and hands it to the browser as a download. */
export async function downloadFilledPdf(base64, fields, formValues, approverValues, employees, filename) {
  const { bytes, skipped } = await fillOriginalPdf(base64, fields, formValues, approverValues, employees)
  const blob = new Blob([bytes], { type: 'application/pdf' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
  return { skipped }
}
