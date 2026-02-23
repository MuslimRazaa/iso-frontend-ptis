import React, { useState } from "react";
import { Link, NavLink } from "react-router-dom";
import ptisLogo from "/ptisLogo.png";

const iconPaths = {
  dashboard: "M3 10h7V3H3zm11 0h7V3h-7zm0 11h7v-8h-7zm-11 0h7v-5H3z",
  addClient: "M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z",
  insertRecord: "M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm4 18H6V4h7v5h5v11zm-3-7v2H9v-2h6zm0 4v2H9v-2h6z",
  allRecords: "M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14zm-7-2h2V7h-2v10zm-4 0h2v-7H8v7zm8 0h2v-4h-2v4z",
  pdf: "M20 2H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-8.5 7.5c0 .83-.67 1.5-1.5 1.5H9v2H7.5V7H10c.83 0 1.5.67 1.5 1.5v1zm5 2c0 .83-.67 1.5-1.5 1.5h-2.5V7H15c.83 0 1.5.67 1.5 1.5v3zm4-3H19v1h1.5V11H19v2h-1.5V7h3v1.5zM9 9.5h1v-1H9v1zM4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm10 5.5h1v-3h-1v3z",
  admin: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z",
  home: "M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z",
};

const menuConfig = [
  {
    id: "dashboard",
    label: "Dashboard",
    path: "/portal",
  },
  {
    id: "addClient",
    label: "Add Client",
    path: "/portal/add-client",
  },
  {
    id: "insertRecord",
    label: "Insert Record",
    path: "/portal/insert-record",
  },
  {
    id: "allRecords",
    label: "All Records",
    path: "/portal/all-records",
  },
  {
    id: "pdf",
    label: "Unprocessed Records",
    path: "/portal/unprocessed-records",
  },
  {
    id: "admin",
    label: "Add Admin",
    path: "/portal/add-admin",
  },
];

const SidebarIcon = ({ id }) => (
  <span className="menu-icon" aria-hidden="true">
    <svg viewBox="0 0 24 24" focusable="false">
      <path d={iconPaths[id] || iconPaths.dashboard} />
    </svg>
  </span>
);

function PortalSidebar() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [openMenus, setOpenMenus] = useState({});

  const handleToggle = (id) => {
    setOpenMenus((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <aside
      className={`lms-sidebar ${isExpanded ? "expanded" : "collapsed"}`}
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => setIsExpanded(false)}
    >
      <div className="sidebar-brand">
        <div className="brand-logo" aria-hidden="true">
          <Link to="/dashboard"><img src={ptisLogo} alt="PTIS" /></Link>
        </div>
      </div>
      <nav className="sidebar-menu">
        {menuConfig.map((menu) => (
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
                end
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

export default PortalSidebar;
