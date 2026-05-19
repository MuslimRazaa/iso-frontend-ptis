import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_ENDPOINTS, API_BASE_URL } from '../../config/api';


const MyCourses = () => {
  const [assignedCourses, setAssignedCourses] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [startModal, setStartModal] = useState({ show: false, course: null });
  const navigate = useNavigate();

  const userFullName = localStorage.getItem('userFullName') || '';
  const userEmail = localStorage.getItem('userEmail') || '';

  useEffect(() => {
    fetchAssignedCourses();
  }, []);

  const fetchAssignedCourses = async () => {
    try {
      const [tasksRes, coursesRes, progressRes] = await Promise.all([
        fetch(API_ENDPOINTS.TASK_ALLOCATIONS),
        fetch(API_ENDPOINTS.COURSES),
        fetch(`${API_ENDPOINTS.COURSE_PROGRESS}/user/${encodeURIComponent(userEmail)}`).catch(() => null),
      ]);

      const allTasks = await tasksRes.json();
      const allCourses = await coursesRes.json();
      const progressList = progressRes?.ok ? (await progressRes.json()).data || [] : [];

      const myTasks = allTasks.filter(
        (task) =>
          task.employee_name &&
          userFullName &&
          task.employee_name.toLowerCase().trim() === userFullName.toLowerCase().trim()
      );

      const enriched = myTasks.map((task) => {
        const matchedCourse = allCourses.find(
          (c) => c.course_title?.toLowerCase() === task.course_title?.toLowerCase()
        );
        const courseId = matchedCourse?.id;
        const apiProgress = progressList.find((p) => p.course_id === courseId);

        return {
          ...task,
          courseId,
          thumbnail: matchedCourse?.course_thumbnail
            ? `${API_BASE_URL}/${matchedCourse.course_thumbnail}`
            : null,
          category: matchedCourse?.course_category || 'Training',
          creditHours: matchedCourse?.credit_hours || task.total_hours || 0,
          videoSeconds: apiProgress?.video_watch_time || 0,
          pptSeconds: apiProgress?.ppt_view_time || 0,
          isStarted: !!apiProgress,
          localProgress: apiProgress?.progress_percentage || task.progress || 0,
        };
      });

      setAssignedCourses(enriched);
    } catch (error) {
      console.error('Error fetching courses:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusLabel = (course) => {
    if (course.localProgress >= 100 || course.status === 'Completed') return 'Completed';
    if (course.isStarted) return 'In Progress';
    return 'Not Started';
  };

  const getStatusColor = (course) => {
    const label = getStatusLabel(course);
    if (label === 'Completed') return '#4caf50';
    if (label === 'In Progress') return '#ff9800';
    return '#9e9e9e';
  };

  const filteredCourses = assignedCourses.filter((course) => {
    if (filter === 'all') return true;
    if (filter === 'completed') return course.localProgress >= 100 || course.status === 'Completed';
    if (filter === 'in-progress') return course.isStarted && course.localProgress < 100;
    if (filter === 'not-started') return !course.isStarted;
    return true;
  });

  const handleCourseClick = (course) => {
    if (!course.courseId) {
      alert('Course details not available. Please contact your administrator.');
      return;
    }
    if (!course.isStarted) {
      setStartModal({ show: true, course });
    } else {
      navigate(`/user/course/${course.courseId}`);
    }
  };

  const handleStartCourse = async () => {
    const course = startModal.course;
    if (!course?.courseId) return;

    try {
      await fetch(API_ENDPOINTS.COURSE_PROGRESS, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_email: userEmail,
          course_id: course.courseId,
          action: 'enroll',
        }),
      });
    } catch {
      // Proceed even if enroll fails
    }

    setStartModal({ show: false, course: null });
    navigate(`/user/course/${course.courseId}`);
  };

  const formatTime = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', flexDirection: 'column', gap: '16px', color: 'rgba(255,255,255,0.5)' }}>
        <div style={{ width: '36px', height: '36px', border: '3px solid rgba(255,93,93,0.3)', borderTopColor: '#ff5d5d', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <p>Loading your courses...</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ padding: '32px', minHeight: '100%', background: '#0e0f14' }}>

      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px' }}>
        <div>
          <p style={{ fontSize: '12px', fontWeight: '700', letterSpacing: '1.5px', color: 'rgba(255,93,93,0.8)', textTransform: 'uppercase', marginBottom: '6px' }}>
            My Training
          </p>
          <h1 style={{ fontSize: '26px', fontWeight: '700', color: '#fff', marginBottom: '6px' }}>My Assigned Courses</h1>
          <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.45)' }}>Courses assigned to you — track your progress here</p>
        </div>
        <button className="ghost-btn" onClick={() => navigate('/user/all-courses')}>
          Browse All Courses
        </button>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '28px', flexWrap: 'wrap' }}>
        {[
          { key: 'all', label: 'All', count: assignedCourses.length },
          { key: 'not-started', label: 'Not Started', count: assignedCourses.filter(c => !c.isStarted).length },
          { key: 'in-progress', label: 'In Progress', count: assignedCourses.filter(c => c.isStarted && c.localProgress < 100).length },
          { key: 'completed', label: 'Completed', count: assignedCourses.filter(c => c.localProgress >= 100 || c.status === 'Completed').length },
        ].map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            style={{
              padding: '8px 18px',
              borderRadius: '8px',
              border: filter === f.key ? '1px solid rgba(255,93,93,0.5)' : '1px solid rgba(255,255,255,0.08)',
              background: filter === f.key ? 'rgba(255,93,93,0.12)' : 'rgba(255,255,255,0.03)',
              color: filter === f.key ? '#ff5d5d' : 'rgba(255,255,255,0.45)',
              fontSize: '13px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.18s',
            }}
          >
            {f.label} <span style={{ opacity: 0.7, marginLeft: '4px' }}>({f.count})</span>
          </button>
        ))}
      </div>

      {filteredCourses.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 20px', background: 'rgba(255,255,255,0.02)', borderRadius: '16px', border: '2px dashed rgba(255,255,255,0.08)' }}>
          <div style={{ fontSize: '56px', marginBottom: '20px', opacity: 0.4 }}>📚</div>
          <h3 style={{ color: '#ccc', marginBottom: '10px' }}>{assignedCourses.length === 0 ? 'No courses assigned yet' : 'No courses in this category'}</h3>
          <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '14px' }}>
            {assignedCourses.length === 0 ? 'Browse available courses and request access.' : 'Try a different filter.'}
          </p>
          {assignedCourses.length === 0 && (
            <button className="primary-btn" style={{ marginTop: '20px' }} onClick={() => navigate('/user/all-courses')}>
              Browse All Courses
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
          {filteredCourses.map((course) => {
            const statusLabel = getStatusLabel(course);
            const statusClr = getStatusColor(course);
            return (
              <div
                key={course.id}
                onClick={() => handleCourseClick(course)}
                style={{
                  background: 'linear-gradient(160deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '16px',
                  padding: '20px',
                  cursor: 'pointer',
                  transition: 'all 0.22s ease',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '14px',
                  position: 'relative',
                  overflow: 'hidden',
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 16px 40px rgba(0,0,0,0.4)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; }}
              >
                {/* Top row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: 'rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', overflow: 'hidden' }}>
                    {course.thumbnail ? <img src={course.thumbnail} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '10px' }} /> : '📚'}
                  </div>
                  <span style={{ fontSize: '11px', fontWeight: '700', padding: '4px 10px', borderRadius: '6px', background: `${statusClr}22`, color: statusClr, border: `1px solid ${statusClr}44` }}>
                    {statusLabel}
                  </span>
                </div>

                {/* Title & category */}
                <div>
                  <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '4px' }}>{course.category}</p>
                  <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#fff', lineHeight: '1.3' }}>{course.course_title}</h3>
                </div>

                {/* Meta */}
                <div style={{ display: 'flex', gap: '16px' }}>
                  <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>📚 {course.creditHours}h</span>
                  <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>📅 {new Date(course.deadline).toLocaleDateString()}</span>
                </div>

                {/* Time tracked */}
                {course.isStarted && (
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <span style={{ fontSize: '11px', background: 'rgba(255,255,255,0.05)', padding: '3px 8px', borderRadius: '5px', color: 'rgba(255,255,255,0.5)' }}>🎥 {formatTime(course.videoSeconds)}</span>
                    <span style={{ fontSize: '11px', background: 'rgba(255,255,255,0.05)', padding: '3px 8px', borderRadius: '5px', color: 'rgba(255,255,255,0.5)' }}>📄 {formatTime(course.pptSeconds)}</span>
                  </div>
                )}

                {/* Progress bar */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)' }}>Progress</span>
                    <span style={{ fontSize: '11px', fontWeight: '700', color: statusClr }}>{course.localProgress}%</span>
                  </div>
                  <div style={{ height: '4px', background: 'rgba(255,255,255,0.08)', borderRadius: '2px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${course.localProgress}%`, background: `linear-gradient(90deg, ${statusClr}, ${statusClr}aa)`, borderRadius: '2px', transition: 'width 0.4s ease' }} />
                  </div>
                </div>

                {/* Action */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '4px' }}>
                  <span style={{ fontSize: '13px', fontWeight: '600', color: 'rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {statusLabel === 'Completed' ? 'Review Course' : course.isStarted ? 'Continue Learning' : 'Start Course'}
                    <svg viewBox="0 0 24 24" style={{ width: '14px', height: '14px', fill: 'none', stroke: 'currentColor', strokeWidth: 2 }}><path d="M5 12h14M13 6l6 6-6 6" /></svg>
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {startModal.show && (
        <div className="modal-overlay" onClick={() => setStartModal({ show: false, course: null })}>
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '480px' }}
          >
            <div className="modal-header">
              <h2>Ready to Start?</h2>
              <button
                className="close-modal-btn"
                onClick={() => setStartModal({ show: false, course: null })}
              >
                ✕
              </button>
            </div>
            <div style={{ padding: '24px' }}>
              <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                <div style={{ fontSize: '56px', marginBottom: '16px' }}>🎓</div>
                <h3 style={{ marginBottom: '10px', fontSize: '18px' }}>
                  {startModal.course?.course_title}
                </h3>
                <p style={{ color: '#888', fontSize: '14px', lineHeight: '1.6' }}>
                  Once you start this course, your progress will be tracked — including video watch
                  time and study material time. This will be visible to your administrator.
                </p>
              </div>

              <div
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  borderRadius: '10px',
                  padding: '16px',
                  marginBottom: '24px',
                  display: 'flex',
                  gap: '24px',
                  justifyContent: 'center',
                }}
              >
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '20px', fontWeight: '700' }}>
                    {startModal.course?.creditHours}h
                  </div>
                  <div style={{ fontSize: '12px', color: '#888' }}>Credit Hours</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '20px', fontWeight: '700' }}>
                    {startModal.course?.deadline
                      ? new Date(startModal.course.deadline).toLocaleDateString()
                      : 'N/A'}
                  </div>
                  <div style={{ fontSize: '12px', color: '#888' }}>Deadline</div>
                </div>
              </div>

              <div className="modal-actions">
                <button
                  className="ghost-btn"
                  onClick={() => setStartModal({ show: false, course: null })}
                >
                  Not Now
                </button>
                <button className="primary-btn" onClick={handleStartCourse}>
                  Start Learning →
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyCourses;
