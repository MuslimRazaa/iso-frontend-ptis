import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { API_ENDPOINTS, API_BASE_URL } from '../config/api'
import { computeCourseTests } from '../UserPanel/utils/courseTests'

const BASE = '/user/learning-management-system'

// Status buckets — mutually exclusive so each course lands in exactly one bar.
// Distinct hues (gray / blue / green / red / amber) + a text label under every
// bar, so identity never rests on colour alone.
const STATUS = {
  notStarted: { label: 'Not Started', color: '#8a8a95' },
  inProgress: { label: 'In Progress', color: '#2f74bf' },
  passed:     { label: 'Passed',      color: '#1d814c' },
  failed:     { label: 'Failed',      color: '#d7263d' },
  overdue:    { label: 'Overdue',     color: '#e08a1e' },
}
const STATUS_ORDER = ['notStarted', 'inProgress', 'passed', 'failed', 'overdue']

function UserLmsHome() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [counts, setCounts] = useState({ notStarted: 0, inProgress: 0, passed: 0, failed: 0, overdue: 0 })
  const [courseProgress, setCourseProgress] = useState([]) // [{ title, progress }]
  const [historyRows, setHistoryRows] = useState([])
  const [avgProgress, setAvgProgress] = useState(0)

  const userEmail = localStorage.getItem('userEmail') || ''
  const userFullName = localStorage.getItem('userFullName') || ''
  const firstName = (userFullName || userEmail.split('@')[0]).split(' ')[0]

  useEffect(() => {
    if (!userEmail) { setLoading(false); return }
    const load = async () => {
      try {
        const [tasksRes, progressRes, resultsRes] = await Promise.all([
          fetch(API_ENDPOINTS.TASK_ALLOCATIONS),
          fetch(`${API_ENDPOINTS.COURSE_PROGRESS}/user/${encodeURIComponent(userEmail)}`).catch(() => null),
          fetch(`${API_BASE_URL}/api/test-results/user/${encodeURIComponent(userEmail)}`).catch(() => null),
        ])
        const allTasks = tasksRes.ok ? await tasksRes.json() : []
        const progressList = progressRes?.ok ? ((await progressRes.json()).data || []) : []
        const results = resultsRes?.ok ? ((await resultsRes.json()).data || []) : []

        const myTasks = (Array.isArray(allTasks) ? allTasks : []).filter(t =>
          t.employee_name && userFullName &&
          t.employee_name.toLowerCase().trim() === userFullName.toLowerCase().trim()
        )

        const enriched = await Promise.all(myTasks.map(async (task) => {
          let detail = {}
          try {
            const r = await fetch(`${API_ENDPOINTS.COURSES}/${task.course_id}`)
            if (r.ok) detail = await r.json()
          } catch { /* ignore */ }
          const cp = progressList.find(p => p.course_id === task.course_id)
          const st = computeCourseTests(detail, results, task.deadline)
          return {
            title: detail.course_title || task.course_title || 'Course',
            progress: cp?.progress_percentage || task.progress || 0,
            started: !!cp,
            deadlinePassed: task.deadline ? new Date() > new Date(task.deadline) : false,
            status: st,
          }
        }))

        // Mutually-exclusive bucket per course.
        const c = { notStarted: 0, inProgress: 0, passed: 0, failed: 0, overdue: 0 }
        enriched.forEach(e => {
          const s = e.status
          if (s.allDone) {
            if (!s.passedAll) c.failed++
            else if (s.overdue) c.overdue++
            else c.passed++
          } else if (e.deadlinePassed) {
            c.overdue++
          } else if (e.started || e.progress > 0) {
            c.inProgress++
          } else {
            c.notStarted++
          }
        })
        setCounts(c)

        setCourseProgress(enriched.map(e => ({ title: e.title, progress: Number(e.progress) || 0 })))
        setAvgProgress(enriched.length
          ? Math.round(enriched.reduce((s, e) => s + (Number(e.progress) || 0), 0) / enriched.length)
          : 0)

        const history = enriched
          .filter(e => e.status.allDone)
          .map(e => ({ title: e.title, passed: e.status.passedAll, overdue: e.status.overdue, date: e.status.lastSubmittedAt }))
          .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))
          .slice(0, 5)
        setHistoryRows(history)
      } catch (e) {
        console.error('Dashboard error:', e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [userEmail, userFullName])

  const totalCourses = STATUS_ORDER.reduce((s, k) => s + counts[k], 0)
  const statCards = [
    { label: 'Assigned Courses', value: totalCourses, accent: '#2f74bf' },
    { label: 'In Progress', value: counts.inProgress, accent: '#c87e1c' },
    { label: 'Completed', value: counts.passed + counts.failed + counts.overdue, accent: '#1d814c' },
    { label: 'Avg Progress', value: `${avgProgress}%`, accent: '#d7263d' },
  ]

  const fmtDate = (s) => s ? new Date(s).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : '—'

  return (
    <div style={{ padding: '32px', width: '100%' }}>
      {/* Welcome */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <span style={{ width: 4, height: 22, borderRadius: 4, background: '#d7263d', flexShrink: 0 }} />
          <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.18em', color: '#d7263d' }}>Learning Management</span>
        </div>
        <h2 style={{ margin: '0 0 6px', fontSize: 28, fontWeight: 800, color: '#1f1f27' }}>Welcome back, {firstName} 👋</h2>
        <p style={{ margin: 0, fontSize: 14, color: '#7a7a8c' }}>Your training progress at a glance.</p>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 28 }}>
        {statCards.map(s => (
          <div key={s.label} style={{ flex: '1 1 160px', background: '#fff', border: `1px solid ${s.accent}22`, borderRadius: 16, padding: '16px 20px', boxShadow: `0 4px 18px ${s.accent}10` }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: s.accent, marginBottom: 4 }}>{s.label}</div>
            <div style={{ fontSize: 30, fontWeight: 800, color: s.accent }}>{loading ? '—' : s.value}</div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20, marginBottom: 28 }}>
        <StatusBar counts={counts} loading={loading} total={totalCourses} />
        <ProgressLine data={courseProgress} loading={loading} />
      </div>

      {/* Recent history (top 5) */}
      <div style={{ background: '#fff', border: '1px solid #ececf0', borderRadius: 16, overflow: 'hidden', marginBottom: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', borderBottom: '1px solid #f0f0f3' }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#1f1f27' }}>Recent History</h3>
          <button onClick={() => navigate(`${BASE}/history`)} style={{ background: 'none', border: 'none', color: '#d7263d', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>View all →</button>
        </div>
        {loading ? (
          <div style={{ padding: 30, textAlign: 'center', color: '#9a9aaa', fontSize: 14 }}>Loading…</div>
        ) : historyRows.length === 0 ? (
          <div style={{ padding: 30, textAlign: 'center', color: '#9a9aaa', fontSize: 14 }}>No finished courses yet.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <tbody>
                {historyRows.map((r, i) => (
                  <tr key={i} style={{ borderTop: i ? '1px solid #f0f0f3' : 'none' }}>
                    <td style={{ padding: '13px 20px', fontWeight: 600, color: '#1f1f27' }}>{r.title}</td>
                    <td style={{ padding: '13px 20px', textAlign: 'center' }}>
                      <Chip text={r.passed ? 'Pass' : 'Fail'} color={r.passed ? '#1d814c' : '#d7263d'} />
                    </td>
                    <td style={{ padding: '13px 20px', textAlign: 'center' }}>
                      <Chip text={r.overdue ? 'Overdue' : 'Completed'} color={r.overdue ? '#e08a1e' : '#1d814c'} />
                    </td>
                    <td style={{ padding: '13px 20px', textAlign: 'right', color: '#7a7a8c', whiteSpace: 'nowrap', fontSize: 13 }}>{fmtDate(r.date)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Quick access */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: 16 }}>
        {[
          { title: 'Courses', desc: 'Start a course, take its test, track progress.', icon: '🎓', path: `${BASE}/my-courses` },
          { title: 'History', desc: 'Your finished courses and their results.', icon: '🗂️', path: `${BASE}/history` },
        ].map(tile => (
          <button key={tile.title} onClick={() => navigate(tile.path)} style={{ background: '#fff', border: '1px solid #d7263d22', borderRadius: 16, padding: '22px 20px', textAlign: 'left', cursor: 'pointer', transition: 'all 0.2s ease', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 8px 24px #d7263d18'; e.currentTarget.style.borderColor = '#d7263d44' }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.04)'; e.currentTarget.style.borderColor = '#d7263d22' }}
          >
            <div style={{ width: 44, height: 44, borderRadius: 12, background: '#fff5f6', fontSize: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>{tile.icon}</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#1f1f27', marginBottom: 6 }}>{tile.title}</div>
            <div style={{ fontSize: 13, color: '#7a7a8c', lineHeight: 1.5 }}>{tile.desc}</div>
            <div style={{ marginTop: 14, fontSize: 12, fontWeight: 700, color: '#d7263d' }}>Open →</div>
          </button>
        ))}
      </div>
    </div>
  )
}

const Chip = ({ text, color }) => (
  <span style={{ display: 'inline-block', padding: '4px 12px', borderRadius: 999, fontSize: 12, fontWeight: 700, background: `${color}15`, color, border: `1px solid ${color}44` }}>{text}</span>
)

// Bar chart — course counts by status. Bars grow from a shared baseline with a
// 4px rounded top; value above, label below (identity is never colour-alone).
function StatusBar({ counts, loading, total }) {
  const max = Math.max(1, ...STATUS_ORDER.map(k => counts[k]))
  return (
    <div style={{ background: '#fff', border: '1px solid #ececf0', borderRadius: 16, padding: '18px 20px' }}>
      <h3 style={{ margin: '0 0 2px', fontSize: 15, fontWeight: 700, color: '#1f1f27' }}>Courses by Status</h3>
      <p style={{ margin: '0 0 16px', fontSize: 12.5, color: '#9a9aaa' }}>{total} assigned course{total === 1 ? '' : 's'}</p>
      {loading ? (
        <div style={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9a9aaa', fontSize: 14 }}>Loading…</div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, height: 180, paddingTop: 20 }}>
          {STATUS_ORDER.map(k => {
            const v = counts[k]
            const h = Math.round((v / max) * 140)
            return (
              <div key={k} title={`${STATUS[k].label}: ${v}`} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: '#1f1f27', marginBottom: 4 }}>{v}</div>
                <div style={{ width: '100%', maxWidth: 46, height: Math.max(h, v > 0 ? 6 : 2), background: v > 0 ? STATUS[k].color : '#ececed', borderRadius: '4px 4px 0 0', transition: 'height 0.4s ease' }} />
                <div style={{ fontSize: 10.5, color: '#7a7a8c', marginTop: 8, textAlign: 'center', lineHeight: 1.2, height: 26 }}>{STATUS[k].label}</div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// Line chart — progress % across all courses (single series → no legend; the
// title names it). Recessive grid, 2px line, ≥8px markers, tooltips per point.
function ProgressLine({ data, loading }) {
  const W = Math.max(320, data.length * 78 + 40)
  const H = 200
  const pad = { l: 34, r: 16, t: 16, b: 40 }
  const plotW = W - pad.l - pad.r
  const plotH = H - pad.t - pad.b
  const n = data.length
  const x = (i) => pad.l + (n <= 1 ? plotW / 2 : (i / (n - 1)) * plotW)
  const y = (v) => pad.t + (1 - Math.min(100, Math.max(0, v)) / 100) * plotH
  const pts = data.map((d, i) => `${x(i)},${y(d.progress)}`).join(' ')
  const short = (t) => (t.length > 9 ? t.slice(0, 8) + '…' : t)

  return (
    <div style={{ background: '#fff', border: '1px solid #ececf0', borderRadius: 16, padding: '18px 20px' }}>
      <h3 style={{ margin: '0 0 2px', fontSize: 15, fontWeight: 700, color: '#1f1f27' }}>Progress Across Courses</h3>
      <p style={{ margin: '0 0 12px', fontSize: 12.5, color: '#9a9aaa' }}>% completed per course</p>
      {loading ? (
        <div style={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9a9aaa', fontSize: 14 }}>Loading…</div>
      ) : n === 0 ? (
        <div style={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9a9aaa', fontSize: 14 }}>No courses yet.</div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} style={{ display: 'block', minWidth: n > 4 ? W : 0 }} role="img" aria-label="Progress percentage per course">
            {/* gridlines + y labels */}
            {[0, 25, 50, 75, 100].map(g => (
              <g key={g}>
                <line x1={pad.l} y1={y(g)} x2={W - pad.r} y2={y(g)} stroke="#f0f0f3" strokeWidth="1" />
                <text x={pad.l - 8} y={y(g) + 3} textAnchor="end" fontSize="10" fill="#b0b0c0">{g}</text>
              </g>
            ))}
            {/* line */}
            {n > 1 && <polyline points={pts} fill="none" stroke="#d7263d" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />}
            {/* points */}
            {data.map((d, i) => (
              <g key={i}>
                <circle cx={x(i)} cy={y(d.progress)} r="4.5" fill="#d7263d" stroke="#fff" strokeWidth="2">
                  <title>{`${d.title}: ${d.progress}%`}</title>
                </circle>
                <text x={x(i)} y={H - pad.b + 16} textAnchor="middle" fontSize="10" fill="#7a7a8c">{short(d.title)}</text>
              </g>
            ))}
          </svg>
        </div>
      )}
    </div>
  )
}

export default UserLmsHome
