import React, { useEffect, useMemo, useState } from 'react'
import { Link, useParams, useLocation, useNavigate } from 'react-router-dom'
import API_BASE_URL, { API_ENDPOINTS } from '../../config/api'
import { getCurrentEmployeeId } from '../utils/currentEmployee'
import DynamicField from '../components/DynamicField'
import { isFieldEmpty } from '../utils/fieldHelpers'
import { resolveSignerName, stampSignature } from '../utils/signature'
import { getOfflineEntry, updateOfflineEntry, deleteOfflineEntry, getOfflineTemplate } from '../utils/offlineStore'
import { downloadFilledPdf } from '../pdf/fillOriginalPdf'
import { SEED_EMPLOYEES } from '../seedTemplates'

const STATUS_COLORS = {
  pending:  { bg: '#fff7e6', color: '#b54708' },
  approved: { bg: '#e7f6ec', color: '#1a7f4e' },
  rejected: { bg: '#fdecea', color: '#b42318' },
}

const StatusBadge = ({ status }) => {
  const s = STATUS_COLORS[status] || STATUS_COLORS.pending
  return (
    <span style={{
      display: 'inline-block', padding: '5px 14px', borderRadius: 999,
      fontSize: 13, fontWeight: 700, textTransform: 'capitalize',
      background: s.bg, color: s.color,
    }}>{status || 'pending'}</span>
  )
}

function FormDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const isUserSide = location.pathname.startsWith('/user')
  const base = isUserSide ? '/user/iso-forms' : '/iso-forms'

  const [entry, setEntry] = useState(null)
  const [template, setTemplate] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [offline, setOffline] = useState(false)
  const [myEmployeeId, setMyEmployeeId] = useState(null)

  // Per role_key — one form can need sign-off from several roles, each with
  // its own remarks, its own approver-owned field values, and its own
  // approve/reject action, all independent of one another.
  const [remarksByRole, setRemarksByRole] = useState({})
  const [decidingRole, setDecidingRole] = useState(null)
  const [approverValuesByRole, setApproverValuesByRole] = useState({})
  const [downloading, setDownloading] = useState(false)
  const [employees, setEmployees] = useState([])

  let isAdminOverride = !isUserSide
  try {
    const perms = JSON.parse(localStorage.getItem('userPermissions') || '{}')
    if (perms.iso_forms_admin) isAdminOverride = true
  } catch { /* ignore malformed cache */ }

  useEffect(() => { getCurrentEmployeeId().then(setMyEmployeeId) }, [])

  // Employees list, to resolve 'employee' field-type values (e.g. Change Requested By) to a name.
  useEffect(() => {
    fetch(API_ENDPOINTS.EMPLOYEES)
      .then(res => (res.ok ? res.json() : Promise.reject()))
      .then(json => {
        if (!Array.isArray(json) || json.length === 0) throw new Error('empty')
        setEmployees(json)
      })
      .catch(() => setEmployees(SEED_EMPLOYEES))
  }, [])

  const applyTemplate = (tJson) => {
    if (!tJson) return
    const parsedFields = typeof tJson.fields === 'string' ? JSON.parse(tJson.fields) : tJson.fields
    const fields = Array.isArray(parsedFields) ? parsedFields.map(f => ({ owner: 'requester', ...f })) : []
    setTemplate({ ...tJson, fields })
  }

  const loadTemplate = async (templateId) => {
    try {
      const tRes = await fetch(`${API_ENDPOINTS.ISO_FORMS_TEMPLATES}/${templateId}`)
      if (!tRes.ok) throw new Error('not found')
      applyTemplate(await tRes.json())
    } catch {
      applyTemplate(getOfflineTemplate(templateId))
    }
  }

  const load = () => {
    setLoading(true)
    fetch(`${API_ENDPOINTS.ISO_FORMS_ENTRIES}/${id}`)
      .then(res => (res.ok ? res.json() : Promise.reject()))
      .then(async (json) => {
        if (!json) throw new Error('not found')
        setEntry(json)
        setOffline(false)
        if (json.template_id) await loadTemplate(json.template_id)
        setError('')
      })
      .catch(async () => {
        const offlineEntry = getOfflineEntry(id)
        if (!offlineEntry) { setError('Could not load this form.'); return }
        setEntry(offlineEntry)
        setOffline(true)
        if (offlineEntry.template_id) await loadTemplate(offlineEntry.template_id)
        setError('')
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [id])

  const formValues = useMemo(() => {
    if (!entry?.form_data) return {}
    try {
      return typeof entry.form_data === 'string' ? JSON.parse(entry.form_data) : entry.form_data
    } catch { return {} }
  }, [entry])

  const attachments = useMemo(() => {
    if (!entry?.attachments) return []
    try {
      return typeof entry.attachments === 'string' ? JSON.parse(entry.attachments) : entry.attachments
    } catch { return Array.isArray(entry.attachments) ? entry.attachments : [] }
  }, [entry])

  // One row per role (see IsoFormEntryApproval on the backend) — the source
  // of truth for who's decided what, riding along on the entry itself.
  const approvals = useMemo(() => (Array.isArray(entry?.approvals) ? entry.approvals : []), [entry])

  // Prefills each role's own field values from what it already has saved —
  // a role that already decided keeps showing what it submitted.
  useEffect(() => {
    const next = {}
    for (const a of approvals) {
      let data = {}
      try { data = typeof a.approver_data === 'string' ? JSON.parse(a.approver_data || '{}') : (a.approver_data || {}) }
      catch { data = {} }
      next[a.role_key] = data
    }
    setApproverValuesByRole(next)
  }, [approvals])

  const requesterFields = useMemo(() => (template?.fields || []).filter(f => (f.owner || 'requester') === 'requester'), [template])
  const fieldsForRole = (roleKey) => (template?.fields || []).filter(f => f.owner === roleKey)

  // The roles I (or an admin, for any role) can actually decide right now —
  // still pending, and assigned to me unless I'm overriding as admin.
  const decidableApprovals = approvals.filter(a => a.status === 'pending'
    && (isAdminOverride || (myEmployeeId && String(a.approver_employee_id) === String(myEmployeeId))))
  const canDecideRole = (roleKey) => decidableApprovals.some(a => a.role_key === roleKey)

  // Who may open this form at all: its author, anyone assigned to decide any
  // role on it, and an ISO Forms admin. Without this the list could scope
  // what it shows while the form itself stayed readable to anyone who typed
  // its URL.
  const canView = (() => {
    if (!entry) return true
    if (isAdminOverride) return true
    const me = [myEmployeeId, localStorage.getItem('userEmail')].filter(Boolean).map(String)
    if (!me.length) return false
    if (me.includes(String(entry.created_by || ''))) return true
    return approvals.some(a => me.includes(String(a.approver_employee_id || '')))
  })()

  // Who may revise this form: its author while it is still pending, and an ISO
  // Forms admin at any time. A decided form is the record that was signed off,
  // so changing it is deliberately an admin-only act.
  const canEdit = (() => {
    if (!entry) return false
    if (isAdminOverride) return true
    if (entry.status !== 'pending') return false
    const me = myEmployeeId || localStorage.getItem('userEmail')
    return Boolean(me) && String(entry.created_by || '') === String(me)
  })()

  // Who may remove this form: same rule as revising it — its author while
  // still pending, and an ISO Forms admin at any time.
  const canDelete = (() => {
    if (!entry) return false
    if (isAdminOverride) return true
    if (entry.status !== 'pending') return false
    const me = myEmployeeId || localStorage.getItem('userEmail')
    return Boolean(me) && String(entry.created_by || '') === String(me)
  })()

  const setApproverValue = (roleKey, fieldId, val) =>
    setApproverValuesByRole(prev => ({ ...prev, [roleKey]: { ...prev[roleKey], [fieldId]: val } }))

  // Every role's field values merged into one flat object — field ids are
  // unique across the whole template regardless of which role owns them, so
  // merging can't collide. The PDF overlay just needs "value by field id",
  // not which role filled it.
  const flatApproverValues = useMemo(
    () => Object.assign({}, ...Object.values(approverValuesByRole)),
    [approverValuesByRole]
  )

  // Who an approver signature signs as when its name is left blank.
  const signerName = resolveSignerName({ employees, employeeId: myEmployeeId })

  // The download is always the original uploaded PDF with values drawn onto
  // it. There is deliberately no HTML/snapshot fallback: a fallback that
  // silently produced a rebuilt layout is exactly what made downloads stop
  // matching the real form. If the overlay can't run, we say so instead.
  const handleDownloadPdf = async () => {
    setDownloading(true)
    setError('')
    const filename = `${(entry.template_name || template?.name || 'form').replace(/\s+/g, '-')}-${entry.id}.pdf`
    try {
      const originalPdf = template?.originalPdf
      if (!originalPdf) {
        setError('This template has no PDF attached, so the form cannot be generated. Ask an admin to edit the template and import its PDF.')
        return
      }
      const { skipped } = await downloadFilledPdf(
        originalPdf, template.fields || [], formValues, flatApproverValues, employees, filename,
      )
      if (skipped.length) {
        setError(`Downloaded, but ${skipped.length} filled field(s) have no position on the PDF yet and were left off: ${skipped.slice(0, 5).join(', ')}${skipped.length > 5 ? '…' : ''}. An admin can place them under Edit Template → Field Positions.`)
      }
    } catch (err) {
      console.error('Download PDF failed:', err)
      setError('Could not generate the PDF from the attached template. The stored PDF may be corrupt — re-import it on the template and try again.')
    } finally {
      setDownloading(false)
    }
  }

  const handleDecision = async (roleKey, status) => {
    const roleRemarks = (remarksByRole[roleKey] || '').trim()
    if (status === 'rejected' && !roleRemarks) {
      setError('Please add a remark explaining why this form is being rejected.')
      return
    }
    const roleFields = fieldsForRole(roleKey)
    const roleValues = approverValuesByRole[roleKey] || {}
    if (status === 'approved') {
      const missing = roleFields.filter(f => f.required && isFieldEmpty(f, roleValues[f.id]))
      if (missing.length) { setError(`Please fill: ${missing.map(f => f.label).join(', ')}`); return }
    }
    setDecidingRole(roleKey)
    setError('')

    // Seal this role's signature fields — the same stamp the requester's side
    // of the form carries: the date is set now, and the name is whatever was
    // typed, falling back to whoever is deciding.
    const signedValues = { ...roleValues }
    for (const field of roleFields) {
      if (field.type !== 'signature') continue
      signedValues[field.id] = stampSignature(signedValues[field.id], signerName)
    }

    try {
      const res = await fetch(`${API_ENDPOINTS.ISO_FORMS_ENTRIES}/${id}/decision`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status, remarks: roleRemarks, approver_data: signedValues, role_key: roleKey,
          actor_id: myEmployeeId || localStorage.getItem('userEmail') || null,
          actor_name: signerName,
          admin: isAdminOverride ? '1' : undefined,
        }),
      })
      if (!res.ok) throw new Error('decision failed')
    } catch {
      // No backend yet — record the decision in the local demo store instead.
      updateOfflineEntry(id, {
        status,
        remarks: roleRemarks,
        approver_data: JSON.stringify(signedValues),
        decided_at: new Date().toISOString(),
      })
    } finally {
      setDecidingRole(null)
    }
    load()
  }

  // Confirmed first — a submitted form is a record, not a draft.
  const handleDelete = async () => {
    const label = entry?.template_name || template?.name || `Form #${id}`
    if (!window.confirm(`Delete "${label}"? This permanently removes the submission and its attachments.`)) return
    const params = new URLSearchParams()
    if (isAdminOverride) params.set('admin', '1')
    else {
      const me = myEmployeeId || localStorage.getItem('userEmail')
      if (me) params.set('editor', me)
    }
    try {
      const res = await fetch(`${API_ENDPOINTS.ISO_FORMS_ENTRIES}/${id}?${params.toString()}`, { method: 'DELETE' })
      if (!res.ok) {
        const failed = await res.json().catch(() => ({}))
        setError(failed.error || `Could not delete this form (HTTP ${res.status}).`)
        return
      }
    } catch {
      deleteOfflineEntry(id)
    }
    navigate(`${base}/entries`)
  }

  if (loading) return <div style={{ padding: 40 }}>Loading form…</div>
  if (entry && !canView) {
    return (
      <div style={{ padding: 40 }}>
        <Link to={`${base}/entries`} style={{ fontSize: 13, color: '#7a7a8c', textDecoration: 'none' }}>← Back to All Forms</Link>
        <div style={{ background: '#fdecea', border: '1px solid #f5c2c0', color: '#b42318', borderRadius: 12, padding: '14px 16px', marginTop: 16, fontSize: 14 }}>
          This form belongs to someone else. You can only open forms you submitted or have to approve.
        </div>
      </div>
    )
  }
  if (error && !entry) return <div style={{ padding: 40, color: '#b42318' }}>{error}</div>
  if (!entry) return null

  return (
    <div style={{ padding: 'clamp(24px, 4vw, 48px)', maxWidth: 860, margin: '0 auto' }}>
      <Link to={`${base}/entries`} style={{ fontSize: 13, color: '#7a7a8c', textDecoration: 'none' }}>← Back to All Forms</Link>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16, margin: '12px 0 24px' }}>
        <div>
          <p className="eyebrow" style={{ margin: 0 }}>ISO Forms</p>
          <h1 style={{ margin: '4px 0 0', fontSize: 26, fontWeight: 800, color: '#14141c' }}>
            {entry.template_name || template?.name || `Form #${entry.id}`}
          </h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button type="button" className="ghost-btn" disabled={downloading} onClick={handleDownloadPdf}>
            {downloading ? 'Preparing PDF…' : '⬇ Download PDF'}
          </button>
          {canEdit && (
            <Link to={`${base}/entries/${entry.id}/edit`} style={{ textDecoration: 'none' }}>
              <button type="button" className="ghost-btn">✏ Edit Form</button>
            </Link>
          )}
          {canDelete && (
            <button type="button" className="ghost-btn" onClick={handleDelete} style={{ color: '#b42318' }}>
              🗑 Delete Form
            </button>
          )}
          <StatusBadge status={entry.status} />
        </div>
      </div>

      {offline && (
        <div style={{ background: '#fff7e6', border: '1px solid #ffe1a8', color: '#92660a', borderRadius: 12, padding: '12px 16px', marginBottom: 20, fontSize: 14 }}>
          Demo mode — this form is saved in this browser only since the backend isn't connected yet.
        </div>
      )}
      {error && (
        <div style={{ background: '#fdecea', border: '1px solid #f5c2c0', color: '#b42318', borderRadius: 12, padding: '12px 16px', marginBottom: 20, fontSize: 14 }}>
          {error}
        </div>
      )}

      <article className="panel" style={{ padding: 24, marginBottom: 20 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 12, color: '#7a7a8c', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Created By</div>
            <div style={{ fontWeight: 700, color: '#14141c', marginTop: 4 }}>{entry.created_by_name || entry.created_by || '—'}</div>
          </div>
          <div>
            <div style={{ fontSize: 12, color: '#7a7a8c', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              {approvals.length > 1 ? 'Approvers' : 'Related To'}
            </div>
            <div style={{ fontWeight: 700, color: '#14141c', marginTop: 4 }}>
              {approvals.length
                ? approvals.map(a => a.approver_employee_name || a.approver_employee_id).filter(Boolean).join(', ') || '—'
                : (entry.related_employee_name || entry.related_employee_id || '—')}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 12, color: '#7a7a8c', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Submitted</div>
            <div style={{ fontWeight: 700, color: '#14141c', marginTop: 4 }}>
              {entry.created_at ? new Date(entry.created_at).toLocaleString() : '—'}
            </div>
          </div>
          {entry.decided_at && (
            <div>
              <div style={{ fontSize: 12, color: '#7a7a8c', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Decided</div>
              <div style={{ fontWeight: 700, color: '#14141c', marginTop: 4 }}>{new Date(entry.decided_at).toLocaleString()}</div>
            </div>
          )}
        </div>

      </article>

      <article className="panel" style={{ padding: 24, marginBottom: 20, display: 'grid', gap: 18 }}>
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Form Details</h3>
        {requesterFields.map(field => (
          <div key={field.id}>
            <div style={{ fontSize: 12, color: '#7a7a8c', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>{field.label}</div>
            <DynamicField field={field} value={formValues[field.id]} readOnly employees={employees} />
          </div>
        ))}
        {!template && <p style={{ margin: 0, fontSize: 13, color: '#7a7a8c' }}>Template details unavailable.</p>}
      </article>

      {approvals.map(approval => {
        const roleFields = fieldsForRole(approval.role_key)
        const roleValues = approverValuesByRole[approval.role_key] || {}
        const iAmDecider = canDecideRole(approval.role_key)
        return (
          <article className="panel" key={approval.role_key} style={{ padding: 24, marginBottom: 20, display: 'grid', gap: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>{approval.role_label || approval.role_key}</h3>
              <StatusBadge status={approval.status} />
            </div>
            <div style={{ fontSize: 13, color: '#7a7a8c' }}>
              Assigned to <strong style={{ color: '#14141c' }}>{approval.approver_employee_name || approval.approver_employee_id || '—'}</strong>
              {approval.status !== 'pending' && approval.decided_at && (
                <> — {approval.status} on {new Date(approval.decided_at).toLocaleString()}</>
              )}
            </div>
            {approval.remarks && (
              <div style={{ background: '#fafafb', border: '1px solid #ececf0', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#595966' }}>
                <strong style={{ color: '#14141c' }}>Remarks: </strong>{approval.remarks}
              </div>
            )}

            {roleFields.length > 0 && (
              <div style={{ display: 'grid', gap: 16 }}>
                {roleFields.map(field => (
                  <div key={field.id}>
                    <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, fontSize: 14 }}>
                      {field.label}{field.required && <span style={{ color: '#d7263d' }}> *</span>}
                    </label>
                    <DynamicField
                      field={field}
                      value={roleValues[field.id]}
                      onChange={(val) => setApproverValue(approval.role_key, field.id, val)}
                      readOnly={!(iAmDecider && approval.status === 'pending')}
                      employees={employees}
                      signerName={signerName}
                    />
                  </div>
                ))}
              </div>
            )}

            {iAmDecider && approval.status === 'pending' && (
              <div>
                <textarea
                  value={remarksByRole[approval.role_key] || ''}
                  onChange={e => setRemarksByRole(prev => ({ ...prev, [approval.role_key]: e.target.value }))}
                  placeholder="Remarks (required if rejecting)"
                  rows={3}
                  style={{ width: '100%', padding: '12px 15px', border: '2px solid #e0e0e6', borderRadius: 12, fontSize: 14, boxSizing: 'border-box', marginBottom: 12, resize: 'vertical' }}
                />
                <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                  <button type="button" className="ghost-btn" disabled={decidingRole === approval.role_key} onClick={() => handleDecision(approval.role_key, 'rejected')}>
                    Reject
                  </button>
                  <button type="button" className="primary-btn" disabled={decidingRole === approval.role_key} onClick={() => handleDecision(approval.role_key, 'approved')}>
                    Approve
                  </button>
                </div>
              </div>
            )}
          </article>
        )
      })}

      <article className="panel" style={{ padding: 24, marginBottom: 20 }}>
        <h3 style={{ margin: '0 0 14px', fontSize: 16, fontWeight: 700 }}>Attachments</h3>
        {attachments.length === 0 ? (
          <p style={{ margin: 0, fontSize: 13, color: '#7a7a8c' }}>No attachments were uploaded with this form.</p>
        ) : (
          <div style={{ display: 'grid', gap: 10 }}>
            {attachments.map((att, i) => {
              const path = att.file_path || att.path
              const href = att.data_url || (path ? `${API_BASE_URL}${path}` : null)
              return href ? (
                <a
                  key={i}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none',
                    padding: '10px 14px', border: '1px solid #ececf0', borderRadius: 10, fontSize: 14, color: '#14141c',
                  }}
                >
                  📎 {att.file_name || att.name || `Attachment ${i + 1}`}
                </a>
              ) : (
                <div
                  key={i}
                  title="File too large to preview in demo mode, or the backend isn't connected yet."
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 14px', border: '1px dashed #ececf0', borderRadius: 10, fontSize: 14, color: '#9a9aaa',
                  }}
                >
                  📎 {att.file_name || att.name || `Attachment ${i + 1}`} <span style={{ fontSize: 12 }}>(preview unavailable)</span>
                </div>
              )
            })}
          </div>
        )}
      </article>

    </div>
  )
}

export default FormDetail
