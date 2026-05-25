import React, { useState } from "react";
import { Link, NavLink } from "react-router-dom";
import ptisLogo from "/ptisLogo.png";

const iconPaths = {
  dashboard: "M3 10h7V3H3zm11 0h7V3h-7zm0 11h7v-8h-7zm-11 0h7v-5H3z",
  course: "M6 5h12a2 2 0 0 1 2 2v13l-6-3.2L9 20 3 17.3V7a2 2 0 0 1 2-2z",
  employee: "M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4zm0 2c-4.42 0-8 1.79-8 4v2h16v-2c0-2.21-3.58-4-8-4z",
  standards: "M5 6h14v2H5zm0 5h14v2H5zm0 5h9v2H5z",
  questions: "M12 3a9 9 0 1 0 9 9 9 9 0 0 0-9-9zm0 13h-2v-2h2zm1.94-5.06-.99.95A3 3 0 0 0 12 14h-2v-.38a4.64 4.64 0 0 1 1.31-3.31l1.12-1.16A1.31 1.31 0 0 0 11.83 7 1.51 1.51 0 0 0 10 8.5H8a3.5 3.5 0 0 1 6.75-1.31 3 3 0 0 1-.81 3.75z",
  assesments: "M5 4h14v2H5zm0 4h9v2H5zm0 4h14v2H5zm0 4h9v2H5z",
  certificate: "M12 2 9.5 7 4 7.5 8 11l-1 5 5-2.5 5 2.5-1-5 4-3.5-5.5-.5z",
  joblog: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm-1 1.5L18.5 9H13V3.5zM8 18v-2h8v2H8zm0-4v-2h8v2H8zm0-4V8h5v2H8z",
};

const menuConfig = [
  {
    id: "dashboard",
    label: "Dashboard",
    path: "/learning-management-system",
  },
   {
    id: "standards",
    label: "Set Standards",
    children: [
      { label: "Configure Standards", path: "/learning-management-system/set-standards" },
    ],
  },
  {
    id: "course",
    label: "Courses",
    children: [
      { label: "Add Course", path: "/learning-management-system/add-course" },
      { label: "All Courses", path: "/learning-management-system/all-courses" },
      { label: "Task Allocation", path: "/learning-management-system/task-allocation" },
      { label: "Course Categories", path: "/learning-management-system/course-categories" },
    ],
  },
  {
    id: "employee",
    label: "Employees",
    children: [
      { label: "Add Employee", path: "/learning-management-system/add-employee" },
      { label: "All Employees", path: "/learning-management-system/all-employees" },
    ],
  },
  {
    id: "questions",
    label: "Question Bank",
    children: [
      { label: "Add Questions", path: "/learning-management-system/question-bank" },
      { label: "View All Questions", path: "/learning-management-system/question-bank/view-all" },
    ],
  },
  // {
  //   id: "assesments",
  //   label: "Assessments",
  //   children: [
  //     { label: "Add Test", path: null },
  //     { label: "View All Tests", path: null },
  //   ],
  // },
  {
    id: "certificate",
    label: "Certificates",
    path: "/learning-management-system/certificates",
  },
];

const SidebarIcon = ({ id }) => (
  <span className="menu-icon" aria-hidden="true">
    <svg viewBox="0 0 24 24" focusable="false">
      <path d={iconPaths[id] || iconPaths.dashboard} />
    </svg>
  </span>
);

function LmsSidebar() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [openMenus, setOpenMenus] = useState(() =>
    menuConfig.reduce((state, menu) => {
      if (menu.children?.length) state[menu.id] = menu.id === "course";
      return state;
    }, {})
  );

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

export default LmsSidebar;
