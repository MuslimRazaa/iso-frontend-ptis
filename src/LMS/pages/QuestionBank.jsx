import React, { useEffect, useMemo, useState } from 'react'
import { Upload, Loader2 } from 'lucide-react'
import { API_ENDPOINTS } from '../../config/api'
import SearchableSelect from '../../components/SearchableSelect'
import { showToast } from '../../components/Toast'

const formSelectStyle = {
  border: '1px solid #dcdce3', borderRadius: 14, padding: '12px 14px',
  background: '#f9f9fb', color: '#14141c', fontFamily: 'inherit', fontSize: 14,
  cursor: 'pointer', width: '100%', boxSizing: 'border-box',
}

function QuestionBank({ defaultTab = 'add' }) {
  const [activeTab, setActiveTab] = useState(defaultTab)
  const [questions, setQuestions] = useState([])
  const [standards, setStandards] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState(null)
  const [feedback, setFeedback] = useState(null)
  const [filterStandard, setFilterStandard] = useState('')
  const [importing, setImporting] = useState(false)
  const [formState, setFormState] = useState({
    standardId: '',
    prompt: '',
    options: ['', ''],
    correctIndex: null,
  })

  // Fetch initial data
  useEffect(() => {
    fetchAllData()
  }, [])

  useEffect(() => {
    setActiveTab(defaultTab)
  }, [defaultTab])

  const fetchAllData = async () => {
    try {
      setLoading(true)
      const [questionsRes, standardsRes] = await Promise.all([
        fetch(API_ENDPOINTS.QUESTIONS),
        fetch(API_ENDPOINTS.STANDARDS)
      ])

      const questionsData = await questionsRes.json()
      const standardsData = await standardsRes.json()

      setQuestions(questionsData)
      setStandards(standardsData)
      
      // Set default standard
      if (standardsData.length > 0 && !formState.standardId) {
        setFormState(prev => ({ ...prev, standardId: standardsData[0].id.toString() }))
      }
    } catch (error) {
      console.error('Error fetching data:', error)
      setFeedback({ type: 'error', text: 'Failed to load data. Please refresh.' })
    } finally {
      setLoading(false)
    }
  }

  // Helper function to convert DB format to UI format
  const convertQuestionFromDB = (dbQuestion) => {
    const options = []
    if (dbQuestion.option_a) options.push(dbQuestion.option_a)
    if (dbQuestion.option_b) options.push(dbQuestion.option_b)
    if (dbQuestion.option_c) options.push(dbQuestion.option_c)
    if (dbQuestion.option_d) options.push(dbQuestion.option_d)
    if (dbQuestion.option_e) options.push(dbQuestion.option_e)
    if (dbQuestion.option_f) options.push(dbQuestion.option_f)

    // Convert correct_answer (A, B, C, etc.) to index
    const correctIndex = dbQuestion.correct_answer.charCodeAt(0) - 65

    return {
      id: dbQuestion.id,
      standardId: dbQuestion.standard_id,
      standardName: dbQuestion.standard_name,
      prompt: dbQuestion.prompt,
      options,
      correctIndex
    }
  }

  const filteredQuestions = useMemo(() => {
    if (!filterStandard) return []
    if (filterStandard === 'all') {
      return questions.map(convertQuestionFromDB)
    }
    if (filterStandard === 'recent') {
      return questions
        .slice(0, 10)
        .map(convertQuestionFromDB)
    }
    return questions
      .filter((q) => q.standard_id.toString() === filterStandard)
      .map(convertQuestionFromDB)
  }, [questions, filterStandard])

  const setOptionValue = (index, value) => {
    setFormState((prev) => {
      const updated = prev.options.map((option, optionIndex) => (optionIndex === index ? value : option))
      return { ...prev, options: updated }
    })
  }

  const addOptionField = () => {
    if (formState.options.length >= 6) return
    setFormState((prev) => ({ ...prev, options: [...prev.options, ''] }))
  }

  const removeOptionField = (index) => {
    if (formState.options.length <= 2) return
    setFormState((prev) => {
      const nextOptions = prev.options.filter((_, optionIndex) => optionIndex !== index)
      let nextCorrect = prev.correctIndex
      if (prev.correctIndex === index) nextCorrect = null
      if (typeof prev.correctIndex === 'number' && prev.correctIndex > index) nextCorrect = prev.correctIndex - 1
      return { ...prev, options: nextOptions, correctIndex: nextCorrect }
    })
  }

  const markCorrect = (index) => {
    setFormState((prev) => ({ ...prev, correctIndex: index }))
  }

  const resetForm = (retainStandard = true) => {
    setEditingId(null)
    setFormState((prev) => ({
      standardId: retainStandard ? prev.standardId : (standards[0]?.id.toString() || ''),
      prompt: '',
      options: ['', ''],
      correctIndex: null,
    }))
  }

  const upsertQuestion = async (event) => {
    event.preventDefault()
    const trimmedPrompt = formState.prompt.trim()
    if (!trimmedPrompt) {
      setFeedback({ type: 'error', text: 'Question text is required.' })
      return
    }

    const cleanedOptions = formState.options.map((option) => option.trim())
    if (cleanedOptions.some((option) => option === '')) {
      setFeedback({ type: 'error', text: 'Fill every option to continue.' })
      return
    }

    if (formState.correctIndex === null || formState.correctIndex >= cleanedOptions.length) {
      setFeedback({ type: 'error', text: 'Mark the correct answer before saving.' })
      return
    }

    const payload = {
      standard_id: Number(formState.standardId),
      prompt: trimmedPrompt,
      options: cleanedOptions,
      correct_answer: String.fromCharCode(65 + formState.correctIndex) // Convert index to A, B, C, etc.
    }

    try {
      if (editingId) {
        // Update existing question
        const response = await fetch(`${API_ENDPOINTS.QUESTIONS}/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })

        if (!response.ok) {
          const error = await response.json()
          setFeedback({ type: 'error', text: error.error || 'Failed to update question' })
          return
        }

        setFeedback({ type: 'success', text: 'Question updated.' })
      } else {
        // Create new question
        const response = await fetch(API_ENDPOINTS.QUESTIONS, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })

        if (!response.ok) {
          const error = await response.json()
          setFeedback({ type: 'error', text: error.error || 'Failed to save question' })
          return
        }

        setFeedback({ type: 'success', text: 'Question saved.' })
      }

      // Refresh questions
      await fetchAllData()
      resetForm()

      // Clear feedback after 3 seconds
      setTimeout(() => setFeedback(null), 3000)

    } catch (error) {
      console.error('Error saving question:', error)
      setFeedback({ type: 'error', text: 'Network error. Please try again.' })
    }
  }

  const startEditing = (question) => {
    setActiveTab('add')
    setEditingId(question.id)
    setFormState({
      standardId: question.standardId.toString(),
      prompt: question.prompt,
      options: [...question.options],
      correctIndex: question.correctIndex,
    })
    setFeedback(null)
  }

  const removeQuestion = async (id) => {
    if (!window.confirm('Are you sure you want to delete this question?')) {
      return
    }

    try {
      const response = await fetch(`${API_ENDPOINTS.QUESTIONS}/${id}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const error = await response.json()
        showToast(error.error || 'Failed to delete question', 'error')
        return
      }

      // Remove from local state
      setQuestions(prev => prev.filter(q => q.id !== id))
      
      if (editingId === id) {
        resetForm(false)
      }

      setFeedback({ type: 'success', text: 'Question deleted successfully!' })
      setTimeout(() => setFeedback(null), 3000)

    } catch (error) {
      console.error('Error deleting question:', error)
      showToast('Network error. Please try again.', 'error')
    }
  }

  const handleImportCSV = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file type
    const validTypes = [
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ]
    
    if (!validTypes.includes(file.type)) {
      showToast('Please upload a valid Excel file (.xls or .xlsx)', 'error')
      event.target.value = ''
      return
    }

    const formData = new FormData()
    formData.append('excel_file', file)

    try {
      setImporting(true)
      setFeedback({ type: 'info', text: 'Importing questions...' })

      const response = await fetch(`${API_ENDPOINTS.QUESTIONS}/bulk-import`, {
        method: 'POST',
        body: formData
      })

      const result = await response.json()

      if (!response.ok) {
        setFeedback({ type: 'error', text: result.error || 'Import failed' })
        event.target.value = ''
        return
      }

      // Show detailed import results — the toast holds a short summary, and
      // the fuller breakdown (setFeedback below) stays on the page for the
      // validation errors, which are too long for a toast to hold.
      showToast(
        `Import complete: ${result.successful} of ${result.total_rows} imported${result.failed ? `, ${result.failed} failed` : ''}.`,
        result.failed ? 'error' : 'success'
      )

      // Refresh questions list
      await fetchAllData()
      setFeedback({ type: 'success', text: `Successfully imported ${result.successful} questions!` })
      setTimeout(() => setFeedback(null), 5000)

    } catch (error) {
      console.error('Error importing file:', error)
      setFeedback({ type: 'error', text: 'Network error during import. Please try again.' })
    } finally {
      setImporting(false)
      event.target.value = '' // Reset file input
    }
  }

  return (
    <div className="question-bank-page">
      <div className="question-tabs">
        <button className={`question-tab ${activeTab === 'add' ? 'active' : ''}`} type="button" onClick={() => setActiveTab('add')}>
          Add Questions
        </button>
        <button className={`question-tab ${activeTab === 'view' ? 'active' : ''}`} type="button" onClick={() => setActiveTab('view')}>
          View All
        </button>
      </div>

      {activeTab === 'add' ? (
        <div className="question-add-container">
          <section className="lms-form-panel question-form-panel">
            <header>
              <div>
                <p className="eyebrow">Question Builder</p>
                <h2>{editingId ? 'Edit Question' : 'Add New Question'}</h2>
                <p className="panel-subtitle">Select a standard and capture MCQs with answer keys.</p>
              </div>
              <label htmlFor="excel-upload" className="primary-btn" style={{ cursor: 'pointer' }}>
                {importing
                  ? <><Loader2 size={16} className="lms-spin" style={{ verticalAlign: 'middle', marginRight: 6 }} /> Importing…</>
                  : <><Upload size={16} style={{ verticalAlign: 'middle', marginRight: 6 }} /> Import Excel</>}
                <input
                  id="excel-upload"
                  type="file"
                  accept=".xls,.xlsx"
                  onChange={handleImportCSV}
                  disabled={importing}
                  style={{ display: 'none' }}
                />
              </label>
            </header>

            <form className="question-form" onSubmit={upsertQuestion}>
              <div className="form-row">
                <label>
                  <span>Standard *</span>
                  <SearchableSelect
                    value={formState.standardId}
                    onChange={(v) => setFormState((prev) => ({ ...prev, standardId: v }))}
                    required
                    disabled={loading || standards.length === 0}
                    options={standards.map((standard) => ({ value: standard.id, label: standard.standard_name }))}
                    emptyOptionLabel={standards.length === 0 ? 'No standards available' : undefined}
                    placeholder="Type to search…"
                    style={formSelectStyle}
                  />
                </label>
              </div>

              <label>
                <span>Question *</span>
                <textarea
                  rows="3"
                  placeholder="Type the question stem"
                  value={formState.prompt}
                  onChange={(event) => setFormState((prev) => ({ ...prev, prompt: event.target.value }))}
                  required
                />
              </label>

              <div className="option-header">
                <span>Options (MCQ)</span>
                <button type="button" className="ghost-btn small" onClick={addOptionField} disabled={formState.options.length >= 6}>
                  + Add Option
                </button>
              </div>

              <div className="options-stack">
                {formState.options.map((option, index) => (
                  <div className="option-row" key={`option-${index}`}>
                    <input
                      type="text"
                      value={option}
                      placeholder={`Option ${index + 1}`}
                      onChange={(event) => setOptionValue(index, event.target.value)}
                      required
                    />
                    <div className="option-controls">
                      <button
                        type="button"
                        className={`option-pill ${formState.correctIndex === index ? 'selected' : ''}`}
                        onClick={() => markCorrect(index)}
                      >
                        {formState.correctIndex === index ? 'Correct' : 'Mark Correct'}
                      </button>
                      <button type="button" className="remove-option" onClick={() => removeOptionField(index)} disabled={formState.options.length <= 2}>
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {feedback && <p className={`form-hint ${feedback.type}`}>{feedback.text}</p>}

              <div className="form-actions">
                {editingId && (
                  <button type="button" className="ghost-btn" onClick={() => resetForm()}>
                    Cancel Edit
                  </button>
                )}
                <button type="submit" className="primary-btn">
                  {editingId ? 'Update Question' : 'Save Question'}
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : (
        <section className="question-library">
          <div className="lms-form-panel">
            <header>
              <div>
                <p className="eyebrow">Question Library</p>
                <h2>All Questions</h2>
                <p className="panel-subtitle">Browse and manage all questions across standards.</p>
              </div>
            </header>

            <div className="filter-section">
              <label>
                <span>Filter by Standard</span>
                <SearchableSelect
                  value={filterStandard}
                  onChange={setFilterStandard}
                  disabled={loading}
                  options={standards.map((standard) => ({ value: standard.id.toString(), label: standard.standard_name }))}
                  emptyOptionLabel="-- Select Standard --"
                  extraOptions={[
                    { value: 'all', label: 'All Standards' },
                    { value: 'recent', label: 'Recently Added (Last 10)' },
                  ]}
                  placeholder="Type to search…"
                  style={formSelectStyle}
                />
              </label>
            </div>

            {loading ? (
              <div className="empty-state-card">
                <p className="empty-state-text">Loading questions...</p>
              </div>
            ) : !filterStandard ? (
              <div className="empty-state-card">
                <p className="empty-state-text">Select standard first to view questions</p>
              </div>
            ) : filteredQuestions.length === 0 ? (
              <div className="empty-state-card">
                <p className="empty-state-text">No questions available for selected filter.</p>
              </div>
            ) : (
              <div className="question-table-wrapper">
                <div className="results-info">
                  <p>Showing {filteredQuestions.length} question(s)</p>
                </div>
                <table className="question-table">
                  <thead>
                    <tr>
                      <th style={{ width: '5%' }}>#</th>
                      <th style={{ width: '20%' }}>Standard</th>
                      <th style={{ width: '35%' }}>Question</th>
                      <th style={{ width: '25%' }}>Options</th>
                      <th style={{ width: '15%' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredQuestions.map((question, index) => {
                      return (
                        <tr key={question.id}>
                          <td className="text-center">{index + 1}</td>
                          <td>
                            <span className="standard-badge">{question.standardName}</span>
                          </td>
                          <td>
                            <p className="question-prompt">{question.prompt}</p>
                          </td>
                          <td>
                            <div className="options-cell">
                              {question.options.map((option, optionIndex) => (
                                <div
                                  key={`view-${question.id}-${optionIndex}`}
                                  className={`option-badge ${question.correctIndex === optionIndex ? 'is-correct' : ''}`}
                                >
                                  <strong>{String.fromCharCode(65 + optionIndex)}.</strong> {option}
                                  {question.correctIndex === optionIndex && <span className="correct-indicator">✓</span>}
                                </div>
                              ))}
                            </div>
                          </td>
                          <td>
                            <div className="table-actions">
                              <button type="button" className="action-btn edit small" onClick={() => startEditing(question)} title="Edit Question">
                                Edit
                              </button>
                              <button type="button" className="action-btn delete small" onClick={() => removeQuestion(question.id)} title="Delete Question">
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  )
}

export default QuestionBank
