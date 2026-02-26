import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_ENDPOINTS, API_BASE_URL } from '../../config/api';

const MyCourses = () => {
  const [assignedCourses, setAssignedCourses] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchAssignedCourses();
  }, []);

  const fetchAssignedCourses = async () => {
    try {
      setLoading(true);
      // Fetch from backend
      const response = await fetch(API_ENDPOINTS.COURSES);
      const data = await response.json();

      // Filter published courses and transform data
      const publishedCourses = data
        .filter(c => c.is_published === true || c.is_published === 1)
        .map(course => ({
          id: course.id,
          title: course.course_title,
          thumbnail: course.course_thumbnail ? `${API_BASE_URL}${course.course_thumbnail}` : 'https://via.placeholder.com/300x180',
          category: course.course_category || 'General',
          description: course.course_description || 'No description available',
          progress: 0, // Mock progress - in real app, fetch from user progress table
          status: 'not-started', // Mock status
          deadline: '2024-03-31',
          creditHours: course.credit_hours || 0
        }));

      setAssignedCourses(publishedCourses);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching courses:', error);
      setLoading(false);
    }
  };

  const filteredCourses = assignedCourses.filter(course => {
    if (filter === 'all') return true;
    return course.status === filter;
  });

  const handleCourseClick = (courseId) => {
    navigate(`/user/course/${courseId}`);
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'completed': return '#4caf50';
      case 'in-progress': return '#ff9800';
      case 'not-started': return '#9e9e9e';
      default: return '#9e9e9e';
    }
  };

  const getStatusLabel = (status) => {
    switch(status) {
      case 'completed': return 'Completed';
      case 'in-progress': return 'In Progress';
      case 'not-started': return 'Not Started';
      default: return 'Unknown';
    }
  };

  if (loading) {
    return (
      <div className="lms-home" style={{ textAlign: 'center', padding: '3rem' }}>
        <p>Loading your courses...</p>
      </div>
    );
  }

  return (
    <div className="lms-home">
      <section className="lms-spotlight">
        {/* Professional Header */}
        <header style={{ 
          marginBottom: '2.5rem', 
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          borderRadius: '20px',
          padding: '2.5rem',
          color: '#fff',
          boxShadow: '0 10px 40px rgba(102, 126, 234, 0.3)'
        }}>
          <p className="eyebrow" style={{ 
            opacity: 0.9, 
            fontSize: '0.8rem', 
            fontWeight: '700', 
            textTransform: 'uppercase', 
            letterSpacing: '1.5px',
            marginBottom: '0.75rem'
          }}>
            📚 My Learning
          </p>
          <h2 style={{ 
            fontSize: '2.25rem', 
            fontWeight: '800', 
            marginBottom: '0.75rem',
            textShadow: '0 2px 10px rgba(0,0,0,0.1)'
          }}>
            Assigned Courses
          </h2>
          <p style={{ 
            fontSize: '1rem', 
            opacity: 0.95,
            maxWidth: '600px'
          }}>
            Track your progress, continue learning, and complete courses to earn certificates
          </p>
        </header>

        {/* Professional Filter Pills */}
        <div style={{
          display: 'flex',
          gap: '12px',
          marginBottom: '2.5rem',
          flexWrap: 'wrap',
          background: '#fff',
          padding: '1.5rem',
          borderRadius: '16px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
          border: '1px solid rgba(0,0,0,0.05)'
        }}>
          {[
            { key: 'all', label: 'All Courses', color: '#667eea', emoji: '📚' },
            { key: 'in-progress', label: 'In Progress', color: '#ff9800', emoji: '⏳' },
            { key: 'completed', label: 'Completed', color: '#4caf50', emoji: '✅' },
            { key: 'not-started', label: 'Not Started', color: '#9e9e9e', emoji: '📖' }
          ].map(btn => (
            <button 
              key={btn.key}
              onClick={() => setFilter(btn.key)}
              style={{
                padding: '12px 24px',
                border: 'none',
                background: filter === btn.key 
                  ? `linear-gradient(135deg, ${btn.color} 0%, ${btn.color}dd 100%)` 
                  : '#f8f9fa',
                color: filter === btn.key ? '#fff' : '#495057',
                borderRadius: '12px',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '0.9rem',
                transition: 'all 0.3s ease',
                boxShadow: filter === btn.key ? `0 4px 15px ${btn.color}40` : 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px'
              }}
              onMouseEnter={(e) => {
                if (filter !== btn.key) {
                  e.target.style.background = '#e9ecef';
                  e.target.style.transform = 'translateY(-2px)';
                }
              }}
              onMouseLeave={(e) => {
                if (filter !== btn.key) {
                  e.target.style.background = '#f8f9fa';
                  e.target.style.transform = 'translateY(0)';
                }
              }}
            >
              <span>{btn.emoji}</span>
              <span>{btn.label}</span>
              <span style={{
                background: filter === btn.key ? 'rgba(255,255,255,0.3)' : '#dee2e6',
                padding: '2px 8px',
                borderRadius: '10px',
                fontSize: '0.75rem',
                fontWeight: '700'
              }}>
                {btn.key === 'all' 
                  ? assignedCourses.length 
                  : assignedCourses.filter(c => c.status === btn.key).length
                }
              </span>
            </button>
          ))}
        </div>

        {/* Professional Courses Grid */}
        {filteredCourses.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '5rem 2rem',
            background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
            borderRadius: '20px',
            border: '2px dashed rgba(0,0,0,0.1)',
            boxShadow: '0 4px 20px rgba(0,0,0,0.06)'
          }}>
            <div style={{ fontSize: '5rem', marginBottom: '1.5rem' }}>📚</div>
            <h3 style={{ 
              marginBottom: '0.75rem', 
              color: '#2c3e50', 
              fontSize: '1.75rem', 
              fontWeight: '700' 
            }}>No courses found</h3>
            <p style={{ color: '#6c757d', fontSize: '1.05rem' }}>
              Try changing the filter or wait for new course assignments
            </p>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: '2rem'
          }}>
            {filteredCourses.map((course) => (
              <article 
                key={course.id} 
                onClick={() => handleCourseClick(course.id)}
                style={{
                  background: '#fff',
                  borderRadius: '20px',
                  overflow: 'hidden',
                  boxShadow: '0 6px 25px rgba(0,0,0,0.08)',
                  border: '1px solid rgba(0,0,0,0.06)',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  position: 'relative'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-10px) scale(1.02)';
                  e.currentTarget.style.boxShadow = '0 15px 50px rgba(0,0,0,0.15)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0) scale(1)';
                  e.currentTarget.style.boxShadow = '0 6px 25px rgba(0,0,0,0.08)';
                }}
              >
                {/* Course Thumbnail */}
                <div style={{ 
                  width: '100%', 
                  height: '220px', 
                  overflow: 'hidden',
                  position: 'relative'
                }}>
                  <img 
                    src={course.thumbnail} 
                    alt={course.title}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      transition: 'transform 0.5s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.transform = 'scale(1.1)';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.transform = 'scale(1)';
                    }}
                  />
                  
                  {/* Status Badge */}
                  <span style={{
                    position: 'absolute',
                    top: '16px',
                    right: '16px',
                    padding: '8px 16px',
                    borderRadius: '12px',
                    fontSize: '0.75rem',
                    fontWeight: '700',
                    backgroundColor: getStatusColor(course.status),
                    color: 'white',
                    boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
                    backdropFilter: 'blur(10px)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>
                    {getStatusLabel(course.status)}
                  </span>

                  {/* Category Badge */}
                  <span style={{
                    position: 'absolute',
                    bottom: '16px',
                    left: '16px',
                    padding: '6px 14px',
                    borderRadius: '20px',
                    fontSize: '0.75rem',
                    fontWeight: '600',
                    background: 'rgba(255,255,255,0.95)',
                    color: '#667eea',
                    boxShadow: '0 4px 15px rgba(0,0,0,0.15)',
                    backdropFilter: 'blur(10px)'
                  }}>
                    {course.category}
                  </span>
                </div>
                
                {/* Course Body */}
                <div style={{ padding: '1.75rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '8px', 
                    marginBottom: '1rem',
                    fontSize: '0.8rem',
                    color: '#95a5a6',
                    fontWeight: '600'
                  }}>
                    <span>🕐 {course.creditHours}h</span>
                    <span>•</span>
                    <span>📖 12 Modules</span>
                  </div>

                  <h3 style={{ 
                    fontSize: '1.25rem', 
                    fontWeight: '700', 
                    color: '#2c3e50', 
                    marginBottom: '1rem',
                    lineHeight: '1.4',
                    minHeight: '60px'
                  }}>
                    {course.title}
                  </h3>

                  <p style={{ 
                    fontSize: '0.95rem', 
                    color: '#6c757d', 
                    lineHeight: '1.65',
                    marginBottom: '1.5rem',
                    flex: 1
                  }}>
                    {course.description.length > 120 
                      ? `${course.description.substring(0, 120)}...` 
                      : course.description
                    }
                  </p>
                  
                  {/* Progress Bar */}
                  {course.progress > 0 ? (
                    <div style={{ marginTop: 'auto' }}>
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '8px'
                      }}>
                        <span style={{ 
                          fontSize: '0.8rem', 
                          color: '#95a5a6', 
                          fontWeight: '600',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px'
                        }}>
                          Progress
                        </span>
                        <span style={{ 
                          fontSize: '0.85rem', 
                          color: getStatusColor(course.status), 
                          fontWeight: '700'
                        }}>
                          {course.progress}%
                        </span>
                      </div>
                      <div style={{
                        width: '100%',
                        height: '8px',
                        background: '#f0f0f0',
                        borderRadius: '10px',
                        overflow: 'hidden',
                        boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)'
                      }}>
                        <div style={{
                          width: `${course.progress}%`,
                          height: '100%',
                          background: `linear-gradient(90deg, ${getStatusColor(course.status)} 0%, ${getStatusColor(course.status)}dd 100%)`,
                          borderRadius: '10px',
                          transition: 'width 0.5s ease',
                          boxShadow: `0 0 10px ${getStatusColor(course.status)}60`
                        }} />
                      </div>
                    </div>
                  ) : (
                    <div style={{
                      marginTop: 'auto',
                      padding: '1rem',
                      background: 'linear-gradient(135deg, #667eea15 0%, #764ba215 100%)',
                      borderRadius: '12px',
                      textAlign: 'center'
                    }}>
                      <span style={{
                        fontSize: '0.85rem',
                        color: '#667eea',
                        fontWeight: '600'
                      }}>
                        🚀 Ready to start
                      </span>
                    </div>
                  )}
                </div>
                
                {/* Footer Button */}
                <div style={{
                  padding: '1.5rem',
                  paddingTop: '0',
                  marginTop: 'auto'
                }}>
                  <button style={{
                    width: '100%',
                    padding: '14px',
                    border: 'none',
                    borderRadius: '12px',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: '#fff',
                    fontWeight: '700',
                    fontSize: '0.95rem',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    boxShadow: '0 4px 15px rgba(102, 126, 234, 0.3)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }} onMouseEnter={(e) => {
                    e.target.style.transform = 'translateY(-2px)';
                    e.target.style.boxShadow = '0 6px 20px rgba(102, 126, 234, 0.4)';
                  }} onMouseLeave={(e) => {
                    e.target.style.transform = 'translateY(0)';
                    e.target.style.boxShadow = '0 4px 15px rgba(102, 126, 234, 0.3)';
                  }}>
                    {course.status === 'completed' ? '🎓 Review Course' : 
                     course.status === 'in-progress' ? '▶️ Continue Learning' : 
                     '🚀 Start Course'}
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default MyCourses;
