/**
 * Reads a form's actual drawn geometry out of the PDF.
 *
 * Field positions used to be guessed by fuzzy-matching a field's label against
 * the page text. That can't work for anything the label doesn't sit next to —
 * table cells have no per-cell label at all, so every "Item N" field matched
 * the one column header and stacked on top of it.
 *
 * But the form already *draws* everything we need: the rule under
 * "Name of Requestor: ______" is the value box, the little square before
 * "Purchase" is the checkbox, and the item table is a real grid of rectangles.
 * Reading that geometry gives exact positions with no guessing.
 */

const IDENTITY = [1, 0, 0, 1, 0, 0]

const mul = (m, n) => [
  m[0] * n[0] + m[2] * n[1], m[1] * n[0] + m[3] * n[1],
  m[0] * n[2] + m[2] * n[3], m[1] * n[2] + m[3] * n[3],
  m[0] * n[4] + m[2] * n[5] + m[4], m[1] * n[4] + m[3] * n[5] + m[5],
]
const apply = (m, x, y) => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]]

// pdfjs encodes a path as a flat run of [op, x, y, op, x, y, …] where 0 moves,
// 1 draws a line and 4 closes. Curves use other codes whose arity we don't
// need, so a path containing any is left to its bounding box instead.
const P_MOVE = 0, P_LINE = 1, P_CLOSE = 4

/**
 * Axis-aligned segments of a path, as thin boxes in page space.
 *
 * Returns [] for anything containing curves or for paths with no straight
 * runs, letting the caller fall back to the path's bounding box.
 */
function pathSegments(coordsArg, ctm) {
  const raw = Array.isArray(coordsArg) ? coordsArg[0] : coordsArg
  if (!raw) return []
  const n = raw.length ?? Object.keys(raw).length
  if (!n) return []

  const out = []
  let cur = null, start = null
  for (let i = 0; i < n;) {
    const op = raw[i]
    if (op === P_CLOSE) {
      if (cur && start) addSegment(out, cur, start, ctm)
      cur = start
      i += 1
      continue
    }
    if (op !== P_MOVE && op !== P_LINE) return []   // a curve: not our business
    const x = raw[i + 1], y = raw[i + 2]
    if (typeof x !== 'number' || typeof y !== 'number') return []
    const pt = [x, y]
    if (op === P_MOVE) { cur = pt; start = pt }
    else { if (cur) addSegment(out, cur, pt, ctm); cur = pt }
    i += 3
  }
  return out
}

function addSegment(out, a, b, ctm) {
  const [x0, y0] = apply(ctm, a[0], a[1])
  const [x1, y1] = apply(ctm, b[0], b[1])
  if (![x0, y0, x1, y1].every(Number.isFinite)) return
  const dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0)
  // Only horizontal and vertical runs describe form structure.
  if (dx > 1 && dy > 1) return
  if (dx < 1 && dy < 1) return
  out.push({
    x: Math.min(x0, x1),
    y: Math.min(y0, y1),
    w: dx < 1 ? 0.5 : dx,
    h: dy < 1 ? 0.5 : dy,
  })
}

/**
 * Bounding boxes of every path drawn on a page, in PDF user space.
 *
 * The current transform is tracked through save/restore/transform so boxes
 * come back in page coordinates regardless of how the producer nested them.
 */
