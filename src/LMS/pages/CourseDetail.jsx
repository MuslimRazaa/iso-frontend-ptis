import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { API_ENDPOINTS, API_BASE_URL } from '../../config/api'
import PdfViewer from '../../components/PdfViewer'
import useLmsBase from '../useLmsBase'
import {
  GraduationCap, UserRound, Star, BookOpen, Calendar, Clock,
  ExternalLink, FileText, Video, Smartphone, Infinity as InfinityIcon
} from 'lucide-react'

// Admin text fields (outcomes / syllabus) are stored as one item per line, the
// same way the learner's page reads them — a course must not describe itself
// differently depending on who is looking at it.
const splitLines = (value) => (value || '')
  .toString()
  .split(/\r?\n/)
  .map(s => s.replace(/^\s*[-•*]\s*/, '').trim())
  .filter(Boolean)

function CourseDetail() {
  const { courseId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const isUserMode = location.pathname.startsWith('/user/')
  const lmsBase = useLmsBase()

  const [activeTab, setActiveTab] = useState('overview')
  const [selectedVideo, setSelectedVideo] = useState(0)
  const [course, setCourse] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [pptUrl, setPptUrl] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [showPdfFull, setShowPdfFull] = useState(false)
  const [showStartModal, setShowStartModal] = useState(false)
  const [progressData, setProgressData] = useState(null) // from API
  const [taskInfo, setTaskInfo] = useState(null)

  const userEmail = localStorage.getItem('userEmail') || ''
  const userFullName = localStorage.getItem('userFullName') || ''

  // Time tracking refs
  const videoSessionStartRef = useRef(null)
  const videoAccumulatedRef = useRef(0)  // seconds accumulated this session
  const pptOpenTimeRef = useRef(null)
  const autoSaveTimerRef = useRef(null)

  // ─── API: Load progress ───────────────────────────────────────────────────
  const loadProgressFromAPI = useCallback(async () => {
    if (!userEmail || !courseId) return null
    try {
      const res = await fetch(`${API_ENDPOINTS.COURSE_PROGRESS}/${encodeURIComponent(userEmail)}/${courseId}`)
      if (res.ok) {
        const json = await res.json()
        const data = json.data
        videoAccumulatedRef.current = data.video_watch_time || 0
        setProgressData(data)
        return data
      }
    } catch {
      // Offline fallback
    }
    return null
  }, [userEmail, courseId])

  // ─── API: Save progress ───────────────────────────────────────────────────
  const saveProgressToAPI = useCallback(async (videoSecs, pptSecs) => {
    if (!userEmail || !courseId) return
    const total = videoSecs + pptSecs
    const creditSecs = (course?.creditHours || 1) * 3600
    const pct = Math.min(100, Math.floor((total / creditSecs) * 100))

    try {
      const res = await fetch(API_ENDPOINTS.COURSE_PROGRESS, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_email: userEmail,
          course_id: parseInt(courseId),
          video_watch_time: Math.floor(videoSecs),
          ppt_view_time: Math.floor(pptSecs),
          total_time_spent: Math.floor(total),
          progress_percentage: pct,
        }),
      })
      if (res.ok) {
        const json = await res.json()
        setProgressData((prev) => ({
          ...prev,
          video_watch_time: Math.floor(videoSecs),
          ppt_view_time: Math.floor(pptSecs),
          total_time_spent: Math.floor(total),
          progress_percentage: pct,
        }))
      }
    } catch {
      // Network issue — progress lost this session but UI still updates
    }
  }, [userEmail, courseId, course])

  // ─── Fetch course ─────────────────────────────────────────────────────────
  useEffect(() => {
    const fetchCourseDetail = async () => {
      try {
        setLoading(true)
        const response = await fetch(`${API_ENDPOINTS.COURSES}/${courseId}`)
        if (!response.ok) throw new Error('Course not found')
        const data = await response.json()

        let videos = []
        if (data.course_videos) {
          try {
            videos = typeof data.course_videos === 'string'
              ? JSON.parse(data.course_videos)
              : data.course_videos
          } catch (e) { console.error('Error parsing videos:', e) }
        }

        setCourse({
          id: data.id,
          title: data.course_title,
          description: data.course_description || 'No description available',
          thumbnail: data.course_thumbnail ? `${API_BASE_URL}/${data.course_thumbnail}` : null,
          instructor: data.course_owner || 'PTIS Academy',
          category: data.course_category || 'Technical Skills',
          level: 'Intermediate',
          creditHours: data.credit_hours || 0,
          duration: data.duration_weeks ? `${data.duration_weeks} weeks` : 'Self-paced',
          rating: 4.5,
          totalRatings: 0,
          prerequisites: data.prerequisites || 'None',
          // These were a hard-coded list and an empty array, so the admin page
          // showed four invented outcomes and never showed the syllabus that
          // was actually entered on the course.
          learningOutcomes: splitLines(data.learning_outcomes),
          syllabus: splitLines(data.syllabus),
          videos,
          pdf_path: data.pdf_path || null,
          resources: data.primary_ppt
            ? [{ name: 'Course Presentation', size: 'PPT', url: `${API_BASE_URL}${data.primary_ppt}` }]
            : [],
          standard_name: data.standard_name,
          is_published: data.is_published,
        })
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    if (courseId) fetchCourseDetail()
  }, [courseId])

  // ─── User mode: check task allocation & start status ─────────────────────
  useEffect(() => {
    if (!isUserMode || !course) return

    const checkAccess = async () => {
      try {
        // Check task allocation for this user + course
        const tasksRes = await fetch(API_ENDPOINTS.TASK_ALLOCATIONS)
        const allTasks = await tasksRes.json()
        const myTask = allTasks.find(
          (t) =>
            t.employee_name?.toLowerCase().trim() === userFullName.toLowerCase().trim() &&
            t.course_title?.toLowerCase() === course.title?.toLowerCase()
        )

        if (!myTask) {
          navigate('/user/all-courses', { replace: true })
          return
        }
        setTaskInfo(myTask)

        // Load progress from backend
        const existing = await loadProgressFromAPI()
        if (!existing) {
          setShowStartModal(true)
        }
      } catch (err) {
        console.error('Access check failed:', err)
      }
    }

    checkAccess()
  }, [isUserMode, course, userFullName, navigate, loadProgressFromAPI])

  // ─── Auto-save every 15s when user is in course ──────────────────────────
  useEffect(() => {
    if (!isUserMode) return

    autoSaveTimerRef.current = setInterval(() => {
      if (videoSessionStartRef.current) {
        const liveElapsed = (Date.now() - videoSessionStartRef.current) / 1000
        const totalVideo = videoAccumulatedRef.current + liveElapsed
        const pptSecs = progressData?.ppt_view_time || 0
        saveProgressToAPI(totalVideo, pptSecs)
      }
    }, 15000)

    return () => {
      clearInterval(autoSaveTimerRef.current)
      // Final save on unmount
      if (videoSessionStartRef.current) {
        const elapsed = (Date.now() - videoSessionStartRef.current) / 1000
        videoAccumulatedRef.current += elapsed
        videoSessionStartRef.current = null
      }
      const pptSecs = progressData?.ppt_view_time || 0
      if (videoAccumulatedRef.current > 0) {
        saveProgressToAPI(videoAccumulatedRef.current, pptSecs)
      }
    }
  }, [isUserMode, saveProgressToAPI, progressData])

  // When video changes, end current session
  useEffect(() => {
    if (videoSessionStartRef.current) {
      const elapsed = (Date.now() - videoSessionStartRef.current) / 1000
      videoAccumulatedRef.current += elapsed
      videoSessionStartRef.current = null
    }
  }, [selectedVideo])

  // ─── Video event handlers ─────────────────────────────────────────────────
  const handleVideoPlay = () => {
    if (!isUserMode) return
    videoSessionStartRef.current = Date.now()
  }

  const handleVideoPause = () => {
    if (!isUserMode || !videoSessionStartRef.current) return
    const elapsed = (Date.now() - videoSessionStartRef.current) / 1000
    videoAccumulatedRef.current += elapsed
    videoSessionStartRef.current = null
    const pptSecs = progressData?.ppt_view_time || 0
    saveProgressToAPI(videoAccumulatedRef.current, pptSecs)
  }

  // ─── PPT handlers ─────────────────────────────────────────────────────────
  const handlePPTOpen = (url) => {
    if (isUserMode) pptOpenTimeRef.current = Date.now()
    setPptUrl(url)
    setShowModal(true)
  }

  const handlePPTClose = () => {
    if (isUserMode && pptOpenTimeRef.current) {
      const elapsed = (Date.now() - pptOpenTimeRef.current) / 1000
      const currentPpt = (progressData?.ppt_view_time || 0) + elapsed
      const videoSecs = videoAccumulatedRef.current
      saveProgressToAPI(videoSecs, currentPpt)
      pptOpenTimeRef.current = null
    }
    setShowModal(false)
  }

  // ─── Start Course ─────────────────────────────────────────────────────────
  const handleStartCourse = async () => {
    try {
      const res = await fetch(API_ENDPOINTS.COURSE_PROGRESS, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_email: userEmail,
          course_id: parseInt(courseId),
          action: 'enroll',
        }),
      })
      const json = await res.json()
      if (json.success !== false) {
        setProgressData({
          video_watch_time: 0,
          ppt_view_time: 0,
          total_time_spent: 0,
          progress_percentage: 0,
        })
      }
    } catch {
      // Proceed anyway
      setProgressData({ video_watch_time: 0, ppt_view_time: 0, total_time_spent: 0, progress_percentage: 0 })
    }
    setShowStartModal(false)
  }

  const formatTime = (seconds) => {
    if (!seconds || seconds <= 0) return '0m'
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = Math.floor(seconds % 60)
    if (h > 0) return `${h}h ${m}m`
    if (m > 0) return `${m}m ${s}s`
    return `${s}s`
  }

  // ─── Render ───────────────────────────────────────────────────────────────
  if (loading) {
    return <div className="course-detail-error"><h2>Loading course...</h2></div>
  }

  if (error || !course) {
    return (
      <div className="course-detail-error">
        <h2>Course not found</h2>
        <button
          className="primary-btn"
          onClick={() => navigate(lmsBase)}
        >
          Go Back
        </button>
      </div>
    )
  }

  const currentVideoPath = course.videos[selectedVideo]?.url || course.videos[selectedVideo]
  const currentVideoUrl = currentVideoPath
    ? currentVideoPath.startsWith('http') ? currentVideoPath : `${API_BASE_URL}${currentVideoPath}`
    : null
  const isExternalVideo =
    currentVideoPath &&
    (currentVideoPath.includes('youtube.com') || currentVideoPath.includes('youtu.be') || currentVideoPath.includes('vimeo.com'))

  const progressPct = progressData?.progress_percentage || 0
  const videoSecs = progressData?.video_watch_time || 0
  const pptSecs = progressData?.ppt_view_time || 0

  return (
    <div className="course-detail-page">

      {/* ── Start Course Modal (user only) ── */}
      {showStartModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <h2>Start This Course?</h2>
            </div>
            <div style={{ padding: '24px' }}>
              <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                <div style={{ marginBottom: '16px', color: '#d7263d' }}><GraduationCap size={56} strokeWidth={1.5} /></div>
                <h3 style={{ marginBottom: '10px' }}>{course.title}</h3>
                <p style={{ color: '#888', fontSize: '14px', lineHeight: '1.6' }}>
                  Once you start, your progress will be tracked — video watch time and study
                  material time will be recorded and visible to your administrator.
                </p>
              </div>
              <div
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  borderRadius: '10px',
                  padding: '16px',
                  marginBottom: '24px',
                  display: 'flex',
                  gap: '32px',
                  justifyContent: 'center',
                }}
              >
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '20px', fontWeight: '700' }}>{course.creditHours}h</div>
                  <div style={{ fontSize: '12px', color: '#888' }}>Credit Hours</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '20px', fontWeight: '700' }}>
                    {taskInfo?.deadline ? new Date(taskInfo.deadline).toLocaleDateString() : 'N/A'}
                  </div>
                  <div style={{ fontSize: '12px', color: '#888' }}>Deadline</div>
                </div>
              </div>
              <div className="modal-actions">
                <button className="ghost-btn" onClick={() => navigate('/user/my-courses')}>
                  Go Back
                </button>
                <button className="primary-btn" onClick={handleStartCourse}>
                  Start Learning →
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Header ── */}
      <div className="course-detail-header">
        <button className="back-btn" onClick={() => navigate(isUserMode ? '/user/my-courses' : -1)}>
          ← Back
        </button>
        <div className="course-header-content">
          <div className="course-meta-tags">
            <span className="meta-tag">{course.category}</span>
            <span className="meta-tag level">{course.level}</span>
          </div>
          <h1>{course.title}</h1>
          <p className="course-intro">{course.description}</p>
          <div className="course-stats">
            <div className="stat-item">
              <span className="stat-icon"><UserRound size={20} /></span>
              <div><strong>{course.instructor}</strong><span>Instructor</span></div>
            </div>
            <div className="stat-item">
              <span className="stat-icon"><Star size={20} /></span>
              <div><strong>{course.rating}</strong><span>Rating</span></div>
            </div>
            <div className="stat-item">
              <span className="stat-icon"><BookOpen size={20} /></span>
              <div><strong>{course.creditHours}h</strong><span>Credit Hours</span></div>
            </div>
            <div className="stat-item">
              <span className="stat-icon"><Calendar size={20} /></span>
              <div><strong>{course.duration}</strong><span>Duration</span></div>
            </div>
            {isUserMode && progressData && (
              <div className="stat-item">
                <span className="stat-icon"><Clock size={20} /></span>
                <div><strong>{progressPct}%</strong><span>Your Progress</span></div>
              </div>
            )}
          </div>
          {!isUserMode && (
            <div className="course-actions">
              <button className="primary-btn large" onClick={() => navigate(`${lmsBase}/task-allocation`)}>
                Assign to Employees
              </button>
              <button className="ghost-btn large" onClick={() => navigate(`${lmsBase}/all-courses`)}>
                View All Courses
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Body ── */}
      <div className="course-detail-body">
        <div className="course-main-content">

          {/* Video Player */}
          <div className="video-player-section">
            {course.videos && course.videos.length > 0 ? (
              <>
                <div className="video-container">
                  {isExternalVideo ? (
                    <iframe
                      src={currentVideoUrl}
                      title={course.videos[selectedVideo]?.title || `Video ${selectedVideo + 1}`}
                      frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  ) : (
                    <video
                      key={currentVideoUrl}
                      controls
                      controlsList="nodownload"
                      className="course-video-player"
                      onPlay={handleVideoPlay}
                      onPause={handleVideoPause}
                      onEnded={handleVideoPause}
                    >
                      <source src={currentVideoUrl} type="video/mp4" />
                      <source src={currentVideoUrl} type="video/webm" />
                      Your browser does not support the video tag.
                    </video>
                  )}
                </div>

                <div className="video-playlist">
                  <h3>Course Videos ({course.videos.length})</h3>
                  <ul>
                    {course.videos.map((video, index) => {
                      const vPath = video?.url || video
                      const isExt = vPath.includes('youtube') || vPath.includes('vimeo')
                      return (
                        <li
                          key={index}
                          className={selectedVideo === index ? 'active' : ''}
                          onClick={() => setSelectedVideo(index)}
                        >
                          <span className="video-number">{index + 1}</span>
                          <div className="video-info">
                            <strong>
                              {video?.title || `Video ${index + 1}`}
                              {isExt && <span style={{ marginLeft: '8px', display: 'inline-flex', verticalAlign: 'middle' }}><ExternalLink size={13} /></span>}
                            </strong>
                            <span>{video?.duration || 'Video'}</span>
                          </div>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              </>
            ) : (
              <div className="no-videos-placeholder">
                {course.thumbnail && <img src={course.thumbnail} alt={course.title} />}
                <p>Video content will be available soon</p>
              </div>
            )}
          </div>

          {/* Tabs */}
          <div className="course-tabs">
            <div className="tab-headers">
              {['overview', 'syllabus', 'resources'].map((tab) => (
                <button key={tab} className={activeTab === tab ? 'active' : ''} onClick={() => setActiveTab(tab)}>
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>

            <div className="tab-content">
              {activeTab === 'overview' && (
                <div className="overview-tab">
                  <section>
                    <h3>What You'll Learn</h3>
                    {course.learningOutcomes.length > 0 ? (
                      <ul className="outcomes-list">
                        {course.learningOutcomes.map((outcome, i) => (
                          <li key={i}><span className="check-icon">✓</span>{outcome}</li>
                        ))}
                      </ul>
                    ) : (
                      <p style={{ color: 'rgba(255,255,255,0.6)' }}>
                        No learning outcomes were entered for this course.
                      </p>
                    )}
                  </section>
                  <section><h3>Prerequisites</h3><p className="prerequisites-text">{course.prerequisites}</p></section>
                  <section><h3>Course Description</h3><p>{course.description}</p></section>
                </div>
              )}

              {activeTab === 'syllabus' && (
                <div className="syllabus-tab">
                  <h3>Course Curriculum</h3>
                  {course.syllabus.length > 0 ? (
                    // One topic per line, numbered — the shape the course form
                    // captures and the learner's page already renders. The old
                    // week/topics markup here described a structure the course
                    // never had.
                    <ol className="syllabus-topics">
                      {course.syllabus.map((topic, i) => (
                        <li className="syllabus-topic" key={i}>
                          <span className="syllabus-topic-no">{i + 1}</span>
                          <span className="syllabus-topic-text">{topic}</span>
                        </li>
                      ))}
                    </ol>
                  ) : (
                    <div style={{ padding: '2rem', textAlign: 'center', color: 'rgba(255,255,255,0.6)' }}>
                      <p>Course curriculum will be available soon.</p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'resources' && (
                <div className="resources-tab">
                  {course.pdf_path ? (
                    <>
                      <PdfViewer pdfUrl={course.pdf_path} onOpenFullscreen={() => setShowPdfFull(true)} />
                      {course.resources && course.resources.length > 0 && (
                        <div style={{ marginTop: '20px', padding: '20px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
                          <h3 style={{ marginBottom: '15px' }}>Additional Resources</h3>
                          <ul className="resources-list">
                            {course.resources.map((r, i) => (
                              <li key={i}>
                                <div className="resource-info">
                                  <span className="resource-icon"><FileText size={18} /></span>
                                  <div><strong>{r.name}</strong><span>{r.size}</span></div>
                                </div>
                                {r.url ? <a className="resource-open-btn" href={r.url} target="_blank" rel="noopener noreferrer" download>Download</a>
                                  : <span className="resource-open-btn disabled">No Link</span>}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      <h3>Downloadable Resources</h3>
                      {course.resources && course.resources.length > 0 ? (
                        <ul className="resources-list">
                          {course.resources.map((r, i) => (
                            <li key={i}>
                              <div className="resource-info">
                                <span className="resource-icon"><FileText size={18} /></span>
                                <div><strong>{r.name}</strong><span>{r.size}</span></div>
                              </div>
                              {r.url ? (
                                <button className="resource-open-btn" onClick={() =>
                                  handlePPTOpen('https://docs.google.com/presentation/d/1P3YMxfCJ_5WbOpuKgWaHwBc43AjWa9i5/edit?usp=sharing&ouid=106778398341690570644&rtpof=true&sd=true')
                                }>
                                  Open in Browser
                                </button>
                              ) : <span className="resource-open-btn disabled">No Link</span>}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <div style={{ padding: '2rem', textAlign: 'center', color: 'rgba(255,255,255,0.6)' }}>
                          <p>No downloadable resources available yet.</p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Sidebar ── */}
        <div className="course-sidebar">
          <div className="sidebar-card">
            {course.thumbnail ? (
              <img src={course.thumbnail} alt={course.title} className="sidebar-thumbnail" />
            ) : (
              <div className="sidebar-thumbnail" style={{ background: 'linear-gradient(135deg, rgba(255,93,93,0.2), rgba(255,93,93,0.05))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.5)', height: '200px' }}>
                No Image
              </div>
            )}
            <div className="sidebar-info">
              <h4>Course Includes:</h4>
              <ul>
                <li><span className="ci-ic"><Video size={16} /></span> {course.videos?.length || 0} video lectures</li>
                <li><span className="ci-ic"><FileText size={16} /></span> {course.resources?.length || 0} downloadable resources</li>
                <li><span className="ci-ic"><Smartphone size={16} /></span> Access on mobile and desktop</li>
                <li><span className="ci-ic"><GraduationCap size={16} /></span> Certificate of completion</li>
                <li><span className="ci-ic"><InfinityIcon size={16} /></span> Lifetime access</li>
              </ul>
            </div>

            {/* User Progress Panel */}
            {isUserMode && progressData && (
              <div style={{ marginTop: '20px', padding: '16px', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                <h4 style={{ marginBottom: '14px', fontSize: '14px', color: '#ccc' }}>Your Progress</h4>

                {/* Progress bar */}
                <div style={{ marginBottom: '14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ fontSize: '12px', color: '#888' }}>Completion</span>
                    <span style={{ fontSize: '12px', fontWeight: '700' }}>{progressPct}%</span>
                  </div>
                  <div style={{ height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${progressPct}%`, background: 'linear-gradient(90deg, #ff5d5d, #ff8c5a)', borderRadius: '3px', transition: 'width 0.5s ease' }} />
                  </div>
                </div>

                {/* Time stats */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '12px', color: '#888', display: 'inline-flex', alignItems: 'center', gap: 6 }}><Video size={14} /> Video Time</span>
                    <span style={{ fontSize: '13px', fontWeight: '600' }}>{formatTime(videoSecs)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '12px', color: '#888', display: 'inline-flex', alignItems: 'center', gap: 6 }}><FileText size={14} /> Study Time</span>
                    <span style={{ fontSize: '13px', fontWeight: '600' }}>{formatTime(pptSecs)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
                    <span style={{ fontSize: '12px', color: '#aaa', fontWeight: '600' }}>Total Time</span>
                    <span style={{ fontSize: '13px', fontWeight: '700' }}>{formatTime(videoSecs + pptSecs)}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Same document as the inline reader, given the whole window — the
          compact frame is only good for a glance. */}
      {showPdfFull && course.pdf_path && (
        <div className="ppt-overlay">
          <div
            className="ppt-modal"
            style={{ width: '97vw', height: '96vh', maxWidth: '97vw', maxHeight: '96vh', padding: 0, display: 'flex', flexDirection: 'column' }}
          >
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '12px 20px', borderBottom: '1px solid #e8e8ee', flexShrink: 0,
            }}>
              <span style={{ fontWeight: 700, color: '#1f1f27', fontSize: 15 }}>Course Presentation</span>
              <button className="close-btn" onClick={() => setShowPdfFull(false)}>✕</button>
            </div>
            <div style={{ flex: 1, minHeight: 0, overflow: 'auto', background: '#f4f5f7' }}>
              <PdfViewer pdfUrl={course.pdf_path} variant="fullscreen" />
            </div>
          </div>
        </div>
      )}

      {/* PPT Modal */}
      {showModal && (
        <div className="ppt-overlay">
          <div className="ppt-modal">
            <button className="close-btn" onClick={handlePPTClose}>✕</button>
            <iframe src={pptUrl} frameBorder="0" width="100%" height="500" allowFullScreen mozallowfullscreen="true" webkitallowfullscreen="true" />
          </div>
        </div>
      )}
    </div>
  )
}

export default CourseDetail
