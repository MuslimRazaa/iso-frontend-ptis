import React, { useEffect, useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { API_ENDPOINTS } from '../../config/api'
import { getCurrentEmployeeId } from '../utils/currentEmployee'
import { getOfflineEntries } from '../utils/offlineStore'

const STATUS_COLORS = {
  pending:  { bg: '#fff7e6', color: '#b54708' },
  approved: { bg: '#e7f6ec', color: '#1a7f4e' },
  rejected: { bg: '#fdecea', color: '#b42318' },
}

const StatusBadge = ({ status }) => {
  const s = STATUS_COLORS[status] || STATUS_COLORS.pending
  return (
    <span style={{
      display: 'inline-block', padding: '4px 12px', borderRadius: 999,
      fontSize: 12, fontWeight: 700, textTransform: 'capitalize',
      background: s.bg, color: s.color,
    }}>{status || 'pending'}</span>
  )
}

function FormEntriesList() {
  const location = useLocation()
  const isUserSide = location.pathname.startsWith('/user')
  const base = isUserSide ? '/user/iso-forms' : '/iso-forms'

  const searchParams = new URLSearchParams(location.search)
  const pendingMine = searchParams.get('filter') === 'pending-mine'

  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [offline, setOffline] = useState(false)
  const [myEmployeeId, setMyEmployeeId] = useState(null)

  const [statusFilter, setStatusFilter] = useState(pendingMine ? 'pending' : '')
  const [onlyMine, setOnlyMine] = useState(pendingMine)

  useEffect(() => { getCurrentEmployeeId().then(setMyEmployeeId) }, [])

  useEffect(() => {
    const params = new URLSearchParams()
    if (statusFilter) params.set('status', statusFilter)
    if (onlyMine && myEmployeeId) params.set('relatedEmployeeId', myEmployeeId)

    fetch(`${API_ENDPOINTS.ISO_FORMS_ENTRIES}?${params.toString()}`)
      .then(res => (res.ok ? res.json() : Promise.reject()))
      .then(json => {
        const rows = json?.data ?? json
        if (!Array.isArray(rows)) throw new Error('bad response')
        setEntries(rows)
        setOffline(false)
        setError('')
      })
      .catch(() => {
        // No backend yet — read submissions from the local demo store and apply the same filters client-side.
        let rows = getOfflineEntries()
        if (statusFilter) rows = rows.filter(e => (e.status || 'pending') === statusFilter)
        if (onlyMine && myEmployeeId) rows = rows.filter(e => String(e.related_employee_id) === String(myEmployeeId))
        setEntries(rows)
        setOffline(true)
        setError('')
      })
      .finally(() => setLoading(false))
  }, [statusFilter, onlyMine, myEmployeeId])

  const rows = useMemo(() => entries, [entries])

  return (
    <div style={{ padding: 'clamp(24px, 4vw, 48px)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 16, marginBottom: 24 }}>
        <div>
          <p className="eyebrow" style={{ margin: 0 }}>ISO Forms</p>
          <h1 style={{ margin: '4px 0 0', fontSize: 26, fontWeight: 800, color: '#14141c' }}>
            {pendingMine ? 'Pending Approvals' : 'All Forms'}
          </h1>
        </div>
        {!pendingMine && (
          <Link to={`${base}/new`} style={{ textDecoration: 'none' }}>
            <button className="primary-btn">+ New Form</button>
          </Link>
        )}
      </div>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          style={{ padding: '10px 14px', border: '2px solid #e0e0e6', borderRadius: 12, fontSize: 14, cursor: 'pointer' }}
        >
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: '#595966' }}>
          <input type="checkbox" checked={onlyMine} onChange={e => setOnlyMine(e.target.checked)} />
          Only forms related to me
        </label>
      </div>

      {offline && (
        <div style={{ background: '#fff7e6', border: '1px solid #ffe1a8', color: '#92660a', borderRadius: 12, padding: '12px 16px', marginBottom: 20, fontSize: 14 }}>
          Demo mode — showing forms saved in this browser since the backend isn't connected yet.
        </div>
      )}
      {error && (
        <div style={{ background: '#fdecea', border: '1px solid #f5c2c0', color: '#b42318', borderRadius: 12, padding: '12px 16px', marginBottom: 20, fontSize: 14 }}>
          {error}
        </div>
      )}

      <article className="panel" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#7a7a8c' }}>Loading forms…</div>
        ) : rows.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#7a7a8c' }}>No forms found for this filter.</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#fafafb' }}>
                <th style={{ textAlign: 'left', padding: '14px 20px', fontSize: 12, color: '#7a7a8c', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Form</th>
                <th style={{ textAlign: 'left', padding: '14px 20px', fontSize: 12, color: '#7a7a8c', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Created By</th>
                <th style={{ textAlign: 'left', padding: '14px 20px', fontSize: 12, color: '#7a7a8c', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Related To</th>
                <th style={{ textAlign: 'left', padding: '14px 20px', fontSize: 12, color: '#7a7a8c', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Status</th>
                <th style={{ textAlign: 'left', padding: '14px 20px', fontSize: 12, color: '#7a7a8c', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Submitted</th>
                <th style={{ textAlign: 'right', padding: '14px 20px', fontSize: 12, color: '#7a7a8c', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(entry => (
                <tr key={entry.id} style={{ borderTop: '1px solid #ececf0' }}>
                  <td style={{ padding: '16px 20px', fontWeight: 700, color: '#14141c' }}>{entry.template_name || `Template #${entry.template_id}`}</td>
                  <td style={{ padding: '16px 20px', color: '#595966' }}>{entry.created_by_name || entry.created_by || '—'}</td>
                  <td style={{ padding: '16px 20px', color: '#595966' }}>{entry.related_employee_name || entry.related_employee_id || '—'}</td>
                  <td style={{ padding: '16px 20px' }}><StatusBadge status={entry.status} /></td>
                  <td style={{ padding: '16px 20px', color: '#595966' }}>
                    {entry.created_at ? new Date(entry.created_at).toLocaleDateString() : '—'}
                  </td>
                  <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                    <Link to={`${base}/entries/${entry.id}`} style={{ textDecoration: 'none' }}>
                      <button type="button" className="ghost-btn small">View</button>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </article>
    </div>
  )
}

export default FormEntriesList
