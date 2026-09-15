import React, { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'

// A plain dropdown — click to open, click an option to pick, no typing —
// styled with the same open-panel look used by the searchable dropdowns
// (white card, rounded, shadow, red hover/selected rows). Native <select>
// popups can't be restyled cross-browser at all, so matching that look for
// an ordinary dropdown means replacing the popup with this instead.
//
// The panel is portaled to <body> and positioned with `fixed` coordinates
// read off the trigger's own bounding box, rather than living inside this
// component's DOM position. A dropdown nested in a scrollable table (the
// Certificates / Practical Results rows) would otherwise be clipped by that
// table's own scroll container the moment it tried to open below the row —
// a portal escapes that ancestor entirely, so the panel always draws on top
// instead of being cut off.
function StyledSelect({ value, onChange, options, extraOptions, emptyOptionLabel, emptyOptionValue = '', placeholder = 'Select…', disabled, style, panelStyle }) {
  const [open, setOpen] = useState(false)
  const [rect, setRect] = useState(null)
  const wrapperRef = useRef(null)
  const panelRef = useRef(null)

  const updateRect = useCallback(() => {
    if (!wrapperRef.current) return
    const r = wrapperRef.current.getBoundingClientRect()
    setRect({ top: r.bottom + 4, left: r.left, width: r.width })
  }, [])

  useLayoutEffect(() => {
    if (open) updateRect()
  }, [open, updateRect])

  useEffect(() => {
    if (!open) return
    const onDocMouseDown = (e) => {
      if (wrapperRef.current?.contains(e.target)) return
      if (panelRef.current?.contains(e.target)) return
      setOpen(false)
    }
    // Capture-phase so scrolling inside any ancestor (including the table's
    // own horizontal-scroll wrapper) is caught even though scroll doesn't bubble.
    const onScrollOrResize = () => updateRect()
    document.addEventListener('mousedown', onDocMouseDown)
    window.addEventListener('scroll', onScrollOrResize, true)
    window.addEventListener('resize', onScrollOrResize)
    return () => {
      document.removeEventListener('mousedown', onDocMouseDown)
      window.removeEventListener('scroll', onScrollOrResize, true)
      window.removeEventListener('resize', onScrollOrResize)
    }
  }, [open, updateRect])

  const list = options.map(String)
  const isEmptySelected = String(value ?? '') === String(emptyOptionValue ?? '')

  const selectedLabel = (() => {
    if (isEmptySelected) return emptyOptionLabel || ''
    const extra = (extraOptions || []).find(o => o.value === value)
    return extra ? extra.label : String(value ?? '')
  })()

  const pick = (v) => {
    onChange(v)
    setOpen(false)
  }

  return (
    <div ref={wrapperRef} style={{ position: 'relative' }}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen(o => !o)}
        style={{
          ...style,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
          textAlign: 'left', font: 'inherit',
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {selectedLabel || placeholder}
        </span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
          strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, opacity: 0.6, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s ease' }}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {open && !disabled && rect && createPortal(
        <div
          ref={panelRef}
          style={{
            position: 'fixed', top: rect.top, left: rect.left, width: rect.width, zIndex: 10500,
            background: '#fff', border: '1px solid #e0e0e6', borderRadius: 12,
            boxShadow: '0 12px 32px rgba(0,0,0,0.14)', maxHeight: 240, overflowY: 'auto',
            ...panelStyle,
          }}
        >
          {emptyOptionLabel && (
            <div
              onMouseDown={() => pick(emptyOptionValue)}
              style={{
                padding: '10px 14px', cursor: 'pointer', fontSize: 14, borderBottom: '1px solid #f0f0f3',
                color: isEmptySelected ? '#d7263d' : '#7a7a8c',
                fontWeight: isEmptySelected ? 700 : 400,
                background: isEmptySelected ? '#fff5f6' : 'transparent',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = '#fff5f6' }}
              onMouseLeave={e => { e.currentTarget.style.background = isEmptySelected ? '#fff5f6' : 'transparent' }}
            >{emptyOptionLabel}</div>
          )}
          {list.map(opt => (
            <div
              key={opt}
              onMouseDown={() => pick(opt)}
              style={{
                padding: '10px 14px', cursor: 'pointer', fontSize: 14,
                color: opt === String(value) ? '#d7263d' : '#14141c',
                fontWeight: opt === String(value) ? 700 : 400,
                background: opt === String(value) ? '#fff5f6' : 'transparent',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = '#fff5f6' }}
              onMouseLeave={e => { e.currentTarget.style.background = opt === String(value) ? '#fff5f6' : 'transparent' }}
            >{opt}</div>
          ))}
          {(extraOptions || []).map(({ value: v, label }) => (
            <div
              key={v}
              onMouseDown={() => pick(v)}
              style={{
                padding: '10px 14px', cursor: 'pointer', fontSize: 14, borderTop: '1px solid #f0f0f3',
                color: v === value ? '#d7263d' : '#14141c',
                fontWeight: v === value ? 700 : 400,
                background: v === value ? '#fff5f6' : 'transparent',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = '#fff5f6' }}
              onMouseLeave={e => { e.currentTarget.style.background = v === value ? '#fff5f6' : 'transparent' }}
            >{label}</div>
          ))}
        </div>,
        document.body
      )}
    </div>
  )
}

export default StyledSelect
