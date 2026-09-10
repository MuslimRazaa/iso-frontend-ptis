import React from 'react'
import { useLocation } from 'react-router-dom'
import AuditLogView from '../../components/AuditLogView'

// Admin-only: this route is mounted only under /job-log/*, not /user/job-log/*
// (the same way Backups is), so there is nothing here for a non-admin to
// accidentally land on.
const JLR_ACTIONS = ['create', 'update', 'delete']

function JLRAuditLog() {
  const location = useLocation()
  const isUserSide = location.pathname.startsWith('/user')
  const homePath = isUserSide ? '/user/job-log' : '/job-log'

  return (
    <AuditLogView
      module="jlr"
      title="Audit Log"
      subtitle="Every add, edit and delete recorded against the Job Log register."
      actions={JLR_ACTIONS}
      backTo={homePath}
    />
  )
}

export default JLRAuditLog
