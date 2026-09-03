import React, { useEffect, useState } from 'react'
import { Link, useNavigate, useParams, useLocation } from 'react-router-dom'
import { API_ENDPOINTS } from '../../config/api'
import DynamicField from '../components/DynamicField'
import { isFieldEmpty } from '../utils/fieldHelpers'
import { SEED_TEMPLATES, SEED_VERSION, SEED_EMPLOYEES } from '../seedTemplates'
import { ensureSeeded, getOfflineTemplates, getOfflineTemplate, addOfflineEntry } from '../utils/offlineStore'
import { getCurrentEmployeeId } from '../utils/currentEmployee'
import { resolveSignerName, stampSignature } from '../utils/signature'
import { fileToDataUrl } from '../utils/fileToDataUrl'

// One column per ~340px of available width, so the same markup is a single
// column on a laptop-narrow pane and four across on a wide monitor.
const FIELD_COLUMNS = 'repeat(auto-fit, minmax(340px, 1fr))'

const isWideField = (field) => field.type === 'textarea' || field.type === 'checkbox-group'

function FormFiller() {
  // The same screen fills a new form (`new/:templateId`) and revises a
  // submitted one (`entries/:id/edit`) — the fields, validation and layout are
  // identical, and a second copy of them would drift.
  const { templateId, id: entryId } = useParams()
  const isEdit = Boolean(entryId)
  const navigate = useNavigate()
  const location = useLocation()
  const isUserSide = location.pathname.startsWith('/user')
  const base = isUserSide ? '/user/iso-forms' : '/iso-forms'

  const isAdmin = !isUserSide || (() => {
    try { return JSON.parse(localStorage.getItem('userPermissions') || '{}').iso_forms_admin === true } catch { return false }
  })()

  const [templates, setTemplates] = useState([])
  const [template, setTemplate] = useState(null)
  const [loadingTemplates, setLoadingTemplates] = useState(!templateId && !entryId)
  const [loadingTemplate, setLoadingTemplate] = useState(Boolean(templateId))

  const [entry, setEntry] = useState(null)
  const [loadingEntry, setLoadingEntry] = useState(isEdit)
  // Attachments already stored on the entry; the backend keeps exactly these.
  const [storedAttachments, setStoredAttachments] = useState([])

  const [values, setValues] = useState({})
  const [attachments, setAttachments] = useState([])
  const [employees, setEmployees] = useState([])
  const [relatedEmployeeId, setRelatedEmployeeId] = useState('')

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [offline, setOffline] = useState(false)

  // Template picker (when no templateId is in the URL)
  useEffect(() => {
    if (templateId || entryId) return
    fetch(API_ENDPOINTS.ISO_FORMS_TEMPLATES)
      .then(res => (res.ok ? res.json() : Promise.reject()))
      .then(json => {
        const rows = json?.data ?? json
        if (!Array.isArray(rows)) throw new Error('bad response')
        setTemplates(rows)
        setOffline(false)
      })
      .catch(() => {
        ensureSeeded(SEED_TEMPLATES, SEED_VERSION)
        setTemplates(getOfflineTemplates())
        setOffline(true)
      })
      .finally(() => setLoadingTemplates(false))
  }, [templateId, entryId])

  // Load the form being revised, and prefill from what was submitted.
  useEffect(() => {
    if (!entryId) return
    let active = true
    fetch(`${API_ENDPOINTS.ISO_FORMS_ENTRIES}/${entryId}`)
      .then(res => (res.ok ? res.json() : Promise.reject()))
      .then(json => {
        if (!active) return
        setEntry(json)
        const parsed = typeof json.form_data === 'string' ? JSON.parse(json.form_data || '{}') : (json.form_data || {})
        setValues(parsed && typeof parsed === 'object' ? parsed : {})
        setRelatedEmployeeId(json.related_employee_id != null ? String(json.related_employee_id) : '')
        const files = typeof json.attachments === 'string' ? JSON.parse(json.attachments || '[]') : (json.attachments || [])
        setStoredAttachments(Array.isArray(files) ? files : [])
      })
      .catch(() => { if (active) setError('Could not load this form.') })
      .finally(() => { if (active) { setLoadingEntry(false); setLoadingTemplate(true) } })
    return () => { active = false }
  }, [entryId])

  // Load the selected template's field schema
  const schemaId = templateId || entry?.template_id
  useEffect(() => {
    if (!schemaId) return
    let active = true
    const applyTemplate = (json, isOffline) => {
      if (!active || !json) return
      const parsedFields = typeof json.fields === 'string' ? JSON.parse(json.fields) : json.fields
      const fields = Array.isArray(parsedFields) ? parsedFields.map(f => ({ owner: 'requester', ...f })) : []
      // Only the requester fills fields at submission time — approver fields
      // (e.g. Impact Analysis, Closing Details) are filled in at decision time.
      setTemplate({ ...json, fields: fields.filter(f => (f.owner || 'requester') === 'requester') })
      setOffline(isOffline)
    }
    fetch(`${API_ENDPOINTS.ISO_FORMS_TEMPLATES}/${schemaId}`)
      .then(res => (res.ok ? res.json() : Promise.reject()))
      .then(json => applyTemplate(json, false))
      .catch(() => {
        ensureSeeded(SEED_TEMPLATES, SEED_VERSION)
        applyTemplate(getOfflineTemplate(schemaId), true)
      })
      .finally(() => { if (active) setLoadingTemplate(false) })
    return () => { active = false }
  }, [schemaId])

  // Employees list, for the related-employee (approver) picker
  useEffect(() => {
    fetch(API_ENDPOINTS.EMPLOYEES)
      .then(res => (res.ok ? res.json() : Promise.reject()))
      .then(json => {
        if (!Array.isArray(json) || json.length === 0) throw new Error('empty')
        setEmployees(json)
      })
      .catch(() => setEmployees(SEED_EMPLOYEES))
  }, [])

  // Who a signature field signs as when its name is left blank. Resolved here
  // so the field can offer it as a placeholder, and used again on submit.
  const [myEmployeeId, setMyEmployeeId] = useState(null)
  useEffect(() => { getCurrentEmployeeId().then(setMyEmployeeId) }, [])
  const signerName = resolveSignerName({ employees, employeeId: myEmployeeId })

  const setFieldValue = (fieldId, val) => setValues(prev => ({ ...prev, [fieldId]: val }))

  const addAttachment = () => setAttachments(prev => [...prev, null])
  const updateAttachment = (index, file) =>
    setAttachments(prev => prev.map((f, i) => (i === index ? file : f)))
  const removeAttachment = (index) =>
    setAttachments(prev => prev.filter((_, i) => i !== index))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!template) return
    // The completed form is produced by drawing values onto the template's own
    // PDF, so a template without one has nothing to produce.
    if (!template.originalPdf) {
      setError('This template has no PDF attached, so a completed form cannot be generated. Ask an admin to edit the template and import its PDF first.')
      return
    }
    const missing = template.fields.filter(f => f.required && isFieldEmpty(f, values[f.id]))
    if (missing.length) { setError(`Please fill: ${missing.map(f => f.label).join(', ')}`); return }
    if (!relatedEmployeeId) { setError('Please select the employee this form is related to.'); return }

    setSubmitting(true)
    // Names for the entry's "Created By" / "Related To" columns. The backend has
    // no auth session, so send these explicitly (it denormalizes template_name).
    const relatedEmployee = employees.find(emp => String(emp.id) === String(relatedEmployeeId))
    const relatedEmployeeName = relatedEmployee?.full_name || relatedEmployee?.name || ''
    const resolvedEmployeeId = await getCurrentEmployeeId()

    // Seal the requester's signature fields: the date is stamped now, and the
    // name is whatever was typed on the form, falling back to whoever is logged
    // in. A signature that already carries a date is left alone — revising a
    // form corrects what it says, it does not re-sign it under a later date.
    const myName = resolveSignerName({ employees, employeeId: resolvedEmployeeId })
    const signedValues = { ...values }
    for (const field of template.fields) {
      if (field.type !== 'signature') continue
      signedValues[field.id] = stampSignature(signedValues[field.id], myName)
    }

    // ── Revising an existing form ───────────────────────────────────────────
    // No offline fallback here: the form already exists on the server, so a
    // failed save must be reported rather than written to the demo store where
    // the entries list — which reloads from the server — would never show it.
    if (isEdit) {
      try {
        const body = new FormData()
        body.append('form_data', JSON.stringify(signedValues))
        body.append('related_employee_id', relatedEmployeeId)
        body.append('related_employee_name', relatedEmployeeName)
        body.append('keep_attachments', JSON.stringify(storedAttachments.map(a => a.file_path)))
        if (isAdmin) body.append('admin', '1')
        if (resolvedEmployeeId || localStorage.getItem('userEmail')) {
          body.append('editor', resolvedEmployeeId || localStorage.getItem('userEmail'))
        }
        attachments.forEach(file => { if (file) body.append('attachments', file) })

        const res = await fetch(`${API_ENDPOINTS.ISO_FORMS_ENTRIES}/${entryId}`, { method: 'PUT', body })
        if (!res.ok) {
          const failed = await res.json().catch(() => ({}))
          setError(failed.error || `Could not save the changes (HTTP ${res.status}).`)
          setSubmitting(false)
          return
        }
      } catch {
        setError('Could not reach the server to save the changes.')
        setSubmitting(false)
        return
      }
      setSubmitting(false)
      navigate(`${base}/entries/${entryId}`)
      return
    }

    const createdBy = resolvedEmployeeId || localStorage.getItem('userEmail') || ''
    const createdByName = localStorage.getItem('userFullName') || localStorage.getItem('userEmail') || ''
    try {
      const formData = new FormData()
      formData.append('template_id', template.id)
      formData.append('template_name', template.name || '')
      formData.append('form_data', JSON.stringify(signedValues))
      formData.append('related_employee_id', relatedEmployeeId)
      formData.append('related_employee_name', relatedEmployeeName)
      if (createdBy) formData.append('created_by', createdBy)
      if (createdByName) formData.append('created_by_name', createdByName)
      attachments.forEach(file => { if (file) formData.append('attachments', file) })

      const res = await fetch(API_ENDPOINTS.ISO_FORMS_ENTRIES, { method: 'POST', body: formData })
      if (!res.ok) throw new Error('submit failed')
    } catch {
      // No backend yet — record the submission in the local demo store instead.
      // Inline the actual file content as a data URL so "View" works without a backend.
      const storedAttachments = await Promise.all(
        attachments.filter(Boolean).map(async (f) => ({
          file_name: f.name,
          file_path: '',
          data_url: await fileToDataUrl(f),
        }))
      )
      addOfflineEntry({
        id: `local-${Date.now()}`,
        template_id: template.id,
        template_name: template.name,
        form_data: JSON.stringify(signedValues),
        related_employee_id: relatedEmployeeId,
        related_employee_name: relatedEmployee?.full_name || relatedEmployee?.name || '',
        created_by: resolvedEmployeeId || localStorage.getItem('userEmail') || '',
        created_by_name: localStorage.getItem('userFullName') || localStorage.getItem('userEmail') || 'You (demo)',
        status: 'pending',
        remarks: '',
        attachments: JSON.stringify(storedAttachments),
        created_at: new Date().toISOString(),
      })
    } finally {
      setSubmitting(false)
    }
    navigate(`${base}/entries`)
  }

  // ── Template picker screen ──────────────────────────────────────
  if (!templateId && !entryId) {
    return (
      <div style={{ padding: 'clamp(24px, 4vw, 48px)' }}>
        <p className="eyebrow" style={{ margin: 0 }}>ISO Forms</p>
        <h1 style={{ margin: '4px 0 24px', fontSize: 26, fontWeight: 800, color: '#14141c' }}>Choose a Form to Fill</h1>

        {offline && (
          <div style={{ background: '#fff7e6', border: '1px solid #ffe1a8', color: '#92660a', borderRadius: 12, padding: '12px 16px', marginBottom: 20, fontSize: 14 }}>
            Demo mode — showing templates saved in this browser since the backend isn't connected yet.
          </div>
        )}
        {error && (
          <div style={{ background: '#fdecea', border: '1px solid #f5c2c0', color: '#b42318', borderRadius: 12, padding: '12px 16px', marginBottom: 20, fontSize: 14 }}>
            {error}
          </div>
        )}

        {loadingTemplates ? (
          <div style={{ color: '#7a7a8c' }}>Loading…</div>
        ) : templates.length === 0 ? (
          <div style={{ color: '#7a7a8c' }}>No form templates have been created yet.</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
            {templates.map(t => (
              <Link key={t.id} to={`${base}/new/${t.id}`} style={{ textDecoration: 'none' }}>
                <div className="panel" style={{ padding: 20, cursor: 'pointer', height: '100%' }}>
                  <div style={{ fontWeight: 700, color: '#14141c', marginBottom: 6 }}>{t.name}</div>
                  <div style={{ fontSize: 13, color: '#7a7a8c' }}>{t.description || 'No description'}</div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    )
  }

  if (loadingEntry || loadingTemplate) return <div style={{ padding: 40 }}>Loading form…</div>
  if (!template) return <div style={{ padding: 40, color: '#b42318' }}>Could not load this form template.</div>

  return (
    // Full bleed on purpose: a long form in a 860px column is mostly scrolling
    // past empty margins, so the fields flow into however many columns the
    // screen affords and the page gets shorter instead of narrower.
    <div style={{ padding: 'clamp(20px, 3vw, 40px)', width: '100%', boxSizing: 'border-box' }}>
      <p className="eyebrow" style={{ margin: 0 }}>ISO Forms{isEdit ? ' — Editing' : ''}</p>
      <h1 style={{ margin: '4px 0 8px', fontSize: 26, fontWeight: 800, color: '#14141c' }}>{template.name}</h1>
      {isEdit && entry && entry.status !== 'pending' && (
        <div style={{ background: '#fff7e6', border: '1px solid #ffe1a8', color: '#92660a', borderRadius: 12, padding: '12px 16px', marginBottom: 16, fontSize: 14 }}>
          This form was already {entry.status}. Editing it changes the record that was decided on.
        </div>
      )}
      {template.description && <p style={{ margin: '0 0 24px', color: '#7a7a8c' }}>{template.description}</p>}

      {error && (
        <div style={{ background: '#fdecea', border: '1px solid #f5c2c0', color: '#b42318', borderRadius: 12, padding: '12px 16px', marginBottom: 20, fontSize: 14 }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <article className="panel" style={{ padding: 24, marginBottom: 20, display: 'grid', gridTemplateColumns: FIELD_COLUMNS, gap: '18px 24px', alignItems: 'start' }}>
          {template.fields.map(field => (
            // Long Text and multi-select choices need the full row; everything
            // else is a single control that reads fine beside its neighbour.
            <div key={field.id} style={isWideField(field) ? { gridColumn: '1 / -1' } : undefined}>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, fontSize: 14 }}>
                {field.label}{field.required && <span style={{ color: '#d7263d' }}> *</span>}
              </label>
              <DynamicField
                field={field}
                value={values[field.id]}
                onChange={(val) => setFieldValue(field.id, val)}
                employees={employees}
                signerName={signerName}
              />
            </div>
          ))}
        </article>

        <div style={{ display: 'grid', gridTemplateColumns: FIELD_COLUMNS, gap: 20, marginBottom: 20, alignItems: 'start' }}>
          <article className="panel" style={{ padding: 24 }}>
            <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, fontSize: 14 }}>
              Related Employee (Approver)<span style={{ color: '#d7263d' }}> *</span>
            </label>
            <select
              value={relatedEmployeeId}
              onChange={e => setRelatedEmployeeId(e.target.value)}
              style={{ width: '100%', padding: '12px 15px', border: '2px solid #e0e0e6', borderRadius: 12, fontSize: 14, cursor: 'pointer', boxSizing: 'border-box' }}
            >
              <option value="">Select an employee…</option>
              {employees.map(emp => (
                <option key={emp.id} value={emp.id}>{emp.full_name || emp.name} {emp.department_name ? `— ${emp.department_name}` : ''}</option>
              ))}
            </select>
            <p style={{ margin: '8px 0 0', fontSize: 12, color: '#7a7a8c' }}>
              This person will need to approve or reject the form once submitted.
            </p>
          </article>

          <article className="panel" style={{ padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, gap: 12 }}>
              <label style={{ fontWeight: 600, fontSize: 14 }}>Attachments</label>
              <button type="button" className="ghost-btn small" onClick={addAttachment}>+ Add Attachment</button>
            </div>
            {storedAttachments.map((file, index) => (
              <div key={`stored-${index}`} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                <span style={{ flex: 1, minWidth: 0, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  📎 {file.file_name || file.file_path}
                </span>
                <button
                  type="button"
                  className="ghost-btn small"
                  onClick={() => setStoredAttachments(prev => prev.filter((_, i) => i !== index))}
                >
                  Remove
                </button>
              </div>
            ))}
            {attachments.length === 0 && storedAttachments.length === 0 ? (
              <p style={{ margin: 0, fontSize: 13, color: '#7a7a8c' }}>No attachments added yet.</p>
            ) : attachments.map((file, index) => (
              <div key={index} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                <input
                  type="file"
                  onChange={(e) => updateAttachment(index, e.target.files[0])}
                  style={{ flex: 1, minWidth: 0, fontSize: 13 }}
                />
                <button type="button" className="ghost-btn small" onClick={() => removeAttachment(index)}>Remove</button>
              </div>
            ))}
          </article>
        </div>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
          <Link to={isEdit ? `${base}/entries/${entryId}` : `${base}/entries`} style={{ textDecoration: 'none' }}>
            <button type="button" className="ghost-btn">Cancel</button>
          </Link>
          <button type="submit" className="primary-btn" disabled={submitting}>
            {submitting
              ? (isEdit ? 'Saving…' : 'Submitting…')
              : (isEdit ? 'Save Changes' : 'Submit Form')}
          </button>
        </div>
      </form>
    </div>
  )
}

export default FormFiller
