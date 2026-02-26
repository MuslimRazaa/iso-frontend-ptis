import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { API_ENDPOINTS, API_BASE_URL } from '../../config/api';

const CourseDetailUser = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCourseDetails();
  }, [courseId]);

  const fetchCourseDetails = async () => {
    try {
      const response = await fetch(`${API_ENDPOINTS.COURSES}/${courseId}`);
      if (response.ok) {
        const data = await response.json();
        setCourse(data);
      }
    } catch (error) {
      console.error('Error fetching course:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="lms-home" style={{ textAlign: 'center' }}>
        <p>Loading course details...</p>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="lms-home" style={{ textAlign: 'center' }}>
        <h2>Course Not Found</h2>
        <p>The course you're looking for doesn't exist.</p>
        <Link to="/user/my-courses">
          <button className="btn btn-primary">Back to Courses</button>
        </Link>
      </div>
    );
  }

  return (
    <div className="lms-home">
      {/* Course Header */}
      <section className="lms-hero" style={{ marginBottom: '2rem' }}>
        <div className="lms-hero__copy">
          <p className="eyebrow">{course.course_category || 'Course'}</p>
          <h1>{course.course_title}</h1>
          <p>{course.course_description || 'No description available'}</p>
          <div className="hero-actions" style={{ marginTop: '1.5rem' }}>
            <button className="btn btn-primary">Start Learning</button>
            <button className="btn btn-ghost" onClick={() => navigate('/user/my-courses')}>
              Back to Courses
            </button>
          </div>
        </div>
        <div className="lms-hero__card">
          <div className="hero-card__meta">
            <span>Course Info</span>
            <strong>{course.is_published ? 'Active' : 'Draft'}</strong>
          </div>
          <h3>Course Details</h3>
          <ul>
            <li>
              <span>Credit Hours</span>
              <strong>{course.credit_hours || 0}h</strong>
            </li>
            <li>
              <span>Duration</span>
              <strong>{course.duration_weeks || 0} weeks</strong>
            </li>
            <li>
              <span>Category</span>
              <strong>{course.course_category || 'N/A'}</strong>
            </li>
          </ul>
        </div>
      </section>

      {/* Course Stats */}
      <section className="lms-stat-grid" style={{ marginBottom: '2rem' }}>
        <article className="stat-card accent">
          <p>Progress</p>
          <h3>0%</h3>
          <span>Not started yet</span>
        </article>
        <article className="stat-card neutral">
          <p>Modules</p>
          <h3>0</h3>
          <span>Total modules</span>
        </article>
        <article className="stat-card muted">
          <p>Assignments</p>
          <h3>0</h3>
          <span>Pending tasks</span>
        </article>
        <article className="stat-card warning">
          <p>Status</p>
          <h3>Active</h3>
          <span>Enrollment status</span>
        </article>
      </section>

      {/* Course Content */}
      <section className="lms-panel-grid">
        <article className="panel learning-progress">
          <header>
            <div>
              <p className="eyebrow">Course Content</p>
              <h2>Learning Modules</h2>
            </div>
          </header>
          <div style={{ padding: '2rem', textAlign: 'center' }}>
            <p style={{ fontSize: '3rem', marginBottom: '1rem' }}>📚</p>
            <h3>Course modules will appear here</h3>
            <p style={{ color: '#6c757d', marginTop: '0.5rem' }}>
              Start learning to access course materials, videos, and assignments
            </p>
          </div>
        </article>

        <article className="panel quick-actions">
          <header>
            <div>
              <p className="eyebrow">Quick Actions</p>
              <h2>Course Tools</h2>
            </div>
          </header>
          <ul>
            <li>
              <Link to="#">
                <strong>Course Materials</strong>
                <span>Download PDFs and resources</span>
              </Link>
            </li>
            <li>
              <Link to="#">
                <strong>Video Lectures</strong>
                <span>Watch course videos</span>
              </Link>
            </li>
            <li>
              <Link to="#">
                <strong>Assignments</strong>
                <span>View and submit tasks</span>
              </Link>
            </li>
            <li>
              <Link to="#">
                <strong>Discussion Forum</strong>
                <span>Ask questions and collaborate</span>
              </Link>
            </li>
          </ul>
        </article>
      </section>

      {/* Course Thumbnail */}
      {course.course_thumbnail && (
        <section style={{ marginTop: '2rem' }}>
          <h2 style={{ marginBottom: '1rem' }}>Course Preview</h2>
          <div style={{ 
            borderRadius: '16px', 
            overflow: 'hidden',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            maxWidth: '800px'
          }}>
            <img 
              src={`${API_BASE_URL}${course.course_thumbnail}`} 
              alt={course.course_title}
              style={{ width: '100%', height: 'auto', display: 'block' }}
            />
          </div>
        </section>
      )}
    </div>
  );
};

export default CourseDetailUser;
