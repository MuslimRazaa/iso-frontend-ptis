import React, { useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import ptisLogo from '/ptisLogo.png'

const iconPaths = {
  home:    'M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z',
  entries: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zM13 3.5 18.5 9H13V3.5zM8 18v-2h8v2H8zm0-4v-2h8v2H8zm0-4V8h5v2H8z',
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
  const location = useLocation()

  // Detect whether this layout is mounted under /user/* (user side) or /job-log/* (admin)
  const isUserSide      = location.pathname.startsWith('/user')
  const homePath        = isUserSide ? '/user/job-log'         : '/job-log'
  const entriesPath     = isUserSide ? '/user/job-log/entries' : '/job-log/entries'
  const dashboardPath   = isUserSide ? '/user/dashboard'       : '/dashboard'

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

        {/* Job Entries */}
        <div className="menu-group">
          <NavLink
            to={entriesPath}
            className={({ isActive }) => `menu-trigger link${isActive ? ' active' : ''}`}
          >
            <SidebarIcon id="entries" />
            <span className="menu-label">Job Entries</span>
            <i aria-hidden="true" />
          </NavLink>
        </div>
      </nav>

      {/* Back to Dashboard at bottom */}
      <div style={{
        marginTop: 'auto',
        padding: '12px 18px',
        borderTop: '1px solid #e6e6eb',
      }}>
        <NavLink
          to={dashboardPath}
          className="menu-trigger link"
          style={{ opacity: 0.65 }}
        >
          <SidebarIcon id="back" />
          <span className="menu-label">Back to Dashboard</span>
          <i aria-hidden="true" />
        </NavLink>
      </div>
    </aside>
  )
}

export default JLRSidebar