export async function extractPageGeometry(page, OPS) {
  let ops
  try {
    ops = await page.getOperatorList()
  } catch {
    return { hlines: [], squares: [], rects: [] }
  }

  let ctm = IDENTITY.slice()
  const stack = []
  const boxes = []

  for (let i = 0; i < ops.fnArray.length; i++) {
    const fn = ops.fnArray[i]
    if (fn === OPS.save) stack.push(ctm.slice())
    else if (fn === OPS.restore) ctm = stack.pop() || IDENTITY.slice()
    else if (fn === OPS.transform) ctm = mul(ctm, ops.argsArray[i])
    else if (fn === OPS.constructPath) {
      const args = ops.argsArray[i]
      // Prefer the path's real segments. A producer will happily stroke every
      // separator of a table inside ONE path, and its bounding box is then the
      // whole table — which loses every interior line and merges the columns.
      const segs = pathSegments(args?.[1], ctm)
      if (segs.length) { boxes.push(...segs); continue }

      const mm = args?.[2]
      if (!mm || mm.length < 4) continue
      const [ax, ay] = apply(ctm, mm[0], mm[1])
      const [bx, by] = apply(ctm, mm[2], mm[3])
      const x = Math.min(ax, bx), y = Math.min(ay, by)
      const w = Math.abs(bx - ax), h = Math.abs(by - ay)
      if (!Number.isFinite(x) || !Number.isFinite(y)) continue
      boxes.push({ x, y, w, h })
    }
  }

  const hlines = boxes.filter(b => b.h <= 2.5 && b.w >= 20)
  // Verticals matter as much as horizontals: plenty of producers stroke a
  // table as individual lines rather than emitting a rectangle per cell, and
  // without these such a grid has no detectable cells at all.
  const vlines = boxes.filter(b => b.w <= 2.5 && b.h >= 10)
  const drawnRects = boxes.filter(b => b.w > 16 && b.h > 8)

  return {
    hlines,
    vlines,
    squares: boxes.filter(b =>
      b.w >= 5 && b.w <= 18 && b.h >= 5 && b.h <= 18 && Math.abs(b.w - b.h) <= 4),
    // Cells the producer drew outright, plus those implied by a line grid.
    rects: [...drawnRects, ...cellsFromRules(hlines, vlines)],
  }
}

const GRID_TOL = 3

const clusterValues = (values, tol) => {
  const out = []
  for (const v of [...values].sort((a, b) => a - b)) {
    const last = out[out.length - 1]
    if (last !== undefined && v - last <= tol) continue
    out.push(v)
  }
  return out
}

/**
 * Rebuilds table cells from a grid of stroked lines.
 *
 * A cell exists where two adjacent horizontal rules and two adjacent vertical
 * rules enclose an area, so this pairs up the ruling and emits the rectangles
 * the producer never wrote down. Coverage is checked rather than exact
 * endpoints, because grid lines are routinely drawn in segments.
 */
export function cellsFromRules(hlines, vlines) {
  if (hlines.length < 2 || vlines.length < 2) return []

  const ys = clusterValues(hlines.map(l => l.y), GRID_TOL)
  const xs = clusterValues(vlines.map(l => l.x), GRID_TOL)
  if (ys.length < 2 || xs.length < 2) return []

  const spans = (lines, at, atKey, from, to, startKey, sizeKey) => {
    let covered = 0
    for (const l of lines) {
      if (Math.abs(l[atKey] - at) > GRID_TOL) continue
      const s = l[startKey], e = l[startKey] + l[sizeKey]
      covered += Math.max(0, Math.min(e, to) - Math.max(s, from))
    }
    return covered >= (to - from) * 0.7
  }

  const cells = []
  for (let r = 0; r < ys.length - 1; r++) {
    const y0 = ys[r], y1 = ys[r + 1]
    if (y1 - y0 < 8) continue

    // Only the verticals that actually run down THIS row divide it. Taking
    // every x on the page instead would let a boundary belonging to some other
    // block sit between two real ones, so both halves fail their check and the
    // real cell is never produced — and it keeps merged cells intact.
    const colsHere = xs.filter(x => spans(vlines, x, 'x', y0, y1, 'y', 'h'))

    for (let c = 0; c < colsHere.length - 1; c++) {
      const x0 = colsHere[c], x1 = colsHere[c + 1]
      if (x1 - x0 < 16) continue
      if (spans(hlines, y0, 'y', x0, x1, 'x', 'w') &&
          spans(hlines, y1, 'y', x0, x1, 'x', 'w')) {
        cells.push({ x: x0, y: y0, w: x1 - x0, h: y1 - y0 })
      }
    }
  }
  return cells
}

