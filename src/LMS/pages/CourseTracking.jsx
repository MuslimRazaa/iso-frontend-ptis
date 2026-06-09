import React, { useState, useEffect, useMemo } from 'react'
import {
  Users, BookOpen, Clock, CheckCircle2, AlertTriangle,
  Search, RefreshCw, PlayCircle, Hourglass, CalendarDays, GraduationCap
} from 'lucide-react'
import { API_ENDPOINTS } from '../../config/api'

// Expected total study time for a course (mirrors the learner-side logic):
//  - credit hours  -> 15 study hours each (industry standard)
//  - else weeks    -> 10 study hours each
//  - else fallback -> 1 hour
const expectedSeconds = (row) => {
  const credit = Number(row.credit_hours) || 0
  const weeks = Number(row.duration_weeks) || 0
  let hours = 1
  if (credit > 0) hours = credit * 15
  else if (weeks > 0) hours = weeks * 10
  return hours * 3600
}

const fmtDuration = (secs) => {
  const s = Math.max(0, Math.floor(Number(secs) || 0))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m`
  return `${s}s`
}

const fmtDate = (value) => {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

const isOverdue = (row) => {
  if (!row.deadline) return false
  if (row.status === 'completed') return false
  const due = new Date(row.deadline)
  if (Number.isNaN(due.getTime())) return false
  return due < new Date(new Date().toDateString())
}

// Visual state for a row (overdue takes priority over the stored status)
const rowState = (row) => {
  if (isOverdue(row)) return 'overdue'
  if (row.status === 'completed') return 'completed'
  if (row.status === 'in_progress') return 'in_progress'
  return 'enrolled'
}

const STATE_META = {
  completed:   { label: 'Completed',   color: '#1d814c', bg: 'rgba(29,129,76,0.12)',  Icon: CheckCircle2 },
  in_progress: { label: 'In Progress', color: '#c87e1c', bg: 'rgba(200,126,28,0.12)', Icon: PlayCircle },
  enrolled:    { label: 'Not Started', color: '#5a6b8c', bg: 'rgba(90,107,140,0.12)', Icon: Hourglass },
  overdue:     { label: 'Overdue',     color: '#c0392b', bg: 'rgba(192,57,43,0.12)',  Icon: AlertTriangle },
}

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div style={{
      flex: '1 1 160px', minWidth: 160, background: '#fff', borderRadius: 16,
      border: '1px solid #ececf1', padding: '18px 20px', display: 'flex',
      alignItems: 'center', gap: 14, boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
    }}>
      <span style={{
        width: 44, height: 44, borderRadius: 12, display: 'grid', placeItems: 'center',
        background: `${color}14`, color, flexShrink: 0
      }}>
        <Icon size={22} />
      </span>
      <div>
        <div style={{ fontSize: 22, fontWeight: 800, color: '#1f1f27', lineHeight: 1 }}>{value}</div>
        <div style={{ fontSize: 12.5, color: '#7a7a8c', marginTop: 4, fontWeight: 600 }}>{label}</div>
      </div>
    </div>
  )
}

function ProgressBar({ value }) {
  const pct = Math.max(0, Math.min(100, Math.round(Number(value) || 0)))
  const color = pct >= 100 ? '#1d814c' : pct > 0 ? '#c87e1c' : '#b9c0cf'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 120 }}>
      <div style={{ flex: 1, height: 7, borderRadius: 99, background: '#eceef3', overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 99, transition: 'width .3s' }} />
      </div>
      <span style={{ fontSize: 12.5, fontWeight: 700, color: '#54546a', width: 34, textAlign: 'right' }}>{pct}%</span>
    </div>
  )
}

function CourseTracking() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  const fetchProgress = async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch(`${API_ENDPOINTS.COURSE_PROGRESS}/admin/all`)
      const json = await res.json()
      if (!res.ok || json.success === false) throw new Error(json.message || 'Failed to load')
      setRows(Array.isArray(json.data) ? json.data : [])
    } catch (err) {
      setError(err.message || 'Failed to load course tracking data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchProgress() }, [])

  const stats = useMemo(() => {
    const s = { total: rows.length, in_progress: 0, completed: 0, enrolled: 0, overdue: 0 }
    rows.forEach((r) => { s[rowState(r)] += 1 })
    return s
  }, [rows])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return rows.filter((r) => {
      if (statusFilter !== 'all' && rowState(r) !== statusFilter) return false
      if (!q) return true
      return [r.employee_name, r.user_email, r.employee_code, r.course_title, r.department]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q))
    })
  }, [rows, query, statusFilter])

  return (
    <div className="lms-table-panel">
      <header style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <p className="eyebrow">Learning Analytics</p>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <GraduationCap size={22} /> Course Tracking
          </h2>
          <p style={{ color: '#7a7a8c', margin: '6px 0 0', fontSize: 14 }}>
            Every user's course activity — who started what, time spent, time left and deadlines.
          </p>
        </div>
        <button className="ghost-btn" onClick={fetchProgress} style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <RefreshCw size={16} /> Refresh
        </button>
      </header>

      {/* Summary cards */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, margin: '22px 0' }}>
        <StatCard icon={Users}        label="Total Enrollments" value={stats.total}       color="#3d6fd6" />
        <StatCard icon={PlayCircle}   label="In Progress"        value={stats.in_progress} color="#c87e1c" />
        <StatCard icon={CheckCircle2} label="Completed"          value={stats.completed}   color="#1d814c" />
        <StatCard icon={Hourglass}    label="Not Started"        value={stats.enrolled}    color="#5a6b8c" />
        <StatCard icon={AlertTriangle} label="Overdue"           value={stats.overdue}     color="#c0392b" />
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', marginBottom: 18 }}>
        <div style={{ position: 'relative', flex: '1 1 280px', maxWidth: 380 }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9a9aaa' }} />
          <input
            type="text"
            placeholder="Search by user, email, department or course…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{
              width: '100%', padding: '10px 12px 10px 36px', borderRadius: 10,
              border: '1px solid #e2e2ea', fontSize: 14, outline: 'none', background: '#fff'
            }}
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{ padding: '10px 14px', borderRadius: 10, border: '1px solid #e2e2ea', fontSize: 14, background: '#fff', cursor: 'pointer' }}
        >
          <option value="all">All statuses</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="enrolled">Not Started</option>
          <option value="overdue">Overdue</option>
        </select>
        <span style={{ color: '#9a9aaa', fontSize: 13, marginLeft: 'auto' }}>
          {filtered.length} of {rows.length} records
        </span>
      </div>

      {loading && (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#7a7a8c' }}>
          <Clock size={28} style={{ marginBottom: 8 }} />
          <p>Loading course activity…</p>
        </div>
      )}

      {!loading && error && (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#c0392b' }}>
          <AlertTriangle size={28} style={{ marginBottom: 8 }} />
          <p>{error}</p>
          <button className="primary-btn" onClick={fetchProgress} style={{ marginTop: 12 }}>Try again</button>
        </div>
      )}

      {!loading && !error && filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#7a7a8c' }}>
          <BookOpen size={28} style={{ marginBottom: 8 }} />
          <p>No course activity found.</p>
        </div>
      )}

      {!loading && !error && filtered.length > 0 && (
        <div className="table-wrapper">
          <table className="employee-table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Course</th>
                <th>Status</th>
                <th>Progress</th>
                <th>Time Spent</th>
                <th>Time Left</th>
                <th>Started</th>
                <th>Last Active</th>
                <th>Deadline</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => {
                const state = rowState(r)
                const meta = STATE_META[state]
                const left = state === 'completed' ? 0 : Math.max(0, expectedSeconds(r) - (Number(r.total_time_spent) || 0))
                return (
                  <tr key={`${r.user_email}-${r.course_id}`}>
                    <td>
                      <div style={{ fontWeight: 700, color: '#1f1f27' }}>{r.employee_name || r.user_email}</div>
                      <div style={{ fontSize: 12, color: '#9a9aaa' }}>
                        {r.employee_code ? `${r.employee_code} · ` : ''}{r.department || r.user_email}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: '#2b2b38' }}>{r.course_title}</div>
                      {r.course_category && <div style={{ fontSize: 12, color: '#9a9aaa' }}>{r.course_category}</div>}
                    </td>
                    <td>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px',
                        borderRadius: 99, background: meta.bg, color: meta.color, fontSize: 12.5, fontWeight: 700
                      }}>
                        <meta.Icon size={14} /> {meta.label}
                      </span>
                    </td>
                    <td><ProgressBar value={r.progress_percentage} /></td>
                    <td style={{ whiteSpace: 'nowrap', color: '#2b2b38', fontWeight: 600 }}>{fmtDuration(r.total_time_spent)}</td>
                    <td style={{ whiteSpace: 'nowrap', color: state === 'completed' ? '#1d814c' : '#54546a' }}>
                      {state === 'completed' ? 'Done' : fmtDuration(left)}
                    </td>
                    <td style={{ whiteSpace: 'nowrap', color: '#54546a' }}>{fmtDate(r.enrollment_date)}</td>
                    <td style={{ whiteSpace: 'nowrap', color: '#54546a' }}>{fmtDate(r.last_accessed)}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      {r.deadline ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: state === 'overdue' ? '#c0392b' : '#54546a', fontWeight: state === 'overdue' ? 700 : 500 }}>
                          <CalendarDays size={14} /> {fmtDate(r.deadline)}
                        </span>
                      ) : '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default CourseTracking
