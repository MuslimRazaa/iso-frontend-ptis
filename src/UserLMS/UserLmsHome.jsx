import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { API_ENDPOINTS, API_BASE_URL } from '../config/api'

const BASE = '/user/learning-management-system'

const tiles = [
  {
    id: 'tasks',
    title: 'My Tasks',
    desc: 'View your allocated training tasks and deadlines.',
    icon: '📋',
    path: `${BASE}/my-tasks`,
    accent: '#2f74bf',
    bg: '#eef3ff',
  },
  {
    id: 'browse',
    title: 'Browse Courses',
    desc: 'Explore all published courses available to you.',
    icon: '📚',
    path: `${BASE}/all-courses`,
    accent: '#1d814c',
    bg: '#f0fff8',
  },
  {
    id: 'mycourses',
    title: 'My Courses',
    desc: 'Continue your enrolled and in-progress courses.',
    icon: '🎓',
    path: `${BASE}/my-courses`,
    accent: '#c87e1c',
    bg: '#fff8ef',
  },
  {
    id: 'certs',
    title: 'Certificates',
    desc: 'Download and view your earned certificates.',
    icon: '🏆',
    path: `${BASE}/certificates`,
    accent: '#d7263d',
    bg: '#fff5f6',
  },
]

function UserLmsHome() {
  const navigate = useNavigate()
  const [stats, setStats] = useState({ tasks: 0, courses: 0, progress: 0, certs: 0 })
  const [loading, setLoading] = useState(true)

  const userEmail    = localStorage.getItem('userEmail') || ''
  const userFullName = localStorage.getItem('userFullName') || ''
  const firstName    = (userFullName || userEmail.split('@')[0]).split(' ')[0]

  useEffect(() => {
    const load = async () => {
      try {
        const [tasksRes, coursesRes, progressRes, certsRes] = await Promise.all([
          fetch(API_ENDPOINTS.TASK_ALLOCATIONS),
          fetch(API_ENDPOINTS.COURSES),
          fetch(`${API_ENDPOINTS.COURSE_PROGRESS}/user/${encodeURIComponent(userEmail)}`).catch(() => null),
          fetch(`${API_BASE_URL}/api/certificates/user/${encodeURIComponent(userEmail)}`).catch(() => null),
        ])

        const allTasks    = tasksRes.ok    ? await tasksRes.json()    : []
        const allCourses  = coursesRes.ok  ? await coursesRes.json()  : []
        const progressData = progressRes?.ok ? await progressRes.json() : null
        const certsData   = certsRes?.ok   ? await certsRes.json()   : null

        const myTasks = allTasks.filter(t =>
          t.employee_name?.toLowerCase().trim() === userFullName.toLowerCase().trim()
        )
        const progressList = progressData?.data ?? []
        const avgProgress  = progressList.length
          ? Math.round(progressList.reduce((s, p) => s + (p.progress_percentage || 0), 0) / progressList.length)
          : 0
        const certCount = Array.isArray(certsData?.data) ? certsData.data.length :
                          Array.isArray(certsData)       ? certsData.length : 0

        setStats({
          tasks:    myTasks.length,
          courses:  allCourses.filter(c => c.is_published === 1 || c.is_published === true).length,
          progress: avgProgress,
          certs:    certCount,
        })
      } catch (e) {
        console.error('UserLmsHome stats error:', e)
      } finally {
        setLoading(false)
      }
    }
    if (userEmail) load()
    else setLoading(false)
  }, [userEmail, userFullName])

  const statCards = [
    { label: 'Assigned Tasks',   value: stats.tasks,        accent: '#2f74bf' },
    { label: 'Available Courses',value: stats.courses,       accent: '#1d814c' },
    { label: 'Avg Progress',     value: `${stats.progress}%`,accent: '#c87e1c' },
    { label: 'Certificates',     value: stats.certs,         accent: '#d7263d' },
  ]

  return (
    <div style={{ padding: '32px', maxWidth: 1100 }}>

      {/* Welcome */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <span style={{ width: 4, height: 22, borderRadius: 4, background: '#d7263d', flexShrink: 0 }} />
          <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
            letterSpacing: '0.18em', color: '#d7263d' }}>Learning Management</span>
        </div>
        <h2 style={{ margin: '0 0 6px', fontSize: 28, fontWeight: 800, color: '#1f1f27' }}>
          Welcome back, {firstName} 👋
        </h2>
        <p style={{ margin: 0, fontSize: 14, color: '#7a7a8c' }}>
          Track your training progress, complete allocated tasks, and earn certifications.
        </p>
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 36 }}>
        {statCards.map(s => (
          <div key={s.label} style={{
            flex: '1 1 160px',
            background: '#fff',
            border: `1px solid ${s.accent}22`,
            borderRadius: 16,
            padding: '16px 20px',
            boxShadow: `0 4px 18px ${s.accent}10`,
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
              letterSpacing: '0.12em', color: s.accent, marginBottom: 4 }}>{s.label}</div>
            <div style={{ fontSize: 30, fontWeight: 800, color: s.accent }}>
              {loading ? '—' : s.value}
            </div>
          </div>
        ))}
      </div>

      {/* Tiles */}
      <div style={{ marginBottom: 12 }}>
        <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 700, color: '#1f1f27' }}>
          Quick Access
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: 16 }}>
          {tiles.map(tile => (
            <button
              key={tile.id}
              onClick={() => navigate(tile.path)}
              style={{
                background: '#fff',
                border: `1px solid ${tile.accent}22`,
                borderRadius: 16,
                padding: '24px 20px',
                textAlign: 'left',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'translateY(-3px)'
                e.currentTarget.style.boxShadow = `0 8px 24px ${tile.accent}18`
                e.currentTarget.style.borderColor = `${tile.accent}44`
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.04)'
                e.currentTarget.style.borderColor = `${tile.accent}22`
              }}
            >
              <div style={{
                width: 44, height: 44, borderRadius: 12,
                background: tile.bg, fontSize: 22,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: 14,
              }}>{tile.icon}</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#1f1f27', marginBottom: 6 }}>
                {tile.title}
              </div>
              <div style={{ fontSize: 13, color: '#7a7a8c', lineHeight: 1.5 }}>
                {tile.desc}
              </div>
              <div style={{ marginTop: 16, fontSize: 12, fontWeight: 700,
                color: tile.accent, display: 'flex', alignItems: 'center', gap: 4 }}>
                Open →
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

export default UserLmsHome
