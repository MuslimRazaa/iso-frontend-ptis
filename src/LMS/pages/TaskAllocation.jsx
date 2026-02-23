import React, { useState, useEffect } from 'react'
import { API_ENDPOINTS } from '../../config/api'

function TaskAllocation() {
  const [tasks, setTasks] = useState([])
  const [employees, setEmployees] = useState([])
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [formData, setFormData] = useState({
    employee_id: '',
    course_id: '',
    deadline: '',
  })

  // Fetch all data on component mount
  useEffect(() => {
    fetchAllData()
  }, [])

  const fetchAllData = async () => {
    try {
      setLoading(true)
      const [tasksRes, employeesRes, coursesRes] = await Promise.all([
        fetch(API_ENDPOINTS.TASK_ALLOCATIONS),
        fetch(API_ENDPOINTS.EMPLOYEES),
        fetch(API_ENDPOINTS.COURSES)
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

  const handleCreate = async () => {
    if (formData.employee_id && formData.course_id && formData.deadline) {
      try {
        const response = await fetch(API_ENDPOINTS.TASK_ALLOCATIONS, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            employee_id: formData.employee_id,
            course_id: formData.course_id,
            deadline: formData.deadline
          })
        })

        const data = await response.json()

        if (!response.ok) {
          alert(data.error || 'Failed to assign course')
          return
        }

        // Refresh tasks list after successful creation
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

  const handleDelete = async (id) => {
    if (window.confirm('Remove this task assignment?')) {
      try {
        const response = await fetch(`${API_ENDPOINTS.TASK_ALLOCATIONS}/${id}`, {
          method: 'DELETE'
        })

        if (!response.ok) {
          const data = await response.json()
          alert(data.error || 'Failed to delete task')
          return
        }

        // Remove from local state
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
      case 'Completed':
        return 'completed'
      case 'In Progress':
        return 'in-progress'
      case 'Overdue':
        return 'overdue'
      default:
        return ''
    }
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
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

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <p>Loading...</p>
        </div>
      ) : (
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
                tasks.map((task) => (
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
                          🗑
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => {
          setShowModal(false)
          setFormData({ employee_id: '', course_id: '', deadline: '' })
        }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Assign Course to Employee</h2>
              <button className="close-modal-btn" onClick={() => {
                setShowModal(false)
                setFormData({ employee_id: '', course_id: '', deadline: '' })
              }}>
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
                  ℹ️ The employee will be notified and the course will appear in their learning
                  dashboard. Progress will be tracked automatically.
                </p>
              </div>

              <div className="modal-actions">
                <button type="button" className="ghost-btn" onClick={() => {
                  setShowModal(false)
                  setFormData({ employee_id: '', course_id: '', deadline: '' })
                }}>
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
