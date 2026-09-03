import React, { useEffect, useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Search, Calendar, X, Trash2, Pencil } from 'lucide-react'
import { API_ENDPOINTS } from '../../config/api'
import { getCurrentEmployeeId } from '../utils/currentEmployee'
import { getOfflineEntries, deleteOfflineEntry } from '../utils/offlineStore'

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

const inputStyle = {
  background: '#fff',
  border: '1px solid #e0e0e6',
  color: '#14141c',
  borderRadius: 16,
  padding: '12px 16px',
  fontSize: 14,
  outline: 'none',
  fontFamily: 'inherit',
  transition: 'all 0.2s ease',
}

function FormEntriesList() {
  const location = useLocation()
  const isUserSide = location.pathname.startsWith('/user')
  const base = isUserSide ? '/user/iso-forms' : '/iso-forms'

  const searchParams = new URLSearchParams(location.search)
  const pendingMine = searchParams.get('filter') === 'pending-mine'

  const isAdmin = !isUserSide || (() => {
    try { return JSON.parse(localStorage.getItem('userPermissions') || '{}').iso_forms_admin === true } catch { return false }
  })()

  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [offline, setOffline] = useState(false)
  const [myEmployeeId, setMyEmployeeId] = useState(null)

  // Filters
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState(pendingMine ? 'pending' : '')
  const [templateFilter, setTemplateFilter] = useState('')
  const [createdByFilter, setCreatedByFilter] = useState('')
  const [relatedToFilter, setRelatedToFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [onlyMine, setOnlyMine] = useState(false)

  const effectiveOnlyMine = pendingMine && !isAdmin ? true : onlyMine

  useEffect(() => { getCurrentEmployeeId().then(setMyEmployeeId) }, [])

  // A form is somebody's record, not a company noticeboard: the register shows
  // an ISO Forms admin every form, and everyone else only the forms they
  // submitted. The list used to fetch every entry for everyone, so one
  // employee's submission was readable by all of them.
  //
  // Pending Approvals is the exception, and asks a different question — the
  // forms awaiting this person's decision. Those are forms somebody else
  // submitted, so the "only what I submitted" limit must not apply there or an
  // approver would have nothing to approve.
  const myEmail = localStorage.getItem('userEmail') || ''
  const identityReady = isAdmin || Boolean(myEmployeeId) || Boolean(myEmail)

  useEffect(() => {
    // Waiting for the identity keeps the unscoped "everything" list from
    // flashing up before the scope is known.
    if (!identityReady) return

    const params = new URLSearchParams()
    if (statusFilter) params.set('status', statusFilter)
    if (effectiveOnlyMine && myEmployeeId) params.set('relatedEmployeeId', myEmployeeId)
    if (!isAdmin && !effectiveOnlyMine) {
      if (myEmployeeId) params.set('employeeId', myEmployeeId)
      if (myEmail) params.set('email', myEmail)
    }

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
        let rows = getOfflineEntries()
        if (statusFilter) rows = rows.filter(e => (e.status || 'pending') === statusFilter)
        if (effectiveOnlyMine && myEmployeeId) rows = rows.filter(e => String(e.related_employee_id) === String(myEmployeeId))
        if (!isAdmin && !effectiveOnlyMine) {
          const mine = [myEmployeeId, myEmail].filter(Boolean).map(String)
          rows = rows.filter(e => mine.includes(String(e.created_by || '')))
        }
        setEntries(rows)
        setOffline(true)
        setError('')
      })
      .finally(() => setLoading(false))
  }, [statusFilter, effectiveOnlyMine, myEmployeeId, identityReady])   // eslint-disable-line react-hooks/exhaustive-deps

  // Unique option lists for filter dropdowns
  const templateOptions = useMemo(() => [...new Set(entries.map(e => e.template_name).filter(Boolean))], [entries])
  // Who may revise a submitted form: its author while it is still pending, and
  // an ISO Forms admin at any time. A decided form is the record that was
  // signed off, so changing it is deliberately an admin-only act.
  const canEdit = (entry) => {
    if (isAdmin) return true
    if (entry.status !== 'pending') return false
    const me = myEmployeeId || localStorage.getItem('userEmail')
    return Boolean(me) && String(entry.created_by || '') === String(me)
  }

  const createdByOptions = useMemo(() => [...new Set(entries.map(e => e.created_by_name || e.created_by).filter(Boolean))], [entries])
  const relatedToOptions = useMemo(() => [...new Set(entries.map(e => e.related_employee_name || e.related_employee_id).filter(Boolean))], [entries])

  // Client-side filtering (search + column filters)
  const rows = useMemo(() => {
    const q = search.trim().toLowerCase()
    return entries.filter(e => {
      const tName = e.template_name || ''
      const createdBy = e.created_by_name || e.created_by || ''
      const relatedTo = e.related_employee_name || String(e.related_employee_id || '')
      const status = e.status || 'pending'
      const dateStr = e.created_at ? new Date(e.created_at).toLocaleDateString() : ''

      if (templateFilter && tName !== templateFilter) return false
      if (createdByFilter && createdBy !== createdByFilter) return false
      if (relatedToFilter && relatedTo !== relatedToFilter) return false
      if (dateFrom && e.created_at && e.created_at < dateFrom) return false
      if (dateTo && e.created_at && e.created_at > dateTo + 'T23:59:59') return false
      if (q && ![tName, createdBy, relatedTo, status, dateStr].join(' ').toLowerCase().includes(q)) return false
      return true
    })
  }, [entries, search, templateFilter, createdByFilter, relatedToFilter, dateFrom, dateTo])

  // Admin-only. A submitted form is a record, so this is confirmed first and
  // the row is dropped locally rather than re-running the whole list fetch.
  const handleDelete = async (entry) => {
    const label = entry.template_name || `Form #${entry.id}`
    if (!window.confirm(`Delete "${label}"? This permanently removes the submission and its attachments.`)) return
    try {
      const res = await fetch(`${API_ENDPOINTS.ISO_FORMS_ENTRIES}/${entry.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('delete failed')
    } catch {
      deleteOfflineEntry(entry.id)
    }
    setEntries(prev => prev.filter(e => String(e.id) !== String(entry.id)))
  }

  const clearFilters = () => {
    setSearch('')
    setTemplateFilter('')
    setCreatedByFilter('')
    setRelatedToFilter('')
    setDateFrom('')
    setDateTo('')
    if (!pendingMine) setStatusFilter('')
    setOnlyMine(false)
  }

  const hasActiveFilters = search || templateFilter || createdByFilter || relatedToFilter || dateFrom || dateTo || onlyMine || (statusFilter && !pendingMine)

  return (
    <div style={{ padding: 'clamp(24px, 4vw, 48px)' }}>
      {/* Header */}
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

      {/* Filters — JLR style */}
      <div style={{
        display: 'flex', gap: 12, padding: '18px 20px',
        background: '#fff', border: '1px solid #e0e0e6', borderRadius: 16,
        flexWrap: 'wrap', alignItems: 'center', marginBottom: 20,
      }}>
        {/* Search */}
        <div style={{ flex: 1, minWidth: 220, position: 'relative' }}>
          <span style={{
            position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
            color: '#aaa', pointerEvents: 'none', display: 'inline-flex',
          }}>
            <Search size={15} />
          </span>
          <input
            type="text"
            style={{ ...inputStyle, paddingLeft: 40, width: '100%', boxSizing: 'border-box' }}
            placeholder="Search forms…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* Template / Form name */}
        <select
          style={{ ...inputStyle, minWidth: 160, cursor: 'pointer' }}
          value={templateFilter}
          onChange={e => setTemplateFilter(e.target.value)}
        >
          <option value="">All Forms</option>
          {templateOptions.map(s => <option key={s} value={s}>{s}</option>)}
        </select>

        {/* Status */}
        {!pendingMine && (
          <select
            style={{ ...inputStyle, minWidth: 140, cursor: 'pointer' }}
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        )}

        {/* Created By */}
        <select
          style={{ ...inputStyle, minWidth: 150, cursor: 'pointer' }}
          value={createdByFilter}
          onChange={e => setCreatedByFilter(e.target.value)}
        >
          <option value="">All Created By</option>
          {createdByOptions.map(s => <option key={s} value={s}>{s}</option>)}
        </select>

        {/* Related To */}
        {(!pendingMine || isAdmin) && (
          <select
            style={{ ...inputStyle, minWidth: 150, cursor: 'pointer' }}
            value={relatedToFilter}
            onChange={e => setRelatedToFilter(e.target.value)}
          >
            <option value="">All Related To</option>
            {relatedToOptions.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        )}

        {/* Date range */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: '#7a7a8c', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <Calendar size={13} /> From
          </span>
          <input
            type="date"
            value={dateFrom}
            max={dateTo || undefined}
            style={{ ...inputStyle, padding: '10px 10px', minWidth: 0, cursor: 'pointer' }}
            onChange={e => setDateFrom(e.target.value)}
          />
          <span style={{ fontSize: 12, fontWeight: 600, color: '#7a7a8c' }}>To</span>
          <input
            type="date"
            value={dateTo}
            min={dateFrom || undefined}
            style={{ ...inputStyle, padding: '10px 10px', minWidth: 0, cursor: 'pointer' }}
            onChange={e => setDateTo(e.target.value)}
          />
        </div>

        {/* Narrows an admin's register to the forms routed to them. Everyone
            else already sees only their own submissions, so for them the toggle
            would only ever have taken things away. */}
        {isAdmin && (
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, color: '#595966', whiteSpace: 'nowrap', cursor: 'pointer' }}>
            <input type="checkbox" checked={effectiveOnlyMine} onChange={e => setOnlyMine(e.target.checked)} />
            Only mine
          </label>
        )}

        {/* Clear */}
        {hasActiveFilters && (
          <button
            type="button"
            onClick={clearFilters}
            style={{
              background: 'transparent', border: '1px solid #e0e0e6',
              color: '#595966', padding: '10px 16px', borderRadius: 16,
              fontSize: 14, cursor: 'pointer', whiteSpace: 'nowrap',
              display: 'inline-flex', alignItems: 'center', gap: 6,
            }}
          >
            <X size={14} /> Clear
          </button>
        )}
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
          <div style={{ padding: 40, textAlign: 'center', color: '#7a7a8c' }}>
            {hasActiveFilters ? 'No forms match your filters. Try adjusting the search or filters.' : 'No forms found.'}
          </div>
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
                    <div style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}>
                      <Link to={`${base}/entries/${entry.id}`} style={{ textDecoration: 'none' }}>
                        <button type="button" className="ghost-btn small">View</button>
                      </Link>
                      {canEdit(entry) && (
                        <Link to={`${base}/entries/${entry.id}/edit`} style={{ textDecoration: 'none' }}>
                          <button type="button" title="Edit form" className="ghost-btn small">
                            <Pencil size={15} />
                          </button>
                        </Link>
                      )}
                      {isAdmin && (
                        <button
                          type="button"
                          title="Delete form"
                          className="ghost-btn small"
                          onClick={() => handleDelete(entry)}
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
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
