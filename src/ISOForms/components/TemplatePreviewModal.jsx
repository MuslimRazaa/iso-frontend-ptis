import React, { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { API_ENDPOINTS } from '../../config/api'

// Preview shows the template's ACTUAL PDF, not a rebuilt approximation — it is
// the same document filled forms are generated from, so what an admin sees
// here is exactly what downloads later.
function TemplatePreviewModal({ template, onClose }) {
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

export default TemplatePreviewModal
