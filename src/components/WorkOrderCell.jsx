import React from 'react'
import { ChevronDown } from 'lucide-react'

// A work order as it reads in the Job Log table.
//
// Used in the entry's own row, `value` is that row's work order and `count` is how many
// work orders the entry has in all. With several, a small dropdown button sits beside
// the chip; the table then shows the entry's whole row again for each of the others
// (see JobLogDescription), and the button toggles that. Without `count` (history
// lines) every work order is shown as chips.
const chip = {
  display: 'inline-block', padding: '2px 8px', borderRadius: 6,
  background: '#f0f7ff', color: '#2f74bf', fontSize: 12, fontWeight: 700,
}

function WorkOrderCell({ value, count, open, onToggle }) {
  const tags = String(value || '').split(',').map(s => s.trim()).filter(Boolean)
  if (!tags.length) return <span>—</span>
  if (count === undefined) {
    return <span style={{ display: 'inline-flex', gap: 4, flexWrap: 'wrap' }}>{tags.map(t => <span key={t} style={chip}>{t}</span>)}</span>
  }

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
      <span style={chip}>{tags[0]}</span>
      {count > 1 && (
        <button
          type="button"
          onClick={onToggle}
          title={open ? 'Hide the other work orders' : `Show the other ${count - 1} work order${count - 1 === 1 ? '' : 's'}`}
          aria-expanded={!!open}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 2, cursor: 'pointer',
            border: '1px solid #dcdce3', background: open ? '#f4f4f7' : '#fff', color: '#595966',
            borderRadius: 999, padding: '1px 6px 1px 7px', fontSize: 11, fontWeight: 700, lineHeight: 1.4,
          }}
        >
          +{count - 1}
          <ChevronDown size={12} style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s ease' }} />
        </button>
      )}
    </span>
  )
}

export default WorkOrderCell
