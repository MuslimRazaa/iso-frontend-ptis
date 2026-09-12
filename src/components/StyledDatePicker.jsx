import React, { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react'

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

function toDateOnly(str) {
  if (!str) return null
  const [y, m, d] = str.split('-').map(Number)
  if (!y || !m || !d) return null
  return new Date(y, m - 1, d)
}

function toIsoDate(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function isSameDay(a, b) {
  return !!a && !!b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

// A calendar dropdown replacing the native <input type="date"> popup — styled
// with the same open-panel look as StyledSelect (white card, rounded, shadow,
// red hover/selected). Native date popups can't be restyled cross-browser at
// all, so matching that look means replacing the popup with this instead.
// Keeps the same value/onChange contract as the native input: value and the
// picked date are both plain 'YYYY-MM-DD' strings, so callers don't change.
function StyledDatePicker({ value, onChange, min, max, placeholder = 'Select date', disabled, style, panelStyle }) {
  const [open, setOpen] = useState(false)
  const [rect, setRect] = useState(null)
  const selectedDate = toDateOnly(value)
  const minDate = toDateOnly(min)
  const maxDate = toDateOnly(max)
  const [viewDate, setViewDate] = useState(() => selectedDate || minDate || new Date())
  const wrapperRef = useRef(null)
  const panelRef = useRef(null)

  const updateRect = useCallback(() => {
    if (!wrapperRef.current) return
    const r = wrapperRef.current.getBoundingClientRect()
    const margin = 24
    const panelWidth = Math.max(r.width, 260)
    // Anchoring the panel to the trigger's left edge clips it against the
    // viewport for any trigger sitting near the right edge (the date filters
    // at the end of a filter row) — pull it left just enough to stay on screen.
    const left = Math.min(r.left, window.innerWidth - margin - panelWidth)
    setRect({ top: r.bottom + 4, left: Math.max(margin, left), width: panelWidth })
  }, [])

  useLayoutEffect(() => {
    if (!open) return
    setViewDate(selectedDate || minDate || new Date())
    updateRect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  useEffect(() => {
    if (!open) return
    const onDocMouseDown = (e) => {
      if (wrapperRef.current?.contains(e.target)) return
      if (panelRef.current?.contains(e.target)) return
      setOpen(false)
    }
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

  const pick = (date) => {
    onChange(toIsoDate(date))
    setOpen(false)
  }

  const isDisabledDay = (date) => (minDate && date < minDate) || (maxDate && date > maxDate)

  const year = viewDate.getFullYear()
  const month = viewDate.getMonth()
  const firstOfMonth = new Date(year, month, 1)
  const startOffset = firstOfMonth.getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells = []
  for (let i = 0; i < startOffset; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d))

  const today = new Date()

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
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: selectedDate ? 'inherit' : '#9a9aaa' }}>
          {selectedDate ? selectedDate.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' }) : placeholder}
        </span>
        <CalendarIcon size={15} style={{ flexShrink: 0, opacity: 0.6 }} />
      </button>
      {open && !disabled && rect && createPortal(
        <div
          ref={panelRef}
          style={{
            position: 'fixed', top: rect.top, left: rect.left, minWidth: rect.width, zIndex: 9999,
            background: '#fff', border: '1px solid #e0e0e6', borderRadius: 12,
            boxShadow: '0 12px 32px rgba(0,0,0,0.14)', padding: 12,
            ...panelStyle,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <button
              type="button"
              onClick={() => setViewDate(new Date(year, month - 1, 1))}
              style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: 4, display: 'flex', color: '#5c5c66' }}
            >
              <ChevronLeft size={16} />
            </button>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#14141c' }}>
              {viewDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
            </span>
            <button
              type="button"
              onClick={() => setViewDate(new Date(year, month + 1, 1))}
              style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: 4, display: 'flex', color: '#5c5c66' }}
            >
              <ChevronRight size={16} />
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 4 }}>
            {WEEKDAYS.map(w => (
              <div key={w} style={{ textAlign: 'center', fontSize: 11, fontWeight: 700, color: '#9a9aaa', padding: '4px 0' }}>{w}</div>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
            {cells.map((date, i) => {
              if (!date) return <div key={i} />
              const dayDisabled = isDisabledDay(date)
              const selected = isSameDay(date, selectedDate)
              const isToday = isSameDay(date, today)
              return (
                <div
                  key={i}
                  onMouseDown={() => !dayDisabled && pick(date)}
                  style={{
                    textAlign: 'center', padding: '8px 0', fontSize: 13, borderRadius: 8,
                    cursor: dayDisabled ? 'not-allowed' : 'pointer',
                    color: dayDisabled ? '#c7c7d1' : (selected ? '#d7263d' : '#14141c'),
                    fontWeight: selected || isToday ? 700 : 400,
                    background: selected ? '#fff5f6' : 'transparent',
                    border: isToday && !selected ? '1px solid #d7263d' : '1px solid transparent',
                    boxSizing: 'border-box',
                  }}
                  onMouseEnter={e => { if (!dayDisabled && !selected) e.currentTarget.style.background = '#fff5f6' }}
                  onMouseLeave={e => { if (!selected) e.currentTarget.style.background = 'transparent' }}
                >
                  {date.getDate()}
                </div>
              )
            })}
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}

export default StyledDatePicker
