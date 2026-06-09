import React, { useMemo, useState, useEffect } from 'react'
import axios from 'axios'
import { Trash2 } from 'lucide-react'
import { API_ENDPOINTS } from '../../config/api'

const timeLimitPresets = [30, 45, 60, 75, 90, 120]

function SetStandards() {
  const [standards, setStandards] = useState([])
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    standard_name: '',
    short_name: '',
    conducted_questions: '',
    passing_criteria: '',
    time_limit: '',
  })
  const [message, setMessage] = useState({ type: '', text: '' })
  const [selectedStandardId, setSelectedStandardId] = useState('all')

  // Fetch standards from backend
  useEffect(() => {
    fetchStandards()
  }, [])

  const fetchStandards = async () => {
    setLoading(true)
    try {
      const response = await axios.get(API_ENDPOINTS.STANDARDS)
      setStandards(response.data)
    } catch (error) {
      console.error('Error fetching standards:', error)
      setMessage({ type: 'error', text: 'Failed to fetch standards from server' })
    } finally {
      setLoading(false)
    }
  }

  const averagePassingCriteria = useMemo(() => {
    if (!standards.length) return 0
    const total = standards.reduce((sum, item) => sum + Number(item.passing_criteria || 0), 0)
    return Math.round(total / standards.length)
  }, [standards])

  const visibleStandards = useMemo(() => {
    if (selectedStandardId === 'all') return standards
    return standards.filter((standard) => String(standard.id) === selectedStandardId)
  }, [selectedStandardId, standards])

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const resetForm = () => {
    setFormData({ standard_name: '', short_name: '', conducted_questions: '', passing_criteria: '', time_limit: '' })
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setLoading(true)
    setMessage({ type: '', text: '' })

    try {
      if (!formData.standard_name || !formData.short_name || !formData.conducted_questions || 
          !formData.passing_criteria || !formData.time_limit) {
        setMessage({ type: 'error', text: 'Fill in all required fields to record the standard.' })
        setLoading(false)
        return
      }

      // Validate passing criteria
      const passingCriteria = Number(formData.passing_criteria)
      if (passingCriteria < 0 || passingCriteria > 100) {
        setMessage({ type: 'error', text: 'Passing criteria must be between 0 and 100' })
        setLoading(false)
        return
      }

      const standardData = {
        standard_name: formData.standard_name.trim(),
        short_name: formData.short_name.trim(),
        conducted_questions: Number(formData.conducted_questions),
        passing_criteria: passingCriteria,
        time_limit: Number(formData.time_limit)
      }

      await axios.post(API_ENDPOINTS.STANDARDS, standardData)

      setMessage({ type: 'success', text: 'Standard saved for upcoming assessments.' })
      resetForm()
      setSelectedStandardId('all')
      
      // Refresh the list
      await fetchStandards()

    } catch (error) {
      console.error('Error creating standard:', error)
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.error || 'Failed to save standard. Please try again.' 
      })
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this standard?')) return

    try {
      await axios.delete(`${API_ENDPOINTS.STANDARDS}/${id}`)
      setStandards(standards.filter(s => s.id !== id))
      setMessage({ type: 'success', text: 'Standard deleted successfully' })
    } catch (error) {
      console.error('Error deleting standard:', error)
      setMessage({ type: 'error', text: 'Failed to delete standard' })
    }
  }

  return (
    <div className="standards-page">
      <section className="lms-form-panel">
        <header>
          <div>
            <p className="eyebrow">Compliance Playbooks</p>
            <h2>Set Standards</h2>
            <p className="panel-subtitle">Capture every requirement once so assessments follow the exact same benchmark.</p>
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

        <form className="standards-form" onSubmit={handleSubmit}>
          <div className="form-row">
            <label>
              <span>Standard Name *</span>
              <input
                type="text"
                placeholder="e.g., DS-1 III Edition 5th Volume"
                value={formData.standard_name}
                onChange={(e) => handleChange('standard_name', e.target.value)}
                required
              />
            </label>
            <label>
              <span>Short Name *</span>
              <input
                type="text"
                placeholder="e.g., DS-1"
                value={formData.short_name}
                onChange={(e) => handleChange('short_name', e.target.value)}
                maxLength={12}
                required
              />
            </label>
          </div>

          <div className="form-row">
            <label>
              <span>Conducted Questions *</span>
              <input
                type="number"
                placeholder="30"
                min="1"
                value={formData.conducted_questions}
                onChange={(e) => handleChange('conducted_questions', e.target.value)}
                required
              />
            </label>
            <label>
              <span>Passing Criteria (%) *</span>
              <input
                type="number"
                placeholder="80"
                min="1"
                max="100"
                value={formData.passing_criteria}
                onChange={(e) => handleChange('passing_criteria', e.target.value)}
                required
              />
            </label>
          </div>

          <label>
            <span>Time Limit (minutes) *</span>
            <div className="time-limit-row">
              <select
                value={timeLimitPresets.includes(Number(formData.time_limit)) ? formData.time_limit : ''}
                onChange={(e) => handleChange('time_limit', e.target.value)}
                required
              >
                <option value="">Select preset</option>
                {timeLimitPresets.map((minutes) => (
                  <option value={minutes} key={minutes}>
                    {minutes} minutes
                  </option>
                ))}
              </select>
              <input
                type="number"
                min="10"
                placeholder="Custom"
                value={formData.time_limit && !timeLimitPresets.includes(Number(formData.time_limit)) ? formData.time_limit : ''}
                onChange={(e) => handleChange('time_limit', e.target.value)}
              />
            </div>
          </label>

          <div className="form-actions">
            <button type="button" className="ghost-btn" onClick={resetForm}>
              Reset
            </button>
            <button type="submit" className="primary-btn" disabled={loading}>
              {loading ? 'Saving...' : 'Save Standard'}
            </button>
          </div>
        </form>
      </section>

      <section className="standards-board">
        <header>
          <div className="standard-selector">
            <p className="eyebrow">Active Benchmarks</p>
            <label>
              <span>Select Standard</span>
              <select value={selectedStandardId} onChange={(e) => setSelectedStandardId(e.target.value)}>
                <option value="all">All Standards</option>
                {standards.map((standard) => (
                  <option key={standard.id} value={String(standard.id)}>
                    {standard.standard_name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="standards-meta">
            <span>{standards.length} total standards</span>
            <span>Avg passing criteria {averagePassingCriteria}%</span>
          </div>
        </header>

        {loading && (
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <p>Loading standards...</p>
          </div>
        )}

        {!loading && standards.length === 0 && (
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <p>No standards found. Add your first standard above!</p>
          </div>
        )}

        {!loading && standards.length > 0 && (
          <div className="standards-grid">
            {visibleStandards.map((standard) => (
              <article key={standard.id} className="standard-card">
                <header>
                  <div>
                    <p className="eyebrow">{standard.short_name}</p>
                    <h4>{standard.standard_name}</h4>
                  </div>
                  <button 
                    className="action-btn delete" 
                    onClick={() => handleDelete(standard.id)}
                    title="Delete"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem' }}
                  >
                    <Trash2 size={16} />
                  </button>
                </header>
                <dl>
                  <div>
                    <dt>Conducted Questions</dt>
                    <dd>{standard.conducted_questions}</dd>
                  </div>
                  <div>
                    <dt>Passing Criteria</dt>
                    <dd>{standard.passing_criteria}%</dd>
                  </div>
                  <div>
                    <dt>Time Limit</dt>
                    <dd>{standard.time_limit} mins</dd>
                  </div>
                </dl>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

export default SetStandards
