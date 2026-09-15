import React, { useEffect, useRef, useState } from 'react'
import { Info } from 'lucide-react'

// Small "i" icon that shows `text` in a floating popover on hover or click,
// closing on outside click. Used to surface a reason/note without cluttering
// the cell it sits next to.
export default function InfoTooltip({ text }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  if (!text) return null

  return (
    <span
      ref={ref}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onClick={(e) => { e.stopPropagation(); setOpen(o => !o) }}
      style={{ position: 'relative', display: 'inline-flex', marginLeft: 6, cursor: 'pointer', verticalAlign: 'middle' }}
    >
      <Info size={14} color="#d7263d" />
      {open && (
        <span style={{
          position: 'absolute', bottom: 'calc(100% + 6px)', left: '50%', transform: 'translateX(-50%)',
          background: '#1f1f27', color: '#fff', fontSize: 12, fontWeight: 500, lineHeight: 1.4,
          padding: '8px 10px', borderRadius: 6, whiteSpace: 'pre-line', minWidth: 180, maxWidth: 280,
          boxShadow: '0 8px 24px rgba(0,0,0,0.25)', zIndex: 100, textAlign: 'left',
        }}>
          {text}
        </span>
      )}
    </span>
  )
}
