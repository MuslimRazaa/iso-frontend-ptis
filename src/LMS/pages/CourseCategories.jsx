import React, { useState, useEffect } from 'react'
import axios from 'axios'
import { API_ENDPOINTS } from '../../config/api'

function CourseCategories() {
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })
  const [isAdding, setIsAdding] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [formData, setFormData] = useState({ name: '', description: '' })

  // Fetch categories from backend
  useEffect(() => {
    fetchCategories()
  }, [])

  const fetchCategories = async () => {
    setLoading(true)
    try {
      const response = await axios.get(API_ENDPOINTS.CATEGORIES)
      setCategories(response.data)
    } catch (error) {
      console.error('Error fetching categories:', error)
      setMessage({ type: 'error', text: 'Failed to fetch categories from server' })
    } finally {
      setLoading(false)
    }
  }

  const handleAdd = async () => {
    if (!formData.name.trim()) {
      setMessage({ type: 'error', text: 'Category name is required' })
      return
    }

    setLoading(true)
    setMessage({ type: '', text: '' })

    try {
      const response = await axios.post(API_ENDPOINTS.CATEGORIES, {
        name: formData.name.trim(),
        description: formData.description.trim()
      })

      setMessage({ type: 'success', text: 'Category added successfully' })
      setFormData({ name: '', description: '' })
      setIsAdding(false)
      
      // Refresh the list
      await fetchCategories()

    } catch (error) {
      console.error('Error adding category:', error)
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.error || 'Failed to add category. Please try again.' 
      })
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this category? Associated courses will be uncategorized.')) {
      return
    }

    try {
      await axios.delete(`${API_ENDPOINTS.CATEGORIES}/${id}`)
      setCategories(categories.filter((cat) => cat.id !== id))
      setMessage({ type: 'success', text: 'Category deleted successfully' })
    } catch (error) {
      console.error('Error deleting category:', error)
      setMessage({ type: 'error', text: 'Failed to delete category' })
    }
  }

  const startEdit = (category) => {
    setEditingId(category.id)
    setFormData({ name: category.name, description: category.description })
  }

  const saveEdit = async (id) => {
    if (!formData.name.trim()) {
      setMessage({ type: 'error', text: 'Category name is required' })
      return
    }

    setLoading(true)
    setMessage({ type: '', text: '' })

    try {
      await axios.put(`${API_ENDPOINTS.CATEGORIES}/${id}`, {
        name: formData.name.trim(),
        description: formData.description.trim()
      })

      setMessage({ type: 'success', text: 'Category updated successfully' })
      setEditingId(null)
      setFormData({ name: '', description: '' })
      
      // Refresh the list
      await fetchCategories()

    } catch (error) {
      console.error('Error updating category:', error)
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.error || 'Failed to update category. Please try again.' 
      })
    } finally {
      setLoading(false)
    }
  }

  const cancelEdit = () => {
    setEditingId(null)
    setIsAdding(false)
    setFormData({ name: '', description: '' })
    setMessage({ type: '', text: '' })
  }

  return (
    <div className="lms-table-panel">
      <header>
        <div>
          <p className="eyebrow">Settings</p>
          <h2>Course Categories</h2>
        </div>
        <button className="primary-btn" onClick={() => setIsAdding(true)}>
          + Add Category
        </button>
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

      {loading && (
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <p>Loading categories...</p>
        </div>
      )}

      {!loading && categories.length === 0 && !isAdding && (
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <p>No categories found. Add your first category!</p>
        </div>
      )}

      {!loading && (categories.length > 0 || isAdding) && (
      <div className="table-wrapper">
        <table className="category-table">
          <thead>
            <tr>
              <th>Category Name</th>
              <th>Description</th>
              <th>Courses</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {isAdding && (
              <tr className="add-row">
                <td>
                  <input
                    type="text"
                    placeholder="Category name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="edit-input"
                    autoFocus
                  />
                </td>
                <td>
                  <input
                    type="text"
                    placeholder="Brief description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="edit-input"
                  />
                </td>
                <td>—</td>
                <td>
                  <div className="action-buttons">
                    <button className="action-btn save" onClick={handleAdd} title="Save">
                      ✓
                    </button>
                    <button className="action-btn cancel" onClick={cancelEdit} title="Cancel">
                      ✕
                    </button>
                  </div>
                </td>
              </tr>
            )}
            {categories.map((category) => (
              <tr key={category.id}>
                <td>
                  {editingId === category.id ? (
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="edit-input"
                    />
                  ) : (
                    <strong>{category.name}</strong>
                  )}
                </td>
                <td>
                  {editingId === category.id ? (
                    <input
                      type="text"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="edit-input"
                    />
                  ) : (
                    <span className="category-desc">{category.description}</span>
                  )}
                </td>
                <td>{category.courses}</td>
                <td>
                  <div className="action-buttons">
                    {editingId === category.id ? (
                      <>
                        <button className="action-btn save" onClick={() => saveEdit(category.id)} title="Save">
                          ✓
                        </button>
                        <button className="action-btn cancel" onClick={cancelEdit} title="Cancel">
                          ✕
                        </button>
                      </>
                    ) : (
                      <>
                        <button className="action-btn edit" onClick={() => startEdit(category)} title="Edit">
                          ✎
                        </button>
                        <button className="action-btn delete" onClick={() => handleDelete(category.id)} title="Delete">
                          🗑
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      )}
    </div>
  )
}

export default CourseCategories
