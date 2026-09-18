import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../assets/style.css";
import ptisLogo from "/ptisLogo.png";
import SystemMap from "../components/SystemMap";
import { API_ENDPOINTS, API_BASE_URL } from "../config/api";
import { summarise, averageCompletion } from "../LMS/utils/courseProgressState";

const dashboardTiles = [
  {
    id: "portal",
    title: "Portal",
    link: "/portal",
    description: "Centralize department shortcuts and SOPs in one place.",
    status: "online",
    statusLabel: "Live",
    metric: "24 quick links curated",
  },
  {
    id: "lms",
    title: "LMS",
    link: "/learning-management-system",
    description: "Monitor training, compliance and renewal windows.",
    status: "sync",
    statusLabel: "Syncing",
    metric: "Loading…",
  },
  {
    id: "testing",
    title: "Testing & Certification",
    link: "/testing",
    description: "Conduct standard-based tests and issue certificates.",
    status: "online",
    statusLabel: "Live",
    metric: "Loading…",
  },
  {
    id: "cv-gen",
    title: "Job Log Description",
    link: "/job-log",
    description: "Track inspection activities and field job entries.",
    status: "online",
    statusLabel: "Live",
    metric: "Loading…",
  },
  {
    id: "iso",
    title: "ISO Forms",
    link: "/iso-forms",
    description: "Quick access to QA/QC controlled documentation.",
    status: "attention",
    statusLabel: "Review",
    metric: "Loading…",
  },
  {
    id: "premier-erp",
    title: "Premier ERP",
    // A separate application on its own domain, not a route inside this app —
    // opened in a new tab rather than routed to internally.
    link: "https://erp.ptis.co/",
    external: true,
    description: "Sales, procurement, HR/payroll and the full ISO compliance stack — CRM, audits, NCR/CAPA, risk and HSE in one system.",
    status: "online",
    statusLabel: "Live",
    metric: "Company-wide operations & compliance",
  },
  // {
  //   id: "cv-bid",
  //   title: "Bid CV Library",
  //   link: "",
  //   description: "Recently curated CVs for tender submissions.",
  //   status: "online",
  //   statusLabel: "Live",
  //   metric: "6 tenders in play",
  // },
  // {
  //   id: "power-bi",
  //   title: "Power BI Dashboards",
  //   link: "",
  //   description: "Track operations KPIs and live financial snapshots.",
  //   status: "sync",
  //   statusLabel: "Syncing",
  //   metric: "Updated 4 mins ago",
  // },
];

const defaultQuickStats = [
  { label: "Number of Inspections", value: "26K", status: "ok" },
  { label: "LMS Completion", value: "87%", status: "ok" },
  { label: "Active Clients", value: "12", status: "warning" },
];

const systemNodes = [
  { id: "portal", label: "Portal", x: 12, y: 32, tag: "Access" },
  { id: "lms", label: "LMS", x: 37, y: 18, tag: "Training" },
  { id: "cv-gen", label: "Job Log Description", x: 64, y: 30, tag: "Delivery" },
  { id: "iso", label: "ISO Forms", x: 54, y: 65, tag: "Compliance" },
  { id: "cv-bid", label: "Bid CV Library", x: 28, y: 65, tag: "Bid Desk" },
  { id: "power-bi", label: "Power BI", x: 80, y: 58, tag: "Insights" },
];

const systemConnections = [
  { from: "portal", to: "lms", status: "stable" },
  { from: "lms", to: "cv-gen", status: "stable" },
  { from: "cv-gen", to: "cv-bid", status: "degraded" },
  { from: "portal", to: "iso", status: "stable" },
  { from: "iso", to: "power-bi", status: "stable" },
  { from: "cv-bid", to: "power-bi", status: "stable" },
];

