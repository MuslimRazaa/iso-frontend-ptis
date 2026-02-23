import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { API_ENDPOINTS, API_BASE_URL } from "../../config/api";

const defaultStatHighlights = [
  { label: "Active Courses", value: "18", helper: "6 expiring this month", tone: "accent" },
  { label: "Learners In Progress", value: "142", helper: "Across 11 departments", tone: "neutral" },
  { label: "Average Completion", value: "84%", helper: "+6% vs last week", tone: "muted" },
  { label: "Pending Approvals", value: "05", helper: "Awaiting QA sign-off", tone: "warning" },
];

const learningTracks = [
  { title: "Integrity Inspectors", modules: "12 modules", progress: 76, due: "Due in 4d" },
  { title: "Rigless Crew L2", modules: "9 modules", progress: 48, due: "Due in 8d" },
  { title: "Audit Leads", modules: "7 modules", progress: 34, due: "New" },
];

const upcomingSessions = [
  {
    title: "API Integrity & Safety",
    owner: "Lead Inspector Team",
    date: "Jan 12 · 09:00 GMT",
    status: "On Track",
  },
  {
    title: "Rigless Operations Refresher",
    owner: "Training Cell",
    date: "Jan 16 · 14:00 GMT",
    status: "Enrolling",
  },
  {
    title: "ISO 17020 Update Brief",
    owner: "Compliance Desk",
    date: "Jan 22 · 11:30 GMT",
    status: "Draft",
  },
];



const quickActions = [
  { label: "Create Course", helper: "Upload modules, tasks, and rubrics", action: "Start Draft" },
  { label: "Assign Learners", helper: "Send invites to teams or individuals", action: "Open Roster" },
  { label: "Quality Review", helper: "Track SME feedback and approval", action: "View Queue" },
];

