import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_ENDPOINTS, API_BASE_URL } from '../../config/api';
import { computeCourseTests } from '../utils/courseTests';

const BASE = '/user/learning-management-system';

// course_thumbnail is stored as "/uploads/…"; build a clean URL (no double slash).
const thumbUrl = (path) => path ? `${API_BASE_URL}/${String(path).replace(/^\/+/, '')}` : null;

// Unified "My Courses" — one place for everything:
//   • Top: courses assigned to / started by the user (Start Course + Start Test).
//   • Bottom: "Browse more" — every other published course (request access).
// This replaces the old 3-tab split (My Tasks / Browse / My Courses) that made it
// unclear where courses lived and which to do.
const MyCourses = () => {
  const [assignedCourses, setAssignedCourses] = useState([]);
  const [browseCourses, setBrowseCourses] = useState([]);
  const [pendingRequests, setPendingRequests] = useState(new Set());
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');
  // Test-chooser modal: opens a clean test list for a course (no course content).
  const [testModal, setTestModal] = useState({ show: false, course: null });
  const [testList, setTestList] = useState([]);
  const [testLoading, setTestLoading] = useState(false);
  const navigate = useNavigate();

  const userFullName = localStorage.getItem('userFullName') || '';
  const userEmail = localStorage.getItem('userEmail') || '';

  useEffect(() => {
    loadPendingRequests();
    fetchData();
  }, []);

  const loadPendingRequests = () => {
    const reqs = JSON.parse(localStorage.getItem(`courseRequests_${userEmail}`) || '[]');
    setPendingRequests(new Set(reqs.map(r => r.courseId)));
  };

  const fetchData = async () => {
    try {
      const [tasksRes, coursesRes, progressRes, resultsRes] = await Promise.all([
        fetch(API_ENDPOINTS.TASK_ALLOCATIONS),
        fetch(API_ENDPOINTS.COURSES),
        fetch(`${API_ENDPOINTS.COURSE_PROGRESS}/user/${encodeURIComponent(userEmail)}`).catch(() => null),
        fetch(`${API_BASE_URL}/api/test-results/user/${encodeURIComponent(userEmail)}`).catch(() => null),
      ]);
      const allTasks = await tasksRes.json();
      const allCourses = await coursesRes.json();
      const progressList = progressRes?.ok ? (await progressRes.json()).data || [] : [];
      const testResults = resultsRes?.ok ? ((await resultsRes.json()).data || []) : [];

      const myTasks = allTasks.filter(t =>
        t.employee_name && userFullName &&
        t.employee_name.toLowerCase().trim() === userFullName.toLowerCase().trim()
      );
      const assignedTitles = new Set(myTasks.map(t => t.course_title?.toLowerCase()));

      // Assigned / started courses. Each course's test status decides whether it
      // stays here or has moved to History (all tests done), and whether its
      // content is locked (a test has been started → no going back).
      const enriched = await Promise.all(myTasks.map(async (task) => {
        // Match by course_id first (task carries it) — matching by title is
        // fragile and breaks the thumbnail, progress lookup and test unlock.
        const matched = allCourses.find(c => c.id === task.course_id)
          || allCourses.find(c => c.course_title?.toLowerCase() === task.course_title?.toLowerCase());
        const courseId = task.course_id || matched?.id;
        const apiProgress = progressList.find(p => p.course_id === courseId);
        const thumbPath = matched?.course_thumbnail || task.course_thumbnail;

        // Course detail (for its standards → number of required tests).
        let detail = matched || {};
        try {
          const dRes = await fetch(`${API_ENDPOINTS.COURSES}/${courseId}`);
          if (dRes.ok) detail = await dRes.json();
        } catch { /* fall back to list row */ }
        const testStatus = computeCourseTests(detail, testResults, task.deadline);

        return {
          ...task,
          courseId,
          // course_thumbnail is stored as "/uploads/…"; avoid a double slash.
          thumbnail: thumbPath ? `${API_BASE_URL}/${String(thumbPath).replace(/^\/+/, '')}` : null,
          category: matched?.course_category || 'Training',
          creditHours: matched?.credit_hours || task.total_hours || 0,
          videoSeconds: apiProgress?.video_watch_time || 0,
          pptSeconds: apiProgress?.ppt_view_time || 0,
          isStarted: !!apiProgress,
          localProgress: apiProgress?.progress_percentage || task.progress || 0,
          allDone: testStatus.allDone,       // every test taken → belongs in History
          locked: testStatus.anyStarted,     // a test started → course content locked
        };
      }));
      // Finished courses live in History, not here.
      setAssignedCourses(enriched.filter(c => !c.allDone));

      // Browse-more = published courses NOT already assigned to the user.
      const published = allCourses.filter(c => c.is_published === true || c.is_published === 1);
      setBrowseCourses(published.filter(c => !assignedTitles.has(c.course_title?.toLowerCase())));
    } catch (e) {
      console.error('Error fetching courses:', e);
    } finally {
      setLoading(false);
    }
  };

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3500); };

  const statusLabel = (c) => {
    if (c.localProgress >= 100 || c.status === 'Completed') return 'Completed';
    if (c.isStarted) return 'In Progress';
    return 'Not Started';
  };
  const statusColor = (c) => {
    const l = statusLabel(c);
    if (l === 'Completed') return '#1d814c';
    if (l === 'In Progress') return '#c87e1c';
    return '#7a7a8c';
  };

  // Start / continue the course (enroll on first start), then open it.
  const openCourse = async (course) => {
    if (!course.courseId) { showToast('Course details not available. Contact your administrator.'); return; }
    // Once a test has been started the course content is locked — no going back.
    if (course.locked) { showToast('Test start ho chuka hai — ab course content locked hai. Baqi test complete karein.'); return; }
    if (!course.isStarted) {
      try {
        await fetch(API_ENDPOINTS.COURSE_PROGRESS, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_email: userEmail, course_id: course.courseId, action: 'enroll' }),
        });
      } catch { /* proceed anyway */ }
    }
    navigate(`${BASE}/course/${course.courseId}`);
  };

  // Start Test — only once the course has been started. Opens a clean test
  // chooser (no course content): single standard = 1 test, multiple = pick one.
  const openTest = async (course) => {
    if (!course.isStarted || !course.courseId) return;
    setTestModal({ show: true, course });
    setTestList([]);
    setTestLoading(true);
    try {
      const [courseRes, resultsRes] = await Promise.all([
        fetch(`${API_ENDPOINTS.COURSES}/${course.courseId}`),
        fetch(`${API_BASE_URL}/api/test-results/user/${encodeURIComponent(userEmail)}`).catch(() => null),
      ]);
      const courseData = courseRes.ok ? await courseRes.json() : {};
      const resultsJson = resultsRes?.ok ? await resultsRes.json() : { data: [] };
      const results = Array.isArray(resultsJson.data) ? resultsJson.data : [];
      setTestList(buildTests(course.courseId, courseData, results));
    } catch (e) {
      console.error('Error loading tests:', e);
      setTestList([]);
    } finally {
      setTestLoading(false);
    }
  };

  // Build one test entry per linked standard, with the user's latest result.
  const buildTests = (courseId, courseData, results) => {
    const courseResults = results.filter(r => Number(r.course_id) === Number(courseId));
    const byStd = {};
    courseResults.forEach(r => { if (!byStd[r.standard_id]) byStd[r.standard_id] = r; });

    let stds = Array.isArray(courseData.standards) ? courseData.standards : [];
    // Fallback for an older backend that doesn't return `standards`.
    if (stds.length === 0 && courseData.standard_id) {
      stds = [{ standard_id: courseData.standard_id, standard_name: courseData.standard_name, standard_type: courseData.standard_type || 'simple' }];
    }
    return stds.map(s => {
      const result = byStd[s.standard_id] || null;
      const type = (s.standard_type || 'simple').toLowerCase();
      const suffix = type === 'general' ? ' (General)' : type === 'specific' ? ' (Specific)' : '';
      return {
        standardId: s.standard_id,
        standardName: s.standard_name || '',
        standardType: type,
        label: `${s.standard_name || courseData.course_title || 'Test'}${suffix}`,
        hasResult: !!result,
        hasPassed: !!result?.passed,
        score: result?.score_percentage,
      };
    });
  };

  const launchTest = (t) => {
    const courseId = testModal.course?.courseId;
    const params = new URLSearchParams({
      courseId: String(courseId),
      standardId: String(t.standardId),
      standardType: String(t.standardType || ''),
      standard: t.standardName || '',
      from: 'course',
    });
    navigate(`/user/lms-test?${params.toString()}`);
  };

  const handleRequest = async (course) => {
    try {
      await fetch(`${API_BASE_URL}/api/course-requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          course_id: course.id, course_title: course.course_title,
          employee_email: userEmail, employee_name: userFullName,
          requested_at: new Date().toISOString(),
        }),
      });
    } catch { /* saved locally anyway */ }
    const key = `courseRequests_${userEmail}`;
    const existing = JSON.parse(localStorage.getItem(key) || '[]');
    localStorage.setItem(key, JSON.stringify([
      ...existing.filter(r => r.courseId !== course.id),
      { courseId: course.id, courseTitle: course.course_title, requestedAt: new Date().toISOString(), status: 'pending' },
    ]));
    setPendingRequests(prev => new Set([...prev, course.id]));
    showToast(`Request sent for "${course.course_title}". Admin will assign it to you.`);
  };

  const fmt = (s) => {
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  const filteredAssigned = assignedCourses.filter(c => {
    if (filter === 'completed') return c.localProgress >= 100 || c.status === 'Completed';
    if (filter === 'in-progress') return c.isStarted && c.localProgress < 100;
    if (filter === 'not-started') return !c.isStarted;
    return true;
  });

  const filteredBrowse = browseCourses.filter(c =>
    c.course_title?.toLowerCase().includes(search.toLowerCase()) ||
    c.course_category?.toLowerCase().includes(search.toLowerCase())
  );

  const filters = [
    { key: 'all', label: 'All', count: assignedCourses.length },
    { key: 'not-started', label: 'Not Started', count: assignedCourses.filter(c => !c.isStarted).length },
    { key: 'in-progress', label: 'In Progress', count: assignedCourses.filter(c => c.isStarted && c.localProgress < 100).length },
    { key: 'completed', label: 'Completed', count: assignedCourses.filter(c => c.localProgress >= 100 || c.status === 'Completed').length },
  ];

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', flexDirection: 'column', gap: 16 }}>
      <div style={{ width: 36, height: 36, border: '3px solid #f0e0e3', borderTopColor: '#d7263d', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <p style={{ color: '#7a7a8c', fontSize: 14 }}>Loading your courses…</p>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return (
    <div style={{ padding: 32, minHeight: '100%' }}>
      {toast && (
        <div style={{
          position: 'fixed', bottom: 32, left: '50%', transform: 'translateX(-50%)',
          background: '#fff', border: '1px solid #c3ecd4', color: '#1d814c',
          padding: '14px 28px', borderRadius: 12, zIndex: 9999, fontSize: 14,
          fontWeight: 600, boxShadow: '0 8px 32px rgba(0,0,0,0.12)', maxWidth: 440, textAlign: 'center',
        }}>✅ {toast}</div>
      )}

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <span style={{ width: 4, height: 20, borderRadius: 4, background: '#d7263d', flexShrink: 0 }} />
          <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.18em', color: '#d7263d' }}>My Learning</span>
        </div>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: '#1f1f27', margin: '0 0 6px' }}>My Courses</h1>
        <p style={{ fontSize: 14, color: '#7a7a8c', margin: 0 }}>Start a course, then take its test — everything in one place.</p>
      </div>

      {/* Filter tabs */}
      {assignedCourses.length > 0 && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 22, flexWrap: 'wrap' }}>
          {filters.map(f => (
            <button key={f.key} onClick={() => setFilter(f.key)} style={{
              padding: '8px 18px', borderRadius: 10,
              border: filter === f.key ? '1px solid #d7263d' : '1px solid #e0e0e6',
              background: filter === f.key ? '#fff0f2' : '#fff',
              color: filter === f.key ? '#d7263d' : '#595966',
              fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all 0.18s',
            }}>
              {f.label} <span style={{ opacity: 0.6, marginLeft: 4 }}>({f.count})</span>
            </button>
          ))}
        </div>
      )}

      {/* Assigned / started courses */}
      {assignedCourses.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '56px 20px', background: '#fafafa', borderRadius: 16, border: '2px dashed #e0e0e6', marginBottom: 40 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📚</div>
          <h3 style={{ color: '#1f1f27', marginBottom: 6 }}>No courses assigned yet</h3>
          <p style={{ color: '#7a7a8c', fontSize: 14, margin: 0 }}>Browse the courses below and request access.</p>
        </div>
      ) : filteredAssigned.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 20px', color: '#7a7a8c', fontSize: 14 }}>No courses in this category.</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px,1fr))', gap: 20, marginBottom: 44 }}>
          {filteredAssigned.map(course => {
            const label = statusLabel(course);
            const clr = statusColor(course);
            const started = course.isStarted;
            return (
              <div key={course.id} style={{
                background: '#fff', border: '1px solid #e8e8ee', borderRadius: 18, overflow: 'hidden',
                display: 'flex', flexDirection: 'column',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)', transition: 'all 0.22s ease',
              }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 14px 34px rgba(0,0,0,0.12)'; e.currentTarget.style.borderColor = '#d7263d44'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.04)'; e.currentTarget.style.borderColor = '#e8e8ee'; }}
              >
                {/* Big centered banner image */}
                <div style={{ position: 'relative', height: 168, background: 'linear-gradient(135deg,#f5f5f9,#e9e9f2)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                  {course.thumbnail
                    ? <img src={course.thumbnail} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} onError={e => { e.currentTarget.style.display = 'none'; }} />
                    : <span style={{ fontSize: 56 }}>📚</span>}
                  <span style={{ position: 'absolute', top: 12, right: 12, fontSize: 11, fontWeight: 700, padding: '5px 12px', borderRadius: 999, background: '#fff', color: clr, border: `1px solid ${clr}55`, boxShadow: '0 2px 10px rgba(0,0,0,0.14)' }}>{label}</span>
                </div>

                {/* Content */}
                <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <p style={{ fontSize: 11, color: '#b0b0c0', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', margin: '0 0 4px' }}>{course.category}</p>
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1f1f27', lineHeight: 1.35, margin: 0 }}>{course.course_title}</h3>
                </div>

                {/* Meta */}
                <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 12, color: '#7a7a8c' }}>📚 {course.creditHours}h</span>
                  {course.deadline && <span style={{ fontSize: 12, color: '#7a7a8c' }}>📅 {new Date(course.deadline).toLocaleDateString()}</span>}
                  {started && <span style={{ fontSize: 12, color: '#7a7a8c' }}>🎥 {fmt(course.videoSeconds)}</span>}
                </div>

                {/* Progress */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: 11, color: '#b0b0c0' }}>Progress</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: clr }}>{course.localProgress}%</span>
                  </div>
                  <div style={{ height: 6, background: '#f0f0f5', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${course.localProgress}%`, background: clr, borderRadius: 3, transition: 'width 0.4s ease' }} />
                  </div>
                </div>

                {/* Two actions — Start Course + Start Test (test locked until started) */}
                <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                  <button onClick={() => openCourse(course)} disabled={course.locked} title={course.locked ? 'Locked — test started' : ''} style={{
                    flex: 1, padding: '10px', borderRadius: 9, border: 'none',
                    cursor: course.locked ? 'not-allowed' : 'pointer',
                    background: course.locked ? '#f6f6f8' : '#d7263d',
                    color: course.locked ? '#b0b0c0' : '#fff', fontSize: 13, fontWeight: 700, transition: 'all 0.18s',
                  }}
                    onMouseEnter={e => { if (!course.locked) e.currentTarget.style.background = '#b81e30'; }}
                    onMouseLeave={e => { if (!course.locked) e.currentTarget.style.background = '#d7263d'; }}
                  >
                    {course.locked ? '🔒 Locked' : started ? 'Continue' : 'Start Course'}
                  </button>
                  <button onClick={() => openTest(course)} disabled={!started} title={started ? 'Take the test' : 'Start the course first'} style={{
                    flex: 1, padding: '10px', borderRadius: 9, cursor: started ? 'pointer' : 'not-allowed',
                    border: `1px solid ${started ? '#d7263d' : '#e0e0e6'}`,
                    background: started ? '#fff5f6' : '#f6f6f8',
                    color: started ? '#d7263d' : '#b0b0c0', fontSize: 13, fontWeight: 700, transition: 'all 0.18s',
                  }}
                    onMouseEnter={e => { if (started) e.currentTarget.style.background = '#ffe8ea'; }}
                    onMouseLeave={e => { if (started) e.currentTarget.style.background = '#fff5f6'; }}
                  >
                    {started ? 'Start Test' : '🔒 Test'}
                  </button>
                </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Browse more courses ─────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '8px 0 20px' }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, color: '#1f1f27', margin: 0 }}>Browse more courses</h2>
        <div style={{ flex: 1, height: 1, background: '#ececf0' }} />
      </div>

      {browseCourses.length > 4 && (
        <div style={{ marginBottom: 22, position: 'relative', maxWidth: 420 }}>
          <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 15, color: '#b0b0c0', pointerEvents: 'none' }}>🔍</span>
          <input type="text" placeholder="Search courses…" value={search} onChange={e => setSearch(e.target.value)}
            style={{ width: '100%', padding: '11px 16px 11px 40px', background: '#fff', border: '1px solid #e0e0e6', borderRadius: 10, color: '#1f1f27', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
        </div>
      )}

      {filteredBrowse.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 20px', color: '#7a7a8c', fontSize: 14 }}>
          {browseCourses.length === 0 ? 'You are enrolled in all available courses. 🎉' : 'No courses match your search.'}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px,1fr))', gap: 20 }}>
          {filteredBrowse.map(course => {
            const pending = pendingRequests.has(course.id);
            return (
              <div key={course.id} style={{
                background: '#fff', border: `1px solid ${pending ? '#ffe4c4' : '#e8e8ee'}`, borderRadius: 18, overflow: 'hidden',
                display: 'flex', flexDirection: 'column', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', transition: 'all 0.22s ease',
              }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 14px 30px rgba(0,0,0,0.1)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.04)'; }}
              >
                {/* Big centered banner image */}
                <div style={{ position: 'relative', height: 168, background: 'linear-gradient(135deg,#f5f5f9,#e9e9f2)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                  {course.course_thumbnail
                    ? <img src={thumbUrl(course.course_thumbnail)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} onError={e => { e.currentTarget.style.display = 'none'; }} />
                    : <span style={{ fontSize: 56 }}>📚</span>}
                  {pending && <span style={{ position: 'absolute', top: 12, right: 12, fontSize: 11, fontWeight: 700, padding: '5px 12px', borderRadius: 999, background: '#fff', color: '#c87e1c', border: '1px solid #c87e1c55', boxShadow: '0 2px 10px rgba(0,0,0,0.14)' }}>Requested</span>}
                </div>

                {/* Content */}
                <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 12, flex: 1 }}>
                <div>
                  <p style={{ fontSize: 11, color: '#b0b0c0', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', margin: '0 0 4px' }}>{course.course_category || 'General'}</p>
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1f1f27', lineHeight: 1.35, margin: 0 }}>{course.course_title}</h3>
                </div>
                {course.course_description && (
                  <p style={{ fontSize: 13, color: '#7a7a8c', lineHeight: 1.5, margin: 0, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{course.course_description}</p>
                )}
                <div style={{ display: 'flex', gap: 14 }}>
                  {course.credit_hours ? <span style={{ fontSize: 12, color: '#7a7a8c' }}>📚 {course.credit_hours}h</span> : null}
                  {course.standard_name && <span style={{ fontSize: 12, color: '#7a7a8c' }}>📋 {course.standard_name}</span>}
                </div>
                <div style={{ marginTop: 'auto', paddingTop: 4 }}>
                  {pending ? (
                    <button disabled style={{ width: '100%', padding: '10px', borderRadius: 8, border: '1px solid #ffe4c4', background: '#fff8ef', color: '#c87e1c', fontSize: 13, fontWeight: 700, cursor: 'not-allowed' }}>⏳ Request Pending</button>
                  ) : (
                    <button onClick={() => handleRequest(course)} style={{ width: '100%', padding: '10px', borderRadius: 8, border: '1px solid #ffd1d8', background: '#fff5f6', color: '#d7263d', fontSize: 13, fontWeight: 700, cursor: 'pointer', transition: 'all 0.18s' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#ffe8ea'}
                      onMouseLeave={e => e.currentTarget.style.background = '#fff5f6'}
                    >Request Access</button>
                  )}
                </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Test chooser modal ──────────────────────────────── */}
      {testModal.show && (
        <div className="modal-overlay" onClick={() => setTestModal({ show: false, course: null })}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 520 }}>
            <div className="modal-header">
              <div>
                <h2 style={{ margin: 0, fontSize: 20 }}>Course Tests</h2>
                <p style={{ margin: '2px 0 0', fontSize: 13, color: '#7a7a8c' }}>{testModal.course?.course_title}</p>
              </div>
              <button className="close-modal-btn" onClick={() => setTestModal({ show: false, course: null })}>✕</button>
            </div>
            <div style={{ padding: 22 }}>
              {testLoading ? (
                <div style={{ textAlign: 'center', padding: '30px 0', color: '#7a7a8c', fontSize: 14 }}>Loading tests…</div>
              ) : testList.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px 0', color: '#7a7a8c', fontSize: 14 }}>No tests found for this course.</div>
              ) : (
                <>
                  {testList.length > 1 && (
                    <p style={{ margin: '0 0 14px', fontSize: 13, color: '#595966' }}>
                      Is course me <strong>{testList.length} tests</strong> hain — jo pehle dena ho choose karein.
                    </p>
                  )}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {testList.map(t => {
                      // A test that's been taken (pass OR fail) is greyed out —
                      // no retake. Only untaken tests get a Start button.
                      const done = t.hasResult;
                      const bg = t.hasPassed ? '#e8fff3' : done ? '#f6f6f8' : '#fafafb';
                      const bd = t.hasPassed ? '#c3ecd4' : done ? '#e6e6ec' : '#ececf0';
                      return (
                      <div key={t.standardId} style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
                        padding: '12px 14px', borderRadius: 12, background: bg, border: `1px solid ${bd}`,
                        opacity: done && !t.hasPassed ? 0.75 : 1,
                      }}>
                        <div>
                          <div style={{ fontWeight: 700, color: '#1f1f27', fontSize: 14 }}>{t.label}</div>
                          <div style={{ fontSize: 12.5, color: t.hasPassed ? '#1d814c' : done ? '#d7263d' : '#7a7a8c', marginTop: 2 }}>
                            {t.hasPassed ? `Passed${t.score != null ? ` · ${t.score}%` : ''}` : done ? `Failed${t.score != null ? ` · ${t.score}%` : ''}` : 'Not attempted yet'}
                          </div>
                        </div>
                        {done ? (
                          <span style={{ padding: '7px 14px', borderRadius: 999, background: t.hasPassed ? '#d4f8e3' : '#ececef', color: t.hasPassed ? '#1d814c' : '#8a8a95', fontWeight: 700, fontSize: 12.5 }}>
                            {t.hasPassed ? '✓ Done' : 'Done'}
                          </span>
                        ) : (
                          <button className="primary-btn" onClick={() => launchTest(t)} style={{ minWidth: 130 }}>
                            Start Test
                          </button>
                        )}
                      </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyCourses;
