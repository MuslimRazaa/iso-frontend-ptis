import React, { useState, useEffect } from 'react'
import { Video, FileText, Trash2, Inbox, Info, RotateCcw } from 'lucide-react'
import { API_ENDPOINTS, API_BASE_URL } from '../../config/api'

function TaskAllocation() {
  const [tasks, setTasks] = useState([])
  const [employees, setEmployees] = useState([])
  const [courses, setCourses] = useState([])
  const [standardById, setStandardById] = useState({})
  const [resultsByEmail, setResultsByEmail] = useState({})
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [activeTab, setActiveTab] = useState('allocations') // 'allocations' | 'requests'
  const [courseRequests, setCourseRequests] = useState([])
  const [formData, setFormData] = useState({
    employee_id: '',
    course_id: '',
    deadline: '',
  })

  useEffect(() => {
    fetchAllData()
    fetchCourseRequests()
  }, [])

  const fetchAllData = async () => {
    try {
      setLoading(true)
      const [tasksRes, employeesRes, coursesRes, standardsRes] = await Promise.all([
        fetch(API_ENDPOINTS.TASK_ALLOCATIONS),
        fetch(API_ENDPOINTS.EMPLOYEES),
        fetch(API_ENDPOINTS.COURSES),
        fetch(API_ENDPOINTS.STANDARDS).catch(() => null),
      ])

      const tasksData = await tasksRes.json()
      const employeesData = await employeesRes.json()
      const coursesData = await coursesRes.json()
      const standardsData = standardsRes?.ok ? await standardsRes.json() : []

      // Map standard id → name so per-test rows can be labelled.
      const stdMap = {}
      ;(Array.isArray(standardsData) ? standardsData : []).forEach(s => { stdMap[s.id] = s })

      // Fetch each employee's test results once (keyed by email) so we can show
      // real per-course status + pass/fail/score, not the stale task columns.
      const emails = [...new Set((Array.isArray(tasksData) ? tasksData : []).map(t => t.employee_email).filter(Boolean))]
      const entries = await Promise.all(emails.map(async (email) => {
        try {
          const r = await fetch(`${API_BASE_URL}/api/test-results/user/${encodeURIComponent(email)}`)
          const j = r.ok ? await r.json() : { data: [] }
          return [email, Array.isArray(j.data) ? j.data : []]
        } catch { return [email, []] }
      }))
      const resMap = {}
      entries.forEach(([email, rows]) => { resMap[email] = rows })

      setTasks(tasksData)
      setEmployees(employeesData)
      setCourses(coursesData)
      setStandardById(stdMap)
      setResultsByEmail(resMap)
    } catch (error) {
      console.error('Error fetching data:', error)
      alert('Failed to load data. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // Real per-task status/progress from course_progress + test_results, scoped to
  // this assignment (results after ta.created_at) so a re-assign reads fresh.
  const computeTaskStatus = (task) => {
    const results = (resultsByEmail[task.employee_email] || []).filter(r =>
      Number(r.course_id) === Number(task.course_id) &&
      r.submitted_at && new Date(r.submitted_at) >= new Date(task.created_at)
    )
    // Latest result per standard.
    const byStd = {}
    results.forEach(r => {
      const prev = byStd[r.standard_id]
      if (!prev || new Date(r.submitted_at) > new Date(prev.submitted_at)) byStd[r.standard_id] = r
    })
    const tests = Object.values(byStd).map(r => ({
      standardId: r.standard_id,
      name: standardById[r.standard_id]?.standard_name || `Standard #${r.standard_id}`,
      passed: !!r.passed,
      score: r.score_percentage,
    }))
    const requiredCount = Number(task.linked_standards_count) > 0
      ? Number(task.linked_standards_count)
      : ((task.general_standard_id && task.specific_standard_id) ? 2 : 1)
    const doneCount = tests.length
    const allDone = requiredCount > 0 && doneCount >= requiredCount
    const passedAll = allDone && tests.every(t => t.passed)
    const progress = task.live_progress != null ? Number(task.live_progress) : (task.progress || 0)
    const overdue = !allDone && task.deadline && new Date() > new Date(task.deadline)
    let label, color
    if (allDone) { label = passedAll ? 'Completed · Passed' : 'Completed · Failed'; color = passedAll ? '#16a34a' : '#dc2626' }
    else if (overdue) { label = 'Overdue'; color = '#d97706' }
    else if (doneCount > 0 || progress > 0) { label = 'In Progress'; color = '#2563eb' }
    else { label = 'Not Started'; color = '#64748b' }
    return { label, color, progress, tests, requiredCount, doneCount, allDone, passedAll }
  }

  const fetchCourseRequests = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/course-requests`)
      if (res.ok) {
        const data = await res.json()
        setCourseRequests(data)
      }
    } catch {
      // Backend endpoint may not exist yet
      setCourseRequests([])
    }
  }

  const handleCreate = async () => {
    if (formData.employee_id && formData.course_id && formData.deadline) {
      try {
        const response = await fetch(API_ENDPOINTS.TASK_ALLOCATIONS, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            employee_id: formData.employee_id,
            course_id: formData.course_id,
            deadline: formData.deadline,
          }),
        })

        const data = await response.json()

        if (!response.ok) {
          alert(data.error || 'Failed to assign course')
          return
        }

        await fetchAllData()
        setFormData({ employee_id: '', course_id: '', deadline: '' })
        setShowModal(false)
        alert('Course assigned successfully!')
      } catch (error) {
        console.error('Error assigning course:', error)
        alert('Failed to assign course. Please try again.')
      }
    }
  }

  const handleApproveRequest = async (request) => {
    const emp = employees.find(
      (e) => e.full_name?.toLowerCase() === request.employee_name?.toLowerCase()
    )
    const course = courses.find(
      (c) => c.course_title?.toLowerCase() === request.course_title?.toLowerCase()
    )

    if (!emp || !course) {
      alert('Could not find matching employee or course. Please assign manually.')
      setShowModal(true)
      return
    }

    const deadline = new Date()
    deadline.setDate(deadline.getDate() + 30)
    const deadlineStr = deadline.toISOString().split('T')[0]

    try {
      const response = await fetch(API_ENDPOINTS.TASK_ALLOCATIONS, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employee_id: emp.id,
          course_id: course.id,
          deadline: deadlineStr,
        }),
      })

      if (response.ok) {
        // Mark request as approved in backend if endpoint exists
        try {
          await fetch(`${API_BASE_URL}/api/course-requests/${request.id}/approve`, {
            method: 'PUT',
          })
        } catch {
          // Endpoint may not exist
        }
        await fetchAllData()
        await fetchCourseRequests()
        alert(`Course "${request.course_title}" assigned to ${request.employee_name}!`)
      } else {
        const data = await response.json()
        alert(data.error || 'Failed to approve request')
      }
    } catch (error) {
      console.error('Error approving request:', error)
      alert('Failed to approve. Please assign manually.')
    }
  }

  // Reassign the same course to the same employee. We remove the old assignment
  // first — its DELETE resets the user's course progress so the course truly
  // restarts from scratch — then open the assign modal prefilled to create a
  // fresh task. The user's History (test_results) is kept regardless.
  const handleReassign = async (task) => {
    if (!window.confirm(`Reassign "${task.course_title}" to ${task.employee_name}? The course will restart from scratch (their past result stays in History).`)) return
    try {
      await fetch(`${API_ENDPOINTS.TASK_ALLOCATIONS}/${task.id}`, { method: 'DELETE' })
    } catch (e) {
      console.error('Failed to clear old assignment:', e)
    }
    const emp = employees.find(
      (e) => e.full_name?.toLowerCase().trim() === task.employee_name?.toLowerCase().trim()
    )
    setFormData({
      employee_id: emp ? String(emp.id) : '',
      course_id: task.course_id ? String(task.course_id) : '',
      deadline: '',
    })
    await fetchAllData()
    setShowModal(true)
  }

  const handleDelete = async (id) => {
    if (window.confirm('Remove this task assignment?')) {
      try {
        const response = await fetch(`${API_ENDPOINTS.TASK_ALLOCATIONS}/${id}`, {
          method: 'DELETE',
        })

        if (!response.ok) {
          const data = await response.json()
          alert(data.error || 'Failed to delete task')
          return
        }

        setTasks(tasks.filter((task) => task.id !== id))
        alert('Task removed successfully!')
      } catch (error) {
        console.error('Error deleting task:', error)
        alert('Failed to delete task. Please try again.')
      }
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'Completed': return 'completed'
      case 'In Progress': return 'in-progress'
      case 'Overdue': return 'overdue'
      default: return ''
    }
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const formatHours = (seconds) => {
    if (!seconds) return '0h 0m'
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    return `${h}h ${m}m`
  }

  return (
    <div className="task-board">
      <header>
        <div>
          <p className="eyebrow">Employee Training</p>
          <h2>Task Allocation & Progress Tracking</h2>
        </div>
        <button className="primary-btn" onClick={() => setShowModal(true)}>
          + Assign Course
        </button>
      </header>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
        <button
          className={activeTab === 'allocations' ? 'primary-btn' : 'ghost-btn'}
          onClick={() => setActiveTab('allocations')}
          style={{ fontSize: '14px', padding: '8px 20px' }}
        >
          Task Allocations ({tasks.length})
        </button>
        <button
          className={activeTab === 'requests' ? 'primary-btn' : 'ghost-btn'}
          onClick={() => setActiveTab('requests')}
          style={{ fontSize: '14px', padding: '8px 20px', position: 'relative' }}
        >
          Course Requests
          {courseRequests.filter((r) => r.status === 'pending').length > 0 && (
            <span
              style={{
                position: 'absolute',
                top: '-6px',
                right: '-6px',
                background: '#ff5d5d',
                color: 'white',
                borderRadius: '50%',
                width: '18px',
                height: '18px',
                fontSize: '11px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: '700',
              }}
            >
              {courseRequests.filter((r) => r.status === 'pending').length}
            </span>
          )}
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <p>Loading...</p>
        </div>
      ) : activeTab === 'allocations' ? (
        <div className="task-table-wrapper">
          <table className="task-table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Course</th>
                <th>Assigned</th>
                <th>Deadline</th>
                <th>Progress</th>
                <th>Tests (Result)</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {tasks.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '40px' }}>
                    No task allocations found. Create one to get started.
                  </td>
                </tr>
              ) : (
                tasks.map((task) => {
                  const st = computeTaskStatus(task)
                  return (
                    <tr key={task.id} className={st.label === 'Overdue' ? 'overdue-row' : ''}>
                      <td>
                        <strong>{task.employee_name}</strong>
                      </td>
                      <td>{task.course_title}</td>
                      <td>{formatDate(task.assigned_date)}</td>
                      <td>{formatDate(task.deadline)}</td>
                      <td>
                        <div className="progress-cell">
                          <div className="mini-progress-bar">
                            <div className="mini-progress-fill" style={{ width: `${st.progress}%` }} />
                          </div>
                          <span>{st.progress}%</span>
                        </div>
                      </td>
                      <td>
                        {st.tests.length === 0 ? (
                          <span style={{ color: '#94a3b8', fontSize: 13 }}>{st.doneCount} / {st.requiredCount} taken</span>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            {st.tests.map((t) => (
                              <div key={t.standardId} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                                <span style={{ color: '#334155' }}>{t.name}</span>
                                <span style={{
                                  padding: '2px 8px', borderRadius: 999, fontWeight: 700, fontSize: 11,
                                  background: t.passed ? '#dcfce7' : '#fee2e2',
                                  color: t.passed ? '#16a34a' : '#dc2626',
                                }}>
                                  {t.passed ? 'Pass' : 'Fail'}{t.score != null ? ` · ${Math.round(Number(t.score))}%` : ''}
                                </span>
                              </div>
                            ))}
                            {st.doneCount < st.requiredCount && (
                              <span style={{ color: '#94a3b8', fontSize: 12 }}>{st.doneCount} / {st.requiredCount} tests taken</span>
                            )}
                          </div>
                        )}
                      </td>
                      <td>
                        <span style={{
                          display: 'inline-block', padding: '4px 12px', borderRadius: 999,
                          fontSize: 12, fontWeight: 700,
                          background: `${st.color}18`, color: st.color, border: `1px solid ${st.color}44`,
                        }}>
                          {st.label}
                        </span>
                      </td>
                      <td>
                        <div className="action-buttons">
                          <button
                            className="action-btn"
                            onClick={() => handleReassign(task)}
                            title="Reassign this course (fresh start)"
                          >
                            <RotateCcw size={16} />
                          </button>
                          <button
                            className="action-btn delete"
                            onClick={() => handleDelete(task.id)}
                            title="Remove"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      ) : (
        /* Course Requests Tab */
        <div>
          {courseRequests.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '60px 20px',
                background: 'rgba(255,255,255,0.02)',
                borderRadius: '12px',
                border: '2px dashed rgba(255,255,255,0.08)',
              }}
            >
              <div style={{ marginBottom: '16px', color: '#9a9aaa' }}><Inbox size={48} strokeWidth={1.5} /></div>
              <h3 style={{ marginBottom: '8px', color: '#ccc' }}>No Course Requests</h3>
              <p style={{ color: '#666' }}>
                When employees request access to courses, they will appear here.
              </p>
              <p style={{ color: '#555', fontSize: '13px', marginTop: '8px' }}>
                Note: Requires backend endpoint <code>/api/course-requests</code>
              </p>
            </div>
          ) : (
            <div className="task-table-wrapper">
              <table className="task-table">
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Requested Course</th>
                    <th>Requested On</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {courseRequests.map((req, index) => (
                    <tr key={req.id || index}>
                      <td>
                        <strong>{req.employee_name}</strong>
                        <div style={{ fontSize: '12px', color: '#888' }}>{req.employee_email}</div>
                      </td>
                      <td>{req.course_title}</td>
                      <td>
                        {req.requested_at ? formatDate(req.requested_at) : 'N/A'}
                      </td>
                      <td>
                        <span
                          className={`status-badge ${req.status === 'approved' ? 'completed' : req.status === 'rejected' ? 'overdue' : 'in-progress'}`}
                        >
                          {req.status || 'pending'}
                        </span>
                      </td>
                      <td>
                        {req.status === 'pending' && (
                          <div className="action-buttons">
                            <button
                              className="primary-btn"
                              style={{ fontSize: '12px', padding: '6px 14px' }}
                              onClick={() => handleApproveRequest(req)}
                            >
                              Approve & Assign
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Assign Course Modal */}
      {showModal && (
        <div
          className="modal-overlay"
          onClick={() => {
            setShowModal(false)
            setFormData({ employee_id: '', course_id: '', deadline: '' })
          }}
        >
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Assign Course to Employee</h2>
              <button
                className="close-modal-btn"
                onClick={() => {
                  setShowModal(false)
                  setFormData({ employee_id: '', course_id: '', deadline: '' })
                }}
              >
                ✕
              </button>
            </div>

            <form
              className="modal-form"
              onSubmit={(e) => {
                e.preventDefault()
                handleCreate()
              }}
            >
              <label>
                <span>Select Employee *</span>
                <select
                  value={formData.employee_id}
                  onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
                  required
                >
                  <option value="">Choose employee</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.full_name} ({emp.employee_id})
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span>Select Course *</span>
                <select
                  value={formData.course_id}
                  onChange={(e) => setFormData({ ...formData, course_id: e.target.value })}
                  required
                >
                  <option value="">Choose course</option>
                  {courses.map((course) => (
                    <option key={course.id} value={course.id}>
                      {course.course_title} ({course.credit_hours} hours)
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span>Deadline *</span>
                <input
                  type="date"
                  value={formData.deadline}
                  onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                  required
                  min={new Date().toISOString().split('T')[0]}
                />
              </label>

              <div className="info-box">
                <p>
                  <Info size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} /> The employee will be notified and the course will appear in their learning
                  dashboard. Progress and time will be tracked automatically.
                </p>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="ghost-btn"
                  onClick={() => {
                    setShowModal(false)
                    setFormData({ employee_id: '', course_id: '', deadline: '' })
                  }}
                >
                  Cancel
                </button>
                <button type="submit" className="primary-btn">
                  Assign Course
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default TaskAllocation
