import React from 'react'
import { Outlet, Link } from 'react-router-dom'
import ptisLogo from '/ptisLogo.png'

// Standalone shell for Employee Management (moved out of the LMS / Testing
// modules). Reuses the LMS shell styling but has no module sidebar — the logo
// and the button both return to the main dashboard.
function EmployeesLayout() {
  return (
    <div className="lms-shell">
      <div className="lms-shell__pattern" aria-hidden="true" />
      <div className="lms-shell__grid">
        <div className="lms-main">
          <header style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 28,
            gap: 16,
            flexWrap: 'wrap',
          }}>
            <Link to="/dashboard" title="Back to Dashboard" style={{
              display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none',
            }}>
              <img src={ptisLogo} alt="PTIS" style={{ width: 42, height: 42, objectFit: 'contain' }} />
              <span style={{
                fontSize: 13, fontWeight: 800, letterSpacing: '1.4px',
                textTransform: 'uppercase', color: '#d7263d',
              }}>
                Employee Management
              </span>
            </Link>
            <Link to="/dashboard" className="ghost-btn">← Back to Dashboard</Link>
          </header>

          <section className="lms-content">
            <Outlet />
          </section>
        </div>
      </div>
    </div>
  )
}

export default EmployeesLayout
