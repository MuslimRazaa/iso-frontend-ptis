import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { API_ENDPOINTS, API_BASE_URL } from '../../config/api'
import PdfViewer from '../../components/PdfViewer'

function CourseDetail() {
  const { courseId } = useParams()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('overview')
  const [selectedVideo, setSelectedVideo] = useState(0)
  const [course, setCourse] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [pptUrl, setPptUrl] = useState(null);
  const [showModal, setShowModal] = useState(false);

  
  useEffect(() => {
    const fetchCourseDetail = async () => {
      try {
        setLoading(true)
        const response = await fetch(`${API_ENDPOINTS.COURSES}/${courseId}`)

        if (!response.ok) {
          throw new Error('Course not found')
        }

        const data = await response.json()

        // Parse videos if they're stored as JSON string
        let videos = []
        if (data.course_videos) {
          try {
            videos = typeof data.course_videos === 'string'
              ? JSON.parse(data.course_videos)
              : data.course_videos
          } catch (e) {
            console.error('Error parsing videos:', e)
          }
        }




        // Transform the API response to match component structure
        const transformedCourse = {
          id: data.id,
          title: data.course_title,
          description: data.course_description || 'No description available',
          thumbnail: data.course_thumbnail ? `${API_BASE_URL}/${data.course_thumbnail}` : null,
          instructor: data.course_owner || 'PTIS Academy',
          category: data.course_category || 'Technical Skills',
          level: 'Intermediate',
          creditHours: data.credit_hours || 0,
          duration: data.duration_weeks ? `${data.duration_weeks} weeks` : 'Self-paced',
          enrolled: 0,
          rating: 4.5,
          totalRatings: 0,
          prerequisites: data.prerequisites || 'None',
          learningOutcomes: [
            'Complete the course objectives',
            'Master the core concepts',
            'Apply learned skills in real scenarios',
            'Earn course completion certificate',
          ],
          syllabus: [],
          videos: videos,
          pdf_path: data.pdf_path || null,
          resources: data.primary_ppt ? [
            {
              name: 'Course Presentation',
              size: 'PPT',
              url: `${API_BASE_URL}${data.primary_ppt}`
            }
          ] : [],
          standard_name: data.standard_name,
          is_published: data.is_published,
        }

        setCourse(transformedCourse)
      } catch (err) {
        console.error('Error fetching course:', err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    if (courseId) {
      fetchCourseDetail()
    }
  }, [courseId])

  if (loading) {
    return (
      <div className="course-detail-error">
        <h2>Loading course...</h2>
      </div>
    )
  }

  if (error || !course) {
    return (
      <div className="course-detail-error">
        <h2>Course not found</h2>
        <button className="primary-btn" onClick={() => navigate('/learning-management-system')}>
          Back to Home
        </button>
      </div>
    )
  }



  const handlePPTviewer = (url) => {
    console.log('Opening PPT viewer for:', url);

    setPptUrl(url);
    setShowModal(true);
  };
  return (
    <div className="course-detail-page">
      <div className="course-detail-header">
        <button className="back-btn" onClick={() => navigate(-1)}>
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
              <span className="stat-icon">👨‍🏫</span>
              <div>
                <strong>{course.instructor}</strong>
                <span>Instructor</span>
              </div>
            </div>
            <div className="stat-item">
              <span className="stat-icon">⭐</span>
              <div>
                <strong>{course.rating}</strong>
                <span>({course.totalRatings} ratings)</span>
              </div>
            </div>
            <div className="stat-item">
              <span className="stat-icon">👥</span>
              <div>
                <strong>{course.enrolled}</strong>
                <span>Enrolled</span>
              </div>
            </div>
            <div className="stat-item">
              <span className="stat-icon">📚</span>
              <div>
                <strong>{course.creditHours}h</strong>
                <span>Credit Hours</span>
              </div>
            </div>
            <div className="stat-item">
              <span className="stat-icon">📅</span>
              <div>
                <strong>{course.duration}</strong>
                <span>Duration</span>
              </div>
            </div>
          </div>
          <div className="course-actions">
            <button className="primary-btn large" onClick={() => navigate('/learning-management-system/task-allocation')}>
              Assign to Employees
            </button>
            <button className="ghost-btn large" onClick={() => navigate('/learning-management-system/all-courses')}>
              View All Courses
            </button>
          </div>
        </div>
      </div>

      <div className="course-detail-body">
        <div className="course-main-content">
          <div className="video-player-section">
            {course.videos && course.videos.length > 0 ? (
              <>
                <div className="video-container">
                  {(() => {
                    const videoPath = course.videos[selectedVideo]?.url || course.videos[selectedVideo];
                    const videoUrl = videoPath.startsWith('http') ? videoPath : `${API_BASE_URL}${videoPath}`;

                    // Check if it's a YouTube/external video or local file
                    const isExternalVideo = videoPath.includes('youtube.com') ||
                      videoPath.includes('youtu.be') ||
                      videoPath.includes('vimeo.com');

                    if (isExternalVideo) {
                      return (
                        <iframe
                          src={videoUrl}
                          title={course.videos[selectedVideo]?.title || `Video ${selectedVideo + 1}`}
                          frameBorder="0"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        />
                      );
                    } else {
                      return (
                        <video
                          key={videoUrl}
                          controls
                          controlsList="nodownload"
                          className="course-video-player"
                        >
                          <source src={videoUrl} type="video/mp4" />
                          <source src={videoUrl} type="video/webm" />
                          <source src={videoUrl} type="video/ogg" />
                          Your browser does not support the video tag.
                        </video>
                      );
                    }
                  })()}
                </div>
                <div className="video-playlist">
                  <h3>Course Videos ({course.videos.length})</h3>
                  <ul>
                    {course.videos.map((video, index) => {
                      const videoPath = video?.url || video;
                      const isExternal = videoPath.includes('youtube') || videoPath.includes('vimeo');

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
                              {isExternal && <span style={{ marginLeft: '8px', fontSize: '0.85em' }}>🔗</span>}
                            </strong>
                            <span>{video?.duration || 'Video'}</span>
                          </div>
                        </li>
                      );
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

          <div className="course-tabs">
            <div className="tab-headers">
              <button
                className={activeTab === 'overview' ? 'active' : ''}
                onClick={() => setActiveTab('overview')}
              >
                Overview
              </button>
              <button
                className={activeTab === 'syllabus' ? 'active' : ''}
                onClick={() => setActiveTab('syllabus')}
              >
                Syllabus
              </button>
              <button
                className={activeTab === 'resources' ? 'active' : ''}
                onClick={() => setActiveTab('resources')}
              >
                Resources
              </button>
            </div>

            <div className="tab-content">
              {activeTab === 'overview' && (
                <div className="overview-tab">
                  <section>
                    <h3>What You'll Learn</h3>
                    <ul className="outcomes-list">
                      {course.learningOutcomes.map((outcome, index) => (
                        <li key={index}>
                          <span className="check-icon">✓</span>
                          {outcome}
                        </li>
                      ))}
                    </ul>
                  </section>

                  <section>
                    <h3>Prerequisites</h3>
                    <p className="prerequisites-text">{course.prerequisites}</p>
                  </section>

                  <section>
                    <h3>Course Description</h3>
                    <p>{course.description}</p>
                  </section>
                </div>
              )}

              {activeTab === 'syllabus' && (
                <div className="syllabus-tab">
                  <h3>Course Curriculum</h3>
                  {course.syllabus && course.syllabus.length > 0 ? (
                    <div className="syllabus-list">
                      {course.syllabus.map((item, index) => (
                        <div className="syllabus-item" key={index}>
                          <div className="syllabus-header">
                            <span className="week-badge">Week {item.week}</span>
                            <h4>{item.title}</h4>
                          </div>
                          <ul className="topics-list">
                            {item.topics.map((topic, i) => (
                              <li key={i}>{topic}</li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ padding: '2rem', textAlign: 'center', color: 'rgba(255, 255, 255, 0.6)' }}>
                      <p>Course curriculum will be available soon.</p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'resources' && (
                <div className="resources-tab">
                  {course.pdf_path ? (
                    <>
                      <PdfViewer pdfUrl={course.pdf_path} />
                      <div style={{ marginTop: '20px', padding: '20px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
                        <h3 style={{ marginBottom: '15px' }}>Additional Resources</h3>
                        {course.resources && course.resources.length > 0 ? (
                          <ul className="resources-list">
                            {course.resources.map((resource, index) => (
                              <li key={index}>
                                <div className="resource-info">
                                  <span className="resource-icon">📄</span>
                                  <div>
                                    <strong>{resource.name}</strong>
                                    <span>{resource.size}</span>
                                  </div>
                                </div>
                                {resource.url ? (
                                  <a
                                    className="resource-open-btn"
                                    href={resource.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    download
                                  >
                                    Download
                                  </a>
                                ) : (
                                  <span className="resource-open-btn disabled">No Link</span>
                                )}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p style={{ color: 'rgba(255, 255, 255, 0.6)' }}>No additional resources available.</p>
                        )}
                      </div>
                    </>
                  ) : (
                    <>
                      <h3>Downloadable Resources</h3>
                      {course.resources && course.resources.length > 0 ? (
                        <ul className="resources-list">
                          {course.resources.map((resource, index) => (
                            <li key={index}>
                              <div className="resource-info">
                                <span className="resource-icon">📄</span>
                                <div>
                                  <strong>{resource.name}</strong>
                                  <span>{resource.size}</span>
                                </div>
                              </div>
                              {resource.url ? (
                                <button
                                  className="resource-open-btn"
                                  onClick={() => handlePPTviewer("https://docs.google.com/presentation/d/1P3YMxfCJ_5WbOpuKgWaHwBc43AjWa9i5/edit?usp=sharing&ouid=106778398341690570644&rtpof=true&sd=true")}
                                >
                                  Open in Browser
                                </button>
                              ) : (
                                <span className="resource-open-btn disabled">No Link</span>
                              )}
                            </li>
                            // <li key={index}>
                            //   <div className="resource-info">
                            //     <span className="resource-icon">📄</span>
                            //     <div>
                            //       <strong>{resource.name}</strong>
                            //       <span>{resource.size}</span>
                            //     </div>
                            //   </div>
                            //   {resource.url ? (
                            //     <a
                            //       className="resource-open-btn"
                            //       href={resource.url}
                            //       target=""
                            //       rel="noopener noreferrer"
                            //     >
                            //       Open in Browser
                            //     </a>
                            //   ) : (
                            //     <span className="resource-open-btn disabled">No Link</span>
                            //   )}
                            // </li>
                          ))}
                        </ul>
                      ) : (
                        <div style={{ padding: '2rem', textAlign: 'center', color: 'rgba(255, 255, 255, 0.6)' }}>
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

        <div className="course-sidebar">
          <div className="sidebar-card">
            {course.thumbnail ? (
              <img src={course.thumbnail} alt={course.title} className="sidebar-thumbnail" />
            ) : (
              <div className="sidebar-thumbnail" style={{ background: 'linear-gradient(135deg, rgba(255, 93, 93, 0.2), rgba(255, 93, 93, 0.05))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255, 255, 255, 0.5)', height: '200px' }}>
                No Image
              </div>
            )}
            <div className="sidebar-info">
              <h4>Course Includes:</h4>
              <ul>
                <li>
                  <span>🎥</span> {course.videos?.length || 0} video lectures
                </li>
                <li>
                  <span>📄</span> {course.resources?.length || 0} downloadable resources
                </li>
                <li>
                  <span>📱</span> Access on mobile and desktop
                </li>
                <li>
                  <span>🎓</span> Certificate of completion
                </li>
                <li>
                  <span>♾️</span> Lifetime access
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
      {showModal && (
        <div className="ppt-overlay">
          <div className="ppt-modal">

            <button
              className="close-btn"
              onClick={() => setShowModal(false)}
            >
              ✕
            </button>

            {/* <iframe
              src={`https://docs.google.com/gview?url=${encodeURIComponent(pptUrl)}&embedded=true`}
              width="100%"
              height="600px"
              frameBorder="0"
              title="PPT Viewer"
            /> */}
            <iframe src={pptUrl} frameborder="0" width="100%" height="500" allowfullscreen="true" mozallowfullscreen="true" webkitallowfullscreen="true"></iframe>
          </div>
        </div>
      )}

    </div>
  )
}

export default CourseDetail