const ROW_TOL = 3
const COL_TOL = 4

// ─────────────────────────────────────────────────────────────────────────────
// Input-region detection.
//
// Earlier passes tried to recognise particular form *shapes* — a table whose
// rows all share a height, a label with a rule after it — and each new layout
// broke a different assumption. ("Data rows are empty" fails the moment a log
// pre-prints 1., 2., 3. down its first column.)
//
// This works the other way round and asks one question of the page: which
// drawn areas are empty? On a blank form, an empty box IS an input — that is
// what makes it a form. It needs no uniform rows, no complete borders and no
// particular column layout, so it carries across form designs instead of
// having to be taught each one.
// ─────────────────────────────────────────────────────────────────────────────

const LINE = 12

const overlaps1D = (a1, a2, b1, b2) => Math.min(a2, b2) - Math.max(a1, b1)

/** Text whose baseline sits inside a box. */
const textInside = (box, textItems) => textItems.filter(t =>
  t.x + t.width > box.x + 1 &&
  t.x < box.x + box.w - 1 &&
  t.pdfY > box.y - 1 &&
  t.pdfY < box.y + box.h - 1)

/**
 * Drawn boxes reduced to the ones that can hold a value.
 *
 * Duplicate outlines are collapsed, and any box that encloses several others
 * is treated as a frame (a table outline or section border) rather than a
 * field. A box that carries only a caption on its top line still counts: the
 * space beneath the caption is the writable part.
 */
export function detectInputRegions(rects, hlines, textItems) {
  // Collapse borders that were drawn more than once.
  const seen = new Set()
  const boxes = []
  for (const r of rects) {
    const key = `${Math.round(r.x)},${Math.round(r.y)},${Math.round(r.w)},${Math.round(r.h)}`
    if (seen.has(key)) continue
    seen.add(key)
    boxes.push(r)
  }

  const strictlyInside = (inner, outer) =>
    inner !== outer &&
    inner.x >= outer.x - 1 && inner.x + inner.w <= outer.x + outer.w + 1 &&
    inner.y >= outer.y - 1 && inner.y + inner.h <= outer.y + outer.h + 1 &&
    inner.w * inner.h < outer.w * outer.h * 0.92

  const regions = []

  for (const box of boxes) {
    if (box.w < 24 || box.h < 10) continue
    // A frame around other cells is structure, not an input.
    if (boxes.filter(o => strictlyInside(o, box)).length >= 2) continue

    const inside = textInside(box, textItems)

    if (!inside.length) {
      regions.push({ ...box, kind: 'cell' })
      continue
    }

    // Caption on top, space underneath → the space is the input.
    const lowestCaption = Math.min(...inside.map(t => t.pdfY))
    const spare = lowestCaption - box.y
    const captionAtTop = inside.every(t => t.pdfY >= box.y + box.h - LINE * 2.2)
    if (captionAtTop && spare >= LINE * 1.4) {
      regions.push({ x: box.x, y: box.y, w: box.w, h: spare - 2, kind: 'below-caption' })
    }
  }

  // Rules that nothing is written on are inputs too.
  for (const l of hlines) {
    if (l.w < 24) continue
    const onIt = textItems.some(t =>
      overlaps1D(t.x, t.x + t.width, l.x, l.x + l.w) > l.w * 0.4 &&
      t.pdfY > l.y - 2 && t.pdfY < l.y + LINE)
    if (onIt) continue
    // Skip a rule that merely traces the edge of a box we already captured.
    const isEdge = boxes.some(b =>
      Math.abs(b.x - l.x) <= 2 && Math.abs(b.w - l.w) <= 3 &&
      (Math.abs(b.y - l.y) <= 1.5 || Math.abs(b.y + b.h - l.y) <= 1.5))
    if (isEdge) continue
    // And skip one that sits inside a region already found.
    const covered = regions.some(r =>
      l.x >= r.x - 2 && l.x + l.w <= r.x + r.w + 2 && l.y >= r.y - 2 && l.y <= r.y + r.h + 2)
    if (covered) continue
    regions.push({ x: l.x, y: l.y + 1, w: l.w, h: LINE, kind: 'rule' })
  }

  // Drop regions swallowed by a bigger one that was also kept.
  return regions.filter((r, i) => !regions.some((o, j) =>
    j !== i && o.w * o.h > r.w * r.h &&
    r.x >= o.x - 1 && r.x + r.w <= o.x + o.w + 1 &&
    r.y >= o.y - 1 && r.y + r.h <= o.y + o.h + 1))
}

