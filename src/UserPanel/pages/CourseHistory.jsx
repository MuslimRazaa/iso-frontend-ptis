import React, { useEffect, useState } from 'react';
import { API_ENDPOINTS, API_BASE_URL } from '../../config/api';
import { computeCourseTests } from '../utils/courseTests';

// My History — courses where every required test has been taken (pass or fail).
// Once finished, a course leaves My Courses and lands here with its final result
// (Pass/Fail) and timeliness (Completed on time / Overdue). No retake.
const CourseHistory = () => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const userFullName = localStorage.getItem('userFullName') || '';
  const userEmail = localStorage.getItem('userEmail') || '';

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      const [tasksRes, resultsRes] = await Promise.all([
        fetch(API_ENDPOINTS.TASK_ALLOCATIONS),
        fetch(`${API_BASE_URL}/api/test-results/user/${encodeURIComponent(userEmail)}`).catch(() => null),
      ]);
      const allTasks = await tasksRes.json();
      const results = resultsRes?.ok ? ((await resultsRes.json()).data || []) : [];

      const myTasks = (Array.isArray(allTasks) ? allTasks : []).filter(t =>
        t.employee_name && userFullName &&
        t.employee_name.toLowerCase().trim() === userFullName.toLowerCase().trim()
      );

      // Fetch each course's detail (for its standards) and compute completion.
      const enriched = await Promise.all(myTasks.map(async (task) => {
        let detail = {};
        try {
          const r = await fetch(`${API_ENDPOINTS.COURSES}/${task.course_id}`);
          if (r.ok) detail = await r.json();
        } catch { /* ignore */ }
        const status = computeCourseTests(detail, results, task.deadline);
        return { task, detail, status };
      }));

      // Only finished courses belong in History.
      const done = enriched
        .filter(e => e.status.allDone)
        .map(e => ({
          id: e.task.id,
          title: e.detail.course_title || e.task.course_title,
          category: e.detail.course_category || e.task.course_category || 'Training',
          passed: e.status.passedAll,
          overdue: e.status.overdue,
          completedOn: e.status.lastSubmittedAt,
          deadline: e.task.deadline,
          testCount: e.status.tests.length,
          avgScore: (() => {
            const scored = e.status.tests.filter(t => t.score != null);
            if (!scored.length) return null;
            return Math.round(scored.reduce((s, t) => s + Number(t.score), 0) / scored.length);
          })(),
        }))
        .sort((a, b) => new Date(b.completedOn || 0) - new Date(a.completedOn || 0));

      setRows(done);
    } catch (e) {
      console.error('Error loading history:', e);
    } finally {
      setLoading(false);
    }
  };

  const fmtDate = (s) => s ? new Date(s).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', flexDirection: 'column', gap: 16 }}>
      <div style={{ width: 36, height: 36, border: '3px solid #f0e0e3', borderTopColor: '#d7263d', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <p style={{ color: '#7a7a8c', fontSize: 14 }}>Loading your history…</p>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  const Badge = ({ text, color }) => (
    <span style={{ display: 'inline-block', padding: '4px 12px', borderRadius: 999, fontSize: 12, fontWeight: 700, background: `${color}15`, color, border: `1px solid ${color}44` }}>{text}</span>
  );

  return (
    <div style={{ padding: 32, minHeight: '100%' }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <span style={{ width: 4, height: 20, borderRadius: 4, background: '#d7263d', flexShrink: 0 }} />
          <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.18em', color: '#d7263d' }}>My Learning</span>
        </div>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: '#1f1f27', margin: '0 0 6px' }}>My History</h1>
        <p style={{ fontSize: 14, color: '#7a7a8c', margin: 0 }}>Finished courses with their final result and timeliness.</p>
      </div>

      {rows.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '70px 20px', background: '#fafafa', borderRadius: 16, border: '2px dashed #e0e0e6' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🗂️</div>
          <h3 style={{ color: '#1f1f27', marginBottom: 6 }}>No finished courses yet</h3>
          <p style={{ color: '#7a7a8c', fontSize: 14, margin: 0 }}>Complete a course's test(s) and it will appear here.</p>
        </div>
      ) : (
        <div style={{ background: '#fff', border: '1px solid #ececf0', borderRadius: 16, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#fafafb' }}>
                  {['Course', 'Result', 'Status', 'Score', 'Completed On'].map((h, i) => (
                    <th key={h} style={{ textAlign: i > 0 ? 'center' : 'left', padding: '14px 20px', fontSize: 12, color: '#7a7a8c', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map(r => (
                  <tr key={r.id} style={{ borderTop: '1px solid #ececf0' }}>
                    <td style={{ padding: '16px 20px' }}>
                      <div style={{ fontWeight: 700, color: '#1f1f27' }}>{r.title}</div>
                      <div style={{ fontSize: 12, color: '#b0b0c0', textTransform: 'uppercase', letterSpacing: '0.6px', marginTop: 2 }}>
                        {r.category}{r.testCount > 1 ? ` · ${r.testCount} tests` : ''}
                      </div>
                    </td>
                    <td style={{ padding: '16px 20px', textAlign: 'center' }}>
                      <Badge text={r.passed ? 'Pass' : 'Fail'} color={r.passed ? '#1d814c' : '#d7263d'} />
                    </td>
                    <td style={{ padding: '16px 20px', textAlign: 'center' }}>
                      <Badge text={r.overdue ? 'Overdue' : 'Completed'} color={r.overdue ? '#c87e1c' : '#1d814c'} />
                    </td>
                    <td style={{ padding: '16px 20px', textAlign: 'center', color: '#595966', fontWeight: 600 }}>
                      {r.avgScore != null ? `${r.avgScore}%` : '—'}
                    </td>
                    <td style={{ padding: '16px 20px', textAlign: 'center', color: '#595966', whiteSpace: 'nowrap' }}>{fmtDate(r.completedOn)}</td>
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
