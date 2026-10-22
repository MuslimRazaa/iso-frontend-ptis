import React, { useRef, useState } from 'react'

// Work order entry, select2-style: type a number and press Space (or Enter, comma
// or Tab) and it becomes a tag of its own; Backspace on an empty box takes the last
// tag back. Digits only. The value is the tags joined by ", " — the same
// comma-separated string the other multi pickers here use, so it stores in the
// existing work_order column as it is.
//
// A work order already saved in some other form ("WO-1234") is kept as a tag as it
// is rather than being dropped; only what is typed or pasted here is limited to
// numbers.
const toTags = (value) => String(value || '').split(',').map(s => s.trim()).filter(Boolean)

function WorkOrderTagInput({ value, onChange, disabled, placeholder = 'Type a work order no. and press Space' }) {
  const [draft, setDraft] = useState('')
  const inputRef = useRef(null)
  const tags = toTags(value)

  const commit = (list) => onChange(list.join(', '))

  // Adds whatever numbers are in `text` as tags (a paste can carry several).
  const addFrom = (text) => {
    const numbers = String(text || '').split(/\D+/).filter(Boolean)
    if (!numbers.length) return
    const next = [...tags]
    for (const n of numbers) if (!next.includes(n)) next.push(n)
    commit(next)
  }

  const handleChange = (e) => {
    const raw = e.target.value
    // A space, comma or any other separator ends the number being typed.
    if (/[^\d]/.test(raw)) {
      const parts = raw.split(/\D+/)
      const ended = parts.slice(0, -1).join(' ')
      addFrom(ended)
      setDraft((parts[parts.length - 1] || '').replace(/\D/g, ''))
      return
    }
    setDraft(raw)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === 'Tab' || e.key === ',') {
      if (draft) { e.preventDefault(); addFrom(draft); setDraft('') }
      else if (e.key === 'Enter') e.preventDefault()   // do not submit the form with an empty box
    } else if (e.key === 'Backspace' && !draft && tags.length) {
      commit(tags.slice(0, -1))
    }
  }

  const handlePaste = (e) => {
    e.preventDefault()
    addFrom(`${draft} ${e.clipboardData.getData('text')}`)
    setDraft('')
  }

  return (
    <div
      onClick={() => inputRef.current?.focus()}
      style={{
        minHeight: 42, width: '100%', boxSizing: 'border-box',
        display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6,
        padding: tags.length ? '6px 8px' : '0 12px',
        border: '1px solid #e0e0e6', borderRadius: 8,
        background: disabled ? '#f4f4f7' : '#ffffff',
        cursor: disabled ? 'not-allowed' : 'text', fontSize: 14,
      }}
    >
      {tags.map(tag => (
        <span key={tag} style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          background: '#fdf2f3', color: '#d7263d', border: '1px solid #ffd1d8',
          borderRadius: 6, padding: '3px 8px', fontSize: 12.5, fontWeight: 600,
        }}>
          {tag}
          {!disabled && (
            <span
              onClick={(e) => { e.stopPropagation(); commit(tags.filter(t => t !== tag)) }}
              style={{ cursor: 'pointer', fontWeight: 700, lineHeight: 1 }}
              title="Remove"
            >×</span>
          )}
        </span>
      ))}
      <input
        ref={inputRef}
        type="text"
        inputMode="numeric"
        value={draft}
        disabled={disabled}
        placeholder={tags.length ? '' : placeholder}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        // Leaving the box keeps what was typed instead of losing it.
        onBlur={() => { if (draft) { addFrom(draft); setDraft('') } }}
        style={{
          flex: 1, minWidth: 90, border: 'none', outline: 'none', background: 'transparent',
          fontSize: 14, padding: '8px 0', color: '#1f1f27',
        }}
      />
    </div>
  )
}

export default WorkOrderTagInput