/**
 * Names an input region from the form's own printed text: the caption to its
 * left on the same line, else the column heading above it.
 */
// "1.", "2)", "14" — a row marker in a log's first column. It sits to the left
// of the row's cells but names the row, not the field, so it must not be taken
// as a caption or every column inherits the row number as its label.
const ROW_MARKER = /^\(?\d{1,3}\s*[.)]?$/

export function labelForRegion(region, textItems, { maxLeftGap = 260 } = {}) {
  const left = textItems
    .filter(t =>
      t.x + t.width <= region.x + 2 &&
      region.x - (t.x + t.width) <= maxLeftGap &&
      t.pdfY + LINE > region.y &&
      t.pdfY < region.y + region.h + 2 &&
      !ROW_MARKER.test(t.text.trim()))
    .sort((a, b) => (b.x + b.width) - (a.x + a.width))[0]
  if (left) return { text: left.text, from: 'left' }

  // Column heading above. Headings wrap ("Rev /" over "Issue #"), so take the
  // nearest line plus anything stacked directly on top of it.
  const aboveAll = textItems
    .filter(t =>
      t.pdfY >= region.y + region.h - 2 &&
      !ROW_MARKER.test(t.text.trim()) &&
      overlaps1D(t.x, t.x + t.width, region.x, region.x + region.w) >
        Math.min(t.width, region.w) * 0.35)
    .sort((a, b) => a.pdfY - b.pdfY)
  if (!aboveAll.length) return null

  const base = aboveAll[0]
  const stacked = aboveAll
    .filter(t => t.pdfY <= base.pdfY + LINE * 2.2)
    .sort((a, b) => b.pdfY - a.pdfY || a.x - b.x)
  return {
    text: stacked.map(t => t.text).join(' ').replace(/\s+/g, ' ').trim(),
    from: 'above',
    y: base.pdfY,
  }
}

/**
 * Finds table grids among the page's rectangles.
 *
 * Rectangles are first collapsed into row bands, then consecutive bands that
 * share the same column layout are grouped into one table. Grouping by layout
 * matters: a page usually carries several unrelated boxes (a title block, a
 * free-text frame, the item grid), and treating them as one grid produces
 * nonsense columns.
 *
 * Within a table, bands containing text are the header (they hold the column
 * captions) and the empty bands beneath are the data rows a form is filled in.
 */
