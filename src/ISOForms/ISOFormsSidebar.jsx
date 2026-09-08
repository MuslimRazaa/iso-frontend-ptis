import React, { useEffect, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import ptisLogo from '/ptisLogo.png'
import { API_ENDPOINTS } from '../config/api'
import { getCurrentEmployeeId } from './utils/currentEmployee'
import { getOfflineEntries } from './utils/offlineStore'

const iconPaths = {
  home:      'M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z',
  templates: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zM13 3.5 18.5 9H13V3.5zM8 18v-2h8v2H8zm0-4v-2h8v2H8zm0-4V8h5v2H8z',
  entries:   'M5 4h14v2H5zm0 5h14v2H5zm0 5h9v2H5z',
  pending:   'M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm1 11h5v2h-7V7h2z',
  audit:     'M9 12h6v2H9v-2zm0-4h6v2H9V8zm0 8h4v2H9v-2zM7 2h10a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zm0 2v16h10V4H7z',
}

const SidebarIcon = ({ id }) => (
  <span className="menu-icon" aria-hidden="true">
    <svg viewBox="0 0 24 24" focusable="false">
      <path d={iconPaths[id] || iconPaths.home} />
    </svg>
  </span>
)

function ISOFormsSidebar() {
  const [isExpanded, setIsExpanded] = useState(false)
  const [pendingCount, setPendingCount] = useState(0)
  const location = useLocation()

  const isUserSide   = location.pathname.startsWith('/user')
  const base         = isUserSide ? '/user/iso-forms' : '/iso-forms'
  const dashboardPath = isUserSide ? '/user/dashboard' : '/dashboard'

  const isPendingMineView = location.pathname === `${base}/entries` && new URLSearchParams(location.search).get('filter') === 'pending-mine'
  const isAllFormsView    = location.pathname === `${base}/entries` && !isPendingMineView

  let isAdminUser = !isUserSide
  try {
    const perms = JSON.parse(localStorage.getItem('userPermissions') || '{}')
    if (perms.iso_forms_admin) isAdminUser = true
  } catch { /* ignore malformed cache */ }

  useEffect(() => {
    let active = true
    getCurrentEmployeeId().then(employeeId => {
      if (!active) return
      if (!employeeId) {
        const pending = getOfflineEntries().filter(e => (e.status || 'pending') === 'pending')
        setPendingCount(isAdminUser ? pending.length : 0)
        return
      }
      fetch(`${API_ENDPOINTS.ISO_FORMS_ENTRIES}/pending-count?employeeId=${employeeId}${isAdminUser ? '&admin=1' : ''}`)
        .then(res => (res.ok ? res.json() : Promise.reject()))
        .then(json => { if (active) setPendingCount(json?.count ?? 0) })
        .catch(() => {
          const pending = getOfflineEntries().filter(e =>
            (e.status || 'pending') === 'pending' &&
            (isAdminUser || String(e.related_employee_id) === String(employeeId)))
          if (active) setPendingCount(pending.length)
        })
    })
    return () => { active = false }
  }, [isAdminUser])

  return (
    <aside
      className={`lms-sidebar ${isExpanded ? 'expanded' : 'collapsed'}`}
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => setIsExpanded(false)}
    >
      {/* Brand / Logo */}
      <div className="sidebar-brand">
        <div className="brand-logo" aria-hidden="true">
          <Link to={dashboardPath}>
            <img src={ptisLogo} alt="PTIS" />
          </Link>
        </div>
        <div className="sidebar-fade-text" style={{ overflow: 'hidden', whiteSpace: 'nowrap' }}>
          <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '1.4px', textTransform: 'uppercase', color: '#d7263d' }}>ISO</span>
          <div style={{ fontSize: 11, color: '#9a9aaa', marginTop: 1 }}>Forms</div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="sidebar-menu">
        <div className="sidebar-fade-text" style={{ padding: '16px 18px 6px', overflow: 'hidden', whiteSpace: 'nowrap', pointerEvents: 'none' }}>
          <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '1.6px', textTransform: 'uppercase', color: '#b0b0c0' }}>Navigation</span>
        </div>

        {/* Overview */}
        <div className="menu-group">
          <NavLink
            to={base}
            end
            className={({ isActive }) => `menu-trigger link${isActive ? ' active' : ''}`}
          >
            <SidebarIcon id="home" />
            <span className="menu-label">Overview</span>
            <i aria-hidden="true" />
          </NavLink>
        </div>

        {/* Form Templates — admin/template-builder only */}
        {isAdminUser && (
          <div className="menu-group">
            <NavLink
              to={`${base}/templates`}
              className={({ isActive }) => `menu-trigger link${isActive ? ' active' : ''}`}
            >
              <SidebarIcon id="templates" />
              <span className="menu-label">Form Templates</span>
              <i aria-hidden="true" />
            </NavLink>
          </div>
        )}

        {/* Audit Log — admin only */}
        {isAdminUser && (
          <div className="menu-group">
            <NavLink
              to={`${base}/audit-log`}
              className={({ isActive }) => `menu-trigger link${isActive ? ' active' : ''}`}
            >
              <SidebarIcon id="audit" />
              <span className="menu-label">Audit Log</span>
              <i aria-hidden="true" />
            </NavLink>
          </div>
        )}

        {/* All Forms */}
        <div className="menu-group">
          <Link
            to={`${base}/entries`}
            className={`menu-trigger link${isAllFormsView ? ' active' : ''}`}
          >
            <SidebarIcon id="entries" />
            <span className="menu-label">All Forms</span>
            <i aria-hidden="true" />
          </Link>
        </div>

        {/* Pending Approvals */}
        <div className="menu-group">
          <Link
            to={`${base}/entries?filter=pending-mine`}
            className={`menu-trigger link${isPendingMineView ? ' active' : ''}`}
          >
            <SidebarIcon id="pending" />
            <span className="menu-label">Pending Approvals</span>
            {pendingCount > 0 && (
              <span style={{
                marginLeft: 'auto', minWidth: 18, height: 18, borderRadius: 9,
                background: '#d7263d', color: '#fff', fontSize: 11, fontWeight: 700,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                padding: '0 5px',
              }}>{pendingCount}</span>
            )}
            <i aria-hidden="true" />
          </Link>
        </div>
      </nav>
    </aside>
  )
}

export default ISOFormsSidebar
