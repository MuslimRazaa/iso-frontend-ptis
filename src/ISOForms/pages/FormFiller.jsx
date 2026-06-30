import React, { useEffect, useState } from 'react'
import { Link, useNavigate, useParams, useLocation } from 'react-router-dom'
import { API_ENDPOINTS } from '../../config/api'
import DynamicField from '../components/DynamicField'
import { isFieldEmpty } from '../utils/fieldHelpers'
import { SEED_TEMPLATES, SEED_VERSION, SEED_EMPLOYEES } from '../seedTemplates'
import { ensureSeeded, getOfflineTemplates, getOfflineTemplate, addOfflineEntry } from '../utils/offlineStore'
import { getCurrentEmployeeId } from '../utils/currentEmployee'
import { fileToDataUrl } from '../utils/fileToDataUrl'

function FormFiller() {
  const { templateId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const isUserSide = location.pathname.startsWith('/user')
  const base = isUserSide ? '/user/iso-forms' : '/iso-forms'

  const [templates, setTemplates] = useState([])
  const [template, setTemplate] = useState(null)
  const [loadingTemplates, setLoadingTemplates] = useState(!templateId)
  const [loadingTemplate, setLoadingTemplate] = useState(Boolean(templateId))

  const [values, setValues] = useState({})
  const [attachments, setAttachments] = useState([])
  const [employees, setEmployees] = useState([])
  const [relatedEmployeeId, setRelatedEmployeeId] = useState('')

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [offline, setOffline] = useState(false)

  // Template picker (when no templateId is in the URL)
  useEffect(() => {
    if (templateId) return
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
  }, [templateId])

  // Load the selected template's field schema
  useEffect(() => {
    if (!templateId) return
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
    fetch(`${API_ENDPOINTS.ISO_FORMS_TEMPLATES}/${templateId}`)
      .then(res => (res.ok ? res.json() : Promise.reject()))
      .then(json => applyTemplate(json, false))
      .catch(() => {
        ensureSeeded(SEED_TEMPLATES, SEED_VERSION)
        applyTemplate(getOfflineTemplate(templateId), true)
      })
      .finally(() => { if (active) setLoadingTemplate(false) })
    return () => { active = false }
  }, [templateId])

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
    const missing = template.fields.filter(f => f.required && isFieldEmpty(f, values[f.id]))
    if (missing.length) { setError(`Please fill: ${missing.map(f => f.label).join(', ')}`); return }
    if (!relatedEmployeeId) { setError('Please select the employee this form is related to.'); return }

    setSubmitting(true)
    try {
      const formData = new FormData()
      formData.append('template_id', template.id)
      formData.append('form_data', JSON.stringify(values))
      formData.append('related_employee_id', relatedEmployeeId)
      attachments.forEach(file => { if (file) formData.append('attachments', file) })

      const res = await fetch(API_ENDPOINTS.ISO_FORMS_ENTRIES, { method: 'POST', body: formData })
      if (!res.ok) throw new Error('submit failed')
    } catch {
      // No backend yet — record the submission in the local demo store instead.
      const relatedEmployee = employees.find(emp => String(emp.id) === String(relatedEmployeeId))
      const myEmployeeId = await getCurrentEmployeeId()
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
        form_data: JSON.stringify(values),
        related_employee_id: relatedEmployeeId,
        related_employee_name: relatedEmployee?.full_name || relatedEmployee?.name || '',
        created_by: myEmployeeId || localStorage.getItem('userEmail') || '',
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
  if (!templateId) {
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

  if (loadingTemplate) return <div style={{ padding: 40 }}>Loading form…</div>
  if (!template) return <div style={{ padding: 40, color: '#b42318' }}>Could not load this form template.</div>

  return (
    <div style={{ padding: 'clamp(24px, 4vw, 48px)', maxWidth: 860, margin: '0 auto' }}>
      <p className="eyebrow" style={{ margin: 0 }}>ISO Forms</p>
      <h1 style={{ margin: '4px 0 8px', fontSize: 26, fontWeight: 800, color: '#14141c' }}>{template.name}</h1>
      {template.description && <p style={{ margin: '0 0 24px', color: '#7a7a8c' }}>{template.description}</p>}

      {error && (
        <div style={{ background: '#fdecea', border: '1px solid #f5c2c0', color: '#b42318', borderRadius: 12, padding: '12px 16px', marginBottom: 20, fontSize: 14 }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <article className="panel" style={{ padding: 24, marginBottom: 20, display: 'grid', gap: 18 }}>
          {template.fields.map(field => (
            <div key={field.id}>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, fontSize: 14 }}>
                {field.label}{field.required && <span style={{ color: '#d7263d' }}> *</span>}
              </label>
              <DynamicField field={field} value={values[field.id]} onChange={(val) => setFieldValue(field.id, val)} employees={employees} />
            </div>
          ))}
        </article>

        <article className="panel" style={{ padding: 24, marginBottom: 20 }}>
          <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, fontSize: 14 }}>
            Related Employee (Approver)<span style={{ color: '#d7263d' }}> *</span>
          </label>
          <select
            value={relatedEmployeeId}
            onChange={e => setRelatedEmployeeId(e.target.value)}
            style={{ width: '100%', padding: '12px 15px', border: '2px solid #e0e0e6', borderRadius: 12, fontSize: 14, cursor: 'pointer' }}
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

        <article className="panel" style={{ padding: 24, marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <label style={{ fontWeight: 600, fontSize: 14 }}>Attachments</label>
            <button type="button" className="ghost-btn small" onClick={addAttachment}>+ Add Attachment</button>
          </div>
          {attachments.length === 0 ? (
            <p style={{ margin: 0, fontSize: 13, color: '#7a7a8c' }}>No attachments added yet.</p>
          ) : attachments.map((file, index) => (
            <div key={index} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
              <input
                type="file"
                onChange={(e) => updateAttachment(index, e.target.files[0])}
                style={{ flex: 1, fontSize: 13 }}
              />
              <button type="button" className="ghost-btn small" onClick={() => removeAttachment(index)}>Remove</button>
            </div>
          ))}
        </article>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
          <Link to={`${base}/entries`} style={{ textDecoration: 'none' }}>
            <button type="button" className="ghost-btn">Cancel</button>
          </Link>
          <button type="submit" className="primary-btn" disabled={submitting}>
            {submitting ? 'Submitting…' : 'Submit Form'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default FormFiller
