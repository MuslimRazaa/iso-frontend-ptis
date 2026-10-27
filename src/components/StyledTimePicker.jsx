import React, { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { Clock } from 'lucide-react'

const HOURS = Array.from({ length: 12 }, (_, i) => i + 1)
const MINUTES = Array.from({ length: 60 }, (_, i) => i)
const PERIODS = ['AM', 'PM']
const pad = (n) => String(n).padStart(2, '0')

// "HH:mm" (24-hour, what the native input stores) → { hour: 1-12, minute, period }.
function parse(value) {
  const m = /^(\d{1,2}):(\d{2})/.exec(String(value || '').trim())
  if (!m) return null
  const h = Number(m[1])
  return { hour: h % 12 || 12, minute: Number(m[2]), period: h >= 12 ? 'PM' : 'AM' }
}

function format({ hour, minute, period }) {
  const h = (hour % 12) + (period === 'PM' ? 12 : 0)
  return `${pad(h)}:${pad(minute)}`
}

// A clock-time dropdown that replaces the native <input type="time"> popup, which
// cannot be restyled. Same open-panel look as StyledDatePicker and StyledSelect: white
// card, rounded, shadow, red selected / hover. The value is the plain "HH:mm" (24-hour)
// string the native input used, so callers do not change.
//
// Three columns — hour, minute, AM / PM. Picking any of them sets the time straight
// away (an unset part starts from 12:00 AM), and the panel stays open so all three can
// be chosen; it closes on a click outside.
function StyledTimePicker({ value, onChange, placeholder = 'Select time', disabled, style, panelStyle }) {
  const [open, setOpen] = useState(false)
  const [rect, setRect] = useState(null)
  const wrapperRef = useRef(null)
  const panelRef = useRef(null)
  const current = parse(value)

  const computeRect = useCallback(() => {
    if (!wrapperRef.current) return null
    const r = wrapperRef.current.getBoundingClientRect()
    const margin = 12
    const width = Math.max(r.width, 220)
    const height = panelRef.current?.offsetHeight || 260
    const left = Math.max(margin, Math.min(r.left, window.innerWidth - margin - width))
    const openUpward = window.innerHeight - r.bottom < height + 8 && r.top > height
    const top = openUpward ? Math.max(margin, r.top - height - 4) : r.bottom + 4
    return { top, left, width }
  }, [])

  useLayoutEffect(() => {
    if (open) setRect(computeRect())
  }, [open, computeRect])

  useEffect(() => {
    if (!open) return undefined
    const onDown = (e) => {
      if (wrapperRef.current?.contains(e.target) || panelRef.current?.contains(e.target)) return
      setOpen(false)
    }
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false) }
    const follow = (e) => {
      if (panelRef.current?.contains(e.target)) return
      const r = computeRect()
      if (r && panelRef.current) {
        panelRef.current.style.top = `${r.top}px`
        panelRef.current.style.left = `${r.left}px`
      }
    }
    document.addEventListener('mousedown', onDown, true)
    document.addEventListener('keydown', onKey)
    window.addEventListener('scroll', follow, true)
    window.addEventListener('resize', follow)
    return () => {
      document.removeEventListener('mousedown', onDown, true)
      document.removeEventListener('keydown', onKey)
      window.removeEventListener('scroll', follow, true)
      window.removeEventListener('resize', follow)
    }
  }, [open, computeRect])

  // Bring the chosen hour and minute into view when the panel opens.
  useEffect(() => {
    if (!open || !rect) return
    panelRef.current?.querySelectorAll('[data-active="true"]').forEach(el => el.scrollIntoView({ block: 'center' }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, !!rect])

  const set = (part) => onChange(format({ hour: 12, minute: 0, period: 'AM', ...(current || {}), ...part }))

  const cell = (label, selected, onPick, key) => (
    <div
      key={key ?? label}
      data-active={selected ? 'true' : undefined}
      onMouseDown={(e) => { e.preventDefault(); onPick() }}
      style={{
        textAlign: 'center', padding: '8px 0', fontSize: 13, borderRadius: 8, cursor: 'pointer',
        color: selected ? '#d7263d' : '#14141c', fontWeight: selected ? 700 : 400,
        background: selected ? '#fff5f6' : 'transparent',
      }}
      onMouseEnter={e => { if (!selected) e.currentTarget.style.background = '#fff5f6' }}
      onMouseLeave={e => { if (!selected) e.currentTarget.style.background = 'transparent' }}
    >
      {label}
    </div>
  )

  const column = (title, children) => (
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ textAlign: 'center', fontSize: 11, fontWeight: 700, color: '#9a9aaa', padding: '2px 0 6px' }}>{title}</div>
      <div style={{ maxHeight: 190, overflowY: 'auto', display: 'grid', gap: 2 }}>{children}</div>
    </div>
  )

  const shown = current ? `${current.hour}:${pad(current.minute)} ${current.period}` : ''

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
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: current ? 'inherit' : '#9a9aaa' }}>
          {shown || placeholder}
        </span>
        <Clock size={15} style={{ flexShrink: 0, opacity: 0.6 }} />
      </button>
      {open && !disabled && rect && createPortal(
        <div
          ref={panelRef}
          style={{
            position: 'fixed', top: rect.top, left: rect.left, width: rect.width, zIndex: 10500,
            background: '#fff', border: '1px solid #e0e0e6', borderRadius: 12,
            boxShadow: '0 12px 32px rgba(0,0,0,0.14)', padding: 12, boxSizing: 'border-box',
            ...panelStyle,
          }}
        >
          <div style={{ display: 'flex', gap: 8 }}>
            {column('Hour', HOURS.map(h => cell(pad(h), current?.hour === h, () => set({ hour: h }))))}
            {column('Min', MINUTES.map(m => cell(pad(m), current?.minute === m, () => set({ minute: m }))))}
            {column('', PERIODS.map(p => cell(p, current?.period === p, () => set({ period: p }))))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, paddingTop: 8, borderTop: '1px solid #efeff3' }}>
            <button
              type="button"
              onClick={() => { onChange(''); setOpen(false) }}
              style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 12.5, fontWeight: 600, color: '#7a7a8c', padding: '4px 8px', borderRadius: 6 }}
              onMouseEnter={e => { e.currentTarget.style.background = '#fff5f6'; e.currentTarget.style.color = '#d7263d' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#7a7a8c' }}
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() => {
                const d = new Date()
                onChange(`${pad(d.getHours())}:${pad(d.getMinutes())}`)
                setOpen(false)
              }}
              style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 12.5, fontWeight: 700, color: '#d7263d', padding: '4px 8px', borderRadius: 6 }}
              onMouseEnter={e => { e.currentTarget.style.background = '#fff5f6'; e.currentTarget.style.color = '#d7263d' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#d7263d' }}
            >
              Now
            </button>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}

export default StyledTimePicker
