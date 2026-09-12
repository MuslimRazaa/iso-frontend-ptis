import React, { useState, useEffect, useMemo } from 'react'
import axios from 'axios'
import { Pencil, Trash2, Search } from 'lucide-react'
import { API_ENDPOINTS, API_BASE_URL } from '../../config/api'
import PaginationBar from '../../components/PaginationBar'
import StyledSelect from '../../components/StyledSelect'
import StyledDatePicker from '../../components/StyledDatePicker'

const formSelectStyle = {
  border: '1px solid #dcdce3', borderRadius: 14, padding: '12px 14px',
  background: '#f9f9fb', color: '#14141c', fontFamily: 'inherit', fontSize: 14,
  cursor: 'pointer', width: '100%', boxSizing: 'border-box',
}

import dataAnalystThumb from '../../assets/thumbnails/1.jpg'

const PAGE_SIZE = 100

function AllCourses() {
  const [courses, setCourses] = useState([])
  const [currentPage, setCurrentPage] = useState(1)
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
    thumbnailFile: null,
    videos: [],
    standardId: null,
    generalStandardId: null,
    specificStandardId: null,
  })
  const [saving, setSaving] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [query, setQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

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
          updatedAt: course.updated_at,
          thumbnail: course.course_thumbnail ? `${API_BASE_URL}${course.course_thumbnail}` : dataAnalystThumb,
          prerequisites: course.prerequisites || 'None',
          videos: course.course_videos || [],
          // Not shown in the table, but the update needs them: the standard is
          // read-only while editing and the API rejects a course without one.
          standardId: course.standard_id,
          generalStandardId: course.general_standard_id,
          specificStandardId: course.specific_standard_id,
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
      thumbnailFile: null,
      videos: course.videos || [],
      standardId: course.standardId,
      generalStandardId: course.generalStandardId,
      specificStandardId: course.specificStandardId,
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
      thumbnailFile: null,
      videos: [],
      standardId: null,
      generalStandardId: null,
      specificStandardId: null,
    })
    setShowModal(false)
  }

  // Saving edited only the copy of the course held in this component, so every
  // change vanished on the next load — the course was never sent to the server.
  const saveEdit = async () => {
    if (!editForm.title.trim()) {
      alert('Course title is required')
      return
    }

    const data = new FormData()
    data.append('course_title', editForm.title)
    data.append('course_description', editForm.description || '')
    data.append('course_owner', editForm.owner || '')
    data.append('course_category', editForm.category || '')
    data.append('credit_hours', editForm.creditHours || 0)
    data.append('duration_weeks', editForm.duration || 0)
    data.append('prerequisites', editForm.prerequisites || '')
    // The standard is read-only in this form; it is sent back unchanged because
    // the API requires a course to keep one.
    if (editForm.standardId) data.append('standard_id', editForm.standardId)
    if (editForm.generalStandardId) data.append('general_standard_id', editForm.generalStandardId)
    if (editForm.specificStandardId) data.append('specific_standard_id', editForm.specificStandardId)
    // Videos are URLs here, not uploads, so they travel as JSON.
    data.append('course_videos', JSON.stringify(editForm.videos.filter(v => String(v).trim())))
    // Only a newly picked image is uploaded; otherwise the stored one stays.
    if (editForm.thumbnailFile) data.append('course_thumbnail', editForm.thumbnailFile)

    setSaving(true)
    try {
      await axios.put(`${API_ENDPOINTS.COURSES}/${editingId}`, data)
      await fetchCourses()
      cancelEdit()
    } catch (error) {
      console.error('Error updating course:', error)
      alert(error.response?.data?.error || 'Failed to save the course')
    } finally {
      setSaving(false)
    }
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

  const categoryOptions = useMemo(
    () => [...new Set(courses.map((c) => c.category).filter(Boolean))].sort(),
    [courses]
  )

  const onQueryChange = (v) => { setQuery(v); setCurrentPage(1) }
  const onCategoryChange = (v) => { setCategoryFilter(v); setCurrentPage(1) }
  const onStatusChange = (v) => { setStatusFilter(v); setCurrentPage(1) }
  const onDateFromChange = (v) => { setDateFrom(v); setCurrentPage(1) }
  const onDateToChange = (v) => { setDateTo(v); setCurrentPage(1) }
  const hasActiveFilters = Boolean(query || categoryFilter !== 'all' || statusFilter !== 'all' || dateFrom || dateTo)
  const clearFilters = () => {
    setQuery(''); setCategoryFilter('all'); setStatusFilter('all'); setDateFrom(''); setDateTo(''); setCurrentPage(1)
  }

  const filteredCourses = useMemo(() => {
    const q = query.trim().toLowerCase()
    return courses.filter((c) => {
      if (categoryFilter !== 'all' && c.category !== categoryFilter) return false
      if (statusFilter !== 'all' && c.status !== statusFilter) return false
      if (dateFrom || dateTo) {
        const updated = c.updatedAt ? new Date(c.updatedAt) : null
        if (!updated || Number.isNaN(updated.getTime())) return false
        const dateKey = updated.toISOString().slice(0, 10)
        if (dateFrom && dateKey < dateFrom) return false
        if (dateTo && dateKey > dateTo) return false
      }
      if (!q) return true
      return [c.title, c.owner, c.category, c.standard]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q))
    })
  }, [courses, query, categoryFilter, statusFilter, dateFrom, dateTo])

  const totalPages = Math.max(1, Math.ceil(filteredCourses.length / PAGE_SIZE))
  const safePage = Math.min(currentPage, totalPages)
  const paginatedCourses = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE
    return filteredCourses.slice(start, start + PAGE_SIZE)
  }, [filteredCourses, safePage])

  return (
    <div className="lms-table-panel">
      <header>
        <div>
          <p className="eyebrow">Course Catalogue</p>
          <h2>All Courses</h2>
          <p className="panel-subtitle">Every published and draft course, with quick edit and delete.</p>
        </div>
        <button className="ghost-btn" onClick={fetchCourses}>Refresh</button>
      </header>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', margin: '18px 0' }}>
        <div style={{ position: 'relative', flex: '1 1 200px', minWidth: 160, maxWidth: 320 }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9a9aaa' }} />
          <input
            type="text"
            placeholder="Search by title, owner, category or standard…"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            style={{
              width: '100%', padding: '10px 12px 10px 36px', borderRadius: 10,
              border: '1px solid #e2e2ea', fontSize: 14, outline: 'none', background: '#fff', boxSizing: 'border-box',
            }}
          />
        </div>
        <StyledSelect
          value={categoryFilter}
          onChange={onCategoryChange}
          options={[]}
          extraOptions={[
            { value: 'all', label: 'All categories' },
            ...categoryOptions.map((c) => ({ value: c, label: c })),
          ]}
          style={{ padding: '10px 14px', borderRadius: 10, border: '1px solid #e2e2ea', fontSize: 14, background: '#fff', cursor: 'pointer', minWidth: 160 }}
        />
        <StyledSelect
          value={statusFilter}
          onChange={onStatusChange}
          options={[]}
          extraOptions={[
            { value: 'all', label: 'All statuses' },
            { value: 'Active', label: 'Active' },
            { value: 'Draft', label: 'Draft' },
          ]}
          style={{ padding: '10px 14px', borderRadius: 10, border: '1px solid #e2e2ea', fontSize: 14, background: '#fff', cursor: 'pointer', minWidth: 140 }}
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: '#7a7a8c' }}>From</span>
          <StyledDatePicker value={dateFrom} onChange={onDateFromChange} max={dateTo || undefined}
            style={{ padding: '10px 10px', borderRadius: 10, border: '1px solid #e2e2ea', fontSize: 14, background: '#fff', cursor: 'pointer' }} />
          <span style={{ fontSize: 12, fontWeight: 600, color: '#7a7a8c' }}>To</span>
          <StyledDatePicker value={dateTo} onChange={onDateToChange} min={dateFrom || undefined}
            style={{ padding: '10px 10px', borderRadius: 10, border: '1px solid #e2e2ea', fontSize: 14, background: '#fff', cursor: 'pointer' }} />
        </div>
        {hasActiveFilters && (
          <button
            type="button"
            onClick={clearFilters}
            style={{
              background: 'transparent', border: '1px solid #e2e2ea', color: '#595966',
              padding: '10px 16px', borderRadius: 10, fontSize: 14, cursor: 'pointer',
              whiteSpace: 'nowrap', transition: 'all 0.2s ease', flexShrink: 0,
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = '#d7263d'
              e.currentTarget.style.color = '#d7263d'
              e.currentTarget.style.transform = 'translateY(-2px)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = '#e2e2ea'
              e.currentTarget.style.color = '#595966'
              e.currentTarget.style.transform = 'translateY(0)'
            }}
          >
            Clear
          </button>
        )}
        <span style={{ color: '#9a9aaa', fontSize: 13, width: '100%' }}>
          {filteredCourses.length} of {courses.length} courses
        </span>
      </div>

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

      {!loading && courses.length > 0 && filteredCourses.length === 0 && (
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <p>No courses match the current filters.</p>
        </div>
      )}

      {!loading && filteredCourses.length > 0 && (
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
              {paginatedCourses.map((row) => (
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
                      <Pencil size={16} />
                    </button>
                    <button className="action-btn delete" onClick={() => handleDelete(row.id)} title="Delete">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      )}

      {!loading && filteredCourses.length > 0 && (
        <PaginationBar
          page={safePage}
          totalPages={totalPages}
          totalItems={filteredCourses.length}
          pageSize={PAGE_SIZE}
          onPageChange={setCurrentPage}
          itemLabel="courses"
        />
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
                          // The data URL is the preview; the file itself is what
                          // gets uploaded on save.
                          setEditForm((prev) => ({ ...prev, thumbnail: reader.result, thumbnailFile: file }))
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
                <StyledSelect
                  value={editForm.category}
                  onChange={(v) => setEditForm({ ...editForm, category: v })}
                  options={['Technical Skills', 'Compliance & Safety', 'Management', 'Operations', 'Other']}
                  emptyOptionLabel="Select category"
                  style={formSelectStyle}
                />
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
                <button type="submit" className="primary-btn" disabled={saving}>
                  {saving ? 'Saving…' : 'Save Changes'}
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
