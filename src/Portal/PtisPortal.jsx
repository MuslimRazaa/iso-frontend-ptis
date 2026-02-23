import React from 'react'
import { Outlet } from 'react-router-dom'
import PortalHeader from './Portal-header-sidebar/PortalHeader'
import PortalSidebar from './Portal-header-sidebar/PortalSidebar'

function PtisPortal() {
  return (
    <div className="lms-shell">
      <div className="lms-shell__pattern" aria-hidden="true" />
      <div className="lms-shell__grid">
        <PortalSidebar />
        <div className="lms-main">
          <PortalHeader />
          <section className="lms-content">
            <Outlet />
          </section>
        </div>
      </div>
    </div>
  )
}

export default PtisPortal
