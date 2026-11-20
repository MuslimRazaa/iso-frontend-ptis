import React, { useState, useEffect, useRef } from 'react'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'
import { API_ENDPOINTS } from '../../config/api'
import useLmsBase from '../useLmsBase'
import StyledSelect from '../../components/StyledSelect'
import StandardPicker from '../StandardPicker'
import { showToast } from '../../components/Toast'

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
  // Which button was pressed: Publish Course (true) or Save as Draft (false). Set by the buttons just
  // before the form submits, so it is read straight from here rather than from state that may lag.
  const publishRef = useRef(true)
  const [submittingAs, setSubmittingAs] = useState('publish')
  const [standards, setStandards] = useState([])
  const [categories, setCategories] = useState([])

  // Standard selection mode: 'single' → one standard → one test (normal case);
  // 'multiple' → 2+ standards, each becomes its own post-course test.
  const [standardMode, setStandardMode] = useState('single')
  const [selectedStandardIds, setSelectedStandardIds] = useState([])


  const [formData, setFormData] = useState({
    course_title: '',
    course_thumbnail: null,
    credit_hours: '',
    study_minutes: '',
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
    negative_marking: false,
    // false = an awareness course: no test, complete once its content is finished.
    requires_test: true
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
    const publish = publishRef.current
    setSubmittingAs(publish ? 'publish' : 'draft')
    setLoading(true)

    try {
      // Standard(s) validation depends on the selected mode.
      const standardIds = !formData.requires_test ? [] : standardMode === 'multiple'
        ? selectedStandardIds
        : (formData.standard_id ? [formData.standard_id] : [])

      // Validate required fields
      if (!formData.course_title || !formData.course_thumbnail || !formData.credit_hours ||
          !formData.course_category || !formData.course_description) {
        showToast('Please fill all required fields', 'error')
        setLoading(false)
        return
      }
      if (formData.requires_test && standardMode === 'single' && standardIds.length === 0) {
        showToast('Please select a standard', 'error')
        setLoading(false)
        return
      }
      if (formData.requires_test && standardMode === 'multiple' && standardIds.length < 2) {
        showToast('Select at least 2 standards for a multi-standard course', 'error')
        setLoading(false)
        return
      }

      // Create FormData object for file upload
      const data = new FormData()
      data.append('course_title', formData.course_title)
      data.append('course_thumbnail', formData.course_thumbnail)
      data.append('credit_hours', formData.credit_hours)
      if (formData.study_minutes) data.append('study_minutes', formData.study_minutes)
      data.append('course_category', formData.course_category)
      // Primary standard (legacy NOT NULL column) = first selected; full set goes
      // as standard_ids so the backend can create one test per standard.
      data.append('requires_test', formData.requires_test ? '1' : '0')
      if (formData.requires_test) {
        data.append('standard_id', standardIds[0])
        data.append('standard_ids', JSON.stringify(standardIds))
      }
      data.append('course_description', formData.course_description)
      data.append('is_published', publish)
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

      showToast('Course added successfully!', 'success')

      // Redirect to All Courses page after 1.5 seconds
      setTimeout(() => {
        navigate(`${lmsBase}/all-courses`)
      }, 1500)

    } catch (error) {
      console.error('Error adding course:', error)
      const msg = error.response?.data?.error || 'Failed to add course. Please try again.'
      showToast(msg, 'error')
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
          <p className="panel-subtitle">Publish a new course with standards, prerequisites and learning material in one form.</p>
        </div>
      </header>

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

          <label title="How long this course takes to study. Employee progress reaches 100% after this many minutes. Leave empty to work it out from the course content (each video 6 min, the material 10 min).">
            <span>Study Time (minutes)</span>
            <input
              type="number"
              name="study_minutes"
              placeholder="e.g., 30 (empty = automatic)"
              min="1"
              value={formData.study_minutes}
              onChange={handleInputChange}
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

        <div className="form-row">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={!formData.requires_test}
              onChange={(e) => setFormData({ ...formData, requires_test: !e.target.checked })}
            />
            <span>Awareness course — no test (complete once the course content is finished)</span>
          </label>
        </div>

        {formData.requires_test && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 14, color: '#32323c', fontWeight: 600 }}>
          <span>Standards *</span>
          <StandardPicker
            standards={standards}
            mode={standardMode}
            onModeChange={setStandardMode}
            singleId={formData.standard_id}
            onSingleChange={(v) => handleInputChange({ target: { name: 'standard_id', value: v } })}
            multiIds={selectedStandardIds}
            onMultiChange={setSelectedStandardIds}
            selectStyle={formSelectStyle}
          />
        </div>
        )}

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

        {formData.requires_test && (
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
        )}

        <div className="form-actions">
          <button type="button" className="ghost-btn" onClick={() => window.history.back()}>
            Cancel
          </button>
          <button type="submit" className="ghost-btn" disabled={loading}
            title="Saves the course without showing it to employees yet"
            onClick={() => { publishRef.current = false }}>
            {loading && submittingAs === 'draft' ? 'Saving...' : 'Save as Draft'}
          </button>
          <button type="submit" className="primary-btn" disabled={loading}
            onClick={() => { publishRef.current = true }}>
            {loading && submittingAs === 'publish' ? 'Publishing...' : 'Publish Course'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default AddCourse
