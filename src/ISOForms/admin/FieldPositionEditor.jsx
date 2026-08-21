import React, { useCallback, useEffect, useRef, useState } from 'react'
import { X, Move, Trash2, ChevronLeft, ChevronRight } from 'lucide-react'
import { loadPdfDocument, renderPageToCanvas } from '../utils/renderPdfPage'
import {
  normalizePdfCoords,
  pdfToScreen,
  screenToPdf,
  DEFAULT_BOX_WIDTH,
  DEFAULT_BOX_HEIGHT,
} from '../utils/pdfCoords'

// ─────────────────────────────────────────────────────────────────────────────
// Field position editor.
//
// Auto-detection can only place a field where it finds a matching label in the
// PDF text, which is why grid cells (the Requisition Form's 8x6 item table has
// no per-cell labels) could never be placed automatically. Here the admin sees
// the real rendered PDF and puts each field box exactly where it belongs.
//
// The canvas is display-only — it exists so the admin can aim. The generated
// PDF is always drawn onto the original bytes, never onto this raster.
// ─────────────────────────────────────────────────────────────────────────────

const RENDER_SCALE = 1.5

// Repeated table rows are named by number ("Item 3 — Description"), so a field
// belongs to a "series" identified by its label with the number blanked out.
// Placing two rows of a column is then enough to derive the row pitch and fill
// the rest — which is what makes an 8-row grid practical to position by hand.
const parseSeries = (label) => {
  const m = String(label || '').match(/^(.*?)(\d+)(.*)$/)
  if (!m) return null
  return { key: `${m[1]}#${m[3]}`, num: Number(m[2]) }
}

