import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { API_ENDPOINTS } from '../../config/api';

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

    const userEmail = localStorage.getItem('userEmail') || 'user@ptis.com';
    const userName = userEmail.split('@')[0].replace(/\./g, ' ').split(' ').map(word =>
        word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(' ');


    useEffect(() => {
        // Fetch user permissions from backend
        fetchUserPermissions();
        fetchCourses();
    }, []);

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

    // Define all possible tiles
    const allDashboardTiles = [
        {
            id: "my-courses",
            title: "My Courses",
            link: "/user/my-courses",
            description: "Access your assigned training courses and track progress.",
            status: "online",
            statusLabel: "Available",
            metric: "8 courses assigned",
            permission: true, // Always visible
            icon: "lms"
        },
        {
            id: "certificates",
            title: "My Certificates",
            link: "/user/my-certificates",
            description: "View and download your earned certificates.",
            status: "online",
            statusLabel: "Available",
            metric: "3 certificates earned",
            permission: true, // Always visible
            icon: "certificates"
        },
        {
            id: "lms-access",
            title: "LMS Portal",
            link: "/user/all-courses",
            description: "Full access to Learning Management System features.",
            status: "sync",
            statusLabel: "Active",
            metric: "Training module access",
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
            metric: "12 CVs queued",
            permission: userPermissions.cvs,
            icon: "cv"
        },
        {
            id: "iso-forms",
            title: "ISO Forms",
            link: "/user/iso-forms",
            description: "Quick access to QA/QC controlled documentation.",
            status: "attention",
            statusLabel: "Review",
            metric: "3 forms awaiting sign-off",
            permission: userPermissions.cvs, // Using cvs permission for ISO forms access
            icon: "iso"
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
            default:
                return (
                    <svg viewBox="0 0 48 48" role="img" aria-hidden="true">
                        <rect x="6" y="8" width="36" height="28" rx="6" />
                    </svg>
                );
        }
    };

    const handleModuleClick = (moduleId) => {
        console.log(`Module selected: ${moduleId}`);
    };

    return (
        <div className="dashboard-shell">
            <main className="dashboard-content">
                <section className="hero-row">
                    <article className="intro-panel">
                        <p className="eyebrow">Hello {userName}</p>
                        <h1>Welcome To PTIS Portal</h1>
                        <p>
                            Access your training courses, view certificates, and manage your assigned modules
                            from a centralized dashboard.
                        </p>
                        <div className="cta-row">
                            <Link to="/user/my-courses" className="primary-btn">View My Courses</Link>
                            <Link to="/user/my-certificates" className="ghost-btn">My Certificates</Link>
                        </div>
                    </article>

                    <article className="status-panel">
                        <h2>My Learning Status</h2>
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
                            Last updated 5 mins ago
                        </div>
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
                                        <div className="module-icon">{renderTileIcon(tile.icon)}</div>
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
                                        <Link to={tile.link}>
                                            <span className="module-link">
                                                Open Module
                                                <svg viewBox="0 0 24 24" aria-hidden="true">
                                                    <path d="M5 12h14M13 6l6 6-6 6" />
                                                </svg>
                                            </span>
                                        </Link>
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
