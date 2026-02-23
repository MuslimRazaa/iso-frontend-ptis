import React, { useState, useEffect } from 'react'
import axios from 'axios'
import { API_ENDPOINTS, API_BASE_URL } from '../../config/api'

import dataAnalystThumb from '../../assets/thumbnails/1.jpg'

function AllCourses() {
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    owner: '',
    category: '',
    standard: '',
    creditHours: 0,
    duration: 0,
    prerequisites: '',
    thumbnail: null,
    videos: [],
  })
  const [showModal, setShowModal] = useState(false)

  // Fetch courses from backend
  useEffect(() => {
    fetchCourses()
  }, [])

  const fetchCourses = async () => {
    setLoading(true)
    try {
      const response = await axios.get(API_ENDPOINTS.COURSES)
      
      // Transform backend data to match frontend structure
      const transformedCourses = response.data.map(course => {
        const updatedDate = new Date(course.updated_at)
        const now = new Date()
        const diffDays = Math.floor((now - updatedDate) / (1000 * 60 * 60 * 24))
        
        let updatedText = 'Just now'
        if (diffDays === 0) {
          updatedText = 'Today'
        } else if (diffDays === 1) {
          updatedText = 'Yesterday'
        } else if (diffDays < 7) {
          updatedText = `${diffDays} days ago`
        } else if (diffDays < 30) {
          updatedText = `${Math.floor(diffDays / 7)} weeks ago`
        } else {
          updatedText = updatedDate.toLocaleDateString()
        }

        return {
          id: course.id,
          title: course.course_title,
          description: course.course_description,
          owner: course.course_owner || 'N/A',
          category: course.course_category,
          standard: course.standard_name || 'N/A',
          creditHours: course.credit_hours,
          duration: course.duration_weeks || 0,
          status: course.is_published ? 'Active' : 'Draft',
          updated: updatedText,
          thumbnail: course.course_thumbnail ? `${API_BASE_URL}${course.course_thumbnail}` : dataAnalystThumb,
          prerequisites: course.prerequisites || 'None',
          videos: course.course_videos || [],
        }
      })

      setCourses(transformedCourses)
    } catch (error) {
      console.error('Error fetching courses:', error)
      alert('Failed to fetch courses from server')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this course?')) {
      try {
        await axios.delete(`${API_ENDPOINTS.COURSES}/${id}`)
        setCourses(courses.filter((course) => course.id !== id))
      } catch (error) {
        console.error('Error deleting course:', error)
        alert('Failed to delete course')
      }
    }
  }

  const startEdit = (course) => {
    setEditingId(course.id)
    setEditForm({
      title: course.title,
      description: course.description,
      owner: course.owner,
      category: course.category,
      standard: course.standard,
      creditHours: course.creditHours,
      duration: course.duration,
      prerequisites: course.prerequisites,
      thumbnail: course.thumbnail,
      videos: course.videos || [],
    })
    setShowModal(true)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditForm({
      title: '',
      description: '',
      owner: '',
      category: '',
      standard: '',
      creditHours: 0,
      duration: 0,
      prerequisites: '',
      thumbnail: null,
      videos: [],
    })
    setShowModal(false)
  }

  const saveEdit = () => {
    setCourses(
      courses.map((course) =>
        course.id === editingId
          ? { ...course, ...editForm, updated: 'Just now' }
          : course
      )
    )
    cancelEdit()
  }

  const addVideoField = () => {
    setEditForm({ ...editForm, videos: [...editForm.videos, ''] })
  }

  const removeVideoField = (index) => {
    setEditForm({
      ...editForm,
      videos: editForm.videos.filter((_, i) => i !== index),
    })
  }

  const updateVideo = (index, value) => {
    const newVideos = [...editForm.videos]
    newVideos[index] = value
    setEditForm({ ...editForm, videos: newVideos })
  }

  return (
    <div className="lms-table-panel">
      <header>
        <div>
          <p className="eyebrow">Course Catalogue</p>
          <h2>All Courses</h2>
        </div>
        <button className="ghost-btn" onClick={fetchCourses}>Refresh</button>
      </header>

      {loading && (
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <p>Loading courses...</p>
        </div>
      )}

      {!loading && courses.length === 0 && (
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <p>No courses found. Add your first course!</p>
        </div>
      )}

      {!loading && courses.length > 0 && (
        <div className="table-wrapper">
          <table className="course-table">
            <thead>
              <tr>
                <th>Course</th>
                <th>Owner</th>
                <th>Category</th>
                <th>Standard</th>
                <th>Status</th>
                <th>Last Update</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {courses.map((row) => (
                <tr key={row.id}>
                  <td>
                    <div className="course-cell">
                      <img src={row.thumbnail} alt={row.title} className="course-thumb" />
                      <div className="course-info">
                        <strong>{row.title}</strong>
                        <span>{row.description}</span>
                    </div>
                  </div>
                </td>
                <td>{row.owner}</td>
                <td>{row.category}</td>
                <td>{row.standard}</td>
                <td>
                  <span className={`status-pill small ${row.status.toLowerCase()}`}>
                    {row.status}
                  </span>
                </td>
                <td>{row.updated}</td>
                <td>
                  <div className="action-buttons">
                    <button className="action-btn edit" onClick={() => startEdit(row)} title="Edit">
                      ✎
                    </button>
                    <button className="action-btn delete" onClick={() => handleDelete(row.id)} title="Delete">
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
        <div className="modal-overlay" onClick={cancelEdit}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Edit Course</h2>
              <button className="close-modal-btn" onClick={cancelEdit}>
                ✕
              </button>
            </div>

            <form className="modal-form" onSubmit={(e) => { e.preventDefault(); saveEdit(); }}>
              <label>
                <span>Course Title *</span>
                <input
                  type="text"
                  value={editForm.title}
                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                  required
                />
              </label>

              <label>
                <span>Thumbnail</span>
                <div className="thumbnail-preview">
                  {editForm.thumbnail && (
                    <img src={editForm.thumbnail} alt="Preview" className="preview-img" />
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files[0]
                      if (file) {
                        const reader = new FileReader()
                        reader.onloadend = () => {
                          setEditForm({ ...editForm, thumbnail: reader.result })
                        }
                        reader.readAsDataURL(file)
                      }
                    }}
                  />
                </div>
              </label>

              <div className="form-row">
                <label>
                  <span>Credit Hours *</span>
                  <input
                    type="number"
                    value={editForm.creditHours}
                    onChange={(e) => setEditForm({ ...editForm, creditHours: parseInt(e.target.value) || 0 })}
                    required
                  />
                </label>

                <label>
                  <span>Duration (Weeks)</span>
                  <input
                    type="number"
                    value={editForm.duration}
                    onChange={(e) => setEditForm({ ...editForm, duration: parseInt(e.target.value) || 0 })}
                  />
                </label>
              </div>

              <label>
                <span>Course Owner / Instructor</span>
                <input
                  type="text"
                  value={editForm.owner}
                  onChange={(e) => setEditForm({ ...editForm, owner: e.target.value })}
                />
              </label>

              <label>
                <span>Category</span>
                <select
                  value={editForm.category}
                  onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                >
                  <option value="">Select category</option>
                  <option value="Technical Skills">Technical Skills</option>
                  <option value="Compliance & Safety">Compliance & Safety</option>
                  <option value="Management">Management</option>
                  <option value="Operations">Operations</option>
                  <option value="Other">Other</option>
                </select>
              </label>

              <label>
                <span>Standard</span>
                <input
                  type="text"
                  value={editForm.standard}
                  disabled
                  style={{ backgroundColor: '#f5f5f5', cursor: 'not-allowed' }}
                />
              </label>

              <label>
                <span>Prerequisites</span>
                <textarea
                  rows="2"
                  value={editForm.prerequisites}
                  onChange={(e) => setEditForm({ ...editForm, prerequisites: e.target.value })}
                />
              </label>

              <label>
                <span>Description *</span>
                <textarea
                  rows="4"
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  required
                />
              </label>

              <div className="video-section">
                <div className="video-section-header">
                  <span>Course Videos</span>
                  <button type="button" className="ghost-btn small" onClick={addVideoField}>
                    + Add Video
                  </button>
                </div>
                {editForm.videos.length > 0 ? (
                  editForm.videos.map((video, index) => (
                    <div className="video-input-group" key={index}>
                      <input
                        type="url"
                        placeholder="Paste video URL"
                        value={video}
                        onChange={(e) => updateVideo(index, e.target.value)}
                      />
                      <button
                        type="button"
                        className="remove-video-btn"
                        onClick={() => removeVideoField(index)}
                      >
                        ✕
                      </button>
                    </div>
                  ))
                ) : (
                  <p className="no-videos">No videos added yet</p>
                )}
              </div>

              <div className="modal-actions">
                <button type="button" className="ghost-btn" onClick={cancelEdit}>
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

export default AllCourses
