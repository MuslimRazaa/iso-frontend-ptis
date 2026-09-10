import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { API_ENDPOINTS, API_BASE_URL } from "../../config/api";
import useLmsBase from "../useLmsBase";
import { summarise, averageCompletion } from "../utils/courseProgressState";

const defaultStatHighlights = [
  { label: "Active Courses", value: "—", helper: "Published and open", tone: "accent" },
  { label: "Learners In Progress", value: "—", helper: "Courses being worked on", tone: "neutral" },
  { label: "Average Completion", value: "—", helper: "Across every enrolment", tone: "muted" },
  { label: "Pending Approvals", value: "—", helper: "Course requests waiting", tone: "warning" },
];

const formatDue = (date) => {
  if (!date) return "No deadline";
  const days = Math.ceil((date.getTime() - Date.now()) / 86400000);
  if (days < 0) return "Overdue";
  if (days === 0) return "Due today";
  return `Due in ${days}d`;
};

function LmsHome() {
  const navigate = useNavigate();
  const lmsBase = useLmsBase();
  const [spotlightCourses, setSpotlightCourses] = useState([]);
  const [statHighlights, setStatHighlights] = useState(defaultStatHighlights);
  const [learningTracks, setLearningTracks] = useState([]);
  const [upcomingDeadlines, setUpcomingDeadlines] = useState([]);
  const [heroSnapshot, setHeroSnapshot] = useState(null);
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
        // "Learners In Progress" counted every employee in the company, and the
        // last two cards were fixed text — 84% and 05 — that no data ever fed.
        // All four come from the same sources as the pages they open, so the
        // dashboard and those pages cannot disagree.
        const [coursesRes, progressRes, requestsRes] = await Promise.all([
          fetch(API_ENDPOINTS.COURSES),
          fetch(`${API_ENDPOINTS.COURSE_PROGRESS}/admin/all`),
          fetch(API_ENDPOINTS.COURSE_REQUESTS),
        ]);

        const coursesData = coursesRes.ok ? await coursesRes.json() : [];
        const progressJson = progressRes.ok ? await progressRes.json() : null;
        const progressRows = Array.isArray(progressJson?.data) ? progressJson.data : [];
        const requestsJson = requestsRes.ok ? await requestsRes.json() : [];
        const requests = Array.isArray(requestsJson) ? requestsJson : (requestsJson?.data || []);

        const activeCourses = coursesData.filter(c => c.is_published === true || c.is_published === 1).length;
        const progress = summarise(progressRows);
        const avgCompletion = averageCompletion(progressRows);
        const pendingRequests = requests.filter(r => (r.status || 'pending') === 'pending').length;

        setStatHighlights([
          {
            label: "Active Courses", value: activeCourses.toString(),
            helper: `${activeCourses} published course${activeCourses === 1 ? '' : 's'}`,
            tone: "accent", to: `${lmsBase}/all-courses`,
          },
          {
            label: "Learners In Progress", value: progress.in_progress.toString(),
            helper: `${progress.total} enrolment${progress.total === 1 ? '' : 's'} in total`,
            tone: "neutral", to: `${lmsBase}/course-tracking?status=in_progress`,
          },
          {
            label: "Average Completion", value: `${avgCompletion}%`,
            helper: `Across ${progress.total} enrolment${progress.total === 1 ? '' : 's'}`,
            tone: "muted", to: `${lmsBase}/course-tracking`,
          },
          {
            label: "Pending Approvals", value: pendingRequests.toString(),
            helper: pendingRequests ? "Course requests waiting" : "Nothing waiting",
            tone: "warning", to: `${lmsBase}/task-allocation?tab=requests`,
          },
        ]);

        // "Learning pulse" — the courses with real enrolments right now, not a
        // fixed shortlist of course names that may not even exist any more.
        const byCourse = {};
        progressRows.forEach((r) => {
          const id = r.course_id;
          if (!byCourse[id]) byCourse[id] = { title: r.course_title || `Course #${id}`, total: 0, progressSum: 0, nearestDeadline: null };
          const g = byCourse[id];
          g.total += 1;
          g.progressSum += Number(r.progress_percentage) || 0;
          if (r.deadline) {
            const d = new Date(r.deadline);
            if (!Number.isNaN(d.getTime()) && (!g.nearestDeadline || d < g.nearestDeadline)) g.nearestDeadline = d;
          }
        });
        const tracks = Object.values(byCourse)
          .sort((a, b) => b.total - a.total)
          .slice(0, 3)
          .map((g) => ({
            title: g.title,
            modules: `${g.total} learner${g.total === 1 ? '' : 's'}`,
            progress: Math.round(g.progressSum / g.total),
            due: formatDue(g.nearestDeadline),
          }));
        setLearningTracks(tracks);

        // The hero card's numbers, same real sources as everything else here —
        // not a fixed "+18% / 207 learners" no data ever produced.
        const weekAgo = Date.now() - 7 * 86400000;
        const newEnrollments7d = progressRows.filter((r) => {
          const d = r.enrollment_date ? new Date(r.enrollment_date) : null;
          return d && !Number.isNaN(d.getTime()) && d.getTime() >= weekAgo;
        }).length;
        setHeroSnapshot({
          activeCourses, activeEnrolments: progress.total, inProgress: progress.in_progress,
          avgCompletion, pendingRequests, newEnrollments7d,
        });
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setLoadingStats(false);
      }
    };

    // "Upcoming agenda" — the nearest real task deadlines, not a fixed list
    // of training-session names no course or calendar ever produced.
    const fetchDeadlines = async () => {
      try {
        const res = await fetch(API_ENDPOINTS.TASK_ALLOCATIONS);
        const data = res.ok ? await res.json() : [];
        const rows = Array.isArray(data) ? data : [];
        const upcoming = rows
          .filter((t) => t.deadline && new Date(t.deadline) >= new Date(new Date().toDateString()))
          .sort((a, b) => new Date(a.deadline) - new Date(b.deadline))
          .slice(0, 3)
          .map((t) => {
            const progress = Number(t.live_progress ?? t.progress) || 0;
            return {
              title: t.course_title || 'Course',
              owner: t.employee_name || 'Unassigned',
              date: new Date(t.deadline).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
              status: progress >= 100 ? 'Completed' : progress > 0 ? 'In Progress' : 'Not Started',
            };
          });
        setUpcomingDeadlines(upcoming);
      } catch (error) {
        console.error('Error fetching deadlines:', error);
      }
    };

    fetchCourses();
    fetchStats();
    fetchDeadlines();
  }, [lmsBase]);

  const handleCardClick = (courseId) => {
    navigate(`${lmsBase}/course/${courseId}`);
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
            <Link to={`${lmsBase}/add-course`} className="btn btn-primary" style={{textDecoration:"none"}}>
              Launch New Course
            </Link>
          </div>
        </div>
        <div className="lms-hero__card">
          <div className="hero-card__meta">
            <span>Active Enrolments</span>
            <strong>{heroSnapshot ? heroSnapshot.activeEnrolments : '—'}</strong>
          </div>
          <h3>This Week in Training</h3>
          <p>
            {heroSnapshot
              ? `${heroSnapshot.inProgress} learner${heroSnapshot.inProgress === 1 ? '' : 's'} in progress across ${heroSnapshot.activeCourses} active course${heroSnapshot.activeCourses === 1 ? '' : 's'}.`
              : 'Loading live training activity…'}
          </p>
          <ul>
            <li>
              <span>Average Completion</span>
              <strong>{heroSnapshot ? `${heroSnapshot.avgCompletion}%` : '—'}</strong>
            </li>
            <li>
              <span>Pending Approvals</span>
              <strong>{heroSnapshot ? heroSnapshot.pendingRequests : '—'}</strong>
            </li>
            <li>
              <span>New Enrollments (7d)</span>
              <strong>{heroSnapshot ? heroSnapshot.newEnrollments7d : '—'}</strong>
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
          statHighlights.map((stat) => {
            const card = (
              <article
                key={stat.label}
                className={`stat-card ${stat.tone}`}
                style={stat.to ? { cursor: 'pointer', height: '100%' } : undefined}
                title={stat.to ? `Open ${stat.label}` : undefined}
              >
                <p>{stat.label}</p>
                <h3>{stat.value}</h3>
                <span>{stat.helper}</span>
              </article>
            );
            // The card opens the page that lists what it counts, already
            // filtered to it — the number and the list are then the same thing.
            return stat.to
              ? <Link key={stat.label} to={stat.to} style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>{card}</Link>
              : card;
          })
        )}
      </section>

      <section className="lms-panel-grid">
        <article className="panel learning-progress">
          <header>
            <div>
              <p className="eyebrow">Cohorts</p>
              <h2>Learning pulse</h2>
            </div>
            <Link to={`${lmsBase}/course-tracking`}><button type="button">View All</button></Link>
          </header>
          {learningTracks.length === 0 ? (
            <p style={{ padding: '1rem 0', color: '#8c8c94' }}>
              {loadingStats ? 'Loading…' : 'No active enrolments yet.'}
            </p>
          ) : (
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
          )}
        </article>
        <article className="panel session-board">
          <header>
            <div>
              <p className="eyebrow">Deadlines</p>
              <h2>Upcoming agenda</h2>
            </div>
            <Link to={`${lmsBase}/task-allocation`}><button type="button">View All</button></Link>
          </header>
          {upcomingDeadlines.length === 0 ? (
            <p style={{ padding: '1rem 0', color: '#8c8c94' }}>
              {loadingStats ? 'Loading…' : 'No upcoming deadlines.'}
            </p>
          ) : (
            <ul>
              {upcomingDeadlines.map((session, i) => (
                <li key={`${session.title}-${i}`}>
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
          )}
        </article>
      </section>

      <section className="spotlight-grid">
        <header>
          <div>
            <p className="eyebrow">Spotlight</p>
            <h2>Programs to amplify</h2>
          </div>
          <Link to={`${lmsBase}/all-courses`}>View catalog</Link>
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

    </div>
  );
}

export default LmsHome;
