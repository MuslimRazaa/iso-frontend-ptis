// Electronic signatures.
//
// A form is a controlled document: it records WHO completed a section and WHEN,
// and that is what replaces a hand-written signature. The moment is stamped by
// the app when the form is submitted (requester fields) or decided (approver
// fields) and is never typed, so a signature cannot be back-dated. The name can
// be typed, because forms are routinely filled for people who are not in the
// employee list.
//
// Stored as { name, at } — a structure rather than a formatted string, so the
// screen and the PDF can present it differently without either re-parsing text.

/** The signature to stamp for `name`, now. */
export const makeSignature = (name) => ({
  name: String(name || '').trim(),
  at: new Date().toISOString(),
})

/**
 * Seals a signature at submit / decision time.
 *
 * Forms are routinely filled for people who are not in the employee list, so
 * the name can be typed on the form; the DATE is never typed, it is stamped
 * here. A signature that already carries a date is returned untouched — a
 * revision corrects what a form says, it does not re-sign it.
 */
export const stampSignature = (value, fallbackName) => {
  if (value?.at) return value
  const typed = String(value?.name || '').trim()
  return makeSignature(typed || fallbackName)
}

/**
 * The name to sign as.
 *
 * Not every session carries a display name. An employee login stores one, but
 * an admin login stores no identity at all (Login.jsx keeps only `userType`),
 * and a form submitted from one of those was stamped with an empty name and
 * printed as nothing. So the employee record is consulted too, the email stands
 * in after that, and the admin account signs under its own name rather than
 * silently leaving the signature line blank.
 */
export const resolveSignerName = ({ employees = [], employeeId } = {}) => {
  const stored = (localStorage.getItem('userFullName') || '').trim()
  if (stored) return stored

  const email = (localStorage.getItem('userEmail') || '').trim()
  const me = (employees || []).find(e =>
    (employeeId != null && String(e.id) === String(employeeId)) ||
    (email && String(e.email || '').toLowerCase() === email.toLowerCase()))
  const fromRecord = me ? String(me.full_name || me.name || '').trim() : ''
  if (fromRecord) return fromRecord
  if (email) return email

  return localStorage.getItem('userType') === 'admin' ? 'Administrator' : ''
}

/**
 * True for a value already stamped — an edit must not re-sign it.
 *
 * The stamp is what makes it signed, not the name: a signature whose name could
 * not be resolved still records the date it was signed on, and printing nothing
 * would lose that too.
 */
export const isSigned = (value) =>
  Boolean(value && typeof value === 'object' && (value.name || value.at))

const pad = (n) => String(n).padStart(2, '0')

// Spelled out rather than taken from toLocaleString: that gives "Sept" in some
// runtimes and "Sep" in others, and a signature has to read the same on the
// screen and in the PDF.
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/**
 * "03 Sep 2026, 03:45 PM" — when a form was signed.
 *
 * To the minute: seconds say nothing a signature line needs, and 12-hour with
 * AM/PM is how the time is read on these forms. The stored value keeps the full
 * timestamp either way.
 */
export const formatSignatureDate = (at) => {
  if (!at) return ''
  const d = new Date(at)
  if (Number.isNaN(d.getTime())) return String(at)

  const hours24 = d.getHours()
  const meridiem = hours24 < 12 ? 'AM' : 'PM'
  // 0 and 12 both read as 12 on a clock face.
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12

  return `${pad(d.getDate())} ${MONTHS[d.getMonth()]} ${d.getFullYear()}, `
    + `${pad(hours12)}:${pad(d.getMinutes())} ${meridiem}`
}

/** The lines a signature prints as: who signed, and on what date. */
export const signatureLines = (value) => {
  if (!isSigned(value)) return []
  const name = String(value.name || '').trim()
  const when = formatSignatureDate(value.at)
  return [name, when].filter(Boolean)
}

/** Signature as text — for the PDF overlay and any plain-text display. */
export const signatureText = (value) => signatureLines(value).join('\n')
