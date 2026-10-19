import React, { useState } from 'react'
import ExpiringCertificatesModal from './ExpiringCertificatesModal'
import { EXPIRY_WINDOW_DAYS } from '../Testing/certificateExpiry'

// The warning bar shown at the top of a dashboard while General/Specific
// certificates are at or near their five-year end. "View all N" opens the full
// list, each with a button that opens that one certificate. `onOpenCertificate` is
// left out for someone who cannot open the Testing module — they still get the
// warning and the list, just no button to go there.
function ExpiringCertificatesBanner({ items, onOpenCertificate }) {
  const [open, setOpen] = useState(false)
  if (!items || items.length === 0) return null

  const expired = items.filter(c => c.daysLeft < 0).length
  const upcoming = items.length - expired
  const plural = items.length === 1

  return (
    <>
      <div
        role="alert"
        style={{
          display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap',
          background: expired ? '#fdecea' : '#fff4e5', border: `1px solid ${expired ? '#f5c2c0' : '#ffd8a8'}`,
          color: expired ? '#8f1d14' : '#8a4b0a', borderRadius: 14, padding: '14px 18px', marginBottom: 18,
        }}
      >
        <span style={{ fontSize: 22, lineHeight: 1 }} aria-hidden="true">⚠️</span>
        <div style={{ flex: 1, minWidth: 240 }}>
          <strong>{items.length} certificate{plural ? '' : 's'} need{plural ? 's' : ''} renewing</strong>
          <div style={{ fontSize: 13, marginTop: 2 }}>
            {[
              expired ? `${expired} already expired` : '',
              upcoming ? `${upcoming} expiring within ${EXPIRY_WINDOW_DAYS} days` : '',
            ].filter(Boolean).join(' · ')}
            . These employees should take the tests again — press View all to see who.
          </div>
        </div>
        <button
          type="button"
          className="ghost-btn"
          onClick={() => setOpen(true)}
          title="See every employee whose certificate is expiring"
        >
          View all {items.length}
        </button>
      </div>
      {open && (
        <ExpiringCertificatesModal
          items={items}
          onClose={() => setOpen(false)}
          onOpenCertificate={onOpenCertificate}
        />
      )}
    </>
  )
}

export default ExpiringCertificatesBanner
