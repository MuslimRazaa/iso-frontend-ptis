import React, { useEffect, useState } from 'react';
import { API_ENDPOINTS, API_BASE_URL } from '../../config/api';
import { Icon, C } from '../../UserLMS/lmsUI';

// My History — a persistent log of every test the user has taken. Because it's
// built from test_results (which are never deleted), removing/re-assigning a
// task never erases past attempts: the old entry stays here, and a fresh
// attempt after re-assignment simply adds a new row.
const CourseHistory = () => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const userEmail = localStorage.getItem('userEmail') || '';

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      const [resultsRes, coursesRes, tasksRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/test-results/user/${encodeURIComponent(userEmail)}`).catch(() => null),
        fetch(API_ENDPOINTS.COURSES).catch(() => null),
        fetch(API_ENDPOINTS.TASK_ALLOCATIONS).catch(() => null),
      ]);
      const results = resultsRes?.ok ? ((await resultsRes.json()).data || []) : [];
      const courses = coursesRes?.ok ? (await coursesRes.json()) : [];
      const tasks = tasksRes?.ok ? (await tasksRes.json()) : [];

      const courseById = {};
      (Array.isArray(courses) ? courses : []).forEach(c => { courseById[c.id] = c; });
      // Current deadline per course (for the Overdue flag when still assigned).
      const deadlineByCourse = {};
      (Array.isArray(tasks) ? tasks : []).forEach(t => { if (t.course_id) deadlineByCourse[t.course_id] = t.deadline; });

      const history = (Array.isArray(results) ? results : []).map(r => {
        const course = courseById[r.course_id] || {};
        const deadline = deadlineByCourse[r.course_id];
        const overdue = deadline && r.submitted_at ? new Date(r.submitted_at) > new Date(deadline) : false;
        return {
          id: r.id,
          title: course.course_title || `Course #${r.course_id}`,
          category: course.course_category || 'Training',
          passed: !!r.passed,
          overdue,
          score: r.score_percentage,
          date: r.submitted_at,
        };
      }).sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

      setRows(history);
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
        <p style={{ fontSize: 14, color: C.muted, margin: 0 }}>Every test you've taken — kept even if a course is re-assigned.</p>
      </div>

      {rows.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '70px 20px', background: C.surface, borderRadius: 16, border: `2px dashed ${C.border}` }}>
          <div style={{ display: 'inline-flex', color: C.muted, marginBottom: 14 }}><Icon name="folder" size={44} /></div>
          <h3 style={{ color: C.ink, marginBottom: 6 }}>No finished tests yet</h3>
          <p style={{ color: C.muted, fontSize: 14, margin: 0 }}>Complete a course's test and it will appear here.</p>
        </div>
      ) : (
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: C.bg }}>
                  {['Course', 'Result', 'Status', 'Score', 'Taken On'].map((h, i) => (
                    <th key={h} style={{ textAlign: i > 0 ? 'center' : 'left', padding: '14px 20px', fontSize: 12, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map(r => (
                  <tr key={r.id} style={{ borderTop: `1px solid ${C.line}` }}>
                    <td style={{ padding: '16px 20px' }}>
                      <div style={{ fontWeight: 700, color: C.ink }}>{r.title}</div>
                      <div style={{ fontSize: 12, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.6px', marginTop: 2 }}>{r.category}</div>
                    </td>
                    <td style={{ padding: '16px 20px', textAlign: 'center' }}>
                      <Badge text={r.passed ? 'Pass' : 'Fail'} color={r.passed ? C.passed : C.failed} />
                    </td>
                    <td style={{ padding: '16px 20px', textAlign: 'center' }}>
                      <Badge text={r.overdue ? 'Overdue' : 'Completed'} color={r.overdue ? C.overdue : C.passed} />
                    </td>
                    <td style={{ padding: '16px 20px', textAlign: 'center', color: C.body, fontWeight: 600 }}>
                      {r.score != null ? `${Math.round(Number(r.score))}%` : '—'}
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
