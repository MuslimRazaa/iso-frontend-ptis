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
const isTickSized = (b) =>
  b.w >= 5 && b.w <= 18 && b.h >= 5 && b.h <= 18 && Math.abs(b.w - b.h) <= 4

// A box is routinely both stroked and filled, arriving twice.
const dedupeBoxes = (list) => {
  const seen = new Set()
  return list.filter(b => {
    const key = `${Math.round(b.x)},${Math.round(b.y)},${Math.round(b.w)},${Math.round(b.h)}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

/** A path's bounding box in page space, from the [x0,y0,x1,y1] pdfjs reports. */
function pathBounds(minMax, ctm) {
  if (!minMax || minMax.length < 4) return null
  const [ax, ay] = apply(ctm, minMax[0], minMax[1])
  const [bx, by] = apply(ctm, minMax[2], minMax[3])
  const x = Math.min(ax, bx), y = Math.min(ay, by)
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null
  return { x, y, w: Math.abs(bx - ax), h: Math.abs(by - ay) }
}

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
  // A stroked tick box is one path of four straight edges, so pathSegments
  // returns it as four THIN segments and the square itself disappears — which
  // is why forms that stroke their checkboxes ended up with no tick boxes at
  // all. The path's own bounds are kept alongside the segments so such a box
  // is still recognisable as a square.
  const outlines = []

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
      const bounds = pathBounds(args?.[2], ctm)
      if (segs.length) {
        boxes.push(...segs)
        if (bounds) outlines.push(bounds)
        continue
      }
      if (bounds) boxes.push(bounds)
    }
  }

  const hlines = boxes.filter(b => b.h <= 2.5 && b.w >= 10)
  // Verticals matter as much as horizontals: plenty of producers stroke a
  // table as individual lines rather than emitting a rectangle per cell, and
  // without these such a grid has no detectable cells at all.
  const vlines = boxes.filter(b => b.w <= 2.5 && b.h >= 10)
  const drawnRects = boxes.filter(b => b.w > 8 && b.h > 8)

  return {
    hlines,
    vlines,
    squares: dedupeBoxes([...boxes, ...outlines].filter(isTickSized)),
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
      if (x1 - x0 < 10) continue           // narrow tick columns (~14pt) are cells too
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
// How much of a region another must cover before it counts as the same input.
// Well below 1 so a border stroke that overshoots its cell by a point or two
// is still recognised as that cell, and high enough that two genuinely
// different boxes which merely touch both survive.
const COVERED_ENOUGH = 0.7

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
    const printed = inside.map(t => t.text.trim()).join(' ')
    const shouting = /[A-Z]{3}/.test(printed) && printed === printed.toUpperCase() && /\s/.test(printed)
    if (captionAtTop && spare >= LINE * 1.4 && !shouting) {
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

  // Drop a region a bigger one already covers.
  //
  // Containment alone was not enough. A table cell is stroked with a border
  // that pdfjs reports a couple of points wider than the cell itself, so the
  // border came through as a separate "rule" region that stuck out past the
  // cell and escaped every containment test — leaving TWO regions per row of
  // an empty table. Numbered down the column, that is what put the entries of
  // two rows onto one printed row.
  const areaOf = (r) => Math.max(1, r.w * r.h)
  const coveredFraction = (inner, outer) => {
    const ox = Math.min(inner.x + inner.w, outer.x + outer.w) - Math.max(inner.x, outer.x)
    const oy = Math.min(inner.y + inner.h, outer.y + outer.h) - Math.max(inner.y, outer.y)
    if (ox <= 0 || oy <= 0) return 0
    return (ox * oy) / areaOf(inner)
  }
  // Of two regions describing the same input the bigger one is kept; when they
  // are the same size — a rule the producer stroked twice a point apart — the
  // first one is, so exactly one survives either way.
  const losesTo = (r, i, o, j) => (areaOf(o) === areaOf(r) ? j < i : areaOf(o) > areaOf(r))
  return regions.filter((r, i) => !regions.some((o, j) =>
    j !== i && coveredFraction(r, o) >= COVERED_ENOUGH && losesTo(r, i, o, j)))
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

// Column headings that name a point on a rating scale. Deliberately a closed
// list: any table with a few headings and empty rows beneath would otherwise be
// taken for a rating grid. A column like "Score" is not in it, so it is left
// alone while the scale columns beside it are picked up.
const SCALE_WORDS = {
  outstanding: 'Outstanding', excellent: 'Excellent', verygood: 'Very Good', good: 'Good', satisfactory: 'Satisfactory',
  average: 'Average', fair: 'Fair', poor: 'Poor', verypoor: 'Very Poor',
  unsatisfactory: 'Unsatisfactory', na: 'NA', 'n/a': 'N/A',
}
// A producer splits words arbitrarily ("Excel lent"), so spacing is ignored.
const scaleKey = (text) => String(text || '').toLowerCase().replace(/[\s.]/g, '')

/**
 * Finds rating grids: a header line naming the scale ("1 2 3 4 5", or
 * "Excellent / Good / Poor / NA") over rows of empty cells, each row labelled
 * by its question at the left.
 *
 * Nothing in such a grid is printed next to the question — the choices live
 * once, in the header — so label-adjacent option detection cannot see them,
 * and bare numbers are deliberately ignored as row markers elsewhere. Instead
 * the header defines the columns, and each empty cell stacked beneath one is
 * that row's box for that rating.
 *
 * Returns one entry per grid: { top, bottom, columns: [{ label, x, w }],
 * rows: [{ y, h, label, cells }] }, all in page space. `cells` is the row's
 * box for each column, in column order.
 */
export function detectRatingMatrices(rects, textItems) {
  const seen = new Set()
  const boxes = rects.filter(r => {
    const key = `${Math.round(r.x)},${Math.round(r.y)},${Math.round(r.w)},${Math.round(r.h)}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  // Candidate heading text grouped by line.
  const lines = []
  const heading = textItems
    .filter(t => /^[1-9]$/.test(t.text.trim()) || SCALE_WORDS[scaleKey(t.text)])
    .sort((a, b) => b.pdfY - a.pdfY)
  for (const t of heading) {
    const line = lines.find(l => Math.abs(l.y - t.pdfY) <= 3)
    if (line) line.items.push(t)
    else lines.push({ y: t.pdfY, items: [t] })
  }

  const matrices = []
  for (const line of lines) {
    const items = line.items.sort((a, b) => a.x - b.x)

    // Numbered scale: 1..N in order. Worded scale: the scale words, whatever
    // else shares the line.
    let run = []
    const start = items.findIndex(t => t.text.trim() === '1')
    if (start >= 0) {
      run = [items[start]]
      for (let i = start + 1; i < items.length; i++) {
        if (Number(items[i].text) === run.length + 1) run.push(items[i])
        else break
      }
    }
    if (run.length < 3) run = items.filter(t => SCALE_WORDS[scaleKey(t.text)])
    if (run.length < 3) continue

    const headCells = run.map(t => cellContaining(t, boxes))
    if (headCells.some(c => !c)) continue
    if (new Set(headCells.map(c => Math.round(c.x))).size !== run.length) continue

    const columns = run.map((t, i) => ({
      label: /^\d$/.test(t.text.trim()) ? t.text.trim() : SCALE_WORDS[scaleKey(t.text)],
      x: headCells[i].x,
      w: headCells[i].w,
    }))
    const col0 = headCells[0]
    // A data cell belongs to a column when its centre falls under that
    // column's header cell. Edges and widths are not compared: a producer
    // routinely strokes the header cell a few points off the cells under it,
    // and a header can be far wider than the tick boxes beneath.
    const inCol = (b, col) => {
      const mid = b.x + b.w / 2
      return mid >= col.x && mid <= col.x + col.w
    }
    const cellAt = (col, y, h) => boxes.find(b =>
      inCol(b, col) && Math.abs(b.y - y) <= 3 && Math.abs(b.h - h) <= 3)

    const rows = []
    let bottom = col0.y
    const below = boxes
      .filter(b => inCol(b, columns[0]) && b.y + b.h <= col0.y + 3)
      .sort((a, b) => b.y - a.y)
    for (const cell of below) {
      if (bottom - (cell.y + cell.h) > 8) break               // gap: the grid has ended
      if (textInside(cell, textItems).length) break           // printed text: not an input row
      const cells = columns.map(col => cellAt(col, cell.y, cell.h))
      if (cells.some(c => !c)) break
      rows.push({ y: cell.y, h: cell.h, cells })
      bottom = cell.y
    }

    // A row is named by the text to its left. Rows that never get a name at
    // the end of the grid are spare, not questions.
    for (const row of rows) {
      const text = textItems
        .filter(t =>
          t.x + t.width <= columns[0].x + 2 &&
          t.pdfY >= row.y - 1 && t.pdfY <= row.y + row.h + 1 &&
          !ROW_MARKER.test(t.text.trim()))
        .sort((a, b) => b.pdfY - a.pdfY || a.x - b.x)
        .map(t => t.text.trim())
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim()
      row.label = text
    }
    while (rows.length && !rows[rows.length - 1].label) rows.pop()
    rows.forEach((row, i) => { if (!row.label) row.label = `Question ${i + 1}` })
    if (rows.length < 2) continue

    // Columns of the same grid that are written in rather than ticked ("Comments"
    // beside the scale): a heading cell on the scale's line, and an empty cell under
    // it on every row. Each becomes an entry of its row.
    const lastCol = columns[columns.length - 1]
    const extras = boxes
      .filter(b => Math.abs(b.y - col0.y) <= 3 && Math.abs(b.h - col0.h) <= 3 && b.x >= lastCol.x + lastCol.w - 2)
      .sort((a, b) => a.x - b.x)
      .filter((b, i, all) => all.findIndex(o => Math.abs(o.x - b.x) <= 2) === i)
      .map(head => ({
        caption: textInside(head, textItems).map(t => t.text.trim()).join(' ').replace(/\s+/g, ' ').trim(),
        cells: rows.map(row => cellAt({ x: head.x, w: head.w }, row.y, row.h) || null),
      }))
      .filter(e => e.caption && !SCALE_WORDS[scaleKey(e.caption)] && e.cells.every(c => c && !textInside(c, textItems).length))

    matrices.push({ top: col0.y + col0.h, bottom: rows[rows.length - 1].y, columns, rows, extras })
  }
  return matrices
}

/**
 * Finds grids of tick boxes typeset as characters — a header line of numbers
 * ("5 10 15 … 100") with a row of box glyphs under it for every service, as a
 * Wingdings box is in a Word/Excel export. There is no drawn rectangle to find
 * and nothing printed beside each box, so the header number above a glyph is the
 * only thing that says which choice it is.
 *
 * Same result shape as detectRatingMatrices, plus `multi` (a row may have several
 * boxes ticked) and `exact` (each cell is already the box itself).
 */
// A Wingdings box glyph is drawn inside its text item: measured against the
// rendered page, the visible square starts 13% in from the item's left edge,
// sits 3.5% of the item height above the baseline, and is 77% of the width by
// 70% of the height. Marking the whole item box instead put every tick a couple
// of points off its square.
const glyphBox = (t) => {
  const w = t.width || 8, h = t.height || w
  return { x: t.x + w * 0.133, y: t.pdfY + h * 0.035, w: w * 0.77, h: h * 0.7 }
}

const isBoxGlyph = (t) => {
  const s = String(t.text || '').trim()
  return s.length > 0 && s.length <= 2 && !/[A-Za-z0-9]/.test(s) &&
    !/^[ -~]+$/.test(s) && (t.width || 0) > 0 && (t.width || 0) <= 24
}

export function detectGlyphMatrices(textItems) {
  const glyphs = textItems.filter(isBoxGlyph)
  if (glyphs.length < 8) return []

  const lines = []
  for (const t of textItems.filter(t => /^\d{1,3}$/.test(t.text.trim())).sort((a, b) => b.pdfY - a.pdfY)) {
    const line = lines.find(l => Math.abs(l.y - t.pdfY) <= 3)
    if (line) line.items.push(t)
    else lines.push({ y: t.pdfY, items: [t] })
  }

  const median = (xs) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)]
  const matrices = []

  for (const line of lines) {
    const items = line.items.sort((a, b) => a.x - b.x)
    // Runs of strictly increasing numbers: the header is one of them.
    const runs = []
    let run = [items[0]]
    for (const t of items.slice(1)) {
      if (Number(t.text) > Number(run[run.length - 1].text)) run.push(t)
      else { runs.push(run); run = [t] }
    }
    runs.push(run)

    for (const head of runs) {
      if (head.length < 4) continue
      const centres = head.map(t => t.x + (t.width || 0) / 2)
      const pitch = median(centres.slice(1).map((c, i) => c - centres[i]))
      if (!(pitch > 4)) continue

      // Each glyph below the header belongs to the column it is nearest to.
      const col = (g) => {
        const c = g.x + (g.width || 0) / 2
        let best = -1, bestD = pitch * 0.6
        centres.forEach((x, i) => { const d = Math.abs(x - c); if (d < bestD) { best = i; bestD = d } })
        return best
      }
      const below = glyphs
        .filter(g => g.pdfY < line.y - 2 && col(g) >= 0)
        .sort((a, b) => b.pdfY - a.pdfY)
      const bands = []
      for (const g of below) {
        const band = bands.find(b => Math.abs(b.y - g.pdfY) <= 3)
        if (band) band.items.push(g)
        else bands.push({ y: g.pdfY, items: [g] })
      }

      const rows = []
      let prevY = null, rowPitch = null
      for (const band of bands) {
        const byCol = new Map()
        for (const g of band.items) if (!byCol.has(col(g))) byCol.set(col(g), g)
        // A row is only trusted when it has a box under EVERY heading; a partial
        // line is something else (a legend, a stray symbol), so the grid ends.
        if (byCol.size !== head.length) { if (rows.length) break; continue }
        if (prevY !== null) {
          const gap = prevY - band.y
          if (rowPitch === null) rowPitch = gap
          else if (gap > rowPitch * 2.5) break
        }
        prevY = band.y
        const cells = head.map((_, i) => {
          const b = glyphBox(byCol.get(i))
          return { x: b.x, y: b.y, w: b.w, h: b.h }
        })
        rows.push({ y: cells[0].y, h: cells[0].h, base: band.y, cells })
      }
      if (rows.length < 2) continue

      // A row is named by the text in the first column to its left. Later
      // columns ("Every 4,000 to 6,000KM…") describe it and may wrap onto a
      // second line, so the band reaches half a row either side.
      const firstBox = Math.min(...rows.flatMap(r => r.cells.map(c => c.x)))
      const half = (rowPitch || 20) / 2
      const left = textItems.filter(t => t.x + (t.width || 0) <= firstBox + 2 && !ROW_MARKER.test(t.text.trim()) && !isBoxGlyph(t))
      const inRows = left.filter(t => t.pdfY <= rows[0].base + half && t.pdfY >= rows[rows.length - 1].base - half)
      const starts = [...new Set(inRows.map(t => Math.round(t.x)))].sort((a, b) => a - b)
      const second = starts.find(x => x > starts[0] + 40)
      const limit = second !== undefined ? second - 5 : Infinity
      for (const row of rows) {
        row.label = left
          .filter(t => t.x < limit && t.pdfY <= row.base + half && t.pdfY > row.base - half)
          .sort((a, b) => b.pdfY - a.pdfY || a.x - b.x)
          .map(t => t.text.trim()).join(' ').replace(/\s+/g, ' ').trim()
      }
      while (rows.length && !rows[rows.length - 1].label) rows.pop()
      rows.forEach((row, i) => { if (!row.label) row.label = `Row ${i + 1}` })
      if (rows.length < 2) continue

      matrices.push({
        top: line.y + 8,
        bottom: rows[rows.length - 1].base - half + 2,
        columns: head.map((t, i) => ({ label: t.text.trim(), x: centres[i] - pitch / 2, w: pitch })),
        rows,
        multi: true,
        exact: true,
      })
    }
  }
  return matrices
}