const renderTileIcon = (type) => {
  switch (type) {
    case "portal":
      return (
        <svg viewBox="0 0 48 48" role="img" aria-hidden="true">
          <rect x="6" y="8" width="36" height="28" rx="6" />
          <path d="M6 20h36" />
          <circle cx="16" cy="14" r="2" />
          <circle cx="22" cy="14" r="2" />
        </svg>
      );
    case "lms":
      return (
        <svg viewBox="0 0 48 48" role="img" aria-hidden="true">
          <path d="M8 14h32v22H8z" />
          <path d="M8 18h32" />
          <circle cx="18" cy="10" r="4" />
        </svg>
      );
    case "cv-gen":
      return (
        <svg viewBox="0 0 48 48" role="img" aria-hidden="true">
          <rect x="10" y="8" width="28" height="32" rx="4" />
          <path d="M16 16h16M16 22h12M16 28h10" />
          <circle cx="24" cy="34" r="2.5" />
        </svg>
      );
    case "iso":
      return (
        <svg viewBox="0 0 48 48" role="img" aria-hidden="true">
          <polygon points="24 6 40 18 32 42 16 42 8 18" />
          <circle cx="24" cy="23" r="5" />
        </svg>
      );
    case "cv-bid":
      return (
        <svg viewBox="0 0 48 48" role="img" aria-hidden="true">
          <rect x="8" y="10" width="32" height="28" rx="6" />
          <path d="M16 10v28M32 10v28" />
          <circle cx="24" cy="24" r="4.5" />
        </svg>
      );
    case "premier-erp":
      return (
        <svg viewBox="0 0 48 48" role="img" aria-hidden="true">
          <rect x="8" y="6" width="32" height="36" rx="4" />
          <path d="M8 18h32M8 30h32" />
          <path d="M17 24l4 4 8-8" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 48 48" role="img" aria-hidden="true">
          <rect x="8" y="12" width="32" height="24" rx="6" />
          <path d="M8 24h32" />
          <circle cx="24" cy="30" r="3" />
        </svg>
      );
  }
};

const DEFAULT_TILE_ORDER = dashboardTiles.map((t) => t.id);

const loadTileOrder = () => {
  try {
    const stored = JSON.parse(localStorage.getItem("dashboardTileOrder") || "null");
    if (Array.isArray(stored) && stored.length) return stored;
  } catch { /* corrupt/missing — fall back to default */ }
  return DEFAULT_TILE_ORDER;
};

const loadHiddenTiles = () => {
  try {
    const stored = JSON.parse(localStorage.getItem("dashboardHiddenTiles") || "null");
    if (Array.isArray(stored)) return stored;
  } catch { /* corrupt/missing — fall back to none hidden */ }
  return [];
};

// "X mins ago" against the moment the dashboard's data actually last loaded,
// not a fixed string no fetch ever touched.
const formatSyncedAgo = (date) => {
  if (!date) return "Syncing…";
  const mins = Math.floor((Date.now() - date.getTime()) / 60000);
  if (mins < 1) return "Live telemetry synced just now";
  if (mins === 1) return "Live telemetry synced 1 min ago";
  return `Live telemetry synced ${mins} mins ago`;
};

