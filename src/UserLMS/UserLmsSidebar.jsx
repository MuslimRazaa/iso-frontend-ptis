import React, { useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import ptisLogo from '/ptisLogo.png'

const BASE = '/user/learning-management-system'
const DASHBOARD = '/user/dashboard'

const iconPaths = {
  home:     'M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z',
  mycourse: 'M6 5h12a2 2 0 0 1 2 2v13l-6-3.2L9 20 3 17.3V7a2 2 0 0 1 2-2z',
  history:  'M13 3a9 9 0 0 0-9 9H1l4 4 4-4H6a7 7 0 1 1 7 7 6.97 6.97 0 0 1-4.9-2L6.7 17.4A9 9 0 1 0 13 3zm-1 5v5l4.25 2.52.75-1.23-3.5-2.08V8H12z',
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
  { id: 'home',     label: 'Dashboard',  path: BASE,                  end: true  },
  { id: 'mycourse', label: 'Courses',    path: `${BASE}/my-courses`,  end: false },
  { id: 'history',  label: 'History',    path: `${BASE}/history`,     end: false },
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
    </aside>
  )
}

export default UserLmsSidebar
