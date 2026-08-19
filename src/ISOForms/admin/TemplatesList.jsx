import React, { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Eye, Plus, Pencil, Trash2, X } from 'lucide-react'
import { API_ENDPOINTS } from '../../config/api'
import { SEED_TEMPLATES, SEED_VERSION } from '../seedTemplates'
import { ensureSeeded, getOfflineTemplates, deleteOfflineTemplate } from '../utils/offlineStore'

// Preview shows the template's ACTUAL PDF, not a rebuilt approximation — it is
// the same document filled forms are generated from, so what an admin sees
// here is exactly what downloads later.
function PreviewModal({ template, onClose }) {
  const [pdfUrl, setPdfUrl] = useState('')
  const [state, setState] = useState('loading')   // loading | ready | missing

  useEffect(() => {
    let url = ''
    let cancelled = false
    ;(async () => {
      try {
        // The list endpoint omits the base64 PDF (it would be megabytes per
        // row), so fetch the single template to get it.
        let base64 = template.originalPdf
        if (!base64) {
          const res = await fetch(`${API_ENDPOINTS.ISO_FORMS_TEMPLATES}/${template.id}`)
          if (res.ok) base64 = (await res.json()).originalPdf
        }
        if (cancelled) return
        if (!base64) { setState('missing'); return }

        const binary = atob(base64)
        const bytes = new Uint8Array(binary.length)
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
        url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }))
        setPdfUrl(url)
        setState('ready')
      } catch {
        if (!cancelled) setState('missing')
      }
    })()
    return () => { cancelled = true; if (url) URL.revokeObjectURL(url) }
  }, [template])

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)',
      display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
      zIndex: 9999, padding: '32px 16px', overflowY: 'auto',
    }}>
      <div style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 900, position: 'relative' }}>
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '18px 24px', borderBottom: '1px solid #ececf0',
        }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: 17, color: '#14141c' }}>{template.name}</div>
            <div style={{ fontSize: 13, color: '#7a7a8c', marginTop: 2 }}>Original template PDF — blank</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#7a7a8c', display: 'flex' }}>
            <X size={22} />
          </button>
        </div>
        <div style={{ padding: state === 'ready' ? 0 : 24 }}>
          {state === 'loading' && <div style={{ color: '#7a7a8c' }}>Loading PDF…</div>}
          {state === 'missing' && (
            <div style={{ background: '#fff6e5', border: '1px solid #f2d9a0', color: '#8a6100', borderRadius: 12, padding: '14px 16px', fontSize: 14 }}>
              This template has no PDF attached, so it can't be previewed or filled.
              Edit the template and import its PDF.
            </div>
          )}
          {state === 'ready' && (
            <iframe
              src={`${pdfUrl}#toolbar=0&navpanes=0&view=FitH`}
              title={`${template.name} preview`}
              style={{ width: '100%', height: '78vh', border: 'none', display: 'block', borderRadius: '0 0 20px 20px' }}
            />
          )}
        </div>
      </div>
    </div>
  )
}

