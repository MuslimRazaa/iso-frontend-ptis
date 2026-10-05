import React from 'react'

// The one "Clear Filter" button style used by every filter bar in the app.
// Each page used to hand-roll its own copy (padding, border-radius, hover
// color and even whether hover changed anything at all all drifted from
// page to page) — this is the single source of truth instead, so it can
// never drift again. Hidden until there's actually something to clear.
function ClearFilterButton({ visible = true, onClick }) {
  if (!visible) return null
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        background: 'transparent',
        border: '1px solid #dcdce3',
        color: '#595966',
        padding: '10px 20px',
        borderRadius: 999,
        fontSize: 14,
        fontWeight: 600,
        cursor: 'pointer',
        whiteSpace: 'nowrap',
        flexShrink: 0,
        transition: 'all 0.2s ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = '#d7263d'
        e.currentTarget.style.color = '#d7263d'
        e.currentTarget.style.transform = 'translateY(-2px)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = '#dcdce3'
        e.currentTarget.style.color = '#595966'
        e.currentTarget.style.transform = 'translateY(0)'
      }}
    >
      Clear Filter
    </button>
  )
}

export default ClearFilterButton