function MainDashboard() {
  const [showSystemMap, setShowSystemMap] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [courses, setCourses] = useState([]);
  const [quickStats, setQuickStats] = useState(defaultQuickStats);
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [loadingStats, setLoadingStats] = useState(true);
  const [tileMetrics, setTileMetrics] = useState({});
  const [lastSyncedAt, setLastSyncedAt] = useState(null);
  const [, setSyncTick] = useState(0);
  const [showCustomize, setShowCustomize] = useState(false);
  const [tileOrder, setTileOrder] = useState(loadTileOrder);
  const [hiddenTiles, setHiddenTiles] = useState(loadHiddenTiles);
  const navigate = useNavigate();

  // Re-renders the "synced X mins ago" line as time passes, without
  // refetching anything.
  useEffect(() => {
    const id = setInterval(() => setSyncTick((t) => t + 1), 30000);
    return () => clearInterval(id);
  }, []);

  // Tiles the admin has hidden/reordered via "Customize Grid", reconciled
  // with the live tile list so a newly added module still shows up even if
  // it didn't exist when this browser last saved an order.
  const orderedTileIds = [
    ...tileOrder.filter((id) => dashboardTiles.some((t) => t.id === id)),
    ...DEFAULT_TILE_ORDER.filter((id) => !tileOrder.includes(id)),
  ];
  const orderedTiles = orderedTileIds.map((id) => dashboardTiles.find((t) => t.id === id)).filter(Boolean);
  const visibleTiles = orderedTiles.filter((t) => !hiddenTiles.includes(t.id));

  const toggleTileVisibility = (id) => {
    setHiddenTiles((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      localStorage.setItem("dashboardHiddenTiles", JSON.stringify(next));
      return next;
    });
  };

  const moveTile = (id, direction) => {
    setTileOrder(() => {
      const current = orderedTileIds;
      const idx = current.indexOf(id);
      const swapIdx = idx + direction;
      if (idx === -1 || swapIdx < 0 || swapIdx >= current.length) return current;
      const next = [...current];
      [next[idx], next[swapIdx]] = [next[swapIdx], next[idx]];
      localStorage.setItem("dashboardTileOrder", JSON.stringify(next));
      return next;
    });
  };

  const resetGridCustomization = () => {
    localStorage.removeItem("dashboardTileOrder");
    localStorage.removeItem("dashboardHiddenTiles");
    setTileOrder(DEFAULT_TILE_ORDER);
    setHiddenTiles([]);
  };

  // Fetch courses from API
  useEffect(() => {
    const fetchCourses = async () => {
      try {
        setLoadingCourses(true);
        const response = await fetch(API_ENDPOINTS.COURSES);
        if (response.ok) {
          const data = await response.json();
          // Get only published courses and limit to 6 for display
          const publishedCourses = data
            .filter(course => course.is_published === true || course.is_published === 1)
            .slice(0, 6);
          setCourses(publishedCourses);
        }
      } catch (error) {
        console.error('Error fetching courses:', error);
      } finally {
        setLoadingCourses(false);
      }
    };

    const fetchStats = async () => {
      try {
        setLoadingStats(true);
        const [coursesRes, employeesRes, standardsRes] = await Promise.all([
          fetch(API_ENDPOINTS.COURSES),
          fetch(API_ENDPOINTS.EMPLOYEES),
          fetch(API_ENDPOINTS.STANDARDS)
        ]);

        const coursesData = coursesRes.ok ? await coursesRes.json() : [];
        const employeesData = employeesRes.ok ? await employeesRes.json() : [];
        const standardsData = standardsRes.ok ? await standardsRes.json() : [];

        const publishedCourses = coursesData.filter(c => c.is_published === true || c.is_published === 1).length;

        setQuickStats([
          { label: "Active Courses", value: publishedCourses, status: "ok" },
          { label: "Total Employees", value: employeesData.length, status: "ok" },
          { label: "Standards", value: standardsData.length, status: "ok" },
        ]);
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setLoadingStats(false);
      }
    };

    // Each module card's line above "Enter Dashboard" reports real numbers
    // from that module's own data — the same sources its own pages use —
    // instead of fixed text no data ever fed.
    const fetchTileMetrics = async () => {
      try {
        const [progressRes, jobLogRes, testingRes, standardsRes, isoTemplatesRes, isoPendingRes] = await Promise.all([
          fetch(`${API_ENDPOINTS.COURSE_PROGRESS}/admin/all`),
          fetch(API_ENDPOINTS.JOB_LOG),
          fetch(`${API_BASE_URL}/api/test-results/legacy`),
          fetch(API_ENDPOINTS.STANDARDS),
          fetch(API_ENDPOINTS.ISO_FORMS_TEMPLATES),
          fetch(`${API_ENDPOINTS.ISO_FORMS_ENTRIES}/pending-count?admin=1`),
        ]);

        const progressJson = progressRes.ok ? await progressRes.json() : null;
        const progressRows = Array.isArray(progressJson?.data) ? progressJson.data : [];
        const progress = summarise(progressRows);
        const avgCompletion = averageCompletion(progressRows);
        const lmsMetric = progress.total
          ? `${avgCompletion}% average completion · ${progress.total} enrolment${progress.total === 1 ? '' : 's'}`
          : "No enrolments yet";

        const jobLogJson = jobLogRes.ok ? await jobLogRes.json() : null;
        const jobLogRows = Array.isArray(jobLogJson?.data) ? jobLogJson.data : (Array.isArray(jobLogJson) ? jobLogJson : []);
        const norm = (s) => (s || '').toString().toLowerCase();
        const pendingJobs = jobLogRows.filter(e => ['pending', ''].includes(norm(e.status))).length;
        const jobLogMetric = jobLogRows.length
          ? `${pendingJobs} pending · ${jobLogRows.length} total entries`
          : "No job entries yet";

        const testingRows = testingRes.ok ? await testingRes.json() : [];
        const testingList = Array.isArray(testingRows) ? testingRows : [];
        const standardsData = standardsRes.ok ? await standardsRes.json() : [];
        const testingMetric = (Array.isArray(standardsData) ? standardsData.length : 0) || testingList.length
          ? `${Array.isArray(standardsData) ? standardsData.length : 0} standards · ${testingList.length} assessments recorded`
          : "No assessments recorded yet";

        const isoTemplatesJson = isoTemplatesRes.ok ? await isoTemplatesRes.json() : null;
        const isoTemplates = Array.isArray(isoTemplatesJson?.data) ? isoTemplatesJson.data : [];
        const isoPendingJson = isoPendingRes.ok ? await isoPendingRes.json() : null;
        const isoPending = isoPendingJson?.count ?? 0;
        const isoMetric = isoTemplates.length
          ? `${isoTemplates.length} template${isoTemplates.length === 1 ? '' : 's'} · ${isoPending} awaiting approval`
          : "No form templates yet";

        setTileMetrics({ lms: lmsMetric, "cv-gen": jobLogMetric, testing: testingMetric, iso: isoMetric });
      } catch (error) {
        console.error('Error fetching tile metrics:', error);
      }
    };

    Promise.allSettled([fetchCourses(), fetchStats(), fetchTileMetrics()])
      .then(() => setLastSyncedAt(new Date()));
  }, []);

  const handleSystemMapToggle = () => setShowSystemMap((prev) => !prev);
  const handleModuleClick = (moduleId) => {
    const selected = dashboardTiles.find((tile) => tile.id === moduleId);
    if (!selected?.link) {
      console.log(`Launchpad selected: ${moduleId}`);
      return;
    }
    // An external tile points at a whole separate application on its own
    // domain — navigate() would try to route to it as if it were a path
    // inside this app, which is wrong for an absolute URL. It opens in a new
    // tab instead, so this dashboard is never navigated away from.
    if (selected.external) {
      window.open(selected.link, "_blank", "noopener,noreferrer");
      return;
    }
    navigate(selected.link);
  };
  const toggleUserMenu = () => setShowUserMenu((prev) => !prev);
  const handleLogout = () => {
    setShowUserMenu(false);
    // Clear identity, not the dashboard's own layout prefs (tile order/hidden
    // tiles) — those are per-browser UI customization, not session state.
    // Leaving identity behind is what let one admin's audit-log actions show
    // up under whichever employee had last logged in on that same laptop.
    localStorage.removeItem('userType');
    localStorage.removeItem('adminPassword');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userEmployeeId');
    localStorage.removeItem('userFullName');
    localStorage.removeItem('userPermissions');
    navigate("/");
  };

  return (
    <div className="dashboard-shell">
      <header className="dashboard-header">
        <div className="brand-cluster">
          <div className="brand-logo">
            <img src={ptisLogo} alt="PTIS" />
          </div>
          <div>
            <p className="brand-label">PTIS Enterprise Hub</p>
            <span className="brand-caption">Admin Command Surface</span>
          </div>
        </div>
        <div className="header-controls">
          <button className="ghost-btn" onClick={handleSystemMapToggle}>
            System Map
          </button>
          <span className="divider-dot" />
          <div className="user-menu-wrapper">
            <button className="user-chip" onClick={toggleUserMenu}>
              <span className="chip-label">Admin</span>
              <strong>Operations</strong>
            </button>
            {showUserMenu && (
              <div className="user-menu">
                <button type="button" onClick={handleLogout}>
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="dashboard-content">
        <section className="hero-row">
          <article className="intro-panel">
            <p className="eyebrow">Welcome back</p>
            <h1>Orchestrate PTIS systems from one control room.</h1>
            <p>
              Launch critical tools, review compliance signals, and keep
              inspection projects aligned within seconds of logging in.
            </p>
            <div className="cta-row">
              {/* <button className="primary-btn">Create Task</button>
              <button className="ghost-btn">View Schedule</button> */}
            </div>
          </article>

          <article className="status-panel">
            <h2>Operational Status</h2>
            <ul>
              {loadingStats ? (
                <li className="status-pill ok">
                  <span>Loading...</span>
                </li>
              ) : (
                quickStats.map((item) => (
                  <li key={item.label} className={`status-pill ${item.status}`}>
                    <span>{item.label}</span>
                    <strong>{item.value}</strong>
                  </li>
                ))
              )}
            </ul>
            <div className="status-footer">
              <span className="pulse" />
              {formatSyncedAgo(lastSyncedAt)}
            </div>
          </article>
        </section>

        <section>
          <div className="section-heading">
            <div>
              <p className="eyebrow">Launchpads</p>
              <h2>Primary Modules</h2>
            </div>
            <button className="ghost-btn" onClick={() => setShowCustomize(true)}>Customize Grid</button>
          </div>

          {visibleTiles.length === 0 ? (
            <div style={{
              padding: '60px 20px', textAlign: 'center', background: 'rgba(0,0,0,0.02)',
              borderRadius: '16px', border: '2px dashed rgba(0,0,0,0.1)',
            }}>
              <p style={{ margin: 0, color: '#7a7a8c' }}>Every module is hidden.</p>
              <button className="ghost-btn" style={{ marginTop: 12 }} onClick={() => setShowCustomize(true)}>
                Customize Grid
              </button>
            </div>
          ) : (
          <div className="module-grid">
            {visibleTiles.map((tile) => (
              <button
                type="button"
                key={tile.id}
                className={`module-card ${tile.status}`}
                onClick={() => handleModuleClick(tile.id)}
                aria-label={`Open ${tile.title} dashboard`}
              >
                <div className="module-top-row">
                  <div className="module-icon">{renderTileIcon(tile.id)}</div>
                  <span className={`module-status ${tile.status}`}>
                    {tile.statusLabel}
                  </span>
                </div>
                <div className="module-meta">
                  <h3>{tile.title}</h3>
                  <p>{tile.description}</p>
                </div>
               <div className="module-footer">
                  <span className="module-metric">{tileMetrics[tile.id] || tile.metric}</span>
                  {tile.external ? (
                    // The card's own onClick already opens this in a new tab;
                    // without stopping the click here it would bubble up and
                    // open a second one.
                    <a
                      href={tile.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <span className="module-link">
                        Open in New Window
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                          <path d="M5 12h14M13 6l6 6-6 6" />
                        </svg>
                      </span>
                    </a>
                  ) : (
                    <Link to={tile.link}><span className="module-link">
                      Enter Dashboard
                      <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M5 12h14M13 6l6 6-6 6" />
                      </svg>
                    </span></Link>
                  )}
                </div>
              </button>
            ))}
          </div>
          )}
        </section>

        {showCustomize && (
          <div className="modal-overlay" onClick={() => setShowCustomize(false)}>
            <div className="modal-content" style={{ maxWidth: 520 }} onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>Customize Grid</h2>
                <button className="close-modal-btn" onClick={() => setShowCustomize(false)}>✕</button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, overflowY: 'auto' }}>
                {orderedTiles.map((tile, index) => {
                  const isHidden = hiddenTiles.includes(tile.id);
                  return (
                    <div
                      key={tile.id}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 12,
                        padding: '10px 14px', borderRadius: 14,
                        border: '1px solid #ececf0', background: isHidden ? '#fafafb' : '#fff',
                        opacity: isHidden ? 0.55 : 1,
                      }}
                    >
                      <label style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={!isHidden}
                          onChange={() => toggleTileVisibility(tile.id)}
                        />
                        <span style={{ fontWeight: 700, color: '#14141c', fontSize: 14 }}>{tile.title}</span>
                      </label>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button
                          type="button" className="ghost-btn small"
                          disabled={index === 0}
                          onClick={() => moveTile(tile.id, -1)}
                          title="Move up"
                        >↑</button>
                        <button
                          type="button" className="ghost-btn small"
                          disabled={index === orderedTiles.length - 1}
                          onClick={() => moveTile(tile.id, 1)}
                          title="Move down"
                        >↓</button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="modal-actions">
                <button type="button" className="ghost-btn" onClick={resetGridCustomization}>Reset to Default</button>
                <button type="button" className="primary-btn" onClick={() => setShowCustomize(false)}>Done</button>
              </div>
            </div>
          </div>
        )}

        {/* <section>
          <div className="section-heading">
            <div>
              <p className="eyebrow">Learning Management</p>
              <h2>Featured Courses</h2>
            </div>
            <Link to="/learning-management-system/all-courses" className="ghost-btn">
              View All Courses
            </Link>
          </div>

          <div className="courses-grid">
            {loadingCourses ? (
              <div style={{ gridColumn: "1 / -1", textAlign: "center", padding: "2rem" }}>
                <p>Loading courses...</p>
              </div>
            ) : courses.length > 0 ? (
              courses.map((course) => (
                <div key={course.id} className="course-card">
                  <div className="course-thumbnail">
                    {course.course_thumbnail ? (
                      <img 
                        src={`${API_BASE_URL}/${course.course_thumbnail}`} 
                        alt={course.course_title}
                      />
                    ) : (
                      <div className="thumbnail-placeholder">No Image</div>
                    )}
                    <span className="course-badge">{course.credit_hours} Credits</span>
                  </div>
                  <div className="course-content">
                    <h3>{course.course_title}</h3>
                    <p className="course-category">{course.course_category}</p>
                    <p className="course-description">
                      {course.course_description?.substring(0, 100)}...
                    </p>
                    <div className="course-meta">
                      <span>{course.standard_name || 'Standard'}</span>
                      <span>{course.duration_weeks ? `${course.duration_weeks} weeks` : 'Self-paced'}</span>
                    </div>
                    <Link 
                      to={`/learning-management-system/course/${course.id}`}
                      className="course-link"
                    >
                      View Course
                      <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M5 12h14M13 6l6 6-6 6" />
                      </svg>
                    </Link>
                  </div>
                </div>
              ))
            ) : (
              <div style={{ gridColumn: "1 / -1", textAlign: "center", padding: "2rem" }}>
                <p>No published courses available yet.</p>
              </div>
            )}
          </div>
        </section> */}
      </main>
      {showSystemMap && (
        <SystemMap
          modules={systemNodes}
          connections={systemConnections}
          onClose={handleSystemMapToggle}
        />
      )}
    </div>
  );
}

export default MainDashboard;