export function detectTables(rects, textItems, { minCols = 3, minRows = 2 } = {}) {
  if (!rects.length) return []

  // ── Row bands, top of page first ──────────────────────────────────────────
  const bands = []
  for (const r of [...rects].sort((a, b) => b.y - a.y)) {
    const band = bands.find(b => Math.abs(b.y - r.y) <= ROW_TOL)
    if (band) band.cells.push(r)
    else bands.push({ y: r.y, cells: [r] })
  }
  for (const b of bands) b.height = Math.max(...b.cells.map(c => c.h))

  // ── Group consecutive bands of uniform height into candidate tables ───────
  // Rows are grouped by height rather than by an exact set of column edges:
  // producers routinely omit a shared border on some rows, so requiring every
  // row to declare the identical column set misses real tables entirely.
  const HEIGHT_TOL = 6
  const runs = []
  for (const band of bands) {
    if (band.cells.length < 2) { runs.push(null); continue }   // breaks a run
    const last = runs[runs.length - 1]
    const contiguous = last &&
      Math.abs(band.height - last.height) <= HEIGHT_TOL &&
      Math.abs((last.bands.at(-1).y - band.y) - last.height) <= HEIGHT_TOL * 2
    if (contiguous) last.bands.push(band)
    else runs.push({ height: band.height, bands: [band] })
  }

  const tables = []
  for (const run of runs) {
    if (!run || run.bands.length < minRows) continue

    const all = run.bands.flatMap(b => b.cells)
    const runTop = run.bands[0].y + run.bands[0].height
    const runBottom = run.bands.at(-1).y
    const rightEdge = Math.max(...all.map(c => c.x + c.w))
    const runLeft = Math.min(...all.map(c => c.x))

    const bandHasText = (b) => textItems.some(t =>
      t.pdfY >= b.y - 2 && t.pdfY <= b.y + b.height + 2 &&
      t.x >= runLeft - 4 && t.x <= rightEdge + 4)

    // The caption row is whichever band carries the column headings. Depending
    // on how uniform the row heights are it may have been swept into the run
    // itself, or sit just above it — so look inside first, then above.
    const headerBand =
      run.bands.find(bandHasText) ||
      bands
        .filter(b => !run.bands.includes(b) && b.y >= runTop - ROW_TOL && bandHasText(b))
        .sort((a, b) => a.y - b.y)[0]

    // Columns come from the left edges of the data rows, plus those of the
    // header row: a header often declares a boundary that the empty rows below
    // it leave undrawn, and missing it would merge two columns into one.
    const EDGE_TOL = 6
    const lefts = []
    const addEdge = (x, rowKey, fromHeader) => {
      const hit = lefts.find(l => Math.abs(l.x - x) <= EDGE_TOL)
      if (hit) { hit.rows.add(rowKey); hit.header = hit.header || fromHeader }
      else lefts.push({ x, rows: new Set([rowKey]), header: fromHeader })
    }
    for (const c of [...all].sort((a, b) => a.x - b.x)) addEdge(c.x, c.y, false)
    if (headerBand && !run.bands.includes(headerBand)) {
      for (const c of [...headerBand.cells].sort((a, b) => a.x - b.x)) {
        if (c.x >= runLeft - EDGE_TOL && c.x <= rightEdge) addEdge(c.x, 'header', true)
      }
    }
    lefts.sort((a, b) => a.x - b.x)

    // A column counts if it shows up on a reasonable share of rows — a border
    // that a few rows happen to omit is still a real column.
    const keep = lefts.filter(l =>
      l.header || l.rows.size >= Math.max(2, run.bands.length * 0.25))
    if (keep.length < minCols) continue

    const columns = keep.map((l, i) => {
      // A column runs to the next column's edge, so widths stay correct even
      // when a row's own cell rect spans several columns.
      const next = keep[i + 1]
      const x2 = next ? next.x : rightEdge
      return { index: i, x: l.x, width: x2 - l.x, x2 }
    })

    for (const col of columns) {
      const inHeader = headerBand
        ? textItems.filter(t =>
          t.pdfY >= headerBand.y - 2 && t.pdfY <= headerBand.y + headerBand.height + 2 &&
          t.x >= col.x - 3 && t.x < col.x2 - 2)
        : []
      // Top line first: a caption wrapped as "Sr." above "No:" reads "Sr. No:".
      col.caption = inHeader
        .sort((a, b) => b.pdfY - a.pdfY || a.x - b.x)
        .map(t => t.text).join(' ').trim()
    }
    if (!columns.some(c => c.caption)) continue

    // Rows holding printed text are headers; the empty ones are fillable.
    const dataRows = run.bands
      .filter(b => !textItems.some(t =>
        t.pdfY >= b.y - 1 && t.pdfY <= b.y + b.height + 1 &&
        t.x >= columns[0].x - 4 && t.x <= columns.at(-1).x2 + 4))
      .map(b => ({ y: b.y, height: b.height }))
    if (dataRows.length < minRows) continue

    tables.push({ columns, dataRows, headerRows: [], top: runTop, bottom: runBottom })
  }

  return tables
}

