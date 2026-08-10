import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_ENDPOINTS, API_BASE_URL } from '../../config/api';
import { computeCourseTests } from '../utils/courseTests';
import { Icon, C } from '../../UserLMS/lmsUI';

const BASE = '/user/learning-management-system';

// course_thumbnail is stored as "/uploads/…"; build a clean URL (no double slash).
const thumbUrl = (path) => path ? `${API_BASE_URL}/${String(path).replace(/^\/+/, '')}` : null;

// Has the user started (armed) a test for this course's CURRENT assignment? The
// Testing module drops a marker `ptis_active_test_<courseId>_<standardId>_<sinceMs>`
// the moment a course test begins. If one exists, the course content locks even
// before a result is recorded. Scoped by assignment so a re-assign is a clean slate.
const courseHasActiveTest = (courseId, createdAt) => {
  const sinceMs = createdAt ? new Date(createdAt).getTime() : 0;
  const prefix = `ptis_active_test_${courseId}_`;
  const suffix = `_${sinceMs}`;
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(prefix) && k.endsWith(suffix)) return true;
    }
  } catch { /* ignore */ }
  return false;
};

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

  // Turn abandoned course-test markers into recorded FAILs. The Testing module
  // arms a marker when a course test starts; if the user leaves/refreshes without
  // finishing, no result gets recorded there (to avoid client races). My Courses
  // is the single authority: on load, any armed marker without a matching result
  // becomes a fail (score 0) here — awaited — and pushed into `results` so the
  // course completes and moves to History/Browse in the same render.
  const reconcileAbandonedTests = async (results) => {
    const keys = [];
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith('ptis_active_test_')) keys.push(k);
      }
    } catch { return; }
    for (const key of keys) {
      const parts = key.slice('ptis_active_test_'.length).split('_');
      if (parts.length < 3) { localStorage.removeItem(key); continue; }
      const sinceMs = Number(parts.pop());
      const standardId = Number(parts.pop());
      const courseId = Number(parts.join('_'));
      if (!courseId || !standardId) { localStorage.removeItem(key); continue; }
      const has = results.some(r =>
        Number(r.course_id) === courseId &&
        Number(r.standard_id) === standardId &&
        (!sinceMs || (r.submitted_at && new Date(r.submitted_at).getTime() >= sinceMs))
      );
      if (has) { localStorage.removeItem(key); continue; }
      try {
        await fetch(`${API_BASE_URL}/api/test-results/submit`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_email: userEmail, course_id: courseId, standard_id: standardId,
            total_questions: 0, correct_answers: 0, score_percentage: 0,
            passed: false, test_duration_seconds: 0, answers_data: {},
          }),
        });
        results.push({ course_id: courseId, standard_id: standardId, passed: 0, score_percentage: 0, submitted_at: new Date().toISOString() });
        localStorage.removeItem(key);
      } catch {
        /* leave the marker so we retry on the next load */
      }
    }
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

      // Record any abandoned test attempts as fails before deciding what's done.
      await reconcileAbandonedTests(testResults);

      const myTasks = allTasks.filter(t =>
        t.employee_name && userFullName &&
        t.employee_name.toLowerCase().trim() === userFullName.toLowerCase().trim()
      );

      // A pending request is "fulfilled" once a task exists for that course — clear
      // those from localStorage so a finished (re-appeared) course can be requested
      // again instead of being stuck on "Request Pending".
      const assignedCourseIds = new Set(myTasks.map(t => t.course_id));
      const reqKey = `courseRequests_${userEmail}`;
      const storedReqs = JSON.parse(localStorage.getItem(reqKey) || '[]');
      const prunedReqs = storedReqs.filter(r => !assignedCourseIds.has(r.courseId));
      if (prunedReqs.length !== storedReqs.length) localStorage.setItem(reqKey, JSON.stringify(prunedReqs));
      setPendingRequests(new Set(prunedReqs.map(r => r.courseId)));

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
        // Gate on this assignment's start — a re-assigned course starts fresh.
        const testStatus = computeCourseTests(detail, testResults, task.deadline, task.created_at);

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
          // A test has a result OR one is mid-attempt (marker) → content locked.
          locked: testStatus.anyStarted || courseHasActiveTest(courseId, task.created_at),
        };
      }));
      // Finished courses leave My Courses (they live in History now).
      const active = enriched.filter(c => !c.allDone);
      setAssignedCourses(active);

      // Browse-more = every course the user can request that they aren't ACTIVELY
      // doing. That's all published courses PLUS any course they just finished
      // (so a completed course reappears here to request again — even if it isn't
      // published), minus the ones still active in My Courses.
      const activeTitles = new Set(active.map(c => c.course_title?.toLowerCase()));
      const finishedCourseIds = new Set(enriched.filter(c => c.allDone).map(c => c.courseId));
      const browsePool = allCourses.filter(c =>
        c.is_published === true || c.is_published === 1 || finishedCourseIds.has(c.id)
      );
      setBrowseCourses(browsePool.filter(c => !activeTitles.has(c.course_title?.toLowerCase())));
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
    if (l === 'Completed') return C.passed;
    if (l === 'In Progress') return C.inProgress;
    return C.notStarted;
  };

  // Start / continue the course (enroll on first start), then open it.
  const openCourse = async (course) => {
    if (!course.courseId) { showToast('Course details not available. Contact your administrator.'); return; }
    // Once a test has been started the course content is locked — no going back.
    if (course.locked) { showToast('A test has already been started — the course content is now locked. Complete the remaining test(s).'); return; }
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
      // Scope to THIS assignment (same boundary the card uses) so the chooser and
      // the card agree on what's done — otherwise a result from a previous
      // assignment greys out a test the card still considers pending (deadlock).
      setTestList(buildTests(course.courseId, courseData, results, course.created_at));
    } catch (e) {
      console.error('Error loading tests:', e);
      setTestList([]);
    } finally {
      setTestLoading(false);
    }
  };

  // Build one test entry per linked standard, with the user's latest result.
  // `assignedSince` (task.created_at) scopes results to the current assignment so
  // a re-assigned course starts fresh and stays consistent with the card.
  const buildTests = (courseId, courseData, results, assignedSince) => {
    const sinceMs = assignedSince ? new Date(assignedSince).getTime() : 0;
    const courseResults = results.filter(r =>
      Number(r.course_id) === Number(courseId) &&
      (!sinceMs || (r.submitted_at && new Date(r.submitted_at).getTime() >= sinceMs))
    );
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
      // Scope the attempt to this assignment so a re-assign starts fresh.
      assignedSince: testModal.course?.created_at || '',
    });
    navigate(`/user/testing?${params.toString()}`);
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
      <div style={{ width: 36, height: 36, border: `3px solid ${C.line}`, borderTopColor: C.brand, borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <p style={{ color: C.muted, fontSize: 14 }}>Loading your courses…</p>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return (
    <div style={{ padding: 32, minHeight: '100%' }}>
      {toast && (
        <div style={{
          position: 'fixed', bottom: 32, left: '50%', transform: 'translateX(-50%)',
          background: C.surface, border: `1px solid ${C.passed}44`, color: C.passed,
          padding: '14px 24px', borderRadius: 12, zIndex: 9999, fontSize: 14,
          fontWeight: 600, boxShadow: '0 8px 32px rgba(15,23,42,0.14)', maxWidth: 440, textAlign: 'center',
          display: 'flex', alignItems: 'center', gap: 10,
        }}><Icon name="check" size={18} /> {toast}</div>
      )}

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <span style={{ width: 4, height: 20, borderRadius: 4, background: C.brand, flexShrink: 0 }} />
          <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.16em', color: C.brand }}>My Learning</span>
        </div>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: C.ink, margin: '0 0 6px' }}>My Courses</h1>
        <p style={{ fontSize: 14, color: C.muted, margin: 0 }}>Start a course, then take its test — everything in one place.</p>
      </div>

      {/* Filter tabs */}
      {assignedCourses.length > 0 && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 22, flexWrap: 'wrap' }}>
          {filters.map(f => (
            <button key={f.key} onClick={() => setFilter(f.key)} style={{
              padding: '8px 18px', borderRadius: 10,
              border: filter === f.key ? `1px solid ${C.brand}` : `1px solid ${C.border}`,
              background: filter === f.key ? C.brandTint : C.surface,
              color: filter === f.key ? C.brand : C.body,
              fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all 0.18s',
            }}>
              {f.label} <span style={{ opacity: 0.6, marginLeft: 4 }}>({f.count})</span>
            </button>
          ))}
        </div>
      )}

      {/* Assigned / started courses */}
      {assignedCourses.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '56px 20px', background: C.surface, borderRadius: 16, border: `2px dashed ${C.border}`, marginBottom: 40 }}>
          <div style={{ display: 'inline-flex', color: C.muted, marginBottom: 14 }}><Icon name="bookOpen" size={44} /></div>
          <h3 style={{ color: C.ink, marginBottom: 6 }}>No courses assigned yet</h3>
          <p style={{ color: C.muted, fontSize: 14, margin: 0 }}>Browse the courses below and request access.</p>
        </div>
      ) : filteredAssigned.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 20px', color: C.muted, fontSize: 14 }}>No courses in this category.</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px,1fr))', gap: 20, marginBottom: 44 }}>
          {filteredAssigned.map(course => {
            const label = statusLabel(course);
            const clr = statusColor(course);
            const started = course.isStarted;
            return (
              <div key={course.id} style={{
                background: C.surface, border: `1px solid ${C.border}`, borderRadius: 18, overflow: 'hidden',
                display: 'flex', flexDirection: 'column', transition: 'all 0.22s ease',
              }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 14px 30px rgba(15,23,42,0.10)'; e.currentTarget.style.borderColor = C.muted; }}
                onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.borderColor = C.border; }}
              >
                {/* Big centered banner image */}
                <div style={{ position: 'relative', height: 168, background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                  {course.thumbnail
                    ? <img src={course.thumbnail} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} onError={e => { e.currentTarget.style.display = 'none'; }} />
                    : <span style={{ color: C.muted }}><Icon name="bookOpen" size={52} /></span>}
                  <span style={{ position: 'absolute', top: 12, right: 12, fontSize: 11, fontWeight: 700, padding: '5px 12px', borderRadius: 999, background: C.surface, color: clr, border: `1px solid ${clr}55`, boxShadow: '0 2px 8px rgba(15,23,42,0.10)' }}>{label}</span>
                </div>

                {/* Content */}
                <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <p style={{ fontSize: 11, color: C.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', margin: '0 0 4px' }}>{course.category}</p>
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: C.ink, lineHeight: 1.35, margin: 0 }}>{course.course_title}</h3>
                </div>

                {/* Meta */}
                <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', color: C.muted }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12 }}><Icon name="book" size={14} /> {course.creditHours}h</span>
                  {course.deadline && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12 }}><Icon name="calendar" size={14} /> {new Date(course.deadline).toLocaleDateString()}</span>}
                  {started && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12 }}><Icon name="video" size={14} /> {fmt(course.videoSeconds)}</span>}
                </div>

                {/* Progress */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: 11, color: C.muted }}>Progress</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: clr }}>{course.localProgress}%</span>
                  </div>
                  <div style={{ height: 6, background: C.line, borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${course.localProgress}%`, background: clr, borderRadius: 3, transition: 'width 0.4s ease' }} />
                  </div>
                </div>

                {/* Two actions — Start Course + Start Test (test locked until started) */}
                <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                  <button onClick={() => openCourse(course)} disabled={course.locked} title={course.locked ? 'Locked — test started' : ''} style={{
                    flex: 1, padding: '10px', borderRadius: 9, border: 'none',
                    cursor: course.locked ? 'not-allowed' : 'pointer',
                    background: course.locked ? C.bg : C.brand,
                    color: course.locked ? C.muted : '#fff', fontSize: 13, fontWeight: 700, transition: 'all 0.18s',
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  }}
                    onMouseEnter={e => { if (!course.locked) e.currentTarget.style.background = '#991b1b'; }}
                    onMouseLeave={e => { if (!course.locked) e.currentTarget.style.background = C.brand; }}
                  >
                    {course.locked ? <><Icon name="lock" size={15} /> Locked</> : started ? <><Icon name="play" size={14} /> Continue</> : <><Icon name="play" size={14} /> Start Course</>}
                  </button>
                  <button onClick={() => openTest(course)} disabled={!started} title={started ? 'Take the test' : 'Start the course first'} style={{
                    flex: 1, padding: '10px', borderRadius: 9, cursor: started ? 'pointer' : 'not-allowed',
                    border: `1px solid ${started ? C.brand : C.border}`,
                    background: started ? C.brandTint : C.bg,
                    color: started ? C.brand : C.muted, fontSize: 13, fontWeight: 700, transition: 'all 0.18s',
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  }}
                    onMouseEnter={e => { if (started) e.currentTarget.style.background = '#fde4e4'; }}
                    onMouseLeave={e => { if (started) e.currentTarget.style.background = C.brandTint; }}
                  >
                    {started ? <><Icon name="test" size={15} /> Start Test</> : <><Icon name="lock" size={15} /> Test</>}
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
        <h2 style={{ fontSize: 18, fontWeight: 800, color: C.ink, margin: 0 }}>Browse more courses</h2>
        <div style={{ flex: 1, height: 1, background: C.border }} />
      </div>

      {browseCourses.length > 4 && (
        <div style={{ marginBottom: 22, position: 'relative', maxWidth: 420 }}>
          <span style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: C.muted, pointerEvents: 'none', display: 'flex' }}><Icon name="search" size={16} /></span>
          <input type="text" placeholder="Search courses…" value={search} onChange={e => setSearch(e.target.value)}
            style={{ width: '100%', padding: '11px 16px 11px 40px', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, color: C.ink, fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
        </div>
      )}

      {filteredBrowse.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 20px', color: C.muted, fontSize: 14 }}>
          {browseCourses.length === 0 ? 'You are enrolled in all available courses.' : 'No courses match your search.'}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px,1fr))', gap: 20 }}>
          {filteredBrowse.map(course => {
            const pending = pendingRequests.has(course.id);
            return (
              <div key={course.id} style={{
                background: C.surface, border: `1px solid ${pending ? `${C.overdue}55` : C.border}`, borderRadius: 18, overflow: 'hidden',
                display: 'flex', flexDirection: 'column', transition: 'all 0.22s ease',
              }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 14px 30px rgba(15,23,42,0.10)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = 'none'; }}
              >
                {/* Big centered banner image */}
                <div style={{ position: 'relative', height: 168, background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                  {course.course_thumbnail
                    ? <img src={thumbUrl(course.course_thumbnail)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} onError={e => { e.currentTarget.style.display = 'none'; }} />
                    : <span style={{ color: C.muted }}><Icon name="bookOpen" size={52} /></span>}
                  {pending && <span style={{ position: 'absolute', top: 12, right: 12, fontSize: 11, fontWeight: 700, padding: '5px 12px', borderRadius: 999, background: C.surface, color: C.overdue, border: `1px solid ${C.overdue}55`, boxShadow: '0 2px 8px rgba(15,23,42,0.10)' }}>Requested</span>}
                </div>

                {/* Content */}
                <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 12, flex: 1 }}>
                <div>
                  <p style={{ fontSize: 11, color: C.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', margin: '0 0 4px' }}>{course.course_category || 'General'}</p>
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: C.ink, lineHeight: 1.35, margin: 0 }}>{course.course_title}</h3>
                </div>
                {course.course_description && (
                  <p style={{ fontSize: 13, color: C.muted, lineHeight: 1.5, margin: 0, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{course.course_description}</p>
                )}
                <div style={{ display: 'flex', gap: 14, color: C.muted }}>
                  {course.credit_hours ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12 }}><Icon name="book" size={14} /> {course.credit_hours}h</span> : null}
                  {course.standard_name && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12 }}><Icon name="test" size={14} /> {course.standard_name}</span>}
                </div>
                <div style={{ marginTop: 'auto', paddingTop: 4 }}>
                  {pending ? (
                    <button disabled style={{ width: '100%', padding: '10px', borderRadius: 8, border: `1px solid ${C.overdue}44`, background: `${C.overdue}12`, color: C.overdue, fontSize: 13, fontWeight: 700, cursor: 'not-allowed', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}><Icon name="clock" size={15} /> Request Pending</button>
                  ) : (
                    <button onClick={() => handleRequest(course)} style={{ width: '100%', padding: '10px', borderRadius: 8, border: `1px solid ${C.brand}44`, background: C.brandTint, color: C.brand, fontSize: 13, fontWeight: 700, cursor: 'pointer', transition: 'all 0.18s' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#fde4e4'}
                      onMouseLeave={e => e.currentTarget.style.background = C.brandTint}
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
                      This course has <strong>{testList.length} tests</strong> — choose which one to take first.
                    </p>
                  )}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {testList.map(t => {
                      // A test that's been taken (pass OR fail) is greyed out —
                      // no retake. Only untaken tests get a Start button.
                      const done = t.hasResult;
                      const bg = t.hasPassed ? `${C.passed}0f` : done ? C.bg : C.surface;
                      const bd = t.hasPassed ? `${C.passed}44` : done ? C.border : C.border;
                      return (
                      <div key={t.standardId} style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
                        padding: '12px 14px', borderRadius: 12, background: bg, border: `1px solid ${bd}`,
                        opacity: done && !t.hasPassed ? 0.8 : 1,
                      }}>
                        <div>
                          <div style={{ fontWeight: 700, color: C.ink, fontSize: 14 }}>{t.label}</div>
                          <div style={{ fontSize: 12.5, color: t.hasPassed ? C.passed : done ? C.failed : C.muted, marginTop: 2 }}>
                            {t.hasPassed ? `Passed${t.score != null ? ` · ${t.score}%` : ''}` : done ? `Failed${t.score != null ? ` · ${t.score}%` : ''}` : 'Not attempted yet'}
                          </div>
                        </div>
                        {done ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '7px 14px', borderRadius: 999, background: t.hasPassed ? `${C.passed}1a` : C.line, color: t.hasPassed ? C.passed : C.muted, fontWeight: 700, fontSize: 12.5 }}>
                            {t.hasPassed && <Icon name="check" size={14} />} Done
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
