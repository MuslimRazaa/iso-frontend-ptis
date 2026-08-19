import { PDFDocument } from 'pdf-lib'

/**
 * Reads a PDF's own interactive form fields (AcroForm), when it has any.
 *
 * This is the best possible source of field information: a fillable PDF states
 * each field's name, type and exact widget rectangle outright, so nothing has
 * to be inferred from label text or drawn geometry. When a PDF carries these,
 * they take priority over every other detection route.
 *
 * Most forms exported from Word have none, which is why the geometry detector
 * still exists — this simply uses better data when better data is there.
 *
 * Read with pdf-lib rather than pdfjs deliberately: pdf-lib is also what fills
 * the form later, so the option names captured here are exactly the ones
 * `select()` will accept. (pdfjs reports the raw appearance-state names — "0",
 * "1" — which would not select anything.)
 */

const prettyLabel = (raw) =>
  String(raw || '')
    .replace(/[_\-.]+/g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')   // splits camelCase field names
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^./, c => c.toUpperCase())

const widgetBox = (widget, pages) => {
  let rect
  try { rect = widget.getRectangle() } catch { return null }
  if (!rect || !(rect.width > 0) || !(rect.height > 0)) return null

  let page = 0
  try {
    const ref = widget.P()
    const idx = pages.findIndex(p => p.ref === ref)
    if (idx >= 0) page = idx
  } catch { /* single-page or unresolvable — page 0 is the safe default */ }

  return {
    page,
    x: rect.x,
    y: rect.y,
    width: rect.width,
    height: rect.height,
  }
}

/**
 * @param bytes      the PDF's bytes (a copy — pdfjs detaches the buffer it gets)
 * @param guessType  reused label-based type guesser, for plain text fields
 * @param guessOwner reused requester/approver guesser
 * @returns field definitions in the same shape the rest of the module uses
 */
export async function readAcroFormFields(bytes, { guessType, guessOwner } = {}) {
  let doc, formFields, pages
  try {
    doc = await PDFDocument.load(bytes, { updateMetadata: false })
    pages = doc.getPages()
    formFields = doc.getForm().getFields()
  } catch {
    return []   // not a form, or unreadable — callers fall back to detection
  }
  if (!formFields.length) return []

  const fields = []

  for (const f of formFields) {
    const kind = f.constructor.name          // PDFTextField, PDFCheckBox, …
    if (kind === 'PDFSignature' || kind === 'PDFButton') continue

    const name = f.getName()
    const label = prettyLabel(name)
    if (!label) continue

    const widgets = (() => { try { return f.acroField.getWidgets() } catch { return [] } })()
    const boxes = widgets.map(w => widgetBox(w, pages)).filter(Boolean)
    if (!boxes.length) continue

    const base = {
      id: `f_acro_${name.replace(/[^a-zA-Z0-9_]/g, '_')}`,
      label,
      required: (() => { try { return f.isRequired() } catch { return false } })(),
      owner: guessOwner ? guessOwner(label, 'requester') : 'requester',
      options: '',
      acroName: name,
    }
    const pageSize = pages[boxes[0].page]?.getSize?.() || {}
    const coords = { ...boxes[0], pageWidth: pageSize.width, pageHeight: pageSize.height }

    if (kind === 'PDFRadioGroup' || kind === 'PDFDropdown' || kind === 'PDFOptionList') {
      const options = (() => { try { return f.getOptions() } catch { return [] } })()
      // For a radio group each widget is one choice, and its rectangle is
      // exactly where that choice's mark belongs.
      if (kind === 'PDFRadioGroup' && boxes.length === options.length) {
        coords.optionMarks = options.map((opt, i) => ({ label: opt, box: boxes[i] }))
      }
      fields.push({
        ...base,
        type: 'dropdown',
        options: options.join(', '),
        pdfCoords: coords,
      })
      continue
    }

    if (kind === 'PDFCheckBox') {
      fields.push({ ...base, type: 'checkbox', pdfCoords: coords })
      continue
    }

    // Text — the PDF says whether it wraps; the label says the flavour
    // (date / employee / long text), exactly as for non-interactive forms.
    const multiline = (() => { try { return f.isMultiline() } catch { return false } })()
    const guessed = guessType ? guessType(label) : 'text'
    fields.push({
      ...base,
      type: multiline ? 'textarea' : guessed,
      pdfCoords: coords,
    })
  }

  return fields
}