/** Smallest rectangle that encloses a text item — i.e. the cell it sits in. */
export function cellContaining(item, rects) {
  const pad = 2
  const inside = rects.filter(r =>
    item.x >= r.x - pad &&
    item.x + item.width <= r.x + r.w + pad &&
    item.pdfY >= r.y - pad &&
    item.pdfY <= r.y + r.h + pad)
  if (!inside.length) return null
  return inside.reduce((a, b) => (a.w * a.h <= b.w * b.h ? a : b))
}

/** The cell immediately to the right of `cell` on the same row, if any. */
export function cellRightOf(cell, rects, { gapTol = 4 } = {})   {
  const candidates = rects.filter(r => {
    if (r === cell) return false
    if (Math.abs(r.x - (cell.x + cell.w)) > gapTol) return false
    // Must share most of the row's height, so we don't grab a cell from
    // a different band that merely starts at the right x.
    const overlap = Math.min(r.y + r.h, cell.y + cell.h) - Math.max(r.y, cell.y)
    return overlap >= Math.min(r.h, cell.h) * 0.5
  })
  if (!candidates.length) return null
  // Prefer the tightest row match, then the widest usable cell.
  candidates.sort((a, b) => Math.abs(a.h - cell.h) - Math.abs(b.h - cell.h) || b.w - a.w)
  return candidates[0]
}

const LINE_HEIGHT = 12
const MIN_VALUE_WIDTH = 24

/**
 * True when a horizontal line is really a cell edge rather than a fill-in rule.
 * Table borders are horizontal lines too, and mistaking one for a rule puts the
 * value on a cell boundary instead of where it belongs.
 */
const isCellEdge = (line, rects) => rects.some(r =>
  Math.abs(r.x - line.x) <= 2 &&
  Math.abs(r.w - line.w) <= 3 &&
  (Math.abs(r.y - line.y) <= 1.5 || Math.abs((r.y + r.h) - line.y) <= 1.5))

/** A fill-in rule drawn to the right of the label on its own line. */
const ruleAfterLabel = (labelItem, hlines, limitX, rects) => {
  const labelRight = labelItem.x + labelItem.width
  const hit = hlines
    .filter(l => l.x >= labelRight - 2 &&
      l.x + l.w <= limitX + 3 &&
      labelItem.pdfY - l.y >= -3 && labelItem.pdfY - l.y <= 9 &&
      l.w >= MIN_VALUE_WIDTH &&
      !isCellEdge(l, rects))
    .sort((a, b) => a.x - b.x)[0]
  return hit ? { x: hit.x + 1, y: hit.y + 1.5, width: hit.w - 2, height: LINE_HEIGHT } : null
}

/**
 * Where a value belongs, read from what the form actually draws.
 *
 * Forms use a small number of layouts, and each is resolved from geometry
 * rather than guessed:
 *   • label cell with the value cell beside it ("Name: │ ______ ")
 *   • a fill-in rule after the label ("Remarks: ______")
 *   • one tall cell with the label on top and the value written underneath
 *     ("Root Cause: (to be filled in by …)")
 *
 * Order matters: the containing cell is resolved first so that a cell border
 * is never mistaken for a fill-in rule.
 */
