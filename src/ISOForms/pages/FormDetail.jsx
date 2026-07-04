import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams, useLocation } from 'react-router-dom'
import API_BASE_URL, { API_ENDPOINTS } from '../../config/api'
import { getCurrentEmployeeId } from '../utils/currentEmployee'
import DynamicField from '../components/DynamicField'
import { isFieldEmpty } from '../utils/fieldHelpers'
import { getOfflineEntry, updateOfflineEntry, getOfflineTemplate } from '../utils/offlineStore'
import DocumentChangeRequestPrint from '../pdf/DocumentChangeRequestPrint'
import CARPrint from '../pdf/CARPrint'
import GenericFormPrint from '../pdf/GenericFormPrint'
import { downloadNodeAsPdf } from '../pdf/generatePdf'
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
  const location = useLocation()
  const isUserSide = location.pathname.startsWith('/user')
  const base = isUserSide ? '/user/iso-forms' : '/iso-forms'

  const [entry, setEntry] = useState(null)
  const [template, setTemplate] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [offline, setOffline] = useState(false)
  const [myEmployeeId, setMyEmployeeId] = useState(null)

  const [remarks, setRemarks] = useState('')
  const [deciding, setDeciding] = useState(false)
  const [approverValues, setApproverValues] = useState({})
  const [downloading, setDownloading] = useState(false)
  const [employees, setEmployees] = useState([])
  const printRef = useRef(null)

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

  const savedApproverValues = useMemo(() => {
    if (!entry?.approver_data) return {}
    try {
      return typeof entry.approver_data === 'string' ? JSON.parse(entry.approver_data) : entry.approver_data
    } catch { return {} }
  }, [entry])

  useEffect(() => { setApproverValues(savedApproverValues) }, [savedApproverValues])

  const requesterFields = useMemo(() => (template?.fields || []).filter(f => (f.owner || 'requester') === 'requester'), [template])
  const approverFields  = useMemo(() => (template?.fields || []).filter(f => f.owner === 'approver'), [template])

  const canDecide =
    entry?.status === 'pending' &&
    (isAdminOverride || (myEmployeeId && String(myEmployeeId) === String(entry?.related_employee_id)))

  const setApproverValue = (fieldId, val) => setApproverValues(prev => ({ ...prev, [fieldId]: val }))

  const handleDownloadPdf = async () => {
    setDownloading(true)
    const filename = `${(entry.template_name || template?.name || 'form').replace(/\s+/g, '-')}-${entry.id}.pdf`
    try {
      const originalPdf = template?.originalPdf
      if (originalPdf && template?.fields) {
        // Download with the exact original PDF layout, values overlaid via pdf-lib
        const allFields = template.fields
        await downloadFilledPdf(originalPdf, allFields, formValues, approverValues, employees, filename)
      } else {
        // Fallback: html2canvas snapshot of the styled print template
        if (!printRef.current) return
        await downloadNodeAsPdf(printRef.current, filename)
      }
    } finally {
      setDownloading(false)
    }
  }

  const handleDecision = async (status) => {
    if (status === 'rejected' && !remarks.trim()) {
      setError('Please add a remark explaining why this form is being rejected.')
      return
    }
    if (status === 'approved') {
      const missing = approverFields.filter(f => f.required && isFieldEmpty(f, approverValues[f.id]))
      if (missing.length) { setError(`Please fill: ${missing.map(f => f.label).join(', ')}`); return }
    }
    setDeciding(true)
    setError('')
    try {
      const res = await fetch(`${API_ENDPOINTS.ISO_FORMS_ENTRIES}/${id}/decision`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, remarks: remarks.trim(), approver_data: approverValues }),
      })
      if (!res.ok) throw new Error('decision failed')
    } catch {
      // No backend yet — record the decision in the local demo store instead.
      updateOfflineEntry(id, {
        status,
        remarks: remarks.trim(),
        approver_data: JSON.stringify(approverValues),
        decided_at: new Date().toISOString(),
      })
    } finally {
      setDeciding(false)
    }
    load()
  }

  if (loading) return <div style={{ padding: 40 }}>Loading form…</div>
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
            <div style={{ fontSize: 12, color: '#7a7a8c', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Related To</div>
            <div style={{ fontWeight: 700, color: '#14141c', marginTop: 4 }}>{entry.related_employee_name || entry.related_employee_id || '—'}</div>
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

        {entry.remarks && (
          <div style={{ background: '#fafafb', border: '1px solid #ececf0', borderRadius: 12, padding: '14px 16px', fontSize: 14, color: '#595966' }}>
            <strong style={{ color: '#14141c' }}>Remarks: </strong>{entry.remarks}
          </div>
        )}
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

      {approverFields.length > 0 && (
        <article className="panel" style={{ padding: 24, marginBottom: 20, display: 'grid', gap: 18 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>
            Approver Section {entry.status === 'pending' ? '(filled when deciding)' : ''}
          </h3>
          {approverFields.map(field => (
            <div key={field.id}>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, fontSize: 14 }}>
                {field.label}{field.required && <span style={{ color: '#d7263d' }}> *</span>}
              </label>
              <DynamicField
                field={field}
                value={approverValues[field.id]}
                onChange={(val) => setApproverValue(field.id, val)}
                readOnly={!canDecide}
                employees={employees}
              />
            </div>
          ))}
        </article>
      )}

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

      {canDecide && (
        <article className="panel" style={{ padding: 24 }}>
          <h3 style={{ margin: '0 0 14px', fontSize: 16, fontWeight: 700 }}>Your Decision</h3>
          <textarea
            value={remarks}
            onChange={e => setRemarks(e.target.value)}
            placeholder="Remarks (required if rejecting)"
            rows={3}
            style={{ width: '100%', padding: '12px 15px', border: '2px solid #e0e0e6', borderRadius: 12, fontSize: 14, boxSizing: 'border-box', marginBottom: 16, resize: 'vertical' }}
          />
          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
            <button type="button" className="ghost-btn" disabled={deciding} onClick={() => handleDecision('rejected')}>
              Reject
            </button>
            <button type="button" className="primary-btn" disabled={deciding} onClick={() => handleDecision('approved')}>
              Approve
            </button>
          </div>
        </article>
      )}

      {/* Off-screen — captured by html2canvas for the PDF download, never shown to the user */}
      <div style={{ position: 'absolute', left: -99999, top: 0 }}>
        {template?.id === 'seed-fm-001-04' || template?.name === 'Document Change Request Form' ? (
          <DocumentChangeRequestPrint ref={printRef} entry={entry} formValues={formValues} approverValues={approverValues} employees={employees} />
        ) : template?.id === 'seed-fm-002-01' || template?.name === 'Corrective Action Request Form' ? (
          <CARPrint ref={printRef} entry={entry} formValues={formValues} approverValues={approverValues} employees={employees} />
        ) : (
          <GenericFormPrint ref={printRef} entry={entry} template={template} formValues={formValues} approverValues={approverValues} employees={employees} />
        )}
      </div>
    </div>
  )
}

export default FormDetail
