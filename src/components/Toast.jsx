import React, { useEffect, useState } from 'react'
import { CheckCircle, XCircle, Info, Loader } from 'lucide-react'
import { addToast, removeToast, subscribeToasts, getToastsSnapshot } from '../utils/toastStore'

// Site-wide toast — same white-card / tinted-icon look as the rest of the
// app's status badges and error banners (see FormEntriesList's StatusBadge,
// the panel error banners), not a saturated color-gradient popup. One
// <ToastHost /> is mounted once in App.jsx so every module — including the
// login screen, before any route-specific layout exists — can raise a toast
// just by calling showToast(), without mounting its own host or threading a
// callback down through props.
const AUTO_CLOSE_MS = 3000

const TYPE_STYLES = {
  success: { iconColor: '#1a7f4e', iconBg: '#e7f6ec', icon: <CheckCircle size={18} /> },
  error:   { iconColor: '#b42318', iconBg: '#fdecea', icon: <XCircle size={18} /> },
  info:    { iconColor: '#2c4f86', iconBg: '#eef4ff', icon: <Info size={18} /> },
  loading: { iconColor: '#b54708', iconBg: '#fff7e6', icon: <Loader size={18} className="site-toast-spin" /> },
}

function Toast({ message, type = 'info', onClose }) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    setTimeout(() => setIsVisible(true), 10)
    const timer = setTimeout(() => {
      setIsVisible(false)
      setTimeout(onClose, 300)
    }, AUTO_CLOSE_MS)
    return () => clearTimeout(timer)
  }, [onClose])

  const isNarrowViewport = typeof window !== 'undefined' && window.innerWidth <= 768
  const typeStyle = TYPE_STYLES[type] || TYPE_STYLES.info

  return (
    <>
      <style>{`
        @keyframes siteToastSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .site-toast-spin { animation: siteToastSpin 1s linear infinite; }
      `}</style>
      <div
        style={{
          position: 'fixed',
          top: isNarrowViewport ? 12 : 20,
          right: isVisible ? (isNarrowViewport ? 12 : 20) : -400,
          zIndex: 999999,
          minWidth: isNarrowViewport ? 'calc(100vw - 24px)' : 300,
          maxWidth: isNarrowViewport ? 'calc(100vw - 24px)' : 450,
          padding: '13px 16px',
          borderRadius: 12,
          display: 'flex',
          alignItems: 'center',
          gap: 11,
          fontSize: 14,
          fontWeight: 500,
          boxShadow: '0 8px 24px rgba(15, 23, 42, 0.12)',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          background: '#ffffff',
          color: '#14141c',
          border: '1px solid #ececf0',
          fontFamily: 'inherit',
        }}
      >
        <div style={{
          flexShrink: 0, width: 28, height: 28, borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: typeStyle.iconBg, color: typeStyle.iconColor,
        }}>
          {typeStyle.icon}
        </div>
        <div style={{ flex: 1, lineHeight: 1.4 }}>{message}</div>
      </div>
    </>
  )
}

// Mount once, near the root of the app (see App.jsx) — every showToast() call
// anywhere in the tree renders here regardless of which route is active.
export function ToastHost() {
  const [toasts, setToasts] = useState(() => getToastsSnapshot())

  useEffect(() => subscribeToasts(setToasts), [])

  return (
    <>
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          onClose={() => removeToast(toast.id)}
        />
      ))}
    </>
  )
}

// The call site for every other module: showToast('Saved!', 'success').
export function showToast(message, type = 'info') {
  const id = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
  addToast({ id, message, type })
}

export default ToastHost
