import React, { useState, useEffect } from "react";
import { Link, NavLink } from "react-router-dom";
import ptisLogo from "/ptisLogo.png";

const iconPaths = {
  dashboard: "M3 10h7V3H3zm11 0h7V3h-7zm0 11h7v-8h-7zm-11 0h7v-5H3z",
  course: "M6 5h12a2 2 0 0 1 2 2v13l-6-3.2L9 20 3 17.3V7a2 2 0 0 1 2-2z",
  certificate: "M12 2 9.5 7 4 7.5 8 11l-1 5 5-2.5 5 2.5-1-5 4-3.5-5.5-.5z",
  testing: "M9 12h6m-6 4h6M7 3h10a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zm2 3h6v2H9z",
  tasks: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4",
  lms: "M6 5h12a2 2 0 0 1 2 2v13l-6-3.2L9 20 3 17.3V7a2 2 0 0 1 2-2z",
  portal: "M3 10h7V3H3zm11 0h7V3h-7zm0 11h7v-8h-7zm-11 0h7v-5H3z",
  reports: "M5 4h14v2H5zm0 4h9v2H5zm0 4h14v2H5zm0 4h9v2H5z",
  help: "M12 3a9 9 0 1 0 9 9 9 9 0 0 0-9-9zm0 13h-2v-2h2zm1.94-5.06-.99.95A3 3 0 0 0 12 14h-2v-.38a4.64 4.64 0 0 1 1.31-3.31l1.12-1.16A1.31 1.31 0 0 0 11.83 7 1.51 1.51 0 0 0 10 8.5H8a3.5 3.5 0 0 1 6.75-1.31 3 3 0 0 1-.81 3.75z",
};

const menuConfig = [
  {
    id: "dashboard",
    label: "Dashboard",
    path: "/user/dashboard",
  },
  {
    id: "course",
    label: "My Learning",
    children: [
      { label: "My Courses", path: "/user/my-courses" },
      { label: "My Certificates", path: "/user/my-certificates" },
    ],
  },
  {
    id: "testing",
    label: "Testing & Assessments",
    path: "/user/testing",
  },
  {
    id: "tasks",
    label: "Task Allocations",
    path: "/user/task-allocations",
  },
];

const SidebarIcon = ({ id }) => (
  <span className="menu-icon" aria-hidden="true">
    <svg viewBox="0 0 24 24" focusable="false">
      <path d={iconPaths[id] || iconPaths.dashboard} />
    </svg>
  </span>
);

function UserSidebar() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [openMenus, setOpenMenus] = useState(() =>
    menuConfig.reduce((state, menu) => {
      if (menu.children?.length) state[menu.id] = menu.id === "course";
      return state;
    }, {})
  );
  const [userPermissions, setUserPermissions] = useState({
    lms: false,
    portal: false,
    reports: false
  });

  useEffect(() => {
    const permissions = JSON.parse(localStorage.getItem('userPermissions') || '{}');
    setUserPermissions(permissions);
  }, []);

  const handleToggle = (id) => {
    setOpenMenus((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Add permission-based menu items dynamically
  const dynamicMenuConfig = [...menuConfig];
  
  if (userPermissions.lms || userPermissions.portal || userPermissions.reports) {
    const permissionBasedMenu = [];
    
    if (userPermissions.lms) {
      permissionBasedMenu.push({ label: "LMS Portal", path: "/learning-management-system" });
    }
    if (userPermissions.portal) {
      permissionBasedMenu.push({ label: "PTIS Portal", path: "/portal" });
    }
    if (userPermissions.reports) {
      permissionBasedMenu.push({ label: "Reports & Analytics", path: "/user/reports" });
    }

    if (permissionBasedMenu.length > 0) {
      dynamicMenuConfig.push({
        id: "portal",
        label: "Access Modules",
        children: permissionBasedMenu,
      });
    }
  }

  // Add help/support
  dynamicMenuConfig.push({
    id: "help",
    label: "Help & Support",
    path: "/user/help",
  });

  return (
    <aside
      className={`lms-sidebar ${isExpanded ? "expanded" : "collapsed"}`}
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => setIsExpanded(false)}
    >
      <div className="sidebar-brand">
        <div className="brand-logo" aria-hidden="true">
          <Link to="/user/dashboard"><img src={ptisLogo} alt="PTIS" /></Link>
        </div>
      </div>
      <nav className="sidebar-menu">
        {dynamicMenuConfig.map((menu) => (
          <div key={menu.id} className="menu-group">
            {menu.children?.length ? (
              <>
                <button
                  type="button"
                  className={`menu-trigger ${openMenus[menu.id] ? "open" : ""}`}
                  onClick={() => handleToggle(menu.id)}
                >
                  <SidebarIcon id={menu.id} />
                  <span className="menu-label">{menu.label}</span>
                  <i />
                </button>
                <ul className={`submenu ${openMenus[menu.id] ? "visible" : ""}`}>
                  {menu.children.map((child) => (
                    <li key={child.label}>
                      {child.path ? (
                        <NavLink to={child.path}>{child.label}</NavLink>
                      ) : (
                        <span>{child.label}</span>
                      )}
                    </li>
                  ))}
                </ul>
              </>
            ) : menu.path ? (
              <NavLink
                to={menu.path}
                className={({ isActive }) =>
                  `menu-trigger link ${isActive ? "active" : ""}`
                }
              >
                <SidebarIcon id={menu.id} />
                <span className="menu-label">{menu.label}</span>
                <i aria-hidden="true" />
              </NavLink>
            ) : (
              <div className="menu-trigger disabled">
                <SidebarIcon id={menu.id} />
                <span className="menu-label">{menu.label}</span>
              </div>
            )}
          </div>
        ))}
      </nav>
    </aside>
  );
}

export default UserSidebar;
