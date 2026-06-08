import React from 'react'
import { Outlet } from 'react-router-dom'
import UserLmsSidebar from './UserLmsSidebar'

function UserLmsLayout() {
  return (
    <div className="lms-shell">
      <div className="lms-shell__pattern" aria-hidden="true" />
      <div className="lms-shell__grid">
        <UserLmsSidebar />
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

export default UserLmsLayout