/**
 * Finds register tables: a captioned header over rows of EMPTY cells, where every
 * cell is its own entry (an issue log, a schedule, a visitor book).
 *
 * Producers stroke the same cell two or three times a point apart, so the boxes
 * are first collapsed to one per cell. Data rows are the run of equal-height
 * bands, rising from the bottom, whose cells hold nothing (bar a printed
 * "1." in the first column). The header is whatever stacks on top of them,
 * and a caption is the text in that column's header cell — joined to the
 * heading of any wider cell above it ("Risk Matrix" over L, S, R, Nature).
 *
 * Returns { top, bottom, columns: [{ index, x, w, caption }],
 * rows: [{ y, h, number, cells }] } with `cells[i]` null for a column that is
 * printed rather than fillable (the "#" column).
 */
// Words that only ever appear in a PTIS letterhead block.
const LETTERHEAD = /^(title|code|issue|issue date|rev(ision)?|page \d|premier tubular|ptis\b|fm-\d{3}|\d{1,2}-[a-z]{3}-\d{2,4}$)/i

export function detectRegisterTables(rects, textItems) {
  // One box per cell: a box mostly covered by a bigger one is the same cell.
  const sized = rects.filter(r => r.w >= 8 && r.h >= 8 && r.h <= 80)
  const area = (r) => r.w * r.h
  const overlap = (a, b) => {
    const ox = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)
    const oy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y)
    return ox > 0 && oy > 0 ? ox * oy : 0
  }
  const boxes = sized.filter((r, i) => !sized.some((o, j) => {
    if (i === j) return false
    const cover = overlap(r, o) / area(r)
    if (cover < 0.7) return false
    // A shaded band behind a whole row (both tables, the gap between) is not that
    // cell: only a box of about the same size is the same cell drawn again.
    if (area(o) > area(r) * 2.5 && Math.abs(o.w - r.w) > 3) return false
    // A tall box laid over several stacked cells of its own width (a merged span, a
    // frame) is not those cells' duplicate; one stripe inside one cell is.
    if (area(o) > area(r) * 2.5) {
      const under = sized.filter(k => k !== o && Math.abs(k.w - o.w) <= 6 && overlap(k, o) / area(k) >= 0.7).length
      if (under >= 2) return false
    }
    return area(o) > area(r) || (area(o) === area(r) && j < i)
  })).filter((o, _, all) => all.filter(r => r !== o && Math.abs(r.y - o.y) <= 2.5 && Math.abs(r.h - o.h) <= 3 && overlap(r, o) / area(r) >= 0.7).length < 3)
  // (a band laid over a whole row of cells -- shading behind it -- is not a cell itself)

  // Row bands, top of page first.
  const bands = []
  for (const b of [...boxes].sort((a, c) => c.y - a.y || a.x - c.x)) {
    const band = bands.find(r => Math.abs(r.y - b.y) <= 2.5 && Math.abs(r.h - b.h) <= 4)
    if (band) band.cells.push(b)
    else bands.push({ y: b.y, h: b.h, cells: [b] })
  }
  bands.sort((a, b) => b.y - a.y)
  for (const band of bands) band.cells.sort((a, b) => a.x - b.x)
  // Two tables side by side share their row heights, so one band can hold the
  // rows of both. A gap between neighbouring cells is where one table ends; each
  // run of touching cells is a band of its own.
  for (let i = 0; i < bands.length; i++) {
    const cells = bands[i].cells
    const cut = cells.findIndex((c, k) => k > 0 && c.x - (cells[k - 1].x + cells[k - 1].w) > 3)
    if (cut > 0) {
      bands.splice(i + 1, 0, { ...bands[i], cells: cells.slice(cut) })
      bands[i] = { ...bands[i], cells: cells.slice(0, cut) }
    }
  }
  bands.sort((a, b) => b.y - a.y || a.cells[0].x - b.cells[0].x)

  // A small box drawn inside a cell (the tick square of a Yes / No column) is not a
  // row of its own. Left in, the squares made a "row" between every two real rows
  // and broke the table up. They are kept aside as the place a tick goes.
  const insideBox = (inner, outer) => inner !== outer &&
    inner.x >= outer.x - 0.5 && inner.x + inner.w <= outer.x + outer.w + 0.5 &&
    inner.y >= outer.y - 0.5 && inner.y + inner.h <= outer.y + outer.h + 0.5 &&
    inner.w * inner.h < outer.w * outer.h * 0.6
  const nested = new Set()
  for (const band of bands) {
    if (band.cells.every(c => boxes.some(o => insideBox(c, o)))) nested.add(band)
  }
  const tickBoxes = [...nested].flatMap(b => b.cells)
  for (let i = bands.length - 1; i >= 0; i--) if (nested.has(bands[i])) bands.splice(i, 1)

  // A lone box stretched across several rows of a real table (a stray shape drawn over
  // the grid) is not a row, and sitting between two of them it would split the table.
  for (let i = bands.length - 1; i >= 0; i--) {
    const b = bands[i]
    if (b.cells.length !== 1) continue
    const top = b.y + b.h
    const rowsUnder = bands.filter(o => o !== b && o.cells.length >= 4 && o.y >= b.y - 1 && o.y + o.h <= top + 1 &&
      b.cells[0].x < o.cells[o.cells.length - 1].x + o.cells[o.cells.length - 1].w && b.cells[0].x + b.cells[0].w > o.cells[0].x)
    if (rowsUnder.length >= 2) bands.splice(i, 1)
  }

  const emptyBand = (band) => {
    const empty = band.cells.filter(c => !textInside(c, textItems).length)
    // A row may carry printed text in a column or two (a description beside its
    // number); what makes it a data row is a block of empty cells to fill.
    // Two columns will do when every cell is empty (a time | event log): the heading
    // row above it is what makes it a table.
    if (band.cells.length >= 2 && empty.length === band.cells.length) return true
    return band.cells.length >= 4 && empty.length >= 2 && empty.length >= band.cells.length * 0.5
  }

  // Rows of one table need not be the same height (a row that fits two lines of
  // text is taller than its neighbours), so what joins them is that they touch
  // and their cells sit in the same columns. Tables side by side are followed as
  // runs of their own, each ended by a non-row band across its own columns.
  const tables = []
  const runs = []
  const joins = (prev, band) =>
    prev.y - (band.y + band.h) <= 4 && prev.y - (band.y + band.h) >= -2 &&
    band.cells.length === prev.cells.length &&
    band.cells.every((c, i) => Math.abs(c.x - prev.cells[i].x) <= 3 && Math.abs(c.w - prev.cells[i].w) <= 4)
  const spanX = (b) => [b.cells[0].x, b.cells[b.cells.length - 1].x + b.cells[b.cells.length - 1].w]
  const overlapsX = (a, b) => { const [a0, a1] = spanX(a), [b0, b1] = spanX(b); return a0 < b1 && b0 < a1 }
  const close = (run) => {
    runs.splice(runs.indexOf(run), 1)
    if (run.length >= 3) tables.push(run)
  }
  for (const band of bands) {
    const open = runs.find(r => joins(r[r.length - 1], band))
    if (open && emptyBand(band)) { open.push(band); continue }
    for (const r of runs.filter(r => overlapsX(r[r.length - 1], band))) close(r)
    if (emptyBand(band)) runs.push([band])
  }
  for (const r of [...runs]) close(r)
  tables.sort((a, b) => b[0].y - a[0].y || a[0].cells[0].x - b[0].cells[0].x)

  const out = []
  for (const rows of tables) {
    const first = rows[0]
    const cols = first.cells.map(c => ({ x: c.x, w: c.w }))
    const colOf = (c) => {
      const mid = c.x + c.w / 2
      return cols.findIndex(k => mid >= k.x && mid <= k.x + k.w)
    }
    // Every row must have its cells in the same columns.
    if (rows.some(r => r.cells.some(c => colOf(c) < 0))) continue

    // Header: boxes stacked on the data rows, each touching the edge of the
    // header found so far.
    const runTop = first.y + first.h
    const left = cols[0].x - 2, right = cols[cols.length - 1].x + cols[cols.length - 1].w + 2
    const inside = boxes.filter(b => b.x >= left && b.x + b.w <= right && b.y >= runTop - 1.5)

    // A cell over several columns is a group heading ("Risk Matrix" over L, S, R) only
    // when its text is centred over them. The title block a sheet carries above its
    // table ("Title", "Code", "Issue Date" beside their values, the company name) is
    // drawn on the same column grid and touches the header, but its text sits at the
    // left of each cell or spans the whole table — reading it in as part of the
    // header put "Premier Tubular Inspection Services Title Issue" in front of every
    // column's name.
    const colsUnder = (cell) => cols.filter(k => k.x + k.w / 2 >= cell.x && k.x + k.w / 2 <= cell.x + cell.w).length
    const headingLike = (b) => {
      if (b.y <= runTop + 1.5) return true                       // the row of headings right above the data
      const n = colsUnder(b)
      if (n <= 1) return true
      if (n >= cols.length * 0.6) return false                    // a title bar across (nearly) the whole table
      const text = textInside(b, textItems)
      if (!text.length) return false
      const x0 = Math.min(...text.map(t => t.x)), x1 = Math.max(...text.map(t => t.x + (t.width || 0)))
      return Math.abs((x0 + x1) / 2 - (b.x + b.w / 2)) <= b.w * 0.2
    }
    // The boxes that rise past `top`: the next layer of whatever is stacked above.
    const layerAbove = (top, keep) => inside.filter(b => b.y <= top + 1.5 && b.y + b.h > top + 1.5 && keep(b))
    // A layer of mostly empty cells is the rows of another table stacked on this
    // one (a second table drawn directly above), never part of this one's header.
    const rowLike = (layer) => emptyBand({ cells: layer })
    let headerTop = runTop
    for (;;) {
      const layer = layerAbove(headerTop, headingLike)
      if (!layer.length || (headerTop > runTop + 1.5 && rowLike(layer))) break
      headerTop = Math.max(...layer.map(b => b.y + b.h))
    }
    // Everything stacked above the data, title block included: the area no loose field
    // should be read from, even though only the headings count as the table's header.
    // It stops at another table's rows and at a "Label:" cell (Date:, Client Name:),
    // which is a field of the form, not printed letterhead.
    // A title bar drawn a point or two wider than the table still belongs to it.
    const around = boxes.filter(b => b.x >= left - 4 && b.x + b.w <= right + 4 && b.y >= runTop - 1.5)
    let blockTop = headerTop
    // Nothing drawn on top of it: a bare caption printed over the table ("POWER
    // TOOLS/GENERAL EQUIPMENTS") is its title, so the strip just above is its too.
    let openAbove = false
    for (;;) {
      const layer = around.filter(b => b.y <= blockTop + 1.5 && b.y + b.h > blockTop + 1.5)
      if (!layer.length) { openAbove = true; break }
      if (rowLike(layer)) break
      // Only printed matter goes: the letterhead (Title, Code, Issue, the company
      // name, the form code) or a title bar over the table. A layer of the form's own
      // fields ("Main Location", "Client Name:") stops it.
      const words = layer.flatMap(b => textInside(b, textItems)).map(t => t.text.trim())
      const letterhead = words.some(w => LETTERHEAD.test(w))
      const titleBar = layer.every(b => colsUnder(b) >= cols.length * 0.6 && textInside(b, textItems).length)
      if (!letterhead && !titleBar) break
      blockTop = Math.max(...layer.map(b => b.y + b.h))
    }
    // No header of its own: the rest of a table begun on an earlier page. It is
    // returned with no captions, for the caller to match to that table.
    const headerless = headerTop - runTop < 8
    const headerCells = headerless ? [] : inside.filter(b => b.y + b.h <= headerTop + 1.5)

    // Captions: a text line belongs to the smallest header cell holding it. A
    // cell across several columns heads all of them; a cell over one column
    // names it.
    const spans = (cell) => cols.map((k, i) => ({ k, i }))
      .filter(({ k }) => k.x + k.w / 2 >= cell.x && k.x + k.w / 2 <= cell.x + cell.w).map(({ i }) => i)
    const own = cols.map(() => []), group = cols.map(() => [])
    const groupWidth = cols.map(() => [])
    // A column whose header is split into short side-by-side cells directly above
    // the data ("Yes | No" over one wide entry cell) is a choice: each sub-heading
    // is an option, and a tick goes under the one that is picked.
    const choiceCells = new Set()
    const choices = cols.map((k) => {
      const subs = headerCells
        .filter(b => b.y <= runTop + 1.5 && b.w <= k.w * 0.7 && b.x + b.w / 2 >= k.x && b.x + b.w / 2 <= k.x + k.w)
        .filter(b => textInside(b, textItems).length)
        .sort((a, c) => a.x - c.x)
      if (subs.length < 2) return null
      subs.forEach(b => choiceCells.add(b))
      return subs.map(b => ({
        label: textInside(b, textItems).map(t => t.text.trim()).join(' ').replace(/\s+/g, ' ').trim(),
        x: b.x, w: b.w,
      }))
    })
    const headerText = textItems.filter(t => t.pdfY >= runTop - 1 && t.pdfY <= headerTop + 1 &&
      t.x >= left && t.x + (t.width || 0) <= right)
    for (const t of headerText.sort((a, b) => b.pdfY - a.pdfY || a.x - b.x)) {
      const cell = cellContaining(t, headerCells)
      if (!cell || choiceCells.has(cell)) continue
      let cover = spans(cell)
      if (!cover.length) continue
      // A heading over several columns is centred over them. Text that sits to one side
      // inside such a cell (the frame drawn round a block of sub-headings) names the
      // single column under it instead.
      if (cover.length > 1) {
        const mid = t.x + (t.width || 0) / 2
        if (Math.abs(mid - (cell.x + cell.w / 2)) > cell.w * 0.2) {
          const under = cols.map((k, i) => ({ i, k })).filter(({ k }) => mid >= k.x && mid <= k.x + k.w)
          if (under.length === 1) cover = [under[0].i]
        }
      }
      for (const i of cover) (cover.length > 1 ? group : own)[i].push(t.text.trim())
      if (cover.length > 1) for (const i of cover) groupWidth[i].push({ w: cell.w, text: t.text.trim() })
    }
    // A wide grey bar drawn behind several smaller heading cells ("Hardware" over 7
    // columns, "Applications" over 2, both on one bar) reaches the columns of its
    // neighbour too. Each column takes the heading of the narrowest cell over it.
    for (let i = 0; i < cols.length; i++) {
      if (!groupWidth[i].length) continue
      const narrowest = Math.min(...groupWidth[i].map(e => e.w))
      group[i] = groupWidth[i].filter(e => e.w <= narrowest + 1).map(e => e.text)
    }
    const clean = (parts) => parts.join(' ').replace(/\s+/g, ' ').replace(/\/\s+/g, '/').trim()
    const columns = cols.map((k, i) => {
      const g = clean(group[i]), o = clean(own[i])
      return { index: i, x: k.x, w: k.w, caption: [g, o].filter(Boolean).join(' '), group: g, own: o, choices: choices[i] }
    })
    // The same heading over several columns ("Location" x 8) would give every one
    // of them the same name; number them left to right so each stays distinct.
    const seenCaption = new Map()
    for (const c of columns) if (c.caption) seenCaption.set(c.caption, (seenCaption.get(c.caption) || 0) + 1)
    const nth = new Map()
    for (const c of columns) {
      if (c.caption && seenCaption.get(c.caption) > 1) {
        const n = (nth.get(c.caption) || 0) + 1
        nth.set(c.caption, n)
        c.caption = `${c.caption} ${n}`
      }
    }

    // A column is fillable when its cells are empty on (almost) every row.
    const fillable = cols.map((_, i) => rows.filter(r => {
      const c = r.cells.find(cc => colOf(cc) === i)
      return c && !textInside(c, textItems).length
    }).length >= Math.max(2, rows.length * 0.8))

    const numberOf = (r, i) => {
      const c = r.cells.find(cc => colOf(cc) === i)
      const t = c ? textInside(c, textItems)[0] : null
      const m = t && /^\(?(\d{1,3})\s*[.)]?$/.exec(t.text.trim())
      return m ? Number(m[1]) : null
    }
    const numberCol = fillable.findIndex(f => !f)
    const cellText = (r, i) => {
      const c = r.cells.find(cc => colOf(cc) === i)
      return c ? textInside(c, textItems).sort((a, b) => b.pdfY - a.pdfY || a.x - b.x).map(t => t.text.trim()).join(' ').replace(/\s+/g, ' ').trim() : ''
    }
    let lastNumber = 0
    const outRows = rows.map((r, ri) => {
      // A row's printed number, or the one after the row above (blank rows added at
      // the foot of a numbered list carry on from it).
      const number = (numberCol >= 0 && numberOf(r, numberCol)) || (lastNumber ? lastNumber + 1 : ri + 1)
      lastNumber = number
      // What the row is about, as printed in it ("ANGLE GRINDER 4" #1", "Is MSDS
      // available?"), so its entries are named after it rather than "Row 7".
      const printed = cols.map((_, i) => i).filter(i => !fillable[i] && !(i === numberCol && numberOf(r, i)))
      const title = printed.map(i => cellText(r, i)).filter(Boolean).join(' — ')
      return {
        y: r.y, h: r.h,
        // The whole row, printed cells included (its number, its description), so a
        // row nobody filled in can be covered up completely.
        box: (() => {
          const x0 = Math.min(...r.cells.map(c => c.x)), x1 = Math.max(...r.cells.map(c => c.x + c.w))
          const y0 = Math.min(...r.cells.map(c => c.y)), y1 = Math.max(...r.cells.map(c => c.y + c.h))
          return { x: x0, y: y0, width: x1 - x0, height: y1 - y0 }
        })(),
        number,
        title: title ? (numberCol >= 0 && numberOf(r, numberCol) ? number + ". " + title : title) : null,
        // A printed column left blank on this row (the spare rows under a checklist)
        // is written in like any other entry; the number column is not.
        // The tick square drawn inside a cell, where there is one.
        ticks: cols.map((_, i) => {
          const c = r.cells.find(cc => colOf(cc) === i)
          return c ? tickBoxes.find(t => insideBox(t, c)) || null : null
        }),
        cells: cols.map((_, i) => {
          if (fillable[i]) return r.cells.find(cc => colOf(cc) === i)
          if (i === numberCol || cellText(r, i)) return null
          return r.cells.find(cc => colOf(cc) === i) || null
        }),
      }
    })

    // Two rows printed with the same name ("ANGLE GRINDER 7" #2" twice) stay apart.
    const titleCount = new Map()
    for (const r of outRows) if (r.title) titleCount.set(r.title, (titleCount.get(r.title) || 0) + 1)
    const titleSeen = new Map()
    for (const r of outRows) {
      if (!r.title || titleCount.get(r.title) < 2) continue
      const n = (titleSeen.get(r.title) || 0) + 1
      titleSeen.set(r.title, n)
      if (n > 1) r.title = `${r.title} (${n})`
    }

    if (!headerless && !columns.some((c, i) => fillable[i] && c.caption)) continue
    out.push({
      headerless,
      top: headerless ? runTop : headerTop,
      blockTop,
      openAbove,
      bottom: rows[rows.length - 1].y,
      columns: columns.map((c, i) => ({ ...c, fillable: fillable[i] })),
      rows: outRows,
    })
  }
  return out
}

