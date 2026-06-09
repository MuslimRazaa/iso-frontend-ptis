import React, { useState, useEffect } from 'react'
import { Video, FileText, Trash2, Inbox, Info } from 'lucide-react'
import { API_ENDPOINTS, API_BASE_URL } from '../../config/api'

function TaskAllocation() {
  const [tasks, setTasks] = useState([])
  const [employees, setEmployees] = useState([])
  const [courses, setCourses] = useState([])
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
      const [tasksRes, employeesRes, coursesRes] = await Promise.all([
        fetch(API_ENDPOINTS.TASK_ALLOCATIONS),
        fetch(API_ENDPOINTS.EMPLOYEES),
        fetch(API_ENDPOINTS.COURSES),
      ])

      const tasksData = await tasksRes.json()
      const employeesData = await employeesRes.json()
      const coursesData = await coursesRes.json()

      setTasks(tasksData)
      setEmployees(employeesData)
      setCourses(coursesData)
    } catch (error) {
      console.error('Error fetching data:', error)
      alert('Failed to load data. Please try again.')
    } finally {
      setLoading(false)
    }
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
                <th>Hours</th>
                <th>Time Tracked</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {tasks.length === 0 ? (
                <tr>
                  <td colSpan="9" style={{ textAlign: 'center', padding: '40px' }}>
                    No task allocations found. Create one to get started.
                  </td>
                </tr>
              ) : (
                tasks.map((task) => {
                  // Try to get local time tracking data for this employee+course
                  const progressKey = `progress_${task.employee_email || ''}_${task.course_id || ''}`
                  const localData = (() => {
                    try {
                      return JSON.parse(localStorage.getItem(progressKey) || 'null')
                    } catch { return null }
                  })()
                  const trackedSeconds = localData
                    ? (localData.videoSeconds || 0) + (localData.pptSeconds || 0)
                    : 0

                  return (
                    <tr key={task.id} className={task.status === 'Overdue' ? 'overdue-row' : ''}>
                      <td>
                        <strong>{task.employee_name}</strong>
                      </td>
                      <td>{task.course_title}</td>
                      <td>{formatDate(task.assigned_date)}</td>
                      <td>{formatDate(task.deadline)}</td>
                      <td>
                        <div className="progress-cell">
                          <div className="mini-progress-bar">
                            <div
                              className="mini-progress-fill"
                              style={{ width: `${task.progress}%` }}
                            />
                          </div>
                          <span>{task.progress}%</span>
                        </div>
                      </td>
                      <td>
                        {task.completed_hours} / {task.total_hours}
                      </td>
                      <td>
                        <div style={{ fontSize: '13px' }}>
                          {trackedSeconds > 0 ? (
                            <>
                              <div><Video size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} /> {formatHours(localData?.videoSeconds || 0)}</div>
                              <div style={{ color: '#888', marginTop: '2px' }}>
                                <FileText size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} /> {formatHours(localData?.pptSeconds || 0)}
                              </div>
                            </>
                          ) : (
                            <span style={{ color: '#555' }}>Not started</span>
                          )}
                        </div>
                      </td>
                      <td>
                        <span className={`status-badge ${getStatusColor(task.status)}`}>
                          {task.status}
                        </span>
                      </td>
                      <td>
                        <div className="action-buttons">
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
