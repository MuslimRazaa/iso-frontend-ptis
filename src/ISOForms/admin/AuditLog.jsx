import React, { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import AuditLogView from '../../components/AuditLogView'

// This page is mounted on both the admin and user route trees (an
// iso_forms_admin permission can be granted to a user-side account), so —
// exactly like TemplateBuilder — it checks admin status itself and bounces a
// non-admin straight back rather than relying on the route tree alone to
// keep it private.
const ISO_FORMS_ACTIONS = ['create', 'update', 'delete', 'approve', 'reject']

function AuditLog() {
  const navigate = useNavigate()
  const location = useLocation()
  const isUserSide = location.pathname.startsWith('/user')
  const base = isUserSide ? '/user/iso-forms' : '/iso-forms'

  const isAdmin = !isUserSide || (() => {
    try { return JSON.parse(localStorage.getItem('userPermissions') || '{}').iso_forms_admin === true } catch { return false }
  })()

  useEffect(() => {
    if (!isAdmin) navigate(`${base}/entries`, { replace: true })
  }, [isAdmin])

  if (!isAdmin) return null

  return (
    <AuditLogView
      module="iso_forms"
      title="Audit Log"
      subtitle="Every template and form action — submitted, edited, deleted, approved or rejected."
      actions={ISO_FORMS_ACTIONS}
      backTo={`${base}/templates`}
    />
  )
}

export default AuditLog