export function valueBoxForLabel(labelItem, { rects = [], hlines = [], textItems = [] } = {}) {
  const cell = cellContaining(labelItem, rects)
  const limitX = cell ? cell.x + cell.w : labelItem.pageWidth - 8

  // 1. A fill-in rule on the label's own line always wins: it is the form
  //    author saying "write here", and it is per-line, so it resolves repeated
  //    blocks (three follow-up columns each with their own "Remarks: ___").
  const rule = ruleAfterLabel(labelItem, hlines, limitX, rects)
  if (rule) return rule

  if (!cell) return null

  const labelLine = Math.max(labelItem.height, 10)
  const isTallCell = cell.h > labelLine * 2.2

  // 2. Value cell beside the label cell — the common single-line table row.
  //    Only for single-line cells: in a tall multi-line cell (a follow-up
  //    column, say) the "cell to the right" is the next column, not a value.
  if (!isTallCell) {
    const right = cellRightOf(cell, rects)
    if (right && right.w >= MIN_VALUE_WIDTH) {
      const height = Math.min(right.h - 4, LINE_HEIGHT + 2)
      return { x: right.x + 3, y: right.y + (right.h - height) / 2, width: right.w - 6, height }
    }
  }

  // 3. Captioned box: the label caps a tall cell and the value is written in
  //    the space underneath, stopping at whatever is already printed lower in
  //    the cell (a "Signature: ___" line, typically).
  const labelNearTop = (cell.y + cell.h) - labelItem.pdfY <= labelLine * 2.5
  if (isTallCell && labelNearTop) {
    const below = textItems.filter(t =>
      t.page === labelItem.page &&
      t.x >= cell.x - 2 && t.x <= cell.x + cell.w + 2 &&
      t.pdfY >= cell.y - 2 && t.pdfY < labelItem.pdfY - 4)
    const floor = below.length
      ? Math.max(...below.map(t => t.pdfY)) + labelLine + 3
      : cell.y + 3
    const height = (labelItem.pdfY - 4) - floor
    if (height >= LINE_HEIGHT) {
      return { x: cell.x + 4, y: floor, width: cell.w - 8, height }
    }
  }

  // 4. Remaining space on the label's own line, bounded by the cell.
  const x = labelItem.x + labelItem.width + 6
  const width = cell.x + cell.w - 3 - x
  if (width >= MIN_VALUE_WIDTH) {
    const height = Math.min(cell.h - 4, LINE_HEIGHT + 2)
    return { x, y: labelItem.pdfY - 3, width, height }
  }
  return null
}

/**
 * The rule a label's value should be written on, if the form draws one.
 * Returns the value box (sitting just above the rule), or null.
 */
export function underlineAfterLabel(labelItem, hlines) {
  const labelRight = labelItem.x + labelItem.width
  const baseline = labelItem.pdfY

  const candidates = hlines.filter(l =>
    l.x + l.w > labelRight &&              // extends past the label
    l.x < labelItem.pageWidth &&
    baseline - l.y >= -3 && baseline - l.y <= 9)   // sits on this text line

  if (!candidates.length) return null
  // Nearest rule to the right of the label.
  candidates.sort((a, b) => a.x - b.x)
  const rule = candidates.find(l => l.x >= labelRight - 2) || candidates[0]
  const x = Math.max(rule.x, labelRight + 2)
  const width = rule.x + rule.w - x
  if (width < 20) return null

  return { x, y: rule.y + 1.5, width, height: 12 }
}

/** The tick box drawn immediately before a printed option word, if any. */
export function squareBeforeText(textItem, squares) {
  const hits = squares.filter(s =>
    s.x + s.w <= textItem.x + 2 &&
    textItem.x - (s.x + s.w) <= 14 &&
    Math.abs((s.y + s.h / 2) - (textItem.pdfY + 3)) <= 8)
  if (!hits.length) return null
  hits.sort((a, b) => b.x - a.x)   // closest to the word
  return hits[0]
}
