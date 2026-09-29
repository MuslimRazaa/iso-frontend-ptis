import React, { useState, useEffect, useRef, useCallback, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';

// Searchable multi-select (select2-style) — value is a comma-separated
// string. Originally built for JLR's Inspector Name / Inspection Team
// pickers; shared here so any filter that wants "keep adding picks, each one
// a removable tag" gets the exact same component instead of a copy that can
// drift from it.
//
// The dropdown panel is portaled to document.body (position: fixed, tracked
// against the trigger's own bounding rect) rather than absolutely positioned
// inside this component's own DOM position — a plain absolute panel gets
// clipped the moment it sits inside any ancestor with overflow:hidden (a
// filter card, a scrollable panel, …), which cut the last option off inside
// Testing & Certification's filter card. Same technique StyledDatePicker
// already uses for exactly this reason.
function MultiSelect({ value, onChange, options, placeholder = 'Select…', searchPlaceholder = 'Search…', disabled, onAdd }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [rect, setRect] = useState(null)
  const wrapperRef = useRef(null)
  const panelRef = useRef(null)

  const selected = (value || '').split(',').map(s => s.trim()).filter(Boolean)

  const computeRect = useCallback(() => {
    if (!wrapperRef.current) return null
    const r = wrapperRef.current.getBoundingClientRect()
    const margin = 12
    const maxPanelHeight = 260
    const spaceBelow = window.innerHeight - r.bottom
    const openUpward = spaceBelow < maxPanelHeight + 8 && r.top > maxPanelHeight
    const top = openUpward ? Math.max(margin, r.top - maxPanelHeight - 4) : r.bottom + 4
    const left = Math.min(Math.max(margin, r.left), window.innerWidth - margin - r.width)
    return { top, left, width: r.width, maxHeight: openUpward ? Math.min(maxPanelHeight, r.top - 8) : Math.min(maxPanelHeight, window.innerHeight - top - margin) }
  }, [])

  useLayoutEffect(() => {
    if (!open) return
    const r = computeRect()
    if (r) setRect(r)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  useEffect(() => {
    if (!open) return
    const handler = (e) => {
      if (wrapperRef.current?.contains(e.target)) return
      if (panelRef.current?.contains(e.target)) return
      setOpen(false)
    }
    const onScroll = (e) => {
      if (panelRef.current?.contains(e.target)) return
      const r = computeRect()
      if (!r) return
      if (panelRef.current) {
        panelRef.current.style.top = `${r.top}px`
        panelRef.current.style.left = `${r.left}px`
        panelRef.current.style.width = `${r.width}px`
      }
      setRect(r)
    }
    const onResize = () => { const r = computeRect(); if (r) setRect(r) }
    document.addEventListener('mousedown', handler)
    window.addEventListener('scroll', onScroll, true)
    window.addEventListener('resize', onResize)
    return () => {
      document.removeEventListener('mousedown', handler)
      window.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('resize', onResize)
    }
  }, [open, computeRect])

  const commit = (arr) => onChange(arr.join(', '))
  const toggle = (name) =>
    commit(selected.includes(name) ? selected.filter(s => s !== name) : [...selected, name])
  const remove = (name) => commit(selected.filter(s => s !== name))

  const q = query.trim()
  const canAdd = !!onAdd && q.length > 0 && !options.some(o => o.toLowerCase() === q.toLowerCase())
  const doAdd = async () => {
    const added = (onAdd && await onAdd(q)) || q
    if (added && !selected.includes(added)) commit([...selected, added])
    setQuery('')
  }

  const filtered = options.filter(
    o => o.toLowerCase().includes(query.toLowerCase()) || selected.includes(o)
  )

  return (
    <div ref={wrapperRef} style={{ position: 'relative' }}>
      <div
        onClick={() => { if (!disabled) setOpen(o => !o) }}
        style={{
          minHeight: 42, width: '100%', boxSizing: 'border-box',
          display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6,
          padding: selected.length ? '6px 36px 6px 8px' : '0 36px 0 12px',
          border: '1px solid #e0e0e6', borderRadius: 8,
          background: disabled ? '#f4f4f7' : '#ffffff',
          color: disabled ? '#aaa' : '#1f1f27',
          cursor: disabled ? 'not-allowed' : 'pointer',
          position: 'relative', fontSize: 14,
        }}
      >
        {selected.length === 0 && (
          <span style={{ color: '#9a9aaa' }}>{placeholder}</span>
        )}
        {selected.map(name => (
          <span key={name} style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: '#fdf2f3', color: '#d7263d', border: '1px solid #ffd1d8',
            borderRadius: 6, padding: '3px 8px', fontSize: 12.5, fontWeight: 600,
          }}>
            {name}
            {!disabled && (
              <span
                onClick={(e) => { e.stopPropagation(); remove(name) }}
                style={{ cursor: 'pointer', fontWeight: 700, lineHeight: 1 }}
              >×</span>
            )}
          </span>
        ))}
        <span style={{
          position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
          color: '#9a9aaa', fontSize: 11, pointerEvents: 'none',
        }}>▼</span>
      </div>

      {open && !disabled && rect && createPortal(
        <div
          ref={panelRef}
          style={{
            position: 'fixed', top: rect.top, left: rect.left, width: rect.width, zIndex: 10500,
            background: '#fff', border: '1px solid #e0e0e6', borderRadius: 8,
            boxShadow: '0 8px 24px rgba(0,0,0,0.12)', maxHeight: rect.maxHeight, overflowY: 'auto',
          }}
        >
          <div style={{ padding: 8, borderBottom: '1px solid #efeff2', position: 'sticky', top: 0, background: '#fff' }}>
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={searchPlaceholder}
              style={{
                width: '100%', boxSizing: 'border-box', padding: '8px 10px',
                border: '1px solid #e0e0e6', borderRadius: 6, fontSize: 13, outline: 'none',
              }}
            />
          </div>
          {canAdd && (
            <div onClick={doAdd}
              style={{ padding: '9px 14px', cursor: 'pointer', fontSize: 13.5, color: '#d7263d', fontWeight: 600, borderBottom: '1px solid #efeff2' }}>
              + Add "{q}"
            </div>
          )}
          {filtered.length === 0 && !canAdd && (
            <div style={{ padding: '12px 14px', color: '#9a9aaa', fontSize: 13 }}>No matches</div>
          )}
          {filtered.map(name => {
            const isSel = selected.includes(name)
            return (
              <div key={name} onClick={() => toggle(name)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '9px 14px', cursor: 'pointer', fontSize: 13.5,
                  background: isSel ? '#fdf2f3' : '#fff', color: '#1f1f27',
                }}
                onMouseEnter={e => { if (!isSel) e.currentTarget.style.background = '#f7f7f9' }}
                onMouseLeave={e => { if (!isSel) e.currentTarget.style.background = '#fff' }}
              >
                <input type="checkbox" readOnly checked={isSel} style={{ accentColor: '#d7263d' }} />
                {name}
              </div>
            )
          })}
        </div>,
        document.body
      )}
    </div>
  )
}

export default MultiSelect
