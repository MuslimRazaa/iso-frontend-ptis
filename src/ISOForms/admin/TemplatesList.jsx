import React, { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { API_ENDPOINTS } from '../../config/api'
import { SEED_TEMPLATES, SEED_VERSION } from '../seedTemplates'
import { ensureSeeded, getOfflineTemplates, deleteOfflineTemplate } from '../utils/offlineStore'

function TemplatesList() {
  const location = useLocation()
  const isUserSide = location.pathname.startsWith('/user')
  const base = isUserSide ? '/user/iso-forms' : '/iso-forms'

  const [templates, setTemplates] = useState([])
  const [loading, setLoading] = useState(true)
  const [offline, setOffline] = useState(false)
  const [error, setError] = useState('')

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
        // No backend yet — fall back to the local demo store so the page is still usable.
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
        <Link to={`${base}/templates/new`} style={{ textDecoration: 'none' }}>
          <button className="primary-btn">+ New Template</button>
        </Link>
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
                      </div>
                      {t.description && <div style={{ fontSize: 13, color: '#7a7a8c', marginTop: 2 }}>{t.description}</div>}
                    </td>
                    <td style={{ padding: '16px 20px', color: '#595966' }}>{fieldCount} field{fieldCount === 1 ? '' : 's'}</td>
                    <td style={{ padding: '16px 20px', color: '#595966' }}>{t.created_by_name || t.created_by || '—'}</td>
                    <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                      <Link to={`${base}/new/${t.id}`} style={{ textDecoration: 'none', marginRight: 10 }}>
                        <button type="button" className="ghost-btn small">Fill</button>
                      </Link>
                      <Link to={`${base}/templates/${t.id}/edit`} style={{ textDecoration: 'none', marginRight: 10 }}>
                        <button type="button" className="ghost-btn small">Edit</button>
                      </Link>
                      <button type="button" className="ghost-btn small" onClick={() => handleDelete(t.id)}>Delete</button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </article>
    </div>
  )
}

export default TemplatesList
