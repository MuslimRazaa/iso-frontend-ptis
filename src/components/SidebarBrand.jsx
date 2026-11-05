import React from 'react'
import { Link } from 'react-router-dom'
import ptisLogo from '/ptisLogo.png'
import './SidebarBrand.css'

// The logo and the name beside it at the top of every module sidebar. Both go to the module
// owner's main page, and both share one hover (SidebarBrand.css), so a change to how the brand
// looks or behaves is made here once instead of in each sidebar.
//   to       — the main page for whoever is signed in (admin or employee side)
//   label    — the module's name, first line
//   caption  — second line, smaller
//   variant  — 'dark' for the employee panel's dark sidebar, which has its own layout classes
function SidebarBrand({ to, label, caption, variant }) {
  if (variant === 'dark') {
    return (
      <div className="user-sidebar-brand">
        <Link to={to} className="user-sidebar-logo" title="Back to main page">
          <img src={ptisLogo} alt="PTIS" />
        </Link>
        <Link to={to} className="user-sidebar-brand-text" title="Back to main page">{label}</Link>
      </div>
    )
  }

  return (
    <div className="sidebar-brand">
      <div className="brand-logo">
        <Link to={to} title="Back to main page" aria-label="Back to main page">
          <img src={ptisLogo} alt="PTIS" />
        </Link>
      </div>
      {/* The text only shows while the sidebar is open (see .lms-sidebar.expanded in style.css). */}
      <div className="sidebar-fade-text" style={{ overflow: 'hidden', whiteSpace: 'nowrap' }}>
        <Link to={to} title="Back to main page" className="brand-home-link">
          <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '1.4px', textTransform: 'uppercase', color: '#d7263d' }}>{label}</span>
          {caption && <div style={{ fontSize: 11, color: '#9a9aaa', marginTop: 1 }}>{caption}</div>}
        </Link>
      </div>
    </div>
  )
}

export default SidebarBrand
