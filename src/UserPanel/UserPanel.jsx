import React from 'react';
import { Outlet } from 'react-router-dom';
import UserHeader from './User-header-sidebar/UserHeader';

// The employee home has no side menu: its module cards are the way in, and the
// account menu in the header carries Logout. (Each module has its own layout.)
const UserPanel = () => {
  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#0e0f14' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <UserHeader />
        <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', minWidth: 0 }}>
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default UserPanel;