/**
 * Finds a table made of several differently-shaped sections stacked in one
 * frame — a cleaning sheet whose "Daily" rows have 31 day columns, whose
 * "Weekly" row has four week boxes and whose "Monthly" row has one wide box,
 * each under its own heading row and sharing one "Checked by" column.
 *
 * A column grid cannot describe that (the columns change from section to
 * section), so each filled cell is read on its own: its row says WHAT is being
 * done (the task text beside it, under the section's label) and the nearest
 * heading above it that sits over the cell says WHEN or WHICH (a day number, a
 * week, "Checked By").
 *
 * Tables of one uniform shape are left to detectRegisterTables.
 *
 * Returns { top, bottom, entries: [{ label, cell }] }; `cell` is the drawn box.
 */
export function detectSectionedTables(rects, textItems) {
  // One box per cell: a box mostly covered by a bigger one is the same cell.
  const sized = rects.filter(r => r.w >= 8 && r.h >= 8 && r.h <= 90)
  const area = (r) => r.w * r.h
  const overlap = (a, b) => {
    const ox = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)
    const oy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y)
    return ox > 0 && oy > 0 ? ox * oy : 0
  }
  const boxes = sized.filter((r, i) => !sized.some((o, j) => {
    if (i === j) return false
    if (overlap(r, o) / area(r) < 0.7) return false
    return area(o) > area(r) || (area(o) === area(r) && j < i)
  }))

  const bands = []
  for (const b of [...boxes].sort((a, c) => c.y - a.y || a.x - c.x)) {
    const band = bands.find(r => Math.abs(r.y - b.y) <= 2.5 && Math.abs(r.h - b.h) <= 4)
    if (band) band.cells.push(b)
    else bands.push({ y: b.y, h: b.h, cells: [b] })
  }
  bands.sort((a, b) => b.y - a.y)
  for (const band of bands) {
    band.cells.sort((a, b) => a.x - b.x)
    // Cells of one row share its extent; take the band's own.
    band.top = Math.max(...band.cells.map(c => c.y + c.h))
    band.bottom = Math.min(...band.cells.map(c => c.y))
    for (const c of band.cells) c.text = textInside(c, textItems)
  }

  // A data row has cells to fill on the right; a heading row does not — its
  // rightmost cell is printed, or it has more text cells than empty ones.
  for (const band of bands) {
    const texts = band.cells.filter(c => c.text.length).length
    const empties = band.cells.length - texts
    const last = band.cells[band.cells.length - 1]
    band.data = empties >= 2 && empties >= texts && last.text.length === 0
  }

  // Bands that touch form one stack.
  const stacks = []
  for (const band of bands) {
    const stack = stacks[stacks.length - 1]
    const prev = stack && stack[stack.length - 1]
    if (prev && prev.bottom - band.top <= 3 && prev.bottom - band.top >= -3) stack.push(band)
    else stacks.push([band])
  }

  const tables = []
  for (const stack of stacks) {
    const dataBands = stack.filter(b => b.data)
    if (dataBands.length < 2) continue

    // Only a stack that changes shape belongs here.
    const sameShape = (a, b) => a.cells.length === b.cells.length &&
      a.cells.every((c, i) => Math.abs(c.x - b.cells[i].x) <= 3 && Math.abs(c.w - b.cells[i].w) <= 4)
    const separated = stack.some((b, i) => !b.data && i > 0 && i < stack.length - 1 &&
      stack.slice(0, i).some(x => x.data) && stack.slice(i + 1).some(x => x.data))
    if (!separated && dataBands.every(b => sameShape(b, dataBands[0]))) continue

    // Consecutive data rows with no heading between them are one section.
    const sections = []
    for (const band of stack) {
      if (!band.data) { sections.push(null); continue }
      const last = sections[sections.length - 1]
      if (last) last.push(band)
      else sections.push([band])
    }

    const norm = (t) => t.replace(/(\d)\s+(st|nd|rd|th)\b/gi, '$1$2').replace(/\s+/g, ' ').trim()
    const textOf = (items) => norm([...items]
      // A raised "st" / "nd" belongs to the number before it, on the same line.
      .sort((a, b) => Math.abs(b.pdfY - a.pdfY) > 5 ? b.pdfY - a.pdfY : a.x - b.x)
      .map(t => t.text.trim()).join(' '))

    const captionFor = (cell, bandIndex) => {
      const x0 = cell.x - 1, x1 = cell.x + cell.w + 1
      for (let i = bandIndex - 1; i >= 0; i--) {
        const head = stack[i]
        if (head.data) continue
        const items = textItems.filter(t => {
          const cx = t.x + (t.width || 0) / 2
          return cx >= x0 && cx <= x1 && t.pdfY > head.bottom - 1 && t.pdfY < head.top
        })
        if (!items.length) continue
        // Items in one heading cell are one caption; several cells under a
        // wide box make it ambiguous, so it gets none rather than a wrong one.
        const groups = new Map()
        for (const t of items) {
          const home = head.cells.find(c => t.x >= c.x - 2 && t.x + (t.width || 0) <= c.x + c.w + 2) || t
          if (!groups.has(home)) groups.set(home, [])
          groups.get(home).push(t)
        }
        if (groups.size !== 1) return ''
        const text = textOf([...groups.values()][0])
        const digits = head.cells.length ? textItems.filter(t => /^\d{1,2}$/.test(t.text.trim()) &&
          t.pdfY > head.bottom - 1 && t.pdfY < head.top).length : 0
        return /^\d{1,2}$/.test(text) && digits >= 25 ? `Day ${text}` : text
      }
      return ''
    }

    const entriesOut = []
    for (const group of sections) {
      if (!group) continue
      const gTop = Math.max(...group.map(b => b.top)), gBottom = Math.min(...group.map(b => b.bottom))
      for (const band of group) {
        const bi = stack.indexOf(band)
        const textCells = band.cells.filter(c => c.text.length)
        if (!textCells.length) continue
        const taskCell = textCells[textCells.length - 1]
        const entries = band.cells.filter(c => !c.text.length && c.x >= taskCell.x + taskCell.w - 2)
        if (!entries.length) continue

        // The section's own label sits left of the task cell, and a merged label
        // may span rows (and have no cell of its own).
        const labelItems = (lo, hi) => textItems.filter(t =>
          t.x + (t.width || 0) <= taskCell.x + 2 && t.pdfY > lo - 1 && t.pdfY < hi &&
          !ROW_MARKER.test(t.text.trim()))
        // A label of this row's own wins; a merged one is read across the section.
        const own = labelItems(band.bottom, band.top)
        const sectionLabel = textOf(own.length ? own : labelItems(gBottom, gTop))
        const task = textOf(taskCell.text)
        for (const cell of entries) {
          const caption = captionFor(cell, bi)
          const label = [sectionLabel, task, caption].filter(Boolean).join(' — ')
          if (label) entriesOut.push({ label, cell })
        }
      }
    }
    if (!entriesOut.length) continue
    tables.push({
      top: Math.max(...stack.map(b => b.top)),
      bottom: Math.min(...dataBands.map(b => b.bottom)),
      entries: entriesOut,
    })
  }
  return tables
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
  const hits = (squares || []).filter(s =>
    s.x + s.w <= textItem.x + 2 &&
    textItem.x - (s.x + s.w) <= 14 &&
    onTextLine(s, textItem))
  if (!hits.length) return null
  hits.sort((a, b) => b.x - a.x)   // closest to the word
  return hits[0]
}

const onTextLine = (square, textItem) =>
  Math.abs((square.y + square.h / 2) - (textItem.pdfY + 3)) <= 8

/** The tick box drawn immediately after a printed option word, if any. */
export function squareAfterText(textItem, squares) {
  const right = textItem.x + (textItem.width || 0)
  const hits = (squares || []).filter(s =>
    s.x >= right - 2 &&
    s.x - right <= 16 &&
    onTextLine(s, textItem))
  if (!hits.length) return null
  hits.sort((a, b) => a.x - b.x)   // closest to the word
  return hits[0]
}

/**
 * The tick box belonging to a printed option, on whichever side the form draws
 * it.
 *
 * Plenty of forms put the box AFTER the option ("Internal Audit O"), and
 * looking only to the left found nothing for those — so their choice fields
 * had no marks at all and the overlay fell back to writing the selected option
 * text across the form's own printed options. The left side is still tried
 * first, so forms that box their options on the left behave exactly as before.
 */
export function tickBoxNearText(textItem, squares) {
  return squareBeforeText(textItem, squares) || squareAfterText(textItem, squares)
}
