import React, { useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import ptisLogo from '/ptisLogo.png'

const BASE = '/user/learning-management-system'
const DASHBOARD = '/user/dashboard'

const iconPaths = {
  home:     'M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z',
  tasks:    'M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 0 2-2h2a2 2 0 0 0 2 2m-6 9 2 2 4-4',
  browse:   'M4 6h16v2H4zm0 5h16v2H4zm0 5h16v2H4z',
  mycourse: 'M6 5h12a2 2 0 0 1 2 2v13l-6-3.2L9 20 3 17.3V7a2 2 0 0 1 2-2z',
  back:     'M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z',
}

const SidebarIcon = ({ id }) => (
  <span className="menu-icon" aria-hidden="true">
    <svg viewBox="0 0 24 24" focusable="false">
      <path d={iconPaths[id] || iconPaths.home} />
    </svg>
  </span>
)

const navItems = [
  { id: 'home',     label: 'Overview',       path: BASE,                   end: true  },
  { id: 'tasks',    label: 'My Tasks',        path: `${BASE}/my-tasks`,    end: false },
  { id: 'browse',   label: 'Browse Courses',  path: `${BASE}/all-courses`, end: false },
  { id: 'mycourse', label: 'My Courses',      path: `${BASE}/my-courses`,  end: false },
]

function UserLmsSidebar() {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <aside
      className={`lms-sidebar ${isExpanded ? 'expanded' : 'collapsed'}`}
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => setIsExpanded(false)}
    >
      {/* Brand */}
      <div className="sidebar-brand">
        <div className="brand-logo" aria-hidden="true">
          <Link to={DASHBOARD}>
            <img src={ptisLogo} alt="PTIS" />
          </Link>
        </div>
        <div style={{
          overflow: 'hidden',
          opacity: isExpanded ? 1 : 0,
          transition: 'opacity 0.22s',
          whiteSpace: 'nowrap',
        }}>
          <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '1.4px',
            textTransform: 'uppercase', color: '#d7263d' }}>
            LMS
          </span>
          <div style={{ fontSize: 11, color: '#9a9aaa', marginTop: 1 }}>
            Learning Portal
          </div>
        </div>
      </div>

      {/* Section label */}
      <nav className="sidebar-menu">
        <div style={{
          padding: '16px 18px 6px',
          overflow: 'hidden',
          opacity: isExpanded ? 1 : 0,
          transition: 'opacity 0.2s',
          whiteSpace: 'nowrap',
          pointerEvents: 'none',
        }}>
          <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '1.6px',
            textTransform: 'uppercase', color: '#b0b0c0' }}>
            My Learning
          </span>
        </div>

        {navItems.map(item => (
          <div key={item.id} className="menu-group">
            <NavLink
              to={item.path}
              end={item.end}
              className={({ isActive }) => `menu-trigger link${isActive ? ' active' : ''}`}
            >
              <SidebarIcon id={item.id} />
              <span className="menu-label">{item.label}</span>
              <i aria-hidden="true" />
            </NavLink>
          </div>
        ))}
      </nav>

      {/* Back to Dashboard */}
      <div style={{ marginTop: 'auto', padding: '12px 18px', borderTop: '1px solid #e6e6eb' }}>
        <NavLink to={DASHBOARD} className="menu-trigger link" style={{ opacity: 0.65 }}>
          <SidebarIcon id="back" />
          <span className="menu-label">Back to Dashboard</span>
          <i aria-hidden="true" />
        </NavLink>
      </div>
    </aside>
  )
}

export default UserLmsSidebar
