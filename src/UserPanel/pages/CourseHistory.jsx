import React, { useEffect, useState } from 'react';
import { API_ENDPOINTS, API_BASE_URL } from '../../config/api';
import { Icon, C } from '../../UserLMS/lmsUI';

// My History — a persistent log of every course the user has completed. Built
// from test_results (never deleted), so removing/re-assigning a task never
// erases the past: the old completion stays, a fresh attempt adds a new row.
//
// Rows are grouped PER COURSE completion, not per individual test: a two-test
// (multi-standard) course shows both its tests in a single row; a single-test
// course shows one. When a course is re-assigned and taken again, each round of
// attempts becomes its own row (the nth attempt of every standard pairs up).
const CourseHistory = () => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const userEmail = localStorage.getItem('userEmail') || '';

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      const [resultsRes, coursesRes, tasksRes, standardsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/test-results/user/${encodeURIComponent(userEmail)}`).catch(() => null),
        fetch(API_ENDPOINTS.COURSES).catch(() => null),
        fetch(API_ENDPOINTS.TASK_ALLOCATIONS).catch(() => null),
        fetch(API_ENDPOINTS.STANDARDS).catch(() => null),
      ]);
      const results = resultsRes?.ok ? ((await resultsRes.json()).data || []) : [];
      const courses = coursesRes?.ok ? (await coursesRes.json()) : [];
      const tasks = tasksRes?.ok ? (await tasksRes.json()) : [];
      const standards = standardsRes?.ok ? (await standardsRes.json()) : [];

      const courseById = {};
      (Array.isArray(courses) ? courses : []).forEach(c => { courseById[c.id] = c; });
      const standardById = {};
      (Array.isArray(standards) ? standards : []).forEach(s => { standardById[s.id] = s; });
      const deadlineByCourse = {};
      (Array.isArray(tasks) ? tasks : []).forEach(t => { if (t.course_id) deadlineByCourse[t.course_id] = t.deadline; });

      // Group results by course, then by standard (each standard sorted oldest→newest).
      const byCourse = {};
      (Array.isArray(results) ? results : []).forEach(r => {
        (byCourse[r.course_id] = byCourse[r.course_id] || []).push(r);
      });

      const built = [];
      Object.entries(byCourse).forEach(([cid, rs]) => {
        const byStd = {};
        rs.forEach(r => { (byStd[r.standard_id] = byStd[r.standard_id] || []).push(r); });
        Object.values(byStd).forEach(list =>
          list.sort((a, b) => new Date(a.submitted_at || 0) - new Date(b.submitted_at || 0)));

        const rounds = Math.max(...Object.values(byStd).map(l => l.length));
        const course = courseById[cid] || {};
        const deadline = deadlineByCourse[cid];

        for (let round = 0; round < rounds; round++) {
          const tests = [];
          let roundDate = null;
          Object.entries(byStd).forEach(([sid, list]) => {
            const res = list[round];
            if (!res) return;
            const std = standardById[sid] || {};
            tests.push({
              name: std.standard_name || `Standard #${sid}`,
              passed: !!res.passed,
              score: res.score_percentage,
            });
            if (!roundDate || new Date(res.submitted_at || 0) > new Date(roundDate)) roundDate = res.submitted_at;
          });
          if (tests.length === 0) continue;
          built.push({
            key: `${cid}-${round}`,
            title: course.course_title || `Course #${cid}`,
            category: course.course_category || 'Training',
            tests,
            passedAll: tests.every(t => t.passed),
            overdue: deadline && roundDate ? new Date(roundDate) > new Date(deadline) : false,
            date: roundDate,
          });
        }
      });

      built.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
      setRows(built);
    } catch (e) {
      console.error('Error loading history:', e);
    } finally {
      setLoading(false);
    }
  };

  const fmtDate = (s) => s ? new Date(s).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', flexDirection: 'column', gap: 16 }}>
      <div style={{ width: 36, height: 36, border: `3px solid ${C.line}`, borderTopColor: C.brand, borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <p style={{ color: C.muted, fontSize: 14 }}>Loading your history…</p>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  const Badge = ({ text, color }) => (
    <span style={{ display: 'inline-block', padding: '4px 12px', borderRadius: 999, fontSize: 12, fontWeight: 700, background: `${color}14`, color, border: `1px solid ${color}33` }}>{text}</span>
  );

  return (
    <div style={{ padding: 32, minHeight: '100%' }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <span style={{ width: 4, height: 20, borderRadius: 4, background: C.brand, flexShrink: 0 }} />
          <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.16em', color: C.brand }}>My Learning</span>
        </div>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: C.ink, margin: '0 0 6px' }}>My History</h1>
        <p style={{ fontSize: 14, color: C.muted, margin: 0 }}>Completed courses and their test results — one row per completion.</p>
      </div>

      {rows.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '70px 20px', background: C.surface, borderRadius: 16, border: `2px dashed ${C.border}` }}>
          <div style={{ display: 'inline-flex', color: C.muted, marginBottom: 14 }}><Icon name="folder" size={44} /></div>
          <h3 style={{ color: C.ink, marginBottom: 6 }}>No finished courses yet</h3>
          <p style={{ color: C.muted, fontSize: 14, margin: 0 }}>Complete a course's test and it will appear here.</p>
        </div>
      ) : (
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: C.bg }}>
                  {['Course', 'Tests & Results', 'Status', 'Taken On'].map((h, i) => (
                    <th key={h} style={{ textAlign: i === 0 ? 'left' : i === 3 ? 'center' : 'left', padding: '14px 20px', fontSize: 12, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map(r => (
                  <tr key={r.key} style={{ borderTop: `1px solid ${C.line}`, verticalAlign: 'top' }}>
                    <td style={{ padding: '16px 20px' }}>
                      <div style={{ fontWeight: 700, color: C.ink }}>{r.title}</div>
                      <div style={{ fontSize: 12, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.6px', marginTop: 2 }}>{r.category}</div>
                      {r.tests.length > 1 && (
                        <div style={{ fontSize: 11.5, color: C.muted, marginTop: 4 }}>{r.tests.length} tests</div>
                      )}
                    </td>
                    <td style={{ padding: '16px 20px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {r.tests.map((t, i) => (
                          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                            <span style={{ fontSize: 13.5, color: C.body, fontWeight: 600, minWidth: 0 }}>{t.name}</span>
                            <Badge text={t.passed ? 'Pass' : 'Fail'} color={t.passed ? C.passed : C.failed} />
                            <span style={{ fontSize: 12.5, color: C.muted, fontWeight: 600 }}>{t.score != null ? `${Math.round(Number(t.score))}%` : '—'}</span>
                          </div>
                        ))}
                      </div>
                    </td>
                    <td style={{ padding: '16px 20px' }}>
                      <Badge text={r.overdue ? 'Overdue' : 'Completed'} color={r.overdue ? C.overdue : C.passed} />
                    </td>
                    <td style={{ padding: '16px 20px', textAlign: 'center', color: C.body, whiteSpace: 'nowrap' }}>{fmtDate(r.date)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default CourseHistory;