function FieldPositionEditor({ pdfBase64, fields, onSave, onClose }) {
  const canvasRef = useRef(null)
  const surfaceRef = useRef(null)
  const dragRef = useRef(null)

  const [pdfDoc, setPdfDoc] = useState(null)
  const [numPages, setNumPages] = useState(0)
  const [pageIndex, setPageIndex] = useState(0)      // 0-indexed, matches pdfCoords.page
  const [view, setView] = useState(null)             // { viewport, pageSize }
  const [localFields, setLocalFields] = useState(() => fields.map(f => ({ ...f })))
  const [selectedId, setSelectedId] = useState(null)
  const [placingId, setPlacingId] = useState(null)
  const [loadError, setLoadError] = useState('')

  // ── Load the PDF once ──────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false
    let doc = null
    ;(async () => {
      try {
        doc = await loadPdfDocument(pdfBase64)
        if (cancelled) { doc.destroy(); return }
        setPdfDoc(doc)
        setNumPages(doc.numPages)
      } catch (err) {
        console.error('Could not open the template PDF:', err)
        if (!cancelled) setLoadError('Could not open the attached PDF. Try re-importing it on the template.')
      }
    })()
    return () => { cancelled = true; if (doc) doc.destroy() }
  }, [pdfBase64])

  // ── Render the current page ────────────────────────────────────────────────
  useEffect(() => {
    if (!pdfDoc || !canvasRef.current) return
    let cancelled = false
    ;(async () => {
      try {
        const result = await renderPageToCanvas(pdfDoc, pageIndex + 1, canvasRef.current, RENDER_SCALE)
        if (!cancelled) setView(result)
      } catch (err) {
        console.error('Page render failed:', err)
      }
    })()
    return () => { cancelled = true }
  }, [pdfDoc, pageIndex])

  const patchCoords = useCallback((fieldId, patch) => {
    setLocalFields(prev => prev.map(f =>
      f.id === fieldId ? { ...f, pdfCoords: { ...(f.pdfCoords || {}), ...patch } } : f))
  }, [])

  // ── Drag / resize ──────────────────────────────────────────────────────────
  useEffect(() => {
    const onMove = (e) => {
      const drag = dragRef.current
      if (!drag || !view) return
      const dx = e.clientX - drag.startX
      const dy = e.clientY - drag.startY

      let box
      if (drag.mode === 'move') {
        box = { ...drag.box, left: drag.box.left + dx, top: drag.box.top + dy }
      } else {
        box = {
          ...drag.box,
          width: Math.max(12, drag.box.width + dx),
          height: Math.max(8, drag.box.height + dy),
        }
      }
      patchCoords(drag.fieldId, { page: pageIndex, ...screenToPdf(box, view.viewport, view.pageSize) })
    }
    const onUp = () => { dragRef.current = null }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
  }, [view, pageIndex, patchCoords])

  const startDrag = (e, field, mode) => {
    e.preventDefault()
    e.stopPropagation()
    const box = pdfToScreen(field.pdfCoords, view.viewport)
    if (!box) return
    setSelectedId(field.id)
    dragRef.current = { fieldId: field.id, mode, startX: e.clientX, startY: e.clientY, box }
  }

  // Click on the page while a field is armed → drop its box there.
  const handleSurfaceClick = (e) => {
    if (!placingId || !view) return
    const rect = surfaceRef.current.getBoundingClientRect()
    const box = {
      left: e.clientX - rect.left,
      top: e.clientY - rect.top,
      width: DEFAULT_BOX_WIDTH * view.viewport.scale,
      height: DEFAULT_BOX_HEIGHT * view.viewport.scale,
    }
    patchCoords(placingId, { page: pageIndex, ...screenToPdf(box, view.viewport, view.pageSize) })
    setSelectedId(placingId)
    setPlacingId(null)
  }

  // Fills the rest of a numbered series from two already-placed rows: the two
  // give the exact row pitch, so the remaining rows land on the real grid
  // lines rather than on a guessed spacing.
  const seriesInfoFor = (field) => {
    const s = field && parseSeries(field.label)
    if (!s) return null
    const siblings = localFields
      .map(f => ({ f, s: parseSeries(f.label) }))
      .filter(x => x.s && x.s.key === s.key)
    const placedSibs = siblings
      .filter(x => normalizePdfCoords(x.f.pdfCoords))
      .sort((a, b) => a.s.num - b.s.num)
    const missing = siblings.filter(x => !normalizePdfCoords(x.f.pdfCoords))
    return { placedSibs, missing }
  }

  const fillSeries = (field) => {
    const info = seriesInfoFor(field)
    if (!info || info.placedSibs.length < 2 || !info.missing.length) return

    const a = info.placedSibs[0]
    const b = info.placedSibs[1]
    const ca = normalizePdfCoords(a.f.pdfCoords)
    const cb = normalizePdfCoords(b.f.pdfCoords)
    const step = (ca.y - cb.y) / (b.s.num - a.s.num)

    setLocalFields(prev => prev.map(f => {
      const target = info.missing.find(m => m.f.id === f.id)
      if (!target) return f
      return {
        ...f,
        pdfCoords: {
          page: ca.page,
          x: ca.x,
          y: ca.y - (target.s.num - a.s.num) * step,
          width: ca.width,
          height: ca.height,
          fontSize: ca.fontSize ?? undefined,
          align: ca.align,
          pageWidth: ca.pageWidth,
          pageHeight: ca.pageHeight,
        },
      }
    }))
  }

  const clearPosition = (fieldId) => {
    setLocalFields(prev => prev.map(f => {
      if (f.id !== fieldId) return f
      const { pdfCoords, ...rest } = f    // eslint-disable-line no-unused-vars
      return rest
    }))
    if (selectedId === fieldId) setSelectedId(null)
  }

  const placed = localFields.filter(f => normalizePdfCoords(f.pdfCoords))
  const unplaced = localFields.filter(f => !normalizePdfCoords(f.pdfCoords))
  const onThisPage = placed.filter(f => normalizePdfCoords(f.pdfCoords).page === pageIndex)
  const selected = localFields.find(f => f.id === selectedId)
  const selectedCoords = selected ? normalizePdfCoords(selected.pdfCoords) : null

  return (
    <div style={S.backdrop}>
      <div style={S.modal}>
        {/* Header */}
        <div style={S.header}>
          <div>
            <div style={{ fontWeight: 800, fontSize: 17, color: '#14141c' }}>Field Positions</div>
            <div style={{ fontSize: 13, color: '#7a7a8c', marginTop: 2 }}>
              Place each field where its value should print on the original PDF.
              {' '}{placed.length} placed · {unplaced.length} unplaced
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <button type="button" className="ghost-btn" onClick={onClose}>Cancel</button>
            <button type="button" className="primary-btn" onClick={() => onSave(localFields)}>Done</button>
            <button type="button" onClick={onClose} style={S.iconBtn}><X size={20} /></button>
          </div>
        </div>

        {loadError && <div style={S.error}>{loadError}</div>}

        <div style={S.body}>
          {/* ── Sidebar ───────────────────────────────────────────────────── */}
          <div style={S.sidebar}>
            {placingId && (
              <div style={S.hint}>
                Click on the page to place <strong>{localFields.find(f => f.id === placingId)?.label}</strong>.
                <button type="button" onClick={() => setPlacingId(null)} style={S.linkBtn}>cancel</button>
              </div>
            )}

            {selected && selectedCoords && (
              <div style={S.panel}>
                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8 }}>{selected.label}</div>
                <label style={S.label}>Font size</label>
                <input
                  type="number" min="5" max="24" step="0.5"
                  value={selectedCoords.fontSize ?? ''}
                  placeholder="Auto"
                  onChange={(e) => {
                    const v = e.target.value
                    patchCoords(selected.id, { fontSize: v === '' ? undefined : Number(v) })
                  }}
                  style={S.input}
                />
                <label style={S.label}>Alignment</label>
                <select
                  value={selectedCoords.align}
                  onChange={(e) => patchCoords(selected.id, { align: e.target.value })}
                  style={S.input}
                >
                  <option value="left">Left</option>
                  <option value="center">Center</option>
                  <option value="right">Right</option>
                </select>
                {(() => {
                  const info = seriesInfoFor(selected)
                  if (!info || !info.missing.length) return null
                  const ready = info.placedSibs.length >= 2
                  return (
                    <div style={S.seriesBox}>
                      {ready ? (
                        <button type="button" onClick={() => fillSeries(selected)} style={S.seriesBtn}>
                          ⇊ Fill remaining {info.missing.length} row(s)
                        </button>
                      ) : (
                        <span>
                          Place this column in <strong>two</strong> rows, then a button appears
                          here to fill the other {info.missing.length} automatically.
                        </span>
                      )}
                    </div>
                  )
                })()}

                <button type="button" onClick={() => clearPosition(selected.id)} style={S.removeBtn}>
                  <Trash2 size={13} /> Remove position
                </button>
              </div>
            )}

            <div style={S.sectionTitle}>Unplaced ({unplaced.length})</div>
            {unplaced.length === 0 && <div style={S.muted}>All fields are placed.</div>}
            {unplaced.map(f => (
              <button
                key={f.id}
                type="button"
                onClick={() => setPlacingId(f.id)}
                style={{ ...S.fieldRow, ...(placingId === f.id ? S.fieldRowActive : null) }}
              >
                <Move size={13} /> <span style={S.ellipsis}>{f.label}</span>
              </button>
            ))}

            <div style={S.sectionTitle}>Placed ({placed.length})</div>
            {placed.map(f => {
              const c = normalizePdfCoords(f.pdfCoords)
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => { setPageIndex(c.page); setSelectedId(f.id) }}
                  style={{ ...S.fieldRow, ...(selectedId === f.id ? S.fieldRowActive : null) }}
                >
                  <span style={S.pageTag}>p{c.page + 1}</span>
                  <span style={S.ellipsis}>{f.label}</span>
                </button>
              )
            })}
          </div>

          {/* ── Page canvas + overlay boxes ───────────────────────────────── */}
          <div style={S.canvasPane}>
            <div style={S.pager}>
              <button
                type="button" style={S.pagerBtn}
                disabled={pageIndex === 0}
                onClick={() => { setPageIndex(p => Math.max(0, p - 1)); setSelectedId(null) }}
              ><ChevronLeft size={16} /></button>
              <span style={{ fontSize: 13, fontWeight: 600 }}>
                Page {pageIndex + 1} of {numPages || '—'}
              </span>
              <button
                type="button" style={S.pagerBtn}
                disabled={pageIndex >= numPages - 1}
                onClick={() => { setPageIndex(p => Math.min(numPages - 1, p + 1)); setSelectedId(null) }}
              ><ChevronRight size={16} /></button>
            </div>

            <div style={S.canvasScroll}>
              <div
                ref={surfaceRef}
                onClick={handleSurfaceClick}
                style={{ ...S.surface, cursor: placingId ? 'crosshair' : 'default' }}
              >
                <canvas ref={canvasRef} style={{ display: 'block' }} />

                {view && onThisPage.map(f => {
                  const box = pdfToScreen(f.pdfCoords, view.viewport)
                  if (!box) return null
                  const isSel = selectedId === f.id
                  return (
                    <div
                      key={f.id}
                      onPointerDown={(e) => startDrag(e, f, 'move')}
                      onClick={(e) => e.stopPropagation()}
                      title={f.label}
                      style={{
                        ...S.box,
                        left: box.left, top: box.top, width: box.width, height: box.height,
                        borderColor: isSel ? '#d7263d' : '#1a73e8',
                        background: isSel ? 'rgba(215,38,61,0.12)' : 'rgba(26,115,232,0.10)',
                        zIndex: isSel ? 3 : 2,
                      }}
                    >
                      <span style={S.boxLabel}>{f.label}</span>
                      <span
                        onPointerDown={(e) => startDrag(e, f, 'resize')}
                        style={{ ...S.handle, background: isSel ? '#d7263d' : '#1a73e8' }}
                      />
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

const S = {
  backdrop: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, padding: 20,
  },
  modal: {
    background: '#fff', borderRadius: 18, width: '100%', maxWidth: 1180,
    height: '92vh', display: 'flex', flexDirection: 'column', overflow: 'hidden',
  },
  header: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '16px 22px', borderBottom: '1px solid #ececf0', flexShrink: 0,
  },
  iconBtn: { background: 'none', border: 'none', cursor: 'pointer', color: '#7a7a8c', display: 'flex' },
  error: { background: '#fdecea', color: '#b42318', padding: '10px 22px', fontSize: 14 },
  body: { display: 'flex', flex: 1, minHeight: 0 },
  sidebar: {
    width: 260, flexShrink: 0, borderRight: '1px solid #ececf0',
    overflowY: 'auto', padding: 14, background: '#fafafb',
  },
  sectionTitle: {
    fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em',
    color: '#8a8a95', margin: '16px 0 8px',
  },
  fieldRow: {
    display: 'flex', alignItems: 'center', gap: 7, width: '100%', textAlign: 'left',
    padding: '7px 9px', marginBottom: 4, borderRadius: 8, cursor: 'pointer',
    border: '1px solid #e4e4ea', background: '#fff', fontSize: 12.5, color: '#33333f',
  },
  fieldRowActive: { borderColor: '#d7263d', background: '#fdecee', color: '#b42318', fontWeight: 600 },
  ellipsis: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  pageTag: {
    fontSize: 10, fontWeight: 700, background: '#eef2f8', color: '#4a6da7',
    borderRadius: 5, padding: '1px 5px', flexShrink: 0,
  },
  muted: { fontSize: 12, color: '#9a9aa6', padding: '2px 4px' },
  hint: {
    background: '#fff6e5', border: '1px solid #f2d9a0', color: '#8a6100',
    borderRadius: 8, padding: '9px 11px', fontSize: 12.5, marginBottom: 12,
  },
  linkBtn: {
    background: 'none', border: 'none', color: '#8a6100', textDecoration: 'underline',
    cursor: 'pointer', padding: 0, marginLeft: 6, fontSize: 12.5,
  },
  panel: { background: '#fff', border: '1px solid #e4e4ea', borderRadius: 10, padding: 12, marginBottom: 12 },
  label: { display: 'block', fontSize: 11, fontWeight: 700, color: '#7a7a8c', margin: '8px 0 4px' },
  input: {
    width: '100%', padding: '6px 8px', borderRadius: 6, border: '1px solid #d8d8e0',
    fontSize: 13, boxSizing: 'border-box',
  },
  seriesBox: {
    marginTop: 12, padding: '9px 10px', borderRadius: 8, fontSize: 11.5,
    background: '#eef4ff', border: '1px solid #c5d8f5', color: '#2c4f86', lineHeight: 1.45,
  },
  seriesBtn: {
    width: '100%', padding: '7px 10px', borderRadius: 7, cursor: 'pointer',
    border: '1px solid #1a73e8', background: '#1a73e8', color: '#fff',
    fontSize: 12, fontWeight: 700,
  },
  removeBtn: {
    display: 'flex', alignItems: 'center', gap: 5, marginTop: 12, padding: '6px 10px',
    borderRadius: 7, border: '1px solid #f5c2c0', background: '#fff', color: '#b42318',
    cursor: 'pointer', fontSize: 12, fontWeight: 600,
  },
  canvasPane: { flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, background: '#eceef2' },
  pager: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14,
    padding: '9px 0', borderBottom: '1px solid #e0e2e8', background: '#fff', flexShrink: 0,
  },
  pagerBtn: {
    display: 'flex', alignItems: 'center', border: '1px solid #d8d8e0', background: '#fff',
    borderRadius: 7, padding: '4px 7px', cursor: 'pointer',
  },
  canvasScroll: { flex: 1, overflow: 'auto', padding: 20, display: 'flex', justifyContent: 'center' },
  surface: {
    position: 'relative', alignSelf: 'flex-start',
    boxShadow: '0 3px 16px rgba(0,0,0,0.18)', background: '#fff',
  },
  box: {
    position: 'absolute', border: '1.5px solid', borderRadius: 2,
    cursor: 'move', boxSizing: 'border-box', overflow: 'visible',
  },
  boxLabel: {
    position: 'absolute', top: -15, left: -1, fontSize: 9, fontWeight: 700,
    color: '#fff', background: 'rgba(20,20,28,0.78)', padding: '1px 4px',
    borderRadius: 3, whiteSpace: 'nowrap', pointerEvents: 'none',
  },
  handle: {
    position: 'absolute', right: -4, bottom: -4, width: 9, height: 9,
    borderRadius: 2, cursor: 'nwse-resize', border: '1px solid #fff',
  },
}

export default FieldPositionEditor