function TemplatesList() {
  const location = useLocation()
  const isUserSide = location.pathname.startsWith('/user')
  const base = isUserSide ? '/user/iso-forms' : '/iso-forms'

  const isAdmin = !isUserSide || (() => {
    try { return JSON.parse(localStorage.getItem('userPermissions') || '{}').iso_forms_admin === true } catch { return false }
  })()

  const [templates, setTemplates] = useState([])
  const [loading, setLoading] = useState(true)
  const [offline, setOffline] = useState(false)
  const [error, setError] = useState('')
  const [previewTemplate, setPreviewTemplate] = useState(null)

  const load = () => {
    fetch(API_ENDPOINTS.ISO_FORMS_TEMPLATES)
      .then(res => (res.ok ? res.json() : null))
      .then(json => {
        const rows = json?.data ?? json
        if (!Array.isArray(rows)) throw new Error('bad response')
        setTemplates(rows)
        setOffline(false)
        setError('')
      })
      .catch(() => {
        ensureSeeded(SEED_TEMPLATES, SEED_VERSION)
        setTemplates(getOfflineTemplates())
        setOffline(true)
        setError('')
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this template? Forms already submitted from it will keep their data.')) return
    try {
      const res = await fetch(`${API_ENDPOINTS.ISO_FORMS_TEMPLATES}/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('delete failed')
      load()
    } catch {
      deleteOfflineTemplate(id)
      load()
    }
  }


  return (
    <div style={{ padding: 'clamp(24px, 4vw, 48px)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 16, marginBottom: 24 }}>
        <div>
          <p className="eyebrow" style={{ margin: 0 }}>Form Templates</p>
          <h1 style={{ margin: '4px 0 0', fontSize: 26, fontWeight: 800, color: '#14141c' }}>Manage Templates</h1>
        </div>
        {isAdmin && (
          <Link to={`${base}/templates/new`} style={{ textDecoration: 'none' }}>
            <button className="primary-btn">+ New Template</button>
          </Link>
        )}
      </div>

      {offline && (
        <div style={{ background: '#fff7e6', border: '1px solid #ffe1a8', color: '#92660a', borderRadius: 12, padding: '12px 16px', marginBottom: 20, fontSize: 14 }}>
          Demo mode — the ISO Forms backend isn't connected yet, so templates are saved in this browser only.
        </div>
      )}
      {error && (
        <div style={{ background: '#fdecea', border: '1px solid #f5c2c0', color: '#b42318', borderRadius: 12, padding: '12px 16px', marginBottom: 20, fontSize: 14 }}>
          {error}
        </div>
      )}

      <article className="panel" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#7a7a8c' }}>Loading templates…</div>
        ) : templates.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#7a7a8c' }}>
            No templates yet. Create one to let employees start submitting this form.
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#fafafb' }}>
                <th style={{ textAlign: 'left', padding: '14px 20px', fontSize: 12, color: '#7a7a8c', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Name</th>
                <th style={{ textAlign: 'left', padding: '14px 20px', fontSize: 12, color: '#7a7a8c', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Fields</th>
                <th style={{ textAlign: 'left', padding: '14px 20px', fontSize: 12, color: '#7a7a8c', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Created By</th>
                <th style={{ textAlign: 'right', padding: '14px 20px', fontSize: 12, color: '#7a7a8c', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {templates.map(t => {
                const fieldCount = (() => {
                  try {
                    const f = typeof t.fields === 'string' ? JSON.parse(t.fields) : t.fields
                    return Array.isArray(f) ? f.length : 0
                  } catch { return 0 }
                })()
                return (
                  <tr key={t.id} style={{ borderTop: '1px solid #ececf0' }}>
                    <td style={{ padding: '16px 20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontWeight: 700, color: '#14141c' }}>{t.name}</span>
                        {offline && (
                          <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#92660a', background: '#fff7e6', border: '1px solid #ffe1a8', borderRadius: 999, padding: '2px 8px' }}>
                            Demo
                          </span>
                        )}
                        {/* No PDF = no visual base to generate a filled form from. */}
                        {!(t.hasOriginalPdf ?? Boolean(t.originalPdf)) && (
                          <span
                            title="No PDF attached — this template can't be filled or downloaded until an admin imports its PDF."
                            style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#b42318', background: '#fdecea', border: '1px solid #f5c2c0', borderRadius: 999, padding: '2px 8px' }}
                          >
                            Needs PDF
                          </span>
                        )}
                      </div>
                      {t.description && <div style={{ fontSize: 13, color: '#7a7a8c', marginTop: 2 }}>{t.description}</div>}
                    </td>
                    <td style={{ padding: '16px 20px', color: '#595966' }}>{fieldCount} field{fieldCount === 1 ? '' : 's'}</td>
                    <td style={{ padding: '16px 20px', color: '#595966' }}>{t.created_by_name || t.created_by || '—'}</td>
                    <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}>
                        {/* Eye — preview blank form layout */}
                        <button
                          type="button"
                          title="Preview form layout"
                          className="ghost-btn small"
                          onClick={() => setPreviewTemplate(t)}
                        >
                          <Eye size={15} />
                        </button>

                        {/* Plus — fill a new form from this template */}
                        <Link to={`${base}/new/${t.id}`} style={{ textDecoration: 'none' }}>
                          <button type="button" title="Fill new form" className="ghost-btn small">
                            <Plus size={15} />
                          </button>
                        </Link>

                        {/* Admin-only: edit template structure + delete */}
                        {isAdmin && (
                          <>
                            <Link to={`${base}/templates/${t.id}/edit`} style={{ textDecoration: 'none' }}>
                              <button type="button" title="Edit template" className="ghost-btn small">
                                <Pencil size={15} />
                              </button>
                            </Link>
                            <button
                              type="button"
                              title="Delete template"
                              className="ghost-btn small"
                              onClick={() => handleDelete(t.id)}
                            >
                              <Trash2 size={15} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </article>

      {previewTemplate && (
        <PreviewModal template={previewTemplate} onClose={() => setPreviewTemplate(null)} />
      )}
    </div>
  )
}

export default TemplatesList