function LmsHome() {
  const navigate = useNavigate();
  const [spotlightCourses, setSpotlightCourses] = useState([]);
  const [statHighlights, setStatHighlights] = useState(defaultStatHighlights);
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    // Fetch all courses and filter published ones
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
              creditHours: `CH ${course.credit_hours || 0}`,
              progress: 0,
              thumbnail: course.course_thumbnail ? `${API_BASE_URL}${course.course_thumbnail}` : null,
            }));
          setSpotlightCourses(publishedCourses);
        }
      } catch (error) {
        console.error('Error fetching courses:', error);
      } finally {
        setLoadingCourses(false);
      }
    };

    // Fetch stats from API
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

        const activeCourses = coursesData.filter(c => c.is_published === true || c.is_published === 1).length;

        setStatHighlights([
          { label: "Active Courses", value: activeCourses.toString(), helper: `${activeCourses} published courses`, tone: "accent" },
          { label: "Learners In Progress", value: employeesData.length.toString(), helper: `Total employees enrolled`, tone: "neutral" },
          { label: "Average Completion", value: "84%", helper: "+6% vs last week", tone: "muted" },
          { label: "Pending Approvals", value: "05", helper: "Awaiting QA sign-off", tone: "warning" },
        ]);
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setLoadingStats(false);
      }
    };

    fetchCourses();
    fetchStats();
  }, []);

  const handleCardClick = (courseId) => {
    navigate(`/learning-management-system/course/${courseId}`);
  };

  return (
    <div className="lms-home">
      <section className="lms-hero">
        <div className="lms-hero__copy">
          <p className="eyebrow">Learning Operations</p>
          <h1>Upskill every inspection team with guided learning journeys.</h1>
          <p>
            Monitor live cohorts, approvals, and SME reviews without leaving this page. Push
            new tracks when capacity opens and keep compliance programs ahead of audits.
          </p>
          <div className="hero-actions">
            <Link to="/learning-management-system/add-course" className="btn btn-primary" style={{textDecoration:"none"}}>
              Launch New Course
            </Link>
            <button type="button" className="btn btn-ghost">
              Share Snapshot
            </button>
          </div>
        </div>
        <div className="lms-hero__card">
          <div className="hero-card__meta">
            <span>Weekly Throughput</span>
            <strong>+18%</strong>
          </div>
          <h3>Inspection Academies</h3>
          <p>207 learners tracking ahead of schedule across 11 active pathways.</p>
          <ul>
            <li>
              <span>QA Sign-off</span>
              <strong>7 pending</strong>
            </li>
            <li>
              <span>Assignments graded</span>
              <strong>54 today</strong>
            </li>
            <li>
              <span>New enrollments</span>
              <strong>32</strong>
            </li>
          </ul>
        </div>
      </section>

      <section className="lms-stat-grid">
        {loadingStats ? (
          <div style={{ gridColumn: "1 / -1", textAlign: "center", padding: "1rem" }}>
            <p>Loading stats...</p>
          </div>
        ) : (
          statHighlights.map((stat) => (
            <article key={stat.label} className={`stat-card ${stat.tone}`}>
              <p>{stat.label}</p>
              <h3>{stat.value}</h3>
              <span>{stat.helper}</span>
            </article>
          ))
        )}
      </section>

      <section className="lms-panel-grid">
        <article className="panel learning-progress">
          <header>
            <div>
              <p className="eyebrow">Cohorts</p>
              <h2>Learning pulse</h2>
            </div>
            <button type="button">View All</button>
          </header>
          <ul>
            {learningTracks.map((track) => (
              <li key={track.title}>
                <div className="track-meta">
                  <strong>{track.title}</strong>
                  <span>{track.modules}</span>
                </div>
                <div className="track-progress">
                  <div className="progress-pill">
                    <span style={{ width: `${track.progress}%` }} />
                  </div>
                  <em>{track.due}</em>
                </div>
              </li>
            ))}
          </ul>
        </article>
        <article className="panel session-board">
          <header>
            <div>
              <p className="eyebrow">Live Sessions</p>
              <h2>Upcoming agenda</h2>
            </div>
            <button type="button">Publish All</button>
          </header>
          <ul>
            {upcomingSessions.map((session) => (
              <li key={session.title}>
                <div>
                  <strong>{session.title}</strong>
                  <span>{session.owner}</span>
                </div>
                <div className="session-meta">
                  <span>{session.date}</span>
                  <em>{session.status}</em>
                </div>
              </li>
            ))}
          </ul>
        </article>
      </section>

      <section className="spotlight-grid">
        <header>
          <div>
            <p className="eyebrow">Spotlight</p>
            <h2>Programs to amplify</h2>
          </div>
          <Link to="/learning-management-system/all-courses">View catalog</Link>
        </header>
        <div className="spotlight-cards">
          {loadingCourses ? (
            <div style={{ gridColumn: "1 / -1", textAlign: "center", padding: "2rem" }}>
              <p>Loading courses...</p>
            </div>
          ) : spotlightCourses.length > 0 ? (
            spotlightCourses.map((card) => (
              <article
                className="spotlight-card"
                key={card.id}
                onClick={() => handleCardClick(card.id)}
              >
                <div className="spotlight-thumb">
                  {card.thumbnail ? (
                    <img src={card.thumbnail} alt={`${card.title} thumbnail`} loading="lazy" />
                  ) : (
                    <div style={{ width: "100%", height: "100%", background: "linear-gradient(135deg, rgba(255, 93, 93, 0.2), rgba(255, 93, 93, 0.05))", display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(255, 255, 255, 0.5)" }}>
                      No Image
                    </div>
                  )}
                </div>
                <div className="spotlight-body">
                  <div>
                    <p className="eyebrow">{card.creditHours}</p>
                    <h3>{card.title}</h3>
                    <p>{card.description?.substring(0, 80)}...</p>
                  </div>
                  <div className="progress-pill">
                    <span style={{ width: `${card.progress}%` }} />
                  </div>
                </div>
              </article>
            ))
          ) : (
            <div style={{ gridColumn: "1 / -1", textAlign: "center", padding: "2rem" }}>
              <p>No published courses available yet.</p>
            </div>
          )}
        </div>
      </section>

      <section className="quick-actions">
        {quickActions.map((item) => (
          <article key={item.label} className="quick-card">
            <div>
              <p className="eyebrow">{item.label}</p>
              <h3>{item.helper}</h3>
            </div>
            <button type="button">{item.action}</button>
          </article>
        ))}
      </section>
    </div>
  );
}

export default LmsHome;
