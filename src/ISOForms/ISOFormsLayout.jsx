import React from 'react'
import { Outlet } from 'react-router-dom'
import ISOFormsSidebar from './ISOFormsSidebar'

function ISOFormsLayout() {
  return (
    <div className="lms-shell">
      {/* same subtle pattern as LMS/JLR */}
      <div className="lms-shell__pattern" aria-hidden="true" />

      <div className="lms-shell__grid">
        {/* ISO Forms-specific sidebar */}
        <ISOFormsSidebar />

        {/* Content area — no extra padding, pages handle their own spacing */}
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0,
          overflowX: 'hidden',
          overflowY: 'auto',
          position: 'relative',
        }}>
          <Outlet />
        </div>
      </div>
    </div>
  )
}

export default ISOFormsLayout
