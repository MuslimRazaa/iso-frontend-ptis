import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { API_ENDPOINTS } from '../../config/api';
import { getCurrentEmployeeId } from '../../ISOForms/utils/currentEmployee';
import { summarise, averageCompletion } from '../../LMS/utils/courseProgressState';

const UserDashboard = () => {
    const [userPermissions, setUserPermissions] = useState({});
    const [quickStats, setQuickStats] = useState([
        { label: "My Courses", value: "8", status: "ok" },
        { label: "Completion Rate", value: "62%", status: "ok" },
        { label: "Certificates", value: "3", status: "ok" },
    ]);
    const [loadingStats, setLoadingStats] = useState(false);
    const [courses, setCourses] = useState([]);
    const [loadingCourses, setLoadingCourses] = useState(true);
    const [isoPendingCount, setIsoPendingCount] = useState(0);
    const [lmsMetric, setLmsMetric] = useState('Training module access');
    const [jobLogMetric, setJobLogMetric] = useState('Job log access');

    const userEmail = localStorage.getItem('userEmail') || 'user@ptis.com';
    const userName = userEmail.split('@')[0].replace(/\./g, ' ').split(' ').map(word =>
        word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(' ');


    // "X% of your courses completed" — the same source (and math) as the LMS's
    // own dashboard, scoped to this employee's enrolments only.
    const fetchLmsMetric = async () => {
        try {
            if (!userEmail) return;
            const res = await fetch(`${API_ENDPOINTS.COURSE_PROGRESS}/user/${encodeURIComponent(userEmail)}`);
            if (!res.ok) return;
            const json = await res.json();
            const rows = Array.isArray(json?.data) ? json.data : [];
            const progress = summarise(rows);
            if (!progress.total) { setLmsMetric('No courses started yet'); return; }
            const avg = averageCompletion(rows);
            setLmsMetric(`${avg}% of your courses completed`);
        } catch (error) {
            console.error('Error fetching LMS metric:', error);
        }
    };

    // Job Log entries aren't tied to an employee id, so "yours" is matched by
    // name against the inspector/team fields the register actually records.
    const fetchJobLogMetric = async () => {
        try {
            const res = await fetch(API_ENDPOINTS.JOB_LOG);
            if (!res.ok) return;
            const json = await res.json();
            const rows = Array.isArray(json?.data) ? json.data : (Array.isArray(json) ? json : []);
            if (!rows.length) { setJobLogMetric('No job entries yet'); return; }
            const userFullName = (localStorage.getItem('userFullName') || '').toLowerCase().trim();
            const mine = userFullName
                ? rows.filter(e =>
                    (e.inspector_name || '').toLowerCase().includes(userFullName) ||
                    (e.inspector_team || '').toLowerCase().includes(userFullName)
                ).length
                : 0;
            setJobLogMetric(mine > 0
                ? `${mine} of your job entries logged`
                : `${rows.length} job entries logged company-wide`);
        } catch (error) {
            console.error('Error fetching Job Log metric:', error);
        }
    };

    // Forms routed to this employee that are still awaiting their decision —
    // powers the red badge on the ISO Forms card (same count as the ISO Forms
    // sidebar's "Pending Approvals" link).
    const fetchIsoPendingCount = async () => {
        try {
            const employeeId = await getCurrentEmployeeId();
            if (!employeeId) return;
            const res = await fetch(`${API_ENDPOINTS.ISO_FORMS_ENTRIES}/pending-count?employeeId=${employeeId}`);
            if (!res.ok) return;
            const json = await res.json();
            setIsoPendingCount(json?.count ?? 0);
        } catch (error) {
            console.error('Error fetching ISO Forms pending count:', error);
        }
    };

    const fetchUserPermissions = async () => {
        try {
            const userEmail = localStorage.getItem('userEmail');
            if (!userEmail) return;

            const response = await fetch(`${API_ENDPOINTS.EMPLOYEES}/permissions/email/${userEmail}`);
            if (response.ok) {
                const permissions = await response.json();
                setUserPermissions(permissions);
                
                // Also save to localStorage for quick access
                localStorage.setItem('userPermissions', JSON.stringify(permissions));
            }
        } catch (error) {
            console.error('Error fetching permissions:', error);
            // Fallback to localStorage if API fails
            const permissions = JSON.parse(localStorage.getItem('userPermissions') || '{}');
            setUserPermissions(permissions);
        }
    };

    const fetchCourses = async () => {
        try {
            const response = await fetch(API_ENDPOINTS.COURSES);
            const data = await response.json();

            // Filter published courses and limit to 3
            const publishedCourses = data
                .filter(c => c.is_published === true || c.is_published === 1)
                .slice(0, 3);

            setCourses(publishedCourses);
            setLoadingCourses(false);
        } catch (error) {
            console.error('Error fetching courses:', error);
            setLoadingCourses(false);
        }
    };

    useEffect(() => {
        // Fetch user permissions from backend
        fetchUserPermissions();
        fetchCourses();
        fetchIsoPendingCount();
        fetchLmsMetric();
        fetchJobLogMetric();
    }, []);

    // Define all possible tiles.
    // NOTE: only real MODULES live here. Course/certificate views are part of
    // the LMS itself (shown & handled inside the LMS), so they are NOT cards
    // on this dashboard. Every card below is gated by an assigned permission.
    const allDashboardTiles = [
        {
            id: "lms-access",
            title: "LMS Portal",
            link: "/user/all-courses",
            description: "Full access to Learning Management System features.",
            status: "sync",
            statusLabel: "Active",
            metric: lmsMetric,
            permission: userPermissions.lms,
            icon: "lms"
        },
        {
            id: "portal-access",
            title: "PTIS Portal",
            link: "/portal",
            description: "Access inspection records and client information.",
            status: "online",
            statusLabel: "Live",
            metric: "View records & reports",
            permission: userPermissions.portal,
            icon: "portal"
        },
        {
            id: "cvs-access",
            title: "Job Log Description",
            link: "/user/cvs-access",
            description: "Track inspection activities and field job entries.",
            status: "online",
            statusLabel: "Live",
            metric: jobLogMetric,
            permission: userPermissions.cvs,
            icon: "cv"
        },
        {
            id: "iso-forms",
            title: "ISO Forms",
            link: "/user/iso-forms",
            description: "Quick access to QA/QC controlled documentation.",
            status: isoPendingCount > 0 ? "attention" : "online",
            statusLabel: isoPendingCount > 0 ? "Review" : "Live",
            metric: isoPendingCount > 0
                ? `${isoPendingCount} form${isoPendingCount === 1 ? '' : 's'} awaiting sign-off`
                : "No forms awaiting sign-off",
            permission: userPermissions.iso_forms,
            icon: "iso",
            badge: isoPendingCount > 0 ? isoPendingCount : null
        },
        {
            id: "bid-cv-library",
            title: "Bid CV Library",
            link: "/user/bid-cv-library",
            description: "Recently curated CVs for tender submissions.",
            status: "online",
            statusLabel: "Live",
            metric: "6 tenders in play",
            permission: userPermissions.cvs, // Using cvs permission for bid library access
            icon: "bid-cv"
        },
        {
            id: "reports",
            title: "Power BI Dashboards",
            link: "/user/reports",
            description: "Track operations KPIs and live financial snapshots.",
            status: "sync",
            statusLabel: "Syncing",
            metric: "Analytics dashboard",
            permission: userPermissions.reports,
            icon: "power-bi"
        },
        {
            id: "premier-erp",
            title: "Premier ERP",
            // A separate application on its own domain, opened in a new tab —
            // shown to every user regardless of permissions, same as on the
            // admin dashboard.
            link: "https://erp.ptis.co/",
            external: true,
            description: "Sales, procurement, HR/payroll and the full ISO compliance stack — CRM, audits, NCR/CAPA, risk and HSE in one system.",
            status: "online",
            statusLabel: "Live",
            metric: "Company-wide operations & compliance",
            permission: true,
            icon: "premier-erp"
        }
    ];

    // Filter tiles based on permissions
    const dashboardTiles = allDashboardTiles.filter(tile => tile.permission);

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
            case "certificates":
                return (
                    <svg viewBox="0 0 48 48" role="img" aria-hidden="true">
                        <path d="M6 10h36v28H6z" />
                        <path d="M14 18h20M14 24h20M14 30h12" />
                    </svg>
                );
            case "cv":
                return (
                    <svg viewBox="0 0 48 48" role="img" aria-hidden="true">
                        <path d="M12 6h24v36H12z" />
                        <path d="M18 14h12M18 20h12M18 26h12M18 32h8" />
                    </svg>
                );
            case "iso":
                return (
                    <svg viewBox="0 0 48 48" role="img" aria-hidden="true">
                        <path d="M8 12h32v24H8z" />
                        <path d="M14 20h20M14 26h20M14 32h12" />
                        <circle cx="18" cy="20" r="1.5" />
                        <circle cx="18" cy="26" r="1.5" />
                    </svg>
                );
            case "bid-cv":
                return (
                    <svg viewBox="0 0 48 48" role="img" aria-hidden="true">
                        <rect x="10" y="8" width="28" height="32" rx="2" />
                        <path d="M16 14h16M16 20h16M16 26h10" />
                        <rect x="16" y="30" width="6" height="6" rx="1" />
                    </svg>
                );
            case "power-bi":
                return (
                    <svg viewBox="0 0 48 48" role="img" aria-hidden="true">
                        <rect x="8" y="24" width="8" height="16" />
                        <rect x="20" y="16" width="8" height="24" />
                        <rect x="32" y="8" width="8" height="32" />
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
                        <rect x="6" y="8" width="36" height="28" rx="6" />
                    </svg>
                );
        }
    };

    const handleModuleClick = (moduleId) => {
        const selected = dashboardTiles.find((tile) => tile.id === moduleId);
        if (selected?.external) {
            window.open(selected.link, "_blank", "noopener,noreferrer");
        }
    };

    return (
        <div className="dashboard-shell">
            <main className="dashboard-content">
                <section className="hero-row">
                    <article className="intro-panel">
                        <p className="eyebrow">Hello {userName}</p>
                        <h1>Welcome To PTIS Portal</h1>
                        <p>
                            Launch the modules assigned to you from one place. Your courses,
                            certificates and assessments open inside their respective modules.
                        </p>
                    </article>
                </section>

                <section>
                    <div className="section-heading">
                        <div>
                            <p className="eyebrow">Quick Access</p>
                            <h2>Your Available Modules</h2>
                        </div>
                    </div>

                    {dashboardTiles.length === 0 ? (
                        <div style={{
                            padding: '60px 20px',
                            textAlign: 'center',
                            background: 'rgba(0,0,0,0.02)',
                            borderRadius: '16px',
                            border: '2px dashed rgba(0,0,0,0.1)'
                        }}>
                            <div style={{ fontSize: '64px', marginBottom: '20px', opacity: 0.5 }}>🔒</div>
                            <h3 style={{ marginBottom: '12px', color: '#666' }}>No Modules Assigned</h3>
                            <p style={{ color: '#999', fontSize: '15px' }}>
                                Please contact your administrator to request access to modules.
                            </p>
                        </div>
                    ) : (
                        <div className="module-grid">
                            {dashboardTiles.map((tile) => (
                                <button
                                    type="button"
                                    key={tile.id}
                                    className={`module-card ${tile.status}`}
                                    onClick={() => handleModuleClick(tile.id)}
                                    aria-label={`Open ${tile.title} dashboard`}
                                >
                                    <div className="module-top-row">
                                        <div className="module-icon" style={{ position: 'relative' }}>
                                            {renderTileIcon(tile.icon)}
                                            {tile.badge > 0 && (
                                                <span
                                                    aria-label={`${tile.badge} pending`}
                                                    style={{
                                                        position: 'absolute', top: -6, right: -6,
                                                        minWidth: 18, height: 18, borderRadius: 9,
                                                        background: '#d7263d', color: '#fff',
                                                        fontSize: 11, fontWeight: 700, lineHeight: '18px',
                                                        textAlign: 'center', padding: '0 5px',
                                                        boxShadow: '0 0 0 2px #fff',
                                                    }}
                                                >{tile.badge}</span>
                                            )}
                                        </div>
                                        <span className={`module-status ${tile.status}`}>
                                            {tile.statusLabel}
                                        </span>
                                    </div>
                                    <div className="module-meta">
                                        <h3>{tile.title}</h3>
                                        <p>{tile.description}</p>
                                    </div>
                                    <div className="module-footer">
                                        <span className="module-metric">{tile.metric}</span>
                                        {tile.external ? (
                                            // The card's own onClick already opens this in a new
                                            // tab; without stopping the click here it would bubble
                                            // up and open a second one.
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
                                            <Link to={tile.link}>
                                                <span className="module-link">
                                                    Open Module
                                                    <svg viewBox="0 0 24 24" aria-hidden="true">
                                                        <path d="M5 12h14M13 6l6 6-6 6" />
                                                    </svg>
                                                </span>
                                            </Link>
                                        )}
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </section>

            </main>
        </div>
    );
};

export default UserDashboard;
