// Single source of truth for ISO Forms field-coordinate math.
//
// Field positions live in PDF user space: origin bottom-left, units = points.
// The position editor works in canvas pixels (origin top-left), so every
// conversion between the two goes through here rather than being re-derived
// with a stray `height - y` at each call site.

export const DEFAULT_FONT_SIZE = 9
export const DEFAULT_BOX_HEIGHT = 14
export const DEFAULT_BOX_WIDTH = 140

/**
 * Normalizes a field's stored coordinates to the current shape.
 *
 * Templates imported before the position editor existed stored only an anchor
 * point — `{ page, x, pdfY, pageWidth, pageHeight }` — with no box extents.
 * Those records must keep working untouched, so they are widened here to a box
 * running from the anchor to (near) the right page edge, which is what the old
 * overlay effectively assumed when it truncated against `pageWidth - x - 10`.
 *
 * Returns null when there are no usable coordinates, so callers can treat
 * "unplaced" as a single explicit case.
 */
export function normalizePdfCoords(coords) {
  if (!coords) return null

  const page = Number.isFinite(coords.page) ? coords.page : 0
  const x = Number(coords.x)
  // New records carry `y`; legacy ones carry `pdfY`. Both are bottom-origin.
  const y = Number(coords.y ?? coords.pdfY)
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null

  const pageWidth = Number(coords.pageWidth) || 0
  const pageHeight = Number(coords.pageHeight) || 0

  let width = Number(coords.width)
  let height = Number(coords.height)

  // A record with no box extents is a legacy anchor point: we know where the
  // value starts but nothing about the space available for it. Such fields
  // stay single-line and truncate, exactly as they did before boxes existed —
  // wrapping into height we never measured would draw over the form artwork.
  const legacyAnchor = !Number.isFinite(width) || width <= 0 || !Number.isFinite(height) || height <= 0

  if (legacyAnchor) {
    width = pageWidth > 0 ? Math.max(20, pageWidth - x - 10) : DEFAULT_BOX_WIDTH
    height = DEFAULT_BOX_HEIGHT
  }

  const fontSize = Number(coords.fontSize)

  return {
    page,
    x,
    y,
    width,
    height,
    legacyAnchor,
    fontSize: Number.isFinite(fontSize) && fontSize > 0 ? fontSize : null,
    align: coords.align === 'center' || coords.align === 'right' ? coords.align : 'left',
    // Positions of the form's own printed choices, when the importer found
    // them — lets a choice field be ticked in place rather than written out.
    optionMarks: Array.isArray(coords.optionMarks) ? coords.optionMarks : null,
    pageWidth,
    pageHeight,
  }
}

/** True when the field has a usable position on the original PDF. */
export const isPlaced = (field) => normalizePdfCoords(field?.pdfCoords) !== null

/**
 * PDF points → canvas pixels (top-left origin).
 * `viewport` is a pdfjs viewport: { width, height, scale }.
 * The returned box is the CSS box for an overlay element.
 */
export function pdfToScreen(coords, viewport) {
  const c = normalizePdfCoords(coords)
  if (!c) return null
  const scale = viewport.scale
  return {
    left: c.x * scale,
    // Flip: PDF y is the box BOTTOM, CSS top is measured from the page top.
    top: viewport.height - (c.y + c.height) * scale,
    width: c.width * scale,
    height: c.height * scale,
  }
}

/**
 * Canvas pixels (top-left origin) → PDF points.
 * `box` is { left, top, width, height } in canvas pixels.
 */
export function screenToPdf(box, viewport, pageSize) {
  const scale = viewport.scale
  const width = box.width / scale
  const height = box.height / scale
  return {
    x: round2(box.left / scale),
    // Flip back: CSS top+height is the box bottom, measured from the page top.
    y: round2((viewport.height - (box.top + box.height)) / scale),
    width: round2(width),
    height: round2(height),
    pageWidth: pageSize?.width ? round2(pageSize.width) : undefined,
    pageHeight: pageSize?.height ? round2(pageSize.height) : undefined,
  }
}

const round2 = (n) => Math.round(n * 100) / 100
