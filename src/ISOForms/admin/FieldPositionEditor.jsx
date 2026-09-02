import React, { useCallback, useEffect, useRef, useState } from 'react'
import { X, Move, Trash2, ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { loadPdfDocument, renderPageToCanvas } from '../utils/renderPdfPage'
import {
  normalizePdfCoords,
  pdfToScreen,
  screenToPdf,
  DEFAULT_BOX_WIDTH,
  DEFAULT_BOX_HEIGHT,
} from '../utils/pdfCoords'
import { FIELD_TYPES, OWNERS, blankField, hasOptions } from '../utils/fieldTypes'
import { detectOptionMarksOnPage } from '../utils/parsePdf'

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

// Side of a hand-placed tick box, in PDF points — about the size of the tick
// boxes forms actually draw.
const OPTION_MARK_SIZE = 12

// Repeated table rows are named by number ("Item 3 — Description"), so a field
// belongs to a "series" identified by its label with the number blanked out.
// Placing two rows of a column is then enough to derive the row pitch and fill
// the rest — which is what makes an 8-row grid practical to position by hand.
const parseSeries = (label) => {
  const m = String(label || '').match(/^(.*?)(\d+)(.*)$/)
  if (!m) return null
  return { key: `${m[1]}#${m[3]}`, num: Number(m[2]) }
}

const round2 = (n) => Math.round(n * 100) / 100

// A number input that keeps its own text while focused. Binding straight to the
// stored value makes the box unclearable — an empty string parses to 0 and is
// written back the moment the admin deletes the last digit — so typed edits are
// committed as they parse and the field re-syncs on blur.
function NumInput({ value, onCommit, min, step = 1 }) {
  const [text, setText] = useState(value == null ? '' : String(value))
  const [focused, setFocused] = useState(false)
  const [synced, setSynced] = useState(value)

  // Re-sync from the stored value only while the box is idle: dragging the field
  // must update these numbers, but not overwrite a half-typed one.
  if (!focused && value !== synced) {
    setSynced(value)
    setText(value == null ? '' : String(value))
  }

  return (
    <input
      type="number"
      min={min}
      step={step}
      value={text}
      onFocus={() => setFocused(true)}
      onBlur={() => { setFocused(false); setText(value == null ? '' : String(value)) }}
      onChange={(e) => {
        const raw = e.target.value
        setText(raw)
        const n = Number(raw)
        if (raw !== '' && Number.isFinite(n)) onCommit(n)
      }}
      style={S.input}
    />
  )
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
  const [draft, setDraft] = useState(null)          // new-field form, null = closed
  const [placingOption, setPlacingOption] = useState(null)   // { fieldId, label }
  const [markNote, setMarkNote] = useState('')
  const [autoNote, setAutoNote] = useState('')
  const autoDetectedRef = useRef(false)
  // Fields born in this editor: only those may be deleted outright here, since
  // removing one that came from the template would be a silent template edit.
  const [createdIds, setCreatedIds] = useState(() => new Set())

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

  // ── Option ticks (choice fields) ───────────────────────────────────────────
  // A selected choice is ticked on the form's own printed option rather than
  // written out, so a choice field needs a position per option. Import-time
  // detection finds most of them, but a template imported before that worked —
  // or a form whose options it cannot see — needs fixing without re-importing
  // and losing every hand-made position, which is what these controls are for.
  const optionsOf = (field) =>
    String(field?.options || '').split(',').map(o => o.trim()).filter(Boolean)
  const marksOf = (field) =>
    Array.isArray(field?.pdfCoords?.optionMarks) ? field.pdfCoords.optionMarks : []
  const markFor = (field, label) =>
    marksOf(field).find(m => String(m.label).trim().toLowerCase() === label.trim().toLowerCase())

  const detectMarks = async (field) => {
    if (!pdfDoc) return
    const page = Number.isFinite(field.pdfCoords?.page) ? field.pdfCoords.page : pageIndex
    setMarkNote('Looking for this form’s tick boxes…')
    try {
      const found = await detectOptionMarksOnPage(await pdfDoc.getPage(page + 1), field, page)
      if (!found?.length) {
        setMarkNote('No tick boxes found for these options on this page. Place them by hand below.')
        return
      }
      patchCoords(field.id, { page, optionMarks: found })
      setMarkNote(`Found ${found.length} of ${optionsOf(field).length} option(s).`)
    } catch (err) {
      console.error('Option tick detection failed:', err)
      setMarkNote('Could not read the PDF to find tick boxes.')
    }
  }

  // Opening the editor fills in tick positions for any choice field that has
  // none. A template imported before the detection could read its form would
  // otherwise need every option placed by hand, or a re-import that throws away
  // all the positions already set. Nothing is written until the admin saves.
  useEffect(() => {
    if (!pdfDoc || autoDetectedRef.current) return
    autoDetectedRef.current = true
    let cancelled = false
    ;(async () => {
      const targets = localFields.filter(f =>
        hasOptions(f.type) && optionsOf(f).length >= 2 && marksOf(f).length === 0)
      let found = 0
      for (const field of targets) {
        const page = Number.isFinite(field.pdfCoords?.page) ? field.pdfCoords.page : 0
        try {
          const marks = await detectOptionMarksOnPage(await pdfDoc.getPage(page + 1), field, page)
          if (cancelled) return
          if (marks?.length) { patchCoords(field.id, { page, optionMarks: marks }); found++ }
        } catch { /* leave this one to be placed by hand */ }
      }
      if (!cancelled && found) {
        setAutoNote(`Found tick positions for ${found} choice field(s). Save to keep them.`)
      }
    })()
    return () => { cancelled = true }
    // Runs once per opened PDF; the ref keeps a field patch from re-triggering it.
  }, [pdfDoc])   // eslint-disable-line react-hooks/exhaustive-deps

  const placeOptionMark = (field, label, box) => {
    const rest = marksOf(field).filter(m => String(m.label).trim().toLowerCase() !== label.trim().toLowerCase())
    patchCoords(field.id, {
      page: Number.isFinite(field.pdfCoords?.page) ? field.pdfCoords.page : pageIndex,
      optionMarks: [...rest, { label, box }],
    })
  }

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
    if (!view) return
    const rect = surfaceRef.current.getBoundingClientRect()

    // An armed option tick lands as a small box centred on the click, so the
    // admin aims at the form's own checkbox rather than at a corner.
    if (placingOption) {
      const field = localFields.find(f => f.id === placingOption.fieldId)
      if (field) {
        const size = OPTION_MARK_SIZE * view.viewport.scale
        const box = screenToPdf({
          left: e.clientX - rect.left - size / 2,
          top: e.clientY - rect.top - size / 2,
          width: size,
          height: size,
        }, view.viewport, view.pageSize)
        placeOptionMark(field, placingOption.label, {
          x: box.x, y: box.y, width: box.width, height: box.height,
        })
      }
      setPlacingOption(null)
      setMarkNote('')
      return
    }

    if (!placingId) return
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

  // ── New fields ─────────────────────────────────────────────────────────────
  const addDraftField = () => {
    const label = draft.label.trim()
    if (!label) return
    const field = { ...blankField(), ...draft, label }
    setLocalFields(prev => [...prev, field])
    setCreatedIds(prev => new Set(prev).add(field.id))
    setDraft(null)
    setSelectedId(field.id)
    setPlacingId(field.id)          // arm it: next click on the page drops its box
  }

  const deleteField = (fieldId) => {
    setLocalFields(prev => prev.filter(f => f.id !== fieldId))
    setCreatedIds(prev => { const next = new Set(prev); next.delete(fieldId); return next })
    if (selectedId === fieldId) setSelectedId(null)
    if (placingId === fieldId) setPlacingId(null)
  }

  // ── Typed geometry ─────────────────────────────────────────────────────────
  // Legacy anchor records carry no box extents, and normalizePdfCoords rebuilds
  // those defaults whenever either extent is missing — so a typed edit always
  // writes the whole box, or the value would be recomputed away on next read.
  const setGeometry = (field, coords, patch) => {
    patchCoords(field.id, {
      page: coords.page,
      x: coords.x, y: coords.y,
      width: coords.width, height: coords.height,
      ...patch,
    })
  }

  // Growing a box moves its PDF-space y, because y is the BOTTOM edge while the
  // resize handle (and the admin's eye) holds the top edge still.
  const heightPatch = (coords, height) => ({
    height: round2(height),
    y: round2(coords.y + coords.height - height),
  })

  // Equalising by hand is the whole reason typed sizes exist, so the size of the
  // selected box can be pushed onto every other placed field in one go.
  const applySizeToAllPlaced = (withWidth) => {
    if (!selectedCoords) return
    const { width, height } = selectedCoords
    setLocalFields(prev => prev.map(f => {
      const c = normalizePdfCoords(f.pdfCoords)
      if (!c) return f
      return {
        ...f,
        pdfCoords: {
          ...f.pdfCoords,
          page: c.page,
          x: c.x,
          width: withWidth ? width : c.width,
          ...heightPatch(c, height),
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
            {draft ? (
              <div style={S.panel}>
                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8 }}>New field</div>

                <label style={S.label}>Label</label>
                <input
                  type="text"
                  autoFocus
                  value={draft.label}
                  placeholder="e.g. Department"
                  onChange={(e) => setDraft(d => ({ ...d, label: e.target.value }))}
                  onKeyDown={(e) => { if (e.key === 'Enter') addDraftField() }}
                  style={S.input}
                />

                <label style={S.label}>Type</label>
                <select
                  value={draft.type}
                  onChange={(e) => setDraft(d => ({ ...d, type: e.target.value }))}
                  style={S.input}
                >
                  {FIELD_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>

                {hasOptions(draft.type) && (
                  <>
                    <label style={S.label}>Options</label>
                    <input
                      type="text"
                      value={draft.options}
                      placeholder="Hardware, Software, Network"
                      onChange={(e) => setDraft(d => ({ ...d, options: e.target.value }))}
                      style={S.input}
                    />
                  </>
                )}

                <label style={S.label}>Filled by</label>
                <select
                  value={draft.owner}
                  onChange={(e) => setDraft(d => ({ ...d, owner: e.target.value }))}
                  style={S.input}
                >
                  {OWNERS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>

                <label style={{ ...S.label, display: 'flex', alignItems: 'center', gap: 6, textTransform: 'none' }}>
                  <input
                    type="checkbox"
                    checked={draft.required}
                    onChange={(e) => setDraft(d => ({ ...d, required: e.target.checked }))}
                  />
                  Required
                </label>

                <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                  <button
                    type="button"
                    onClick={addDraftField}
                    disabled={!draft.label.trim()}
                    style={{ ...S.seriesBtn, opacity: draft.label.trim() ? 1 : 0.5 }}
                  >
                    Add &amp; place
                  </button>
                  <button type="button" onClick={() => setDraft(null)} style={S.smallGhostBtn}>Cancel</button>
                </div>
              </div>
            ) : (
              <button type="button" onClick={() => setDraft(blankField())} style={S.addBtn}>
                <Plus size={14} /> Add Field
              </button>
            )}

            {autoNote && (
              <div style={S.hint}>
                {autoNote}
                <button type="button" onClick={() => setAutoNote('')} style={S.linkBtn}>dismiss</button>
              </div>
            )}

            {placingId && (
              <div style={S.hint}>
                Click on the page to place <strong>{localFields.find(f => f.id === placingId)?.label}</strong>.
                <button type="button" onClick={() => setPlacingId(null)} style={S.linkBtn}>cancel</button>
              </div>
            )}

            {selected && hasOptions(selected.type) && (
              <div style={S.panel}>
                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4 }}>
                  Tick positions — {selected.label}
                </div>
                <div style={S.muted}>
                  A chosen option is ticked on the form's own printed choice, so each
                  option needs its own spot.
                </div>
                <div style={{ display: 'flex', gap: 6, margin: '8px 0' }}>
                  <button type="button" onClick={() => detectMarks(selected)} style={S.smallGhostBtn}>
                    Find on the form
                  </button>
                  {marksOf(selected).length > 0 && (
                    <button
                      type="button"
                      onClick={() => { patchCoords(selected.id, { optionMarks: [] }); setMarkNote('') }}
                      style={S.smallGhostBtn}
                    >
                      Clear all
                    </button>
                  )}
                </div>
                {markNote && <div style={{ ...S.muted, marginBottom: 6 }}>{markNote}</div>}
                {optionsOf(selected).map(opt => {
                  const mark = markFor(selected, opt)
                  const arming = placingOption?.fieldId === selected.id && placingOption?.label === opt
                  return (
                    <button
                      key={opt}
                      type="button"
                      title={mark ? 'Click to re-place this tick' : 'Click, then click the form'}
                      onClick={() => {
                        setPlacingOption(arming ? null : { fieldId: selected.id, label: opt })
                        setMarkNote(arming ? '' : `Click where "${opt}" is ticked on the form.`)
                      }}
                      style={{ ...S.fieldRow, ...(arming ? S.fieldRowActive : null) }}
                    >
                      <span style={{ width: 14, color: mark ? '#1a7f37' : '#9a9aa8' }}>
                        {mark ? '✓' : '•'}
                      </span>
                      <span style={S.ellipsis}>{opt}</span>
                    </button>
                  )
                })}
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

                <label style={S.label}>Box size &amp; position (pt)</label>
                <div style={S.geomGrid}>
                  <div>
                    <span style={S.geomTag}>Width</span>
                    <NumInput
                      value={round2(selectedCoords.width)}
                      min={1} step={1}
                      onCommit={(n) => setGeometry(selected, selectedCoords, { width: round2(Math.max(1, n)) })}
                    />
                  </div>
                  <div>
                    <span style={S.geomTag}>Height</span>
                    <NumInput
                      value={round2(selectedCoords.height)}
                      min={1} step={1}
                      onCommit={(n) => setGeometry(selected, selectedCoords, heightPatch(selectedCoords, Math.max(1, n)))}
                    />
                  </div>
                  <div>
                    <span style={S.geomTag}>X</span>
                    <NumInput
                      value={round2(selectedCoords.x)}
                      step={1}
                      onCommit={(n) => setGeometry(selected, selectedCoords, { x: round2(n) })}
                    />
                  </div>
                  <div>
                    <span style={S.geomTag}>Y (from bottom)</span>
                    <NumInput
                      value={round2(selectedCoords.y)}
                      step={1}
                      onCommit={(n) => setGeometry(selected, selectedCoords, { y: round2(n) })}
                    />
                  </div>
                </div>

                {placed.length > 1 && (
                  <div style={S.applyBox}>
                    <div style={{ marginBottom: 6 }}>Apply this box to all {placed.length} placed fields:</div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button type="button" onClick={() => applySizeToAllPlaced(false)} style={S.smallGhostBtn}>
                        Height only
                      </button>
                      <button type="button" onClick={() => applySizeToAllPlaced(true)} style={S.smallGhostBtn}>
                        Height + width
                      </button>
                    </div>
                  </div>
                )}
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
                {createdIds.has(selected.id) && (
                  <button type="button" onClick={() => deleteField(selected.id)} style={S.removeBtn}>
                    <Trash2 size={13} /> Delete field
                  </button>
                )}
              </div>
            )}

            <div style={S.sectionTitle}>Unplaced ({unplaced.length})</div>
            {unplaced.length === 0 && <div style={S.muted}>All fields are placed.</div>}
            {unplaced.map(f => (
              <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <button
                  type="button"
                  onClick={() => { setSelectedId(f.id); setPlacingId(f.id) }}
                  style={{ ...S.fieldRow, minWidth: 0, ...(placingId === f.id ? S.fieldRowActive : null) }}
                >
                  <Move size={13} /> <span style={S.ellipsis}>{f.label}</span>
                </button>
                {/* Only fields added here can be taken back here — see createdIds. */}
                {createdIds.has(f.id) && (
                  <button
                    type="button"
                    title="Delete field"
                    onClick={() => deleteField(f.id)}
                    style={S.rowDeleteBtn}
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
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
                style={{ ...S.surface, cursor: (placingId || placingOption) ? 'crosshair' : 'default' }}
              >
                <canvas ref={canvasRef} style={{ display: 'block' }} />

                {/* Tick boxes of the selected choice field, so their aim is visible. */}
                {view && selected && hasOptions(selected.type) && marksOf(selected).map((m, i) => {
                  if (!m.box) return null
                  const box = pdfToScreen(m.box, view.viewport)
                  if (!box) return null
                  return (
                    <div
                      key={`${m.label}-${i}`}
                      title={m.label}
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        position: 'absolute',
                        left: box.left, top: box.top, width: box.width, height: box.height,
                        border: '2px solid #1a7f37',
                        background: 'rgba(26,127,55,0.18)',
                        borderRadius: 3,
                        zIndex: 4,
                      }}
                    />
                  )
                })}

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
  addBtn: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
    width: '100%', padding: '8px 10px', marginBottom: 12, borderRadius: 8,
    border: '1px dashed #b8c6dd', background: '#fff', color: '#2c4f86',
    cursor: 'pointer', fontSize: 12.5, fontWeight: 700,
  },
  smallGhostBtn: {
    padding: '7px 10px', borderRadius: 7, border: '1px solid #d8d8e0',
    background: '#fff', color: '#4a4a58', cursor: 'pointer', fontSize: 12, fontWeight: 600,
  },
  rowDeleteBtn: {
    display: 'flex', alignItems: 'center', flexShrink: 0, marginBottom: 4,
    padding: '6px 7px', borderRadius: 7, border: '1px solid #f5c2c0',
    background: '#fff', color: '#b42318', cursor: 'pointer',
  },
  geomGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 },
  geomTag: { display: 'block', fontSize: 10, color: '#9a9aa6', marginBottom: 2 },
  applyBox: {
    marginTop: 12, padding: '9px 10px', borderRadius: 8, fontSize: 11.5,
    background: '#f5f6f9', border: '1px solid #e0e2e8', color: '#4a4a58', lineHeight: 1.45,
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
