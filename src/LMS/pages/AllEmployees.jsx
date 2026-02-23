import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import { API_ENDPOINTS } from '../../config/api'

function AllEmployees() {
  const [employees, setEmployees] = useState([])
  const [departments, setDepartments] = useState([])
  const [locations, setLocations] = useState([])
  const [loading, setLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [showModalPassword, setShowModalPassword] = useState(false)
  const [formState, setFormState] = useState({
    employee_id: '',
    full_name: '',
    email: '',
    password: '',
    department: '',
    location: '',
    status: 'Active'
  })

  // Fetch employees, departments, and locations from backend
  useEffect(() => {
    fetchEmployees()
    fetchDepartments()
    fetchLocations()
  }, [])

  const fetchDepartments = async () => {
    try {
      const response = await axios.get(API_ENDPOINTS.DEPARTMENTS)
      setDepartments(response.data)
    } catch (error) {
      console.error('Error fetching departments:', error)
    }
  }

  const fetchLocations = async () => {
    try {
      const response = await axios.get(API_ENDPOINTS.LOCATIONS)
      setLocations(response.data)
    } catch (error) {
      console.error('Error fetching locations:', error)
    }
  }

  const fetchEmployees = async () => {
    setLoading(true)
    try {
      const response = await axios.get(API_ENDPOINTS.EMPLOYEES)
      setEmployees(response.data)
    } catch (error) {
      console.error('Error fetching employees:', error)
      alert('Failed to fetch employees from server')
    } finally {
      setLoading(false)
    }
  }

  const openModal = (employee) => {
    setEditingId(employee.id)
    setFormState({
      employee_id: employee.employee_id,
      full_name: employee.full_name,
      email: employee.email || '',
      password: '',
      department: employee.department,
      location: employee.location,
      status: employee.status || 'Active'
    })
    setShowModalPassword(false)
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setEditingId(null)
    setShowModalPassword(false)
  }

  const handleDelete = async (id) => {
    if (window.confirm('Remove this employee from the directory?')) {
      try {
        await axios.delete(`${API_ENDPOINTS.EMPLOYEES}/${id}`)
        setEmployees(employees.filter((emp) => emp.id !== id))
      } catch (error) {
        console.error('Error deleting employee:', error)
        alert('Failed to delete employee')
      }
    }
  }

  const handleChange = (field, value) => {
    setFormState({ ...formState, [field]: value })
  }

  const handleSave = async () => {
    try {
      const updateData = { ...formState }
      // Don't send password if it's empty
      if (!updateData.password) {
        delete updateData.password
      }
      
      await axios.put(`${API_ENDPOINTS.EMPLOYEES}/${editingId}`, updateData)
      
      // Refresh the list
      await fetchEmployees()
      closeModal()
    } catch (error) {
      console.error('Error updating employee:', error)
      alert('Failed to update employee')
    }
  }

  return (
    <div className="lms-table-panel">
      <header>
        <div>
          <p className="eyebrow">People Directory</p>
          <h2>All Employees</h2>
        </div>
        <div className="table-actions">
          <button className="ghost-btn" onClick={fetchEmployees}>
            Refresh
          </button>
          <Link to="/learning-management-system/add-employee" className="primary-btn">
            + Add Employee
          </Link>
        </div>
      </header>

      {loading && (
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <p>Loading employees...</p>
        </div>
      )}

      {!loading && employees.length === 0 && (
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <p>No employees found. Add your first employee!</p>
        </div>
      )}

      {!loading && employees.length > 0 && (
        <div className="table-wrapper">
          <table className="employee-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Employee</th>
              <th>Email</th>
              <th>Department</th>
              <th>Location</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {employees.map((emp) => (
              <tr key={emp.id}>
                <td>{emp.employee_id}</td>
                <td>
                  <div className="employee-ident">
                    <span className="avatar-circle" aria-hidden="true">
                      {emp.full_name
                        .split(' ')
                        .map((part) => part[0])
                        .slice(0, 2)
                        .join('')}
                    </span>
                    <div>
                      <strong>{emp.full_name}</strong>
                      <span>{emp.role}</span>
                    </div>
                  </div>
                </td>
                <td>{emp.email || '—'}</td>
                <td>{emp.department}</td>
                <td>{emp.location}</td>
                <td>
                  <span className={`status-pill small ${emp.status?.toLowerCase() || 'active'}`}>
                    {emp.status || 'Active'}
                  </span>
                </td>
                <td>
                  <div className="action-buttons">
                    <button className="action-btn edit" onClick={() => openModal(emp)} title="Edit">
                      ✎
                    </button>
                    <button className="action-btn delete" onClick={() => handleDelete(emp.id)} title="Remove">
                      🗑
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Edit Employee</h2>
              <button className="close-modal-btn" onClick={closeModal}>
                ✕
              </button>
            </div>

            <form
              className="modal-form"
              onSubmit={(e) => {
                e.preventDefault()
                handleSave()
              }}
            >
              <label>
                <span>Employee ID *</span>
                <input
                  type="text"
                  value={formState.employee_id}
                  onChange={(e) => handleChange('employee_id', e.target.value)}
                  required
                />
              </label>

              <label>
                <span>Full Name *</span>
                <input
                  type="text"
                  value={formState.full_name}
                  onChange={(e) => handleChange('full_name', e.target.value)}
                  required
                />
              </label>

              <label>
                <span>Email (optional)</span>
                <input
                  type="email"
                  value={formState.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  placeholder="name@ptis.com"
                />
              </label>

              <label>
                <span>Password *</span>
                <div className="password-field">
                  <input
                    type={showModalPassword ? 'text' : 'password'}
                    value={formState.password}
                    onChange={(e) => handleChange('password', e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    className="hide-show-password"
                    onClick={() => setShowModalPassword((prev) => !prev)}
                  >
                    {showModalPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
              </label>

              <div className="form-row">
                <label>
                  <span>Department *</span>
                  <select
                    value={formState.department}
                    onChange={(e) => handleChange('department', e.target.value)}
                    required
                  >
                    <option value="">Select department</option>
                    {departments.map((dept) => (
                      <option key={dept.id} value={dept.name}>
                        {dept.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <label>
                <span>Location *</span>
                <select
                  value={formState.location}
                  onChange={(e) => handleChange('location', e.target.value)}
                  required
                >
                  <option value="">Select location</option>
                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.name}>
                      {loc.name}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span>Status *</span>
                <select
                  value={formState.status}
                  onChange={(e) => handleChange('status', e.target.value)}
                  required
                >
                  <option value="Active">Active</option>
                  <option value="Blocked">Blocked</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </label>

              <div className="modal-actions">
                <button type="button" className="ghost-btn" onClick={closeModal}>
                  Cancel
                </button>
                <button type="submit" className="primary-btn">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default AllEmployees
