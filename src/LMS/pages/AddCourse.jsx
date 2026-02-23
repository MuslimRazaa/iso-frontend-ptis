import React, { useState, useEffect } from 'react'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'
import { API_ENDPOINTS } from '../../config/api'

function AddCourse() {
  const navigate = useNavigate()
  const [videos, setVideos] = useState([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })
  const [standards, setStandards] = useState([])
  const [categories, setCategories] = useState([])
  
  const [formData, setFormData] = useState({
    course_title: '',
    course_thumbnail: null,
    credit_hours: '',
    duration_weeks: '',
    course_owner: '',
    course_category: '',
    standard_id: '',
    prerequisites: '',
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
      // Validate required fields
      if (!formData.course_title || !formData.course_thumbnail || !formData.credit_hours || 
          !formData.course_category || !formData.standard_id || !formData.course_description) {
        setMessage({ type: 'error', text: 'Please fill all required fields' })
        setLoading(false)
        return
      }

      // Create FormData object for file upload
      const data = new FormData()
      data.append('course_title', formData.course_title)
      data.append('course_thumbnail', formData.course_thumbnail)
      data.append('credit_hours', formData.credit_hours)
      data.append('course_category', formData.course_category)
      data.append('standard_id', formData.standard_id)
      data.append('course_description', formData.course_description)
      data.append('is_published', formData.is_published)
      data.append('negative_marking', formData.negative_marking ? 0.25 : 0.00)

      // Optional fields
      if (formData.duration_weeks) data.append('duration_weeks', formData.duration_weeks)
      if (formData.course_owner) data.append('course_owner', formData.course_owner)
      if (formData.prerequisites) data.append('prerequisites', formData.prerequisites)
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
        navigate('/learning-management-system/all-courses')
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
          <select 
            name="course_category"
            value={formData.course_category}
            onChange={handleInputChange}
            required
          >
            <option value="">Select category</option>
            {categories.map((category) => (
              <option key={category.id} value={category.name}>
                {category.name}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span>Standards *</span>
          <select 
            name="standard_id"
            value={formData.standard_id}
            onChange={handleInputChange}
            required
          >
            <option value="">Select standard</option>
            {standards.map((standard) => (
              <option key={standard.id} value={standard.id}>
                {standard.standard_name} ({standard.short_name})
              </option>
            ))}
          </select>
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
          <span>Primary PPT / Course Material</span>
          <div className="upload-box">
            <input 
              type="file" 
              name="primary_ppt"
              accept=".ppt,.pptx,.pdf"
              onChange={handleFileChange}
            />
            <p>Upload presentation or course materials (PPT, PPTX, PDF)</p>
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
