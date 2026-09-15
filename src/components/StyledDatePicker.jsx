import React, { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react'

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
const MONTH_LABELS = Array.from({ length: 12 }, (_, i) => new Date(2000, i, 1).toLocaleDateString(undefined, { month: 'short' }))
const YEAR_RANGE_PAST = 100
const YEAR_RANGE_FUTURE = 10

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
//
// The header's month and year are each their own button: clicking either
// swaps the day grid for a month grid or a scrollable year list, so jumping
// to "March 1994" doesn't mean clicking the arrow 380 times.
function StyledDatePicker({ value, onChange, min, max, placeholder = 'Select date', disabled, style, panelStyle }) {
  const [open, setOpen] = useState(false)
  const [view, setView] = useState('days') // 'days' | 'months' | 'years'
  const [rect, setRect] = useState(null)
  const selectedDate = toDateOnly(value)
  const minDate = toDateOnly(min)
  const maxDate = toDateOnly(max)
  const [viewDate, setViewDate] = useState(() => selectedDate || minDate || new Date())
  const wrapperRef = useRef(null)
  const panelRef = useRef(null)
  const yearListRef = useRef(null)

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
    setView('days')
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
    // Capture phase, not bubble: a click on a month/year cell changes `view`
    // (swapping that grid out of the DOM) before a bubble-phase listener here
    // would get to check it, so `contains()` sees an already-removed node and
    // closes the picker instead of just switching views. Capture runs first,
    // while the clicked cell is still in the tree.
    document.addEventListener('mousedown', onDocMouseDown, true)
    window.addEventListener('scroll', onScrollOrResize, true)
    window.addEventListener('resize', onScrollOrResize)
    return () => {
      document.removeEventListener('mousedown', onDocMouseDown, true)
      window.removeEventListener('scroll', onScrollOrResize, true)
      window.removeEventListener('resize', onScrollOrResize)
    }
  }, [open, updateRect])

  // Center the year list on the current year the moment it opens, instead of
  // starting the viewer at the oldest year and making them scroll to today.
  useEffect(() => {
    if (view !== 'years' || !yearListRef.current) return
    const el = yearListRef.current
    const activeEl = el.querySelector('[data-active-year="true"]')
    if (activeEl) activeEl.scrollIntoView({ block: 'center' })
  }, [view])

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
  const thisYear = today.getFullYear()
  const years = []
  for (let y = thisYear + YEAR_RANGE_FUTURE; y >= thisYear - YEAR_RANGE_PAST; y--) years.push(y)

  const isMonthDisabled = (m) => {
    if (minDate && (year < minDate.getFullYear() || (year === minDate.getFullYear() && m < minDate.getMonth()))) return true
    if (maxDate && (year > maxDate.getFullYear() || (year === maxDate.getFullYear() && m > maxDate.getMonth()))) return true
    return false
  }
  const isYearDisabled = (y) => (minDate && y < minDate.getFullYear()) || (maxDate && y > maxDate.getFullYear())

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
              onClick={() => {
                if (view === 'days') setViewDate(new Date(year, month - 1, 1))
                else setView('days') // back arrow out of the month/year picker
              }}
              title={view !== 'days' ? 'Back to date' : undefined}
              style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: 4, display: 'flex', color: '#5c5c66' }}
            >
              <ChevronLeft size={16} />
            </button>
            <span style={{ display: 'flex', gap: 4 }}>
              {view === 'days' && (
                <button type="button" onClick={() => setView('months')}
                  style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 14, fontWeight: 700, color: '#14141c', padding: '2px 6px', borderRadius: 6 }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#fff5f6'; e.currentTarget.style.color = '#d7263d' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#14141c' }}
                >
                  {viewDate.toLocaleDateString(undefined, { month: 'long' })}
                </button>
              )}
              {view !== 'days' && (
                <span style={{ fontSize: 14, fontWeight: 700, color: '#14141c', padding: '2px 6px' }}>
                  {view === 'months' ? 'Select month' : 'Select year'}
                </span>
              )}
              {view === 'days' && (
                <button type="button" onClick={() => setView('years')}
                  style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 14, fontWeight: 700, color: '#14141c', padding: '2px 6px', borderRadius: 6 }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#fff5f6'; e.currentTarget.style.color = '#d7263d' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#14141c' }}
                >
                  {year}
                </button>
              )}
            </span>
            <button
              type="button"
              onClick={() => setViewDate(new Date(year, month + 1, 1))}
              style={{
                border: 'none', background: 'transparent', padding: 4, display: 'flex',
                cursor: view === 'days' ? 'pointer' : 'default',
                color: view === 'days' ? '#5c5c66' : 'transparent',
                pointerEvents: view === 'days' ? 'auto' : 'none',
              }}
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {view === 'days' && (
            <div key="days" style={{ animation: 'datePickerViewIn 0.15s ease' }}>
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
            </div>
          )}

          {view === 'months' && (
            <div key="months" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, animation: 'datePickerViewIn 0.15s ease' }}>
              {MONTH_LABELS.map((label, m) => {
                const monthDisabled = isMonthDisabled(m)
                const selected = m === month
                return (
                  <div
                    key={label}
                    onMouseDown={() => { if (monthDisabled) return; setViewDate(new Date(year, m, 1)); setView('days') }}
                    style={{
                      textAlign: 'center', padding: '12px 0', fontSize: 13, borderRadius: 8,
                      cursor: monthDisabled ? 'not-allowed' : 'pointer',
                      color: monthDisabled ? '#c7c7d1' : (selected ? '#d7263d' : '#14141c'),
                      fontWeight: selected ? 700 : 400,
                      background: selected ? '#fff5f6' : 'transparent',
                    }}
                    onMouseEnter={e => { if (!monthDisabled && !selected) e.currentTarget.style.background = '#fff5f6' }}
                    onMouseLeave={e => { if (!selected) e.currentTarget.style.background = 'transparent' }}
                  >
                    {label}
                  </div>
                )
              })}
            </div>
          )}

          {view === 'years' && (
            <div key="years" ref={yearListRef} style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, maxHeight: 220, overflowY: 'auto', animation: 'datePickerViewIn 0.15s ease' }}>
              {years.map((y) => {
                const yearDisabled = isYearDisabled(y)
                const selected = y === year
                return (
                  <div
                    key={y}
                    data-active-year={selected ? 'true' : undefined}
                    onMouseDown={() => { if (yearDisabled) return; setViewDate(new Date(y, month, 1)); setView('months') }}
                    style={{
                      textAlign: 'center', padding: '10px 0', fontSize: 13, borderRadius: 8,
                      cursor: yearDisabled ? 'not-allowed' : 'pointer',
                      color: yearDisabled ? '#c7c7d1' : (selected ? '#d7263d' : '#14141c'),
                      fontWeight: selected ? 700 : 400,
                      background: selected ? '#fff5f6' : 'transparent',
                    }}
                    onMouseEnter={e => { if (!yearDisabled && !selected) e.currentTarget.style.background = '#fff5f6' }}
                    onMouseLeave={e => { if (!selected) e.currentTarget.style.background = 'transparent' }}
                  >
                    {y}
                  </div>
                )
              })}
            </div>
          )}
        </div>,
        document.body
      )}
    </div>
  )
}

export default StyledDatePicker
