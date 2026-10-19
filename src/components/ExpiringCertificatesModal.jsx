import React from 'react'

const pad = (n) => String(n).padStart(2, '0')
const formatDate = (d) => `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()}`

// Every employee whose General/Specific certificate is at or near its five-year
// end, in one list — opened from the warning bar on the admin dashboard.
function ExpiringCertificatesModal({ items, onClose, onOpenCertificate }) {
  const expired = items.filter(e => e.daysLeft < 0).length

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 10050, background: 'rgba(15,23,42,0.6)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Certificates that need renewing"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#fff', color: '#14141c', borderRadius: 18, width: '100%', maxWidth: 680,
          maxHeight: '85vh', display: 'flex', flexDirection: 'column', overflow: 'hidden',
          boxShadow: '0 20px 60px rgba(0,0,0,0.35)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '18px 22px', borderBottom: '1px solid #ececf0' }}>
          <span style={{ fontSize: 24, lineHeight: 1 }} aria-hidden="true">⚠️</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800, fontSize: 17 }}>
              {items.length} certificate{items.length === 1 ? '' : 's'} need{items.length === 1 ? 's' : ''} renewing
            </div>
            <div style={{ fontSize: 13, color: '#7a7a8c', marginTop: 2 }}>
              {expired ? `${expired} already expired. ` : ''}
              These employees should take the General and Specific tests again. A certificate drops off this list as soon as the tests are retaken and passed.
            </div>
          </div>
          <button
            type="button" onClick={onClose} aria-label="Close"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#7a7a8c', fontSize: 22, lineHeight: 1 }}
          >
            ✕
          </button>
        </div>

        <div style={{ overflowY: 'auto', padding: '4px 22px' }}>
          {items.map(e => {
            const late = e.daysLeft < 0
            return (
              <div
                key={`${e.id}|${e.standard}`}
                style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '12px 0', borderBottom: '1px solid #ececf0' }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>
                    {e.name || e.id} <span style={{ fontWeight: 500, color: '#7a7a8c' }}>· ID {e.id}</span>
                  </div>
                  <div style={{ fontSize: 13, color: '#7a7a8c' }}>{e.standard}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0 }}>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: late ? '#b42318' : '#b54708' }}>
                    {late
                      ? `Expired ${-e.daysLeft} day${-e.daysLeft === 1 ? '' : 's'} ago`
                      : e.daysLeft === 0 ? 'Expires today' : `${e.daysLeft} day${e.daysLeft === 1 ? '' : 's'} left`}
                  </div>
                  <div style={{ fontSize: 12, color: '#7a7a8c' }}>Valid until {formatDate(e.expiry)}</div>
                </div>
                {onOpenCertificate && (
                  <button
                    type="button"
                    className="ghost-btn small"
                    onClick={() => onOpenCertificate(e)}
                    title="Open this employee's certificate"
                  >
                    Open certificate
                  </button>
                )}
                </div>
              </div>
            )
          })}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, padding: '14px 22px', borderTop: '1px solid #ececf0' }}>
          <button type="button" className="ghost-btn" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  )
}

export default ExpiringCertificatesModal
