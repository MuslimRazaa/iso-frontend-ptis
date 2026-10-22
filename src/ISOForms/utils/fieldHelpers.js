import { formatSignatureDate } from './signature'

/**
 * A "Date & Time" value as people read it: "03 Sep 2026, 03:45 PM". The value is
 * stored as "YYYY-MM-DDTHH:mm" (or just the date when no time was picked), and
 * the same wording is used on the screen and in the PDF.
 */
export const formatDateTimeValue = (value) => {
  const v = String(value || '').trim()
  if (!v) return ''
  if (!v.includes('T')) {
    const d = new Date(`${v}T00:00`)
    return Number.isNaN(d.getTime())
      ? v
      : d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  }
  return formatSignatureDate(v)
}

/** Right now as a "Date & Time" value ("YYYY-MM-DDTHH:mm", local time). */
export const nowDateTimeValue = () => {
  const d = new Date()
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`
}

// True when a required field has no usable value yet — shared by FormFiller
// (requester fields) and FormDetail (approver fields filled at decision time).
export const isFieldEmpty = (field, value) => {
  if (field.type === 'checkbox-group' || field.type === 'employee-multi') return !Array.isArray(value) || value.length === 0
  if (field.type === 'checkbox') return false
  // A signature is stamped on submit / on decision, not typed, so it is never
  // the thing standing between someone and sending the form.
  if (field.type === 'signature') return false
  return value === undefined || value === null || value === ''
}

const ROW_NUMBER = /^Row\s+(\d+)\s*[\u2014\u2013-]/i

// Whether a value is something a person actually entered. A ticked box counts, an
// unticked one (or an empty choice list) does not.
export const hasContent = (value) => {
  if (Array.isArray(value)) return value.length > 0
  if (value && typeof value === 'object') return Boolean(String(value.name || '').trim())
  return value !== undefined && value !== null && value !== false && String(value).trim() !== ''
}

/**
 * The signature fields that should be stamped on submit / decision.
 *
 * A register template prints far more rows than a form usually needs, and each
 * row has its own signature cell. Stamping them all signs rows nobody filled in,
 * so a signature is held back when its whole row is empty. A row is the set of
 * fields named "Row N — …" that sit on one line of the page (same page, within a
 * few points vertically), so two tables that both number their rows from 1 do not
 * count as one row. A signature field that is not part of a numbered row is always
 * stamped, as before, and so is one whose row has anything filled in — or one a
 * person already typed a name into.
 */
export const signaturesToStamp = (fields, values) => {
  const rows = []
  for (const f of fields) {
    const m = ROW_NUMBER.exec(String(f.label || ''))
    if (!m) continue
    const page = f.pdfCoords?.page ?? 0
    const y = Number(f.pdfCoords?.y)
    const hit = rows.find(r => r.no === m[1] && r.page === page &&
      (!Number.isFinite(y) || !Number.isFinite(r.y) || Math.abs(r.y - y) <= 8))
    if (hit) hit.fields.push(f)
    else rows.push({ no: m[1], page, y, fields: [f] })
  }

  const stamp = new Set()
  for (const f of fields) {
    if (f.type !== 'signature') continue
    const row = rows.find(r => r.fields.includes(f))
    // Not in a numbered row, or alone in it: nothing to judge it by.
    if (!row || row.fields.length < 2) { stamp.add(f.id); continue }
    if (row.fields.some(x => hasContent(values[x.id]))) stamp.add(f.id)
  }
  return stamp
}
