import React, { useState, useEffect } from 'react'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'
import { API_ENDPOINTS } from '../../config/api'

function AddEmployee() {
  const navigate = useNavigate()
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })
  const [departments, setDepartments] = useState([])
  const [locations, setLocations] = useState([])
  
  // Management modals
  const [showDeptModal, setShowDeptModal] = useState(false)
  const [showLocModal, setShowLocModal] = useState(false)
  const [managingItem, setManagingItem] = useState({ id: null, name: '' })
  const [isEditingItem, setIsEditingItem] = useState(false)
  
  const [formData, setFormData] = useState({
    employee_id: '',
    full_name: '',
    email: '',
    password: '',
    department: '',
    location: '',
    status: 'Active'
  })

  // Fetch departments and locations on mount
  useEffect(() => {
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

  const handleAddDepartment = async () => {
    if (!managingItem.name.trim()) return

    try {
      await axios.post(API_ENDPOINTS.DEPARTMENTS, { name: managingItem.name.trim() })
      await fetchDepartments()
      setManagingItem({ id: null, name: '' })
      setMessage({ type: 'success', text: 'Department added successfully' })
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.error || 'Failed to add department' })
    }
  }

  const handleEditDepartment = async () => {
    if (!managingItem.name.trim()) return

    try {
      await axios.put(`${API_ENDPOINTS.DEPARTMENTS}/${managingItem.id}`, { name: managingItem.name.trim() })
      await fetchDepartments()
      setManagingItem({ id: null, name: '' })
      setIsEditingItem(false)
      setMessage({ type: 'success', text: 'Department updated successfully' })
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.error || 'Failed to update department' })
    }
  }

  const handleDeleteDepartment = async (id) => {
    if (!window.confirm('Delete this department?')) return

    try {
      await axios.delete(`${API_ENDPOINTS.DEPARTMENTS}/${id}`)
      await fetchDepartments()
      setMessage({ type: 'success', text: 'Department deleted successfully' })
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to delete department' })
    }
  }

  const handleAddLocation = async () => {
    if (!managingItem.name.trim()) return

    try {
      await axios.post(API_ENDPOINTS.LOCATIONS, { name: managingItem.name.trim() })
      await fetchLocations()
      setManagingItem({ id: null, name: '' })
      setMessage({ type: 'success', text: 'Location added successfully' })
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.error || 'Failed to add location' })
    }
  }

  const handleEditLocation = async () => {
    if (!managingItem.name.trim()) return

    try {
      await axios.put(`${API_ENDPOINTS.LOCATIONS}/${managingItem.id}`, { name: managingItem.name.trim() })
      await fetchLocations()
      setManagingItem({ id: null, name: '' })
      setIsEditingItem(false)
      setMessage({ type: 'success', text: 'Location updated successfully' })
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.error || 'Failed to update location' })
    }
  }

  const handleDeleteLocation = async (id) => {
    if (!window.confirm('Delete this location?')) return

    try {
      await axios.delete(`${API_ENDPOINTS.LOCATIONS}/${id}`)
      await fetchLocations()
      setMessage({ type: 'success', text: 'Location deleted successfully' })
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to delete location' })
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData({
      ...formData,
      [name]: value
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage({ type: '', text: '' })

    try {
      // Validate required fields
      if (!formData.employee_id || !formData.full_name || !formData.password || 
          !formData.department || !formData.location) {
        setMessage({ type: 'error', text: 'Please fill all required fields' })
        setLoading(false)
        return
      }

      // Send to backend
      const response = await axios.post(API_ENDPOINTS.EMPLOYEES, formData)

      setMessage({ type: 'success', text: 'Employee added successfully! Redirecting...' })
      
      // Redirect to All Employees page after 1.5 seconds
      setTimeout(() => {
        navigate('/learning-management-system/all-employees')
      }, 1500)

    } catch (error) {
      console.error('Error adding employee:', error)
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.error || 'Failed to add employee. Please try again.' 
      })
    } finally {
      setLoading(false)
    }
  }

  const togglePasswordVisibility = () => {
    setShowPassword((prev) => !prev)
  }

  return (
    <div className="lms-form-panel">
      <header>
        <div>
          <p className="eyebrow">Talent & Workforce</p>
          <h2>Add Employee Profile</h2>
        </div>
      </header>

      {message.text && (
        <div className={`message ${message.type}`} style={{
          padding: '1rem',
          marginBottom: '1rem',
          borderRadius: '8px',
          backgroundColor: message.type === 'success' ? '#d4edda' : '#f8d7da',
          color: message.type === 'success' ? '#155724' : '#721c24',
          border: `1px solid ${message.type === 'success' ? '#c3e6cb' : '#f5c6cb'}`
        }}>
          {message.text}
        </div>
      )}

      <form className="lms-form-grid" onSubmit={handleSubmit}>
        <div className="form-row">
          <label>
            <span>Employee ID *</span>
            <input 
              type="text" 
              name="employee_id"
              placeholder="EMP-001" 
              value={formData.employee_id}
              onChange={handleInputChange}
              required 
            />
          </label>
          <label>
            <span>Full Name *</span>
            <input 
              type="text" 
              name="full_name"
              placeholder="e.g., Ahmed Khan" 
              value={formData.full_name}
              onChange={handleInputChange}
              required 
            />
          </label>
        </div>

        <div className="form-row">
          <label>
            <span>Email (optional)</span>
            <input 
              type="email" 
              name="email"
              placeholder="name@ptis.com"
              value={formData.email}
              onChange={handleInputChange}
            />
          </label>
          <label>
            <span>Password *</span>
            <div className="password-field">
              <input 
                type={showPassword ? 'text' : 'password'} 
                name="password"
                placeholder="Enter password"
                value={formData.password}
                onChange={handleInputChange}
                required 
              />
              <button type="button" className="hide-show-password" onClick={togglePasswordVisibility}>
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
          </label>
        </div>

        <div className="form-row">
          <label>
            <span>Department *</span>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <select 
                name="department"
                value={formData.department}
                onChange={handleInputChange}
                required
                style={{ flex: 1 }}
              >
                <option value="">Select department</option>
                {departments.map((dept) => (
                  <option key={dept.id} value={dept.name}>
                    {dept.name}
                  </option>
                ))}
              </select>
              <button 
                type="button" 
                className="ghost-btn"
                onClick={() => {
                  setShowDeptModal(true)
                  setManagingItem({ id: null, name: '' })
                }}
                style={{ whiteSpace: 'nowrap' }}
              >
                Manage
              </button>
            </div>
          </label>

          <label>
            <span>Location *</span>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <select 
                name="location"
                value={formData.location}
                onChange={handleInputChange}
                required
                style={{ flex: 1 }}
              >
                <option value="">Select location</option>
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.name}>
                    {loc.name}
                  </option>
                ))}
              </select>
              <button 
                type="button" 
                className="ghost-btn"
                onClick={() => {
                  setShowLocModal(true)
                  setManagingItem({ id: null, name: '' })
                }}
                style={{ whiteSpace: 'nowrap' }}
              >
                Manage
              </button>
            </div>
          </label>
        </div>

        <label>
          <span>User Status *</span>
          <select 
            name="status"
            value={formData.status}
            onChange={handleInputChange}
            required
          >
            <option value="Active">Active</option>
            <option value="Blocked">Blocked</option>
            <option value="Inactive">Inactive</option>
          </select>
        </label>

        <div className="form-actions">
          <button type="button" className="ghost-btn" onClick={() => window.history.back()}>
            Cancel
          </button>
          <button type="submit" className="primary-btn" disabled={loading}>
            {loading ? 'Creating...' : 'Create Profile'}
          </button>
        </div>
      </form>

      {/* Department Management Modal */}
      {showDeptModal && (
        <div className="modal-overlay" onClick={() => setShowDeptModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h2>Manage Departments</h2>
              <button className="close-modal-btn" onClick={() => setShowDeptModal(false)}>✕</button>
            </div>

            <div style={{ padding: '1rem' }}>
              {/* Add/Edit Form */}
              <div style={{ marginBottom: '1.5rem' }}>
                <label>
                  <span>{isEditingItem ? 'Edit' : 'Add'} Department</span>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input
                      type="text"
                      value={managingItem.name}
                      onChange={(e) => setManagingItem({ ...managingItem, name: e.target.value })}
                      placeholder="Department name"
                      style={{ flex: 1 }}
                    />
                    <button
                      type="button"
                      className="primary-btn"
                      onClick={isEditingItem ? handleEditDepartment : handleAddDepartment}
                    >
                      {isEditingItem ? 'Update' : 'Add'}
                    </button>
                    {isEditingItem && (
                      <button
                        type="button"
                        className="ghost-btn"
                        onClick={() => {
                          setManagingItem({ id: null, name: '' })
                          setIsEditingItem(false)
                        }}
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </label>
              </div>

              {/* Department List */}
              <div>
                <h3 style={{ marginBottom: '0.5rem' }}>All Departments</h3>
                {departments.length === 0 ? (
                  <p style={{ color: '#666' }}>No departments found</p>
                ) : (
                  <ul style={{ listStyle: 'none', padding: 0 }}>
                    {departments.map((dept) => (
                      <li key={dept.id} style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center',
                        padding: '0.5rem',
                        borderBottom: '1px solid #eee'
                      }}>
                        <span>{dept.name}</span>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button
                            type="button"
                            className="action-btn edit"
                            onClick={() => {
                              setManagingItem({ id: dept.id, name: dept.name })
                              setIsEditingItem(true)
                            }}
                            title="Edit"
                          >
                            ✎
                          </button>
                          <button
                            type="button"
                            className="action-btn delete"
                            onClick={() => handleDeleteDepartment(dept.id)}
                            title="Delete"
                          >
                            🗑
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Location Management Modal */}
      {showLocModal && (
        <div className="modal-overlay" onClick={() => setShowLocModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h2>Manage Locations</h2>
              <button className="close-modal-btn" onClick={() => setShowLocModal(false)}>✕</button>
            </div>

            <div style={{ padding: '1rem' }}>
              {/* Add/Edit Form */}
              <div style={{ marginBottom: '1.5rem' }}>
                <label>
                  <span>{isEditingItem ? 'Edit' : 'Add'} Location</span>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input
                      type="text"
                      value={managingItem.name}
                      onChange={(e) => setManagingItem({ ...managingItem, name: e.target.value })}
                      placeholder="Location name"
                      style={{ flex: 1 }}
                    />
                    <button
                      type="button"
                      className="primary-btn"
                      onClick={isEditingItem ? handleEditLocation : handleAddLocation}
                    >
                      {isEditingItem ? 'Update' : 'Add'}
                    </button>
                    {isEditingItem && (
                      <button
                        type="button"
                        className="ghost-btn"
                        onClick={() => {
                          setManagingItem({ id: null, name: '' })
                          setIsEditingItem(false)
                        }}
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </label>
              </div>

              {/* Location List */}
              <div>
                <h3 style={{ marginBottom: '0.5rem' }}>All Locations</h3>
                {locations.length === 0 ? (
                  <p style={{ color: '#666' }}>No locations found</p>
                ) : (
                  <ul style={{ listStyle: 'none', padding: 0 }}>
                    {locations.map((loc) => (
                      <li key={loc.id} style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center',
                        padding: '0.5rem',
                        borderBottom: '1px solid #eee'
                      }}>
                        <span>{loc.name}</span>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button
                            type="button"
                            className="action-btn edit"
                            onClick={() => {
                              setManagingItem({ id: loc.id, name: loc.name })
                              setIsEditingItem(true)
                            }}
                            title="Edit"
                          >
                            ✎
                          </button>
                          <button
                            type="button"
                            className="action-btn delete"
                            onClick={() => handleDeleteLocation(loc.id)}
                            title="Delete"
                          >
                            🗑
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AddEmployee
