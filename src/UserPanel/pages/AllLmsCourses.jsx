import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_ENDPOINTS, API_BASE_URL } from '../../config/api';

const AllLmsCourses = () => {
  const [courses, setCourses] = useState([]);
  const [myAssignedTitles, setMyAssignedTitles] = useState(new Set());
  const [pendingRequests, setPendingRequests] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [toastMsg, setToastMsg] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  const userFullName = localStorage.getItem('userFullName') || '';
  const userEmail = localStorage.getItem('userEmail') || '';

  useEffect(() => {
    fetchData();
    loadPendingRequests();
  }, []);

  const loadPendingRequests = () => {
    const requests = JSON.parse(localStorage.getItem(`courseRequests_${userEmail}`) || '[]');
    setPendingRequests(new Set(requests.map((r) => r.courseId)));
  };

  const fetchData = async () => {
    try {
      const [coursesRes, tasksRes] = await Promise.all([
        fetch(API_ENDPOINTS.COURSES),
        fetch(API_ENDPOINTS.TASK_ALLOCATIONS),
      ]);

      const allCourses = await coursesRes.json();
      const allTasks = await tasksRes.json();

      const myTasks = allTasks.filter(
        (task) =>
          task.employee_name?.toLowerCase().trim() === userFullName.toLowerCase().trim()
      );

      const assignedTitles = new Set(myTasks.map((t) => t.course_title?.toLowerCase()));
      setMyAssignedTitles(assignedTitles);

      const published = allCourses.filter(
        (c) => c.is_published === true || c.is_published === 1
      );
      setCourses(published);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3500);
  };

  const handleRequest = async (course) => {
    try {
      await fetch(`${API_BASE_URL}/api/course-requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          course_id: course.id,
          course_title: course.course_title,
          employee_email: userEmail,
          employee_name: userFullName,
          requested_at: new Date().toISOString(),
        }),
      });
    } catch {
      // Backend may not have this endpoint yet — request is still saved locally
    }

    const key = `courseRequests_${userEmail}`;
    const existing = JSON.parse(localStorage.getItem(key) || '[]');
    const updated = [
      ...existing.filter((r) => r.courseId !== course.id),
      {
        courseId: course.id,
        courseTitle: course.course_title,
        requestedAt: new Date().toISOString(),
        status: 'pending',
      },
    ];
    localStorage.setItem(key, JSON.stringify(updated));
    setPendingRequests((prev) => new Set([...prev, course.id]));
    showToast(`Request sent for "${course.course_title}". Admin will assign it to you.`);
  };

  const isAssigned = (course) =>
    myAssignedTitles.has(course.course_title?.toLowerCase());

  const getLocalProgress = (courseId) => {
    const data = JSON.parse(localStorage.getItem(`progress_${userEmail}_${courseId}`) || 'null');
    return data?.progress || 0;
  };

  const filtered = courses.filter((c) =>
    c.course_title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.course_category?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', flexDirection: 'column', gap: '16px', color: 'rgba(255,255,255,0.5)' }}>
        <div style={{ width: '36px', height: '36px', border: '3px solid rgba(255,93,93,0.3)', borderTopColor: '#ff5d5d', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <p>Loading courses...</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ padding: '32px', minHeight: '100%', background: '#0e0f14' }}>

      {/* Toast */}
      {toastMsg && (
        <div style={{ position: 'fixed', bottom: '32px', left: '50%', transform: 'translateX(-50%)', background: '#1a1b26', border: '1px solid rgba(76,175,80,0.4)', color: '#fff', padding: '14px 28px', borderRadius: '12px', zIndex: 9999, fontSize: '14px', boxShadow: '0 8px 32px rgba(0,0,0,0.5)', maxWidth: '440px', textAlign: 'center' }}>
          ✅ {toastMsg}
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px' }}>
        <div>
          <p style={{ fontSize: '12px', fontWeight: '700', letterSpacing: '1.5px', color: 'rgba(255,93,93,0.8)', textTransform: 'uppercase', marginBottom: '6px' }}>LMS</p>
          <h1 style={{ fontSize: '26px', fontWeight: '700', color: '#fff', marginBottom: '6px' }}>Available Courses</h1>
          <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.45)' }}>Browse all published courses — request access to enroll</p>
        </div>
        <button className="ghost-btn" onClick={() => navigate('/user/my-courses')}>My Assigned Courses</button>
      </div>

      {/* Search */}
      <div style={{ marginBottom: '28px', position: 'relative', maxWidth: '440px' }}>
        <svg viewBox="0 0 20 20" fill="none" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', width: '16px', height: '16px', color: 'rgba(255,255,255,0.3)', stroke: 'currentColor', strokeWidth: 1.5 }}>
          <circle cx="8.5" cy="8.5" r="5.75" /><path d="M12.5 12.5L16 16" strokeLinecap="round" />
        </svg>
        <input
          type="text"
          placeholder="Search by name or category..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          style={{ width: '100%', padding: '11px 16px 11px 38px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: '#fff', fontSize: '14px', outline: 'none' }}
        />
      </div>

      {/* Stats row */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '28px', flexWrap: 'wrap' }}>
        {[
          { label: 'Total Courses', value: courses.length, color: 'rgba(255,255,255,0.6)' },
          { label: 'Assigned to Me', value: myAssignedTitles.size, color: '#4caf50' },
          { label: 'Requests Pending', value: pendingRequests.size, color: '#ff9800' },
        ].map(s => (
          <div key={s.label} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '10px', padding: '14px 20px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ fontSize: '22px', fontWeight: '700', color: s.color }}>{s.value}</span>
            <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', fontWeight: '600' }}>{s.label}</span>
          </div>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 20px', background: 'rgba(255,255,255,0.02)', borderRadius: '16px', border: '2px dashed rgba(255,255,255,0.08)' }}>
          <div style={{ fontSize: '56px', marginBottom: '16px', opacity: 0.4 }}>🔍</div>
          <h3 style={{ color: '#ccc', marginBottom: '8px' }}>No courses found</h3>
          <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '14px' }}>Try a different search term.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
          {filtered.map((course) => {
            const assigned = isAssigned(course);
            const pending = pendingRequests.has(course.id);
            const statusLabel = assigned ? 'Assigned' : pending ? 'Requested' : 'Available';
            const statusColor = assigned ? '#4caf50' : pending ? '#ff9800' : 'rgba(255,255,255,0.4)';

            return (
              <div
                key={course.id}
                style={{
                  background: 'linear-gradient(160deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)',
                  border: `1px solid ${assigned ? 'rgba(76,175,80,0.2)' : pending ? 'rgba(255,152,0,0.2)' : 'rgba(255,255,255,0.08)'}`,
                  borderRadius: '16px',
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '14px',
                  transition: 'all 0.22s ease',
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 14px 35px rgba(0,0,0,0.35)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}
              >
                {/* Top */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: 'rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', fontSize: '22px' }}>
                    {course.course_thumbnail ? <img src={`${API_BASE_URL}/${course.course_thumbnail}`} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '10px' }} /> : '📚'}
                  </div>
                  <span style={{ fontSize: '11px', fontWeight: '700', padding: '4px 10px', borderRadius: '6px', background: `${statusColor}22`, color: statusColor, border: `1px solid ${statusColor}44` }}>
                    {statusLabel}
                  </span>
                </div>

                {/* Title */}
                <div>
                  <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '4px' }}>{course.course_category || 'General'}</p>
                  <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#fff', lineHeight: '1.3' }}>{course.course_title}</h3>
                </div>

                {/* Description */}
                {course.course_description && (
                  <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.35)', lineHeight: '1.5', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {course.course_description}
                  </p>
                )}

                {/* Meta */}
                <div style={{ display: 'flex', gap: '14px' }}>
                  <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>📚 {course.credit_hours}h</span>
                  {course.standard_name && <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>📋 {course.standard_name}</span>}
                </div>

                {/* Action button */}
                <div style={{ marginTop: 'auto', paddingTop: '4px' }}>
                  {assigned ? (
                    <button
                      onClick={() => navigate('/user/my-courses')}
                      style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid rgba(76,175,80,0.35)', background: 'rgba(76,175,80,0.1)', color: '#4caf50', fontSize: '13px', fontWeight: '700', cursor: 'pointer', transition: 'all 0.18s' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(76,175,80,0.2)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'rgba(76,175,80,0.1)'}
                    >
                      Open My Courses →
                    </button>
                  ) : pending ? (
                    <button disabled style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid rgba(255,152,0,0.2)', background: 'rgba(255,152,0,0.08)', color: 'rgba(255,152,0,0.7)', fontSize: '13px', fontWeight: '700', cursor: 'not-allowed' }}>
                      ⏳ Request Pending
                    </button>
                  ) : (
                    <button
                      onClick={() => handleRequest(course)}
                      style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid rgba(255,93,93,0.35)', background: 'rgba(255,93,93,0.08)', color: '#ff5d5d', fontSize: '13px', fontWeight: '700', cursor: 'pointer', transition: 'all 0.18s' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,93,93,0.18)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,93,93,0.08)'}
                    >
                      Request Access
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AllLmsCourses;
