import React, { useState, useEffect } from 'react'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'
import { API_ENDPOINTS } from '../../config/api'
import useLmsBase from '../useLmsBase'
import StyledSelect from '../../components/StyledSelect'
import SearchableSelect from '../../components/SearchableSelect'

const formSelectStyle = {
  border: '1px solid #dcdce3', borderRadius: 14, padding: '12px 14px',
  background: '#f9f9fb', color: '#14141c', fontFamily: 'inherit', fontSize: 14,
  cursor: 'pointer', width: '100%', boxSizing: 'border-box',
}

function AddCourse() {
  const navigate = useNavigate()
  const lmsBase = useLmsBase()
  const [videos, setVideos] = useState([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })
  const [standards, setStandards] = useState([])
  const [categories, setCategories] = useState([])

  // Standard selection mode: 'single' → one standard → one test (normal case);
  // 'multiple' → 2+ standards, each becomes its own post-course test.
  const [standardMode, setStandardMode] = useState('single')
  const [selectedStandardIds, setSelectedStandardIds] = useState([])

  const toggleStandard = (id) => {
    const sid = String(id)
    setSelectedStandardIds(prev =>
      prev.includes(sid) ? prev.filter(x => x !== sid) : [...prev, sid]
    )
  }

  const [formData, setFormData] = useState({
    course_title: '',
    course_thumbnail: null,
    credit_hours: '',
    duration_weeks: '',
    course_owner: '',
    course_category: '',
    standard_id: '',
    prerequisites: '',
    learning_outcomes: '',
    syllabus: '',
    course_description: '',
    primary_ppt: null,
    course_videos: [],
    is_published: false,
    negative_marking: false
  })

  // Fetch standards from backend
  useEffect(() => {
    fetchStandards()
    fetchCategories()
  }, [])

  const fetchStandards = async () => {
    try {
      const response = await axios.get(API_ENDPOINTS.STANDARDS)
      setStandards(response.data)
    } catch (error) {
      console.error('Error fetching standards:', error)
    }
  }

  const fetchCategories = async () => {
    try {
      const response = await axios.get(API_ENDPOINTS.CATEGORIES)
      setCategories(response.data)
    } catch (error) {
      console.error('Error fetching categories:', error)
    }
  }

  const addVideoField = () => {
    setVideos([...videos, null])
  }

  const removeVideoField = (index) => {
    setVideos(videos.filter((_, i) => i !== index))
    const newVideoFiles = [...formData.course_videos]
    newVideoFiles.splice(index, 1)
    setFormData({ ...formData, course_videos: newVideoFiles })
  }

  const updateVideo = (index, file) => {
    const newVideoFiles = [...formData.course_videos]
    newVideoFiles[index] = file
    setFormData({ ...formData, course_videos: newVideoFiles })
  }

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    })
  }

  const handleFileChange = (e) => {
    const { name, files } = e.target
    if (files && files.length > 0) {
      setFormData({
        ...formData,
        [name]: files[0]
      })
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage({ type: '', text: '' })

    try {
      // Standard(s) validation depends on the selected mode.
      const standardIds = standardMode === 'multiple'
        ? selectedStandardIds
        : (formData.standard_id ? [formData.standard_id] : [])

      // Validate required fields
      if (!formData.course_title || !formData.course_thumbnail || !formData.credit_hours ||
          !formData.course_category || !formData.course_description) {
        setMessage({ type: 'error', text: 'Please fill all required fields' })
        setLoading(false)
        return
      }
      if (standardMode === 'single' && standardIds.length === 0) {
        setMessage({ type: 'error', text: 'Please select a standard' })
        setLoading(false)
        return
      }
      if (standardMode === 'multiple' && standardIds.length < 2) {
        setMessage({ type: 'error', text: 'Select at least 2 standards for a multi-standard course' })
        setLoading(false)
        return
      }

      // Create FormData object for file upload
      const data = new FormData()
      data.append('course_title', formData.course_title)
      data.append('course_thumbnail', formData.course_thumbnail)
      data.append('credit_hours', formData.credit_hours)
      data.append('course_category', formData.course_category)
      // Primary standard (legacy NOT NULL column) = first selected; full set goes
      // as standard_ids so the backend can create one test per standard.
      data.append('standard_id', standardIds[0])
      data.append('standard_ids', JSON.stringify(standardIds))
      data.append('course_description', formData.course_description)
      data.append('is_published', formData.is_published)
      data.append('negative_marking', formData.negative_marking ? 0.25 : 0.00)

      // Optional fields
      if (formData.duration_weeks) data.append('duration_weeks', formData.duration_weeks)
      if (formData.course_owner) data.append('course_owner', formData.course_owner)
      if (formData.prerequisites) data.append('prerequisites', formData.prerequisites)
      if (formData.learning_outcomes) data.append('learning_outcomes', formData.learning_outcomes)
      if (formData.syllabus) data.append('syllabus', formData.syllabus)
      if (formData.primary_ppt) data.append('primary_ppt', formData.primary_ppt)

      // Add course videos
      formData.course_videos.forEach((video) => {
        if (video) {
          data.append('course_videos', video)
        }
      })

      // Send to backend
      const response = await axios.post(API_ENDPOINTS.COURSES, data, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })

      setMessage({ type: 'success', text: 'Course added successfully! Redirecting...' })
      
      // Redirect to All Courses page after 1.5 seconds
      setTimeout(() => {
        navigate(`${lmsBase}/all-courses`)
      }, 1500)

    } catch (error) {
      console.error('Error adding course:', error)
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.error || 'Failed to add course. Please try again.' 
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="lms-form-panel">
      <header>
        <div>
          <p className="eyebrow">Course Builder</p>
          <h2>Add New Course</h2>
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
        <label>
          <span>Course Title *</span>
          <input 
            type="text" 
            name="course_title"
            placeholder="Enter course name" 
            value={formData.course_title}
            onChange={handleInputChange}
            required 
          />
        </label>

        <label>
          <span>Course Thumbnail *</span>
          <div className="upload-box">
            <input 
              type="file" 
              name="course_thumbnail"
              accept="image/*"
              onChange={handleFileChange}
              required 
            />
            <p>Upload thumbnail image (JPG, PNG). Recommended: 800x450px</p>
          </div>
        </label>

        <div className="form-row">
          <label>
            <span>Credit Hours *</span>
            <input 
              type="number" 
              name="credit_hours"
              placeholder="e.g., 15" 
              min="0"
              value={formData.credit_hours}
              onChange={handleInputChange}
              required 
            />
          </label>

          <label>
            <span>Duration (Weeks)</span>
            <input 
              type="number" 
              name="duration_weeks"
              placeholder="e.g., 8" 
              min="1"
              value={formData.duration_weeks}
              onChange={handleInputChange}
            />
          </label>
        </div>

        <label>
          <span>Course Owner / Instructor</span>
          <input 
            type="text" 
            name="course_owner"
            placeholder="e.g., Ops Academy"
            value={formData.course_owner}
            onChange={handleInputChange}
          />
        </label>

        <label>
          <span>Course Category *</span>
          <StyledSelect
            value={formData.course_category}
            onChange={(v) => handleInputChange({ target: { name: 'course_category', value: v } })}
            options={categories.map((category) => category.name)}
            emptyOptionLabel="Select category"
            style={formSelectStyle}
          />
        </label>

        <label>
          <span>Standards *</span>
          {/* Mode selector — single standard (one test) vs multiple (a test each) */}
          <div style={{ display: 'flex', gap: 20, margin: '4px 0 10px' }}>
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, margin: 0, cursor: 'pointer', fontWeight: 500 }}>
              <input type="radio" name="standardMode" checked={standardMode === 'single'}
                onChange={() => setStandardMode('single')} />
              Single standard
            </label>
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, margin: 0, cursor: 'pointer', fontWeight: 500 }}>
              <input type="radio" name="standardMode" checked={standardMode === 'multiple'}
                onChange={() => setStandardMode('multiple')} />
              Multiple standards (a test for each)
            </label>
          </div>

          {standardMode === 'single' ? (
            <SearchableSelect
              value={formData.standard_id}
              onChange={(v) => handleInputChange({ target: { name: 'standard_id', value: v } })}
              options={standards.map((standard) => ({
                value: standard.id,
                label: `${standard.standard_name} (${standard.short_name})`,
              }))}
              emptyOptionLabel="Select standard"
              placeholder="Type to search…"
              style={formSelectStyle}
            />
          ) : (
            <div style={{
              border: '1px solid #e0e0e6', borderRadius: 10, padding: 10,
              maxHeight: 220, overflowY: 'auto', display: 'grid', gap: 4,
            }}>
              {standards.length === 0 && (
                <span style={{ fontSize: 13, color: '#9a9aaa' }}>No standards available.</span>
              )}
              {standards.map((standard) => {
                const checked = selectedStandardIds.includes(String(standard.id))
                return (
                  <label key={standard.id} style={{
                    display: 'flex', alignItems: 'center', gap: 8, margin: 0, cursor: 'pointer',
                    padding: '7px 10px', borderRadius: 8, fontWeight: 500,
                    background: checked ? '#fdf2f3' : 'transparent',
                    border: `1px solid ${checked ? '#ffd1d8' : 'transparent'}`,
                  }}>
                    <input type="checkbox" checked={checked}
                      onChange={() => toggleStandard(standard.id)} />
                    {standard.standard_name} ({standard.short_name})
                  </label>
                )
              })}
              <span style={{ fontSize: 12.5, color: '#7a7a8c', marginTop: 4 }}>
                Selected: {selectedStandardIds.length} — user will take {selectedStandardIds.length || 0} test(s) after the course.
              </span>
            </div>
          )}
        </label>

        <label>
          <span>Prerequisites</span>
          <textarea 
            name="prerequisites"
            rows="2" 
            placeholder="List any required prior knowledge or courses"
            value={formData.prerequisites}
            onChange={handleInputChange}
          ></textarea>
        </label>

        <label>
          <span>What You'll Learn (Learning Outcomes)</span>
          <textarea
            name="learning_outcomes"
            rows="4"
            placeholder="One outcome per line, e.g.&#10;Understand the ISO 9001 requirements&#10;Perform an internal audit&#10;Prepare corrective actions"
            value={formData.learning_outcomes}
            onChange={handleInputChange}
          ></textarea>
          <small style={{ color: '#7a7a8c', fontSize: 12 }}>One point per line — shown on the course Overview tab.</small>
        </label>

        <label>
          <span>Course Syllabus</span>
          <textarea
            name="syllabus"
            rows="5"
            placeholder="One topic per line, e.g.&#10;Introduction & scope&#10;Key clauses and terminology&#10;Documentation requirements&#10;Audit & review"
            value={formData.syllabus}
            onChange={handleInputChange}
          ></textarea>
          <small style={{ color: '#7a7a8c', fontSize: 12 }}>One topic per line — shown on the course Syllabus tab.</small>
        </label>

        <label>
          <span>Course Description *</span>
          <textarea
            name="course_description"
            rows="5" 
            placeholder="Describe objectives, learning outcomes, and key topics covered"
            value={formData.course_description}
            onChange={handleInputChange}
            required
          ></textarea>
        </label>

        <label>
          <span>Course Material (PDF)</span>
          <div className="upload-box">
            <input
              type="file"
              name="primary_ppt"
              accept="application/pdf,.pdf"
              onChange={handleFileChange}
            />
            <p>Upload the course material as a PDF file</p>
          </div>
        </label>

        <div className="video-section">
          <div className="video-section-header">
            <span>Course Videos (Optional)</span>
            <button type="button" className="ghost-btn small" onClick={addVideoField}>
              + Add Video
            </button>
          </div>
          {videos.map((video, index) => (
            <div className="video-input-group" key={index}>
              <input
                type="file"
                accept="video/*"
                onChange={(e) => updateVideo(index, e.target.files[0])}
              />
              {videos.length > 1 && (
                <button
                  type="button"
                  className="remove-video-btn"
                  onClick={() => removeVideoField(index)}
                  title="Remove video"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>

        <div className="form-row">
          <label className="checkbox-label">
            <input 
              type="checkbox" 
              name="negative_marking"
              checked={formData.negative_marking}
              onChange={handleInputChange}
            />
            <span>Enable Negative Marking (-0.25 marks per wrong answer)</span>
          </label>
        </div>

        <div className="form-row">
          <label className="checkbox-label">
            <input 
              type="checkbox" 
              name="is_published"
              checked={formData.is_published}
              onChange={handleInputChange}
            />
            <span>Publish Course</span>
          </label>
        </div>

        <div className="form-actions">
          <button type="button" className="ghost-btn" onClick={() => window.history.back()}>
            Cancel
          </button>
          <button type="submit" className="primary-btn" disabled={loading}>
            {loading ? 'Publishing...' : 'Publish Course'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default AddCourse
