import React, { useState, useRef, useMemo, useLayoutEffect, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'

// A <select> that's also a text box — type to filter, click (or the list
// stays open) to pick. A plain <select> becomes unusable to scroll through
// once the list runs into the hundreds; this keeps the same value/onChange
// contract but stays searchable as that list grows.
// `options` is the searchable list — plain strings (value === label), or
// {value, label} objects when the two differ (e.g. an employee id with a
// "Name — Department" label) — filtered by label text as the user types.
// `extraOptions` are fixed {value, label} entries (e.g. a sentinel like
// "__UNMATCHED__") that stay pinned below the searchable list and are never
// filtered out by the typed query.
//
// The panel is portaled to <body> and positioned with `fixed` coordinates
// read off the input's own bounding box, so it can never be clipped by a
// scrollable ancestor (a table wrapper, a modal body) — it always draws on
// top instead.
function SearchableSelect({ value, onChange, options, extraOptions, placeholder = 'Type to search…', emptyOptionLabel, emptyOptionValue = '', disabled, required, style }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
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
    const onScrollOrResize = () => updateRect()
    window.addEventListener('scroll', onScrollOrResize, true)
    window.addEventListener('resize', onScrollOrResize)
    return () => {
      window.removeEventListener('scroll', onScrollOrResize, true)
      window.removeEventListener('resize', onScrollOrResize)
    }
  }, [open, updateRect])

  // Normalize plain strings and {value,label} objects to the same shape.
  const normalized = useMemo(() => options.map(o =>
    (o != null && typeof o === 'object') ? { value: o.value, label: o.label } : { value: o, label: String(o) }
  ), [options])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return normalized
    return normalized.filter(o => o.label.toLowerCase().includes(q))
  }, [normalized, query])

  const isEmptySelected = String(value ?? '') === String(emptyOptionValue ?? '')

  const selectedLabel = useMemo(() => {
    if (isEmptySelected) return emptyOptionLabel || ''
    const match = normalized.find(o => String(o.value) === String(value))
      || (extraOptions || []).find(o => String(o.value) === String(value))
    return match ? match.label : String(value)
  }, [value, normalized, extraOptions, isEmptySelected, emptyOptionLabel])

  const pick = (v) => {
    onChange(v)
    setQuery('')
    setOpen(false)
  }

  return (
    <div ref={wrapperRef} style={{ position: 'relative' }}>
      <input
        type="text"
        value={open ? query : selectedLabel}
        placeholder={selectedLabel || placeholder}
        disabled={disabled}
        required={required}
        onChange={(e) => { setQuery(e.target.value); if (!open) setOpen(true) }}
        onFocus={() => { setQuery(''); setOpen(true) }}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        style={style}
      />
      {open && !disabled && rect && createPortal(
        <div
          ref={panelRef}
          style={{
            position: 'fixed', top: rect.top, left: rect.left, width: rect.width, zIndex: 9999,
            background: '#fff', border: '1px solid #e0e0e6', borderRadius: 12,
            boxShadow: '0 12px 32px rgba(0,0,0,0.14)', maxHeight: 240, overflowY: 'auto',
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
          {filtered.length === 0 ? (
            <div style={{ padding: '10px 14px', fontSize: 13, color: '#9a9aaa' }}>No matches</div>
          ) : filtered.map(({ value: v, label }) => (
            <div
              key={v}
              onMouseDown={() => pick(v)}
              style={{
                padding: '10px 14px', cursor: 'pointer', fontSize: 14,
                color: String(v) === String(value) ? '#d7263d' : '#14141c',
                fontWeight: String(v) === String(value) ? 700 : 400,
                background: String(v) === String(value) ? '#fff5f6' : 'transparent',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = '#fff5f6' }}
              onMouseLeave={e => { e.currentTarget.style.background = String(v) === String(value) ? '#fff5f6' : 'transparent' }}
            >{label}</div>
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

export default SearchableSelect
