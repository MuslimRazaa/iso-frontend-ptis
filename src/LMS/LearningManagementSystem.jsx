import React from 'react'
import { Outlet } from 'react-router-dom'
import LmsHeader from './LMS-header-sidebar/LmsHeader'
import LmsSidebar from './LMS-header-sidebar/LmsSidebar'

function LearningManagementSystem() {
  return (
    <div className="lms-shell">
      <div className="lms-shell__pattern" aria-hidden="true" />
      <div className="lms-shell__grid">
        <LmsSidebar />
        <div className="lms-main">
          <LmsHeader />
          <section className="lms-content">
            <Outlet />
          </section>
        </div>
      </div>
    </div>
  )
}

export default LearningManagementSystem