import React, { useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import ptisLogo from '/ptisLogo.png'

const iconPaths = {
  home:    'M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z',
  entries: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zM13 3.5 18.5 9H13V3.5zM8 18v-2h8v2H8zm0-4v-2h8v2H8zm0-4V8h5v2H8z',
  backups: 'M12 3C7.58 3 4 4.34 4 6v12c0 1.66 3.58 3 8 3s8-1.34 8-3V6c0-1.66-3.58-3-8-3zm6 15c0 .35-2.13 1.5-6 1.5s-6-1.15-6-1.5v-2.23C7.61 15.55 9.66 16 12 16s4.39-.45 6-.77V18zm0-4.5c0 .35-2.13 1.5-6 1.5s-6-1.15-6-1.5v-2.23C7.61 11.05 9.66 11.5 12 11.5s4.39-.45 6-.77v2.77zM12 9C8.13 9 6 7.85 6 7.5S8.13 6 12 6s6 1.15 6 1.5S15.87 9 12 9z',
  audit:   'M9 12h6v2H9v-2zm0-4h6v2H9V8zm0 8h4v2H9v-2zM7 2h10a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zm0 2v16h10V4H7z',
  back:    'M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z',
}

const SidebarIcon = ({ id }) => (
  <span className="menu-icon" aria-hidden="true">
    <svg viewBox="0 0 24 24" focusable="false">
      <path d={iconPaths[id] || iconPaths.home} />
    </svg>
  </span>
)

function JLRSidebar() {
  const [isExpanded, setIsExpanded] = useState(false)
  const [entriesMenuOpen, setEntriesMenuOpen] = useState(false)
  const [auditMenuOpen, setAuditMenuOpen] = useState(false)
  const [backupsMenuOpen, setBackupsMenuOpen] = useState(false)
  const location = useLocation()

  // Detect whether this layout is mounted under /user/* (user side) or /job-log/* (admin)
  const isUserSide      = location.pathname.startsWith('/user')
  const homePath        = isUserSide ? '/user/job-log'         : '/job-log'
  const entriesPath     = isUserSide ? '/user/job-log/entries' : '/job-log/entries'
  const dashboardPath   = isUserSide ? '/user/dashboard'       : '/dashboard'
  const backupsPath     = '/job-log/backups' // admin-only
  const auditLogPath    = '/job-log/audit-log' // admin-only

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
        {/* Module label — only visible when expanded */}
        <div style={{
          overflow: 'hidden',
          opacity: isExpanded ? 1 : 0,
          transition: 'opacity 0.22s',
          whiteSpace: 'nowrap',
        }}>
          <span style={{
            fontSize: 10, fontWeight: 800, letterSpacing: '1.4px',
            textTransform: 'uppercase', color: '#d7263d',
          }}>
            Job Log
          </span>
          <div style={{ fontSize: 11, color: '#9a9aaa', marginTop: 1 }}>
            Description
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="sidebar-menu">
        {/* Section label */}
        <div style={{
          padding: '16px 18px 6px',
          overflow: 'hidden',
          opacity: isExpanded ? 1 : 0,
          transition: 'opacity 0.2s',
          whiteSpace: 'nowrap',
          pointerEvents: 'none',
        }}>
          <span style={{
            fontSize: 9, fontWeight: 700, letterSpacing: '1.6px',
            textTransform: 'uppercase', color: '#b0b0c0',
          }}>
            Navigation
          </span>
        </div>

        {/* Overview */}
        <div className="menu-group">
          <NavLink
            to={homePath}
            end
            className={({ isActive }) => `menu-trigger link${isActive ? ' active' : ''}`}
          >
            <SidebarIcon id="home" />
            <span className="menu-label">Overview</span>
            <i aria-hidden="true" />
          </NavLink>
        </div>

        {/* Job Entries — a dropdown since the page offers two distinct entry
            points (jump straight to Add, or just browse the list). */}
        <div className="menu-group">
          <button
            type="button"
            className={`menu-trigger ${entriesMenuOpen ? 'open' : ''}`}
            onClick={() => setEntriesMenuOpen((prev) => !prev)}
          >
            <SidebarIcon id="entries" />
            <span className="menu-label">Job Entries</span>
            <i />
          </button>
          <ul className={`submenu ${entriesMenuOpen ? 'visible' : ''}`}>
            <li>
              <NavLink to={`${entriesPath}?add=1`}>Add New Entry</NavLink>
            </li>
            <li>
              <NavLink to={entriesPath} end>View Entries</NavLink>
            </li>
          </ul>
        </div>

        {/* Backups — admin side only */}
        {!isUserSide && (
          <div className="menu-group">
            <button
              type="button"
              className={`menu-trigger ${backupsMenuOpen ? 'open' : ''}`}
              onClick={() => setBackupsMenuOpen((prev) => !prev)}
            >
              <SidebarIcon id="backups" />
              <span className="menu-label">Backups</span>
              <i />
            </button>
            <ul className={`submenu ${backupsMenuOpen ? 'visible' : ''}`}>
              <li>
                <NavLink to={backupsPath}>View Backups</NavLink>
              </li>
            </ul>
          </div>
        )}

        {/* Audit Log — admin side only */}
        {!isUserSide && (
          <div className="menu-group">
            <button
              type="button"
              className={`menu-trigger ${auditMenuOpen ? 'open' : ''}`}
              onClick={() => setAuditMenuOpen((prev) => !prev)}
            >
              <SidebarIcon id="audit" />
              <span className="menu-label">Audit Log</span>
              <i />
            </button>
            <ul className={`submenu ${auditMenuOpen ? 'visible' : ''}`}>
              <li>
                <NavLink to={auditLogPath}>View Audit Log</NavLink>
              </li>
            </ul>
          </div>
        )}
      </nav>
    </aside>
  )
}

export default JLRSidebar
