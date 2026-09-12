import React from 'react'
import { Outlet } from 'react-router-dom'
import LmsSidebar from './LMS-header-sidebar/LmsSidebar'

function LearningManagementSystem() {
  return (
    <div className="lms-shell">
      <div className="lms-shell__pattern" aria-hidden="true" />
      <div className="lms-shell__grid">
        <LmsSidebar />
        <div className="lms-main">
          <section className="lms-content">
            <Outlet />
          </section>
        </div>
      </div>
    </div>
  )
}

export default LearningManagementSystem