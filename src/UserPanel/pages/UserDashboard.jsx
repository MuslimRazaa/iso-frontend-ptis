import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { API_ENDPOINTS, API_BASE_URL } from '../../config/api';

const UserDashboard = () => {
    const navigate = useNavigate();
    const [spotlightCourses, setSpotlightCourses] = useState([]);
    const [statHighlights, setStatHighlights] = useState([
        { label: "My Courses", value: "0", helper: "Assigned to you", tone: "accent" },
        { label: "In Progress", value: "0", helper: "Currently learning", tone: "neutral" },
        { label: "Completion Rate", value: "0%", helper: "Overall progress", tone: "muted" },
        { label: "Certificates", value: "0", helper: "Earned so far", tone: "warning" },
    ]);
    const [loadingCourses, setLoadingCourses] = useState(true);
    const [userPermissions, setUserPermissions] = useState({});

    const userEmail = localStorage.getItem('userEmail') || 'user@ptis.com';
    const userName = userEmail.split('@')[0].replace(/\./g, ' ').split(' ').map(word =>
        word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(' ');

    useEffect(() => {
        fetchCourses();
        fetchUserPermissions();
    }, []);

    const fetchUserPermissions = async () => {
        try {
            const permissions = JSON.parse(localStorage.getItem('userPermissions') || '{}');
            setUserPermissions(permissions);
        } catch (error) {
            console.error('Error fetching permissions:', error);
        }
    };

    const fetchCourses = async () => {
        try {
            setLoadingCourses(true);
            const response = await fetch(API_ENDPOINTS.COURSES);
            if (response.ok) {
                const data = await response.json();
                const publishedCourses = data
                    .filter(course => course.is_published === true || course.is_published === 1)
                    .slice(0, 6)
                    .map(course => ({
                        id: course.id,
                        title: course.course_title,
                        description: course.course_description || "No description available",
                        creditHours: `${course.credit_hours || 0} hours`,
                        progress: 0,
                        thumbnail: course.course_thumbnail ? `${API_BASE_URL}${course.course_thumbnail}` : null,
                    }));
                setSpotlightCourses(publishedCourses);
                
                // Update stats
                setStatHighlights([
                    { label: "My Courses", value: publishedCourses.length.toString(), helper: "Assigned to you", tone: "accent" },
                    { label: "In Progress", value: "0", helper: "Currently learning", tone: "neutral" },
                    { label: "Completion Rate", value: "0%", helper: "Overall progress", tone: "muted" },
                    { label: "Certificates", value: "3", helper: "Earned so far", tone: "warning" },
                ]);
            }
        } catch (error) {
            console.error('Error fetching courses:', error);
        } finally {
            setLoadingCourses(false);
        }
    };

    const handleCardClick = (courseId) => {
        navigate(`/user/course/${courseId}`);
    };

    const recentActivities = [
        { title: "ISO 17020 Training", status: "Completed", date: "2 days ago" },
        { title: "Quality Control Basics", status: "In Progress", date: "Last week" },
        { title: "Safety Standards 2024", status: "Completed", date: "Last month" },
    ];

    return (
        <div className="lms-home" style={{ padding: 0 }}>
            {/* Professional Hero Section with Gradient */}
            <section className="lms-hero" style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                borderRadius: '16px',
                padding: '3rem',
                marginBottom: '2rem',
                boxShadow: '0 20px 60px rgba(102, 126, 234, 0.3)',
                position: 'relative',
                overflow: 'hidden'
            }}>
                <div style={{
                    position: 'absolute',
                    top: 0,
                    right: 0,
                    width: '400px',
                    height: '400px',
                    background: 'radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%)',
                    borderRadius: '50%',
                    transform: 'translate(30%, -30%)'
                }}></div>
                <div className="lms-hero__copy" style={{ position: 'relative', zIndex: 1 }}>
                    <p className="eyebrow" style={{ color: 'rgba(255,255,255,0.9)', fontSize: '0.85rem', fontWeight: '600', letterSpacing: '1px', textTransform: 'uppercase' }}>
                        👋 Welcome back, {userName}
                    </p>
                    <h1 style={{ color: '#fff', fontSize: '2.5rem', fontWeight: '700', margin: '1rem 0', lineHeight: '1.2' }}>
                        Continue your learning journey and achieve excellence
                    </h1>
                    <p style={{ color: 'rgba(255,255,255,0.95)', fontSize: '1.05rem', maxWidth: '600px', lineHeight: '1.6' }}>
                        Access your assigned training courses, track your progress, and earn certificates 
                        to advance your career. Stay ahead with continuous learning and skill development.
                    </p>
                    <div className="hero-actions" style={{ marginTop: '2rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                        <Link to="/user/my-courses" style={{
                            textDecoration: 'none',
                            background: '#fff',
                            color: '#667eea',
                            padding: '0.875rem 2rem',
                            borderRadius: '10px',
                            fontWeight: '600',
                            fontSize: '0.95rem',
                            boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
                            transition: 'all 0.3s ease',
                            display: 'inline-block'
                        }} onMouseEnter={(e) => {
                            e.target.style.transform = 'translateY(-2px)';
                            e.target.style.boxShadow = '0 6px 20px rgba(0,0,0,0.25)';
                        }} onMouseLeave={(e) => {
                            e.target.style.transform = 'translateY(0)';
                            e.target.style.boxShadow = '0 4px 15px rgba(0,0,0,0.2)';
                        }}>
                            📚 My Courses
                        </Link>
                        <Link to="/user/my-certificates" style={{
                            textDecoration: 'none',
                            background: 'rgba(255,255,255,0.2)',
                            color: '#fff',
                            padding: '0.875rem 2rem',
                            borderRadius: '10px',
                            fontWeight: '600',
                            fontSize: '0.95rem',
                            backdropFilter: 'blur(10px)',
                            border: '1px solid rgba(255,255,255,0.3)',
                            transition: 'all 0.3s ease',
                            display: 'inline-block'
                        }} onMouseEnter={(e) => {
                            e.target.style.background = 'rgba(255,255,255,0.3)';
                        }} onMouseLeave={(e) => {
                            e.target.style.background = 'rgba(255,255,255,0.2)';
                        }}>
                            🏆 View Certificates
                        </Link>
                    </div>
                </div>
            </section>

            {/* Professional Stats Grid */}
            <section className="lms-stat-grid" style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', 
                gap: '1.5rem', 
                marginBottom: '2.5rem' 
            }}>
                {statHighlights.map((stat, index) => {
                    const colors = [
                        { bg: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', icon: '📚' },
                        { bg: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', icon: '⏳' },
                        { bg: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', icon: '📊' },
                        { bg: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)', icon: '🏆' }
                    ];
                    return (
                        <article key={stat.label} style={{
                            background: '#fff',
                            borderRadius: '16px',
                            padding: '1.75rem',
                            boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                            border: '1px solid rgba(0,0,0,0.06)',
                            transition: 'all 0.3s ease',
                            cursor: 'pointer',
                            position: 'relative',
                            overflow: 'hidden'
                        }} onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translateY(-5px)';
                            e.currentTarget.style.boxShadow = '0 12px 35px rgba(0,0,0,0.12)';
                        }} onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.08)';
                        }}>
                            <div style={{
                                position: 'absolute',
                                top: '-20px',
                                right: '-20px',
                                width: '100px',
                                height: '100px',
                                background: colors[index].bg,
                                borderRadius: '50%',
                                opacity: 0.1
                            }}></div>
                            <div style={{ position: 'relative', zIndex: 1 }}>
                                <div style={{
                                    fontSize: '2rem',
                                    marginBottom: '0.75rem'
                                }}>{colors[index].icon}</div>
                                <p style={{ 
                                    fontSize: '0.85rem', 
                                    color: '#6c757d', 
                                    fontWeight: '600', 
                                    textTransform: 'uppercase', 
                                    letterSpacing: '0.5px',
                                    marginBottom: '0.5rem'
                                }}>{stat.label}</p>
                                <h3 style={{ 
                                    fontSize: '2.25rem', 
                                    fontWeight: '700', 
                                    color: '#2c3e50',
                                    margin: '0.5rem 0'
                                }}>{stat.value}</h3>
                                <span style={{ 
                                    fontSize: '0.875rem', 
                                    color: '#95a5a6',
                                    fontWeight: '500'
                                }}>{stat.helper}</span>
                            </div>
                        </article>
                    );
                })}
            </section>

            {/* Professional Panels */}
            <section className="lms-panel-grid" style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', 
                gap: '2rem', 
                marginBottom: '2.5rem' 
            }}>
                <article style={{
                    background: '#fff',
                    borderRadius: '16px',
                    padding: '2rem',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                    border: '1px solid rgba(0,0,0,0.06)'
                }}>
                    <header style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                            <p className="eyebrow" style={{ color: '#667eea', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '0.5rem' }}>
                                Recent Activity
                            </p>
                            <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#2c3e50', margin: 0 }}>
                                Your Learning Progress
                            </h2>
                        </div>
                        <Link to="/user/my-courses" style={{
                            textDecoration: 'none',
                            color: '#667eea',
                            fontSize: '0.875rem',
                            fontWeight: '600',
                            transition: 'all 0.3s ease'
                        }}>View All →</Link>
                    </header>
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                        {recentActivities.map((activity, idx) => (
                            <li key={activity.title} style={{
                                padding: '1rem 0',
                                borderBottom: idx < recentActivities.length - 1 ? '1px solid #f0f0f0' : 'none'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
                                    <div style={{ flex: 1 }}>
                                        <strong style={{ color: '#2c3e50', fontSize: '0.95rem', fontWeight: '600' }}>
                                            {activity.title}
                                        </strong>
                                        <div style={{ marginTop: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                            <span style={{
                                                fontSize: '0.75rem',
                                                padding: '0.25rem 0.75rem',
                                                borderRadius: '12px',
                                                background: activity.status === 'Completed' ? '#d4edda' : '#fff3cd',
                                                color: activity.status === 'Completed' ? '#155724' : '#856404',
                                                fontWeight: '600'
                                            }}>{activity.status}</span>
                                            <em style={{ fontSize: '0.8rem', color: '#95a5a6', fontStyle: 'normal' }}>
                                                {activity.date}
                                            </em>
                                        </div>
                                    </div>
                                </div>
                            </li>
                        ))}
                    </ul>
                </article>

                <article style={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    borderRadius: '16px',
                    padding: '2rem',
                    boxShadow: '0 10px 40px rgba(102, 126, 234, 0.3)',
                    color: '#fff'
                }}>
                    <header style={{ marginBottom: '1.5rem' }}>
                        <div>
                            <p className="eyebrow" style={{ color: 'rgba(255,255,255,0.9)', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '0.5rem' }}>
                                Quick Actions
                            </p>
                            <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#fff', margin: 0 }}>
                                Tasks & Tests
                            </h2>
                        </div>
                    </header>
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: '0.75rem' }}>
                        {[
                            { to: '/user/my-courses', icon: '📚', title: 'My Courses', desc: 'Access your learning materials' },
                            { to: '/user/testing', icon: '✍️', title: 'Testing', desc: 'Take assessments and quizzes' },
                            { to: '/user/task-allocations', icon: '✅', title: 'Task Allocations', desc: 'View and complete tasks' },
                            { to: '/user/my-certificates', icon: '🏆', title: 'Certificates', desc: 'Download your achievements' }
                        ].map(item => (
                            <li key={item.to}>
                                <Link to={item.to} style={{
                                    textDecoration: 'none',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '1rem',
                                    padding: '1rem',
                                    borderRadius: '12px',
                                    background: 'rgba(255,255,255,0.15)',
                                    backdropFilter: 'blur(10px)',
                                    border: '1px solid rgba(255,255,255,0.2)',
                                    color: '#fff',
                                    transition: 'all 0.3s ease'
                                }} onMouseEnter={(e) => {
                                    e.currentTarget.style.background = 'rgba(255,255,255,0.25)';
                                    e.currentTarget.style.transform = 'translateX(5px)';
                                }} onMouseLeave={(e) => {
                                    e.currentTarget.style.background = 'rgba(255,255,255,0.15)';
                                    e.currentTarget.style.transform = 'translateX(0)';
                                }}>
                                    <span style={{ fontSize: '1.5rem' }}>{item.icon}</span>
                                    <div>
                                        <strong style={{ display: 'block', fontSize: '0.95rem', fontWeight: '600' }}>
                                            {item.title}
                                        </strong>
                                        <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.85)' }}>
                                            {item.desc}
                                        </span>
                                    </div>
                                </Link>
                            </li>
                        ))}
                    </ul>
                </article>
            </section>

            {/* Professional Course Spotlight */}
            <section className="lms-spotlight">
                <header style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                    <div>
                        <p className="eyebrow" style={{ color: '#667eea', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '0.5rem' }}>
                            Available Courses
                        </p>
                        <h2 style={{ fontSize: '2rem', fontWeight: '700', color: '#2c3e50', margin: 0 }}>
                            Start Learning Today
                        </h2>
                    </div>
                    <Link to="/user/my-courses" style={{
                        textDecoration: 'none',
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        color: '#fff',
                        padding: '0.75rem 1.5rem',
                        borderRadius: '10px',
                        fontWeight: '600',
                        fontSize: '0.9rem',
                        boxShadow: '0 4px 15px rgba(102, 126, 234, 0.3)',
                        transition: 'all 0.3s ease'
                    }} onMouseEnter={(e) => {
                        e.target.style.transform = 'translateY(-2px)';
                        e.target.style.boxShadow = '0 6px 20px rgba(102, 126, 234, 0.4)';
                    }} onMouseLeave={(e) => {
                        e.target.style.transform = 'translateY(0)';
                        e.target.style.boxShadow = '0 4px 15px rgba(102, 126, 234, 0.3)';
                    }}>
                        Browse All →
                    </Link>
                </header>

                {loadingCourses ? (
                    <div style={{ textAlign: 'center', padding: '4rem', background: '#f8f9fa', borderRadius: '16px' }}>
                        <div style={{ 
                            display: 'inline-block', 
                            width: '40px', 
                            height: '40px', 
                            border: '4px solid #f3f3f3', 
                            borderTop: '4px solid #667eea', 
                            borderRadius: '50%',
                            animation: 'spin 1s linear infinite'
                        }}></div>
                        <p style={{ marginTop: '1rem', color: '#6c757d' }}>Loading courses...</p>
                    </div>
                ) : spotlightCourses.length === 0 ? (
                    <div style={{ 
                        textAlign: 'center', 
                        padding: '4rem', 
                        background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)', 
                        borderRadius: '16px',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.08)'
                    }}>
                        <p style={{ fontSize: '4rem', marginBottom: '1rem' }}>📚</p>
                        <h3 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#2c3e50', marginBottom: '0.5rem' }}>
                            No Courses Available
                        </h3>
                        <p style={{ color: '#6c757d', fontSize: '1rem' }}>
                            New courses will appear here when assigned to you
                        </p>
                    </div>
                ) : (
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                        gap: '2rem'
                    }}>
                        {spotlightCourses.map((course) => (
                            <article 
                                key={course.id} 
                                style={{
                                    background: '#fff',
                                    borderRadius: '16px',
                                    overflow: 'hidden',
                                    boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                                    border: '1px solid rgba(0,0,0,0.06)',
                                    transition: 'all 0.3s ease',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    flexDirection: 'column'
                                }} 
                                onClick={() => handleCardClick(course.id)}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.transform = 'translateY(-8px)';
                                    e.currentTarget.style.boxShadow = '0 12px 40px rgba(0,0,0,0.15)';
                                }} 
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.transform = 'translateY(0)';
                                    e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.08)';
                                }}
                            >
                                <div style={{ 
                                    width: '100%', 
                                    height: '200px', 
                                    overflow: 'hidden',
                                    position: 'relative'
                                }}>
                                    {course.thumbnail ? (
                                        <>
                                            <img 
                                                src={course.thumbnail} 
                                                alt={course.title}
                                                style={{
                                                    width: '100%',
                                                    height: '100%',
                                                    objectFit: 'cover',
                                                    transition: 'transform 0.3s ease'
                                                }}
                                                onMouseEnter={(e) => {
                                                    e.target.style.transform = 'scale(1.05)';
                                                }}
                                                onMouseLeave={(e) => {
                                                    e.target.style.transform = 'scale(1)';
                                                }}
                                            />
                                            <div style={{
                                                position: 'absolute',
                                                top: '12px',
                                                right: '12px',
                                                background: 'rgba(0,0,0,0.7)',
                                                backdropFilter: 'blur(10px)',
                                                color: '#fff',
                                                padding: '0.4rem 0.8rem',
                                                borderRadius: '8px',
                                                fontSize: '0.75rem',
                                                fontWeight: '600'
                                            }}>
                                                {course.creditHours}
                                            </div>
                                        </>
                                    ) : (
                                        <div style={{ 
                                            width: '100%', 
                                            height: '100%', 
                                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontSize: '4rem'
                                        }}>
                                            📚
                                        </div>
                                    )}
                                </div>
                                <div style={{ padding: '1.5rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
                                    <h3 style={{ 
                                        fontSize: '1.1rem', 
                                        fontWeight: '700', 
                                        color: '#2c3e50', 
                                        marginBottom: '0.75rem',
                                        lineHeight: '1.4'
                                    }}>
                                        {course.title}
                                    </h3>
                                    <p style={{ 
                                        fontSize: '0.9rem', 
                                        color: '#6c757d', 
                                        lineHeight: '1.6',
                                        marginBottom: '1.5rem',
                                        flex: 1
                                    }}>
                                        {course.description.length > 100 
                                            ? `${course.description.substring(0, 100)}...` 
                                            : course.description
                                        }
                                    </p>
                                    <div style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        paddingTop: '1rem',
                                        borderTop: '1px solid #f0f0f0'
                                    }}>
                                        <span style={{ fontSize: '0.85rem', color: '#95a5a6', fontWeight: '600' }}>
                                            Start Course
                                        </span>
                                        <div style={{
                                            width: '40px',
                                            height: '40px',
                                            borderRadius: '50%',
                                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            color: '#fff',
                                            fontSize: '1.2rem',
                                            transition: 'all 0.3s ease'
                                        }}>
                                            →
                                        </div>
                                    </div>
                                </div>
                            </article>
                        ))}
                    </div>
                )}
            </section>
        </div>
    );
};

export default UserDashboard;