import React, { useState, useEffect } from 'react'
import axios from 'axios'
import { Pencil, Trash2 } from 'lucide-react'
import { API_ENDPOINTS } from '../../config/api'
import { showToast } from '../../components/Toast'

function CourseCategories() {
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(false)
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
      showToast('Failed to fetch categories from server', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleAdd = async () => {
    if (!formData.name.trim()) {
      showToast('Category name is required', 'error')
      return
    }

    setLoading(true)

    try {
      const response = await axios.post(API_ENDPOINTS.CATEGORIES, {
        name: formData.name.trim(),
        description: formData.description.trim()
      })

      showToast('Category added successfully!', 'success')
      setFormData({ name: '', description: '' })
      setIsAdding(false)

      // Refresh the list
      await fetchCategories()

    } catch (error) {
      console.error('Error adding category:', error)
      const msg = error.response?.data?.error || 'Failed to add category. Please try again.'
      showToast(msg, 'error')
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
      showToast('Category deleted successfully!', 'success')
    } catch (error) {
      console.error('Error deleting category:', error)
      showToast('Failed to delete category', 'error')
    }
  }

  const startEdit = (category) => {
    setEditingId(category.id)
    setFormData({ name: category.name, description: category.description })
  }

  const saveEdit = async (id) => {
    if (!formData.name.trim()) {
      showToast('Category name is required', 'error')
      return
    }

    setLoading(true)

    try {
      await axios.put(`${API_ENDPOINTS.CATEGORIES}/${id}`, {
        name: formData.name.trim(),
        description: formData.description.trim()
      })

      showToast('Category updated successfully!', 'success')
      setEditingId(null)
      setFormData({ name: '', description: '' })

      // Refresh the list
      await fetchCategories()

    } catch (error) {
      console.error('Error updating category:', error)
      const msg = error.response?.data?.error || 'Failed to update category. Please try again.'
      showToast(msg, 'error')
    } finally {
      setLoading(false)
    }
  }

  const cancelEdit = () => {
    setEditingId(null)
    setIsAdding(false)
    setFormData({ name: '', description: '' })
  }

  return (
    <div className="lms-table-panel">
      <header>
        <div>
          <p className="eyebrow">Settings</p>
          <h2>Course Categories</h2>
          <p className="panel-subtitle">Group courses into categories learners can browse by.</p>
        </div>
        <button className="primary-btn" onClick={() => setIsAdding(true)}>
          + Add Category
        </button>
      </header>

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
                          <Pencil size={16} />
                        </button>
                        <button className="action-btn delete" onClick={() => handleDelete(category.id)} title="Delete">
                          <Trash2 size={16} />
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
