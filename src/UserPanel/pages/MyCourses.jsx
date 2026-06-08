import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_ENDPOINTS, API_BASE_URL } from '../../config/api';

const BASE = '/user/learning-management-system';

const MyCourses = () => {
  const [assignedCourses, setAssignedCourses] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [startModal, setStartModal] = useState({ show: false, course: null });
  const navigate = useNavigate();

  const userFullName = localStorage.getItem('userFullName') || '';
  const userEmail    = localStorage.getItem('userEmail')    || '';

  useEffect(() => { fetchAssignedCourses(); }, []);

  const fetchAssignedCourses = async () => {
    try {
      const [tasksRes, coursesRes, progressRes] = await Promise.all([
        fetch(API_ENDPOINTS.TASK_ALLOCATIONS),
        fetch(API_ENDPOINTS.COURSES),
        fetch(`${API_ENDPOINTS.COURSE_PROGRESS}/user/${encodeURIComponent(userEmail)}`).catch(() => null),
      ]);
      const allTasks   = await tasksRes.json();
      const allCourses = await coursesRes.json();
      const progressList = progressRes?.ok ? (await progressRes.json()).data || [] : [];

      const myTasks = allTasks.filter(t =>
        t.employee_name && userFullName &&
        t.employee_name.toLowerCase().trim() === userFullName.toLowerCase().trim()
      );

      const enriched = myTasks.map((task) => {
        const matched    = allCourses.find(c => c.course_title?.toLowerCase() === task.course_title?.toLowerCase());
        const courseId   = matched?.id;
        const apiProgress = progressList.find(p => p.course_id === courseId);
        return {
          ...task,
          courseId,
          thumbnail:     matched?.course_thumbnail ? `${API_BASE_URL}/${matched.course_thumbnail}` : null,
          category:      matched?.course_category || 'Training',
          creditHours:   matched?.credit_hours || task.total_hours || 0,
          videoSeconds:  apiProgress?.video_watch_time || 0,
          pptSeconds:    apiProgress?.ppt_view_time    || 0,
          isStarted:     !!apiProgress,
          localProgress: apiProgress?.progress_percentage || task.progress || 0,
        };
      });
      setAssignedCourses(enriched);
    } catch (e) {
      console.error('Error fetching courses:', e);
    } finally {
      setLoading(false);
    }
  };

  const getStatusLabel = (c) => {
    if (c.localProgress >= 100 || c.status === 'Completed') return 'Completed';
    if (c.isStarted) return 'In Progress';
    return 'Not Started';
  };
  const getStatusColor = (c) => {
    const l = getStatusLabel(c);
    if (l === 'Completed')  return '#1d814c';
    if (l === 'In Progress') return '#c87e1c';
    return '#7a7a8c';
  };

  const filteredCourses = assignedCourses.filter(c => {
    if (filter === 'completed')  return c.localProgress >= 100 || c.status === 'Completed';
    if (filter === 'in-progress') return c.isStarted && c.localProgress < 100;
    if (filter === 'not-started') return !c.isStarted;
    return true;
  });

  const handleCourseClick = (course) => {
    if (!course.courseId) { alert('Course details not available. Please contact your administrator.'); return; }
    if (!course.isStarted) { setStartModal({ show: true, course }); }
    else { navigate(`${BASE}/course/${course.courseId}`); }
  };

  const handleStartCourse = async () => {
    const course = startModal.course;
    if (!course?.courseId) return;
    try {
      await fetch(API_ENDPOINTS.COURSE_PROGRESS, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_email: userEmail, course_id: course.courseId, action: 'enroll' }),
      });
    } catch { /* proceed anyway */ }
    setStartModal({ show: false, course: null });
    navigate(`${BASE}/course/${course.courseId}`);
  };

  const fmt = (s) => {
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'60vh', flexDirection:'column', gap:16 }}>
      <div style={{ width:36, height:36, border:'3px solid #f0e0e3', borderTopColor:'#d7263d', borderRadius:'50%', animation:'spin 0.8s linear infinite' }} />
      <p style={{ color:'#7a7a8c', fontSize:14 }}>Loading your courses…</p>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  const filters = [
    { key:'all',         label:'All',         count: assignedCourses.length },
    { key:'not-started', label:'Not Started',  count: assignedCourses.filter(c => !c.isStarted).length },
    { key:'in-progress', label:'In Progress',  count: assignedCourses.filter(c => c.isStarted && c.localProgress < 100).length },
    { key:'completed',   label:'Completed',    count: assignedCourses.filter(c => c.localProgress >= 100 || c.status === 'Completed').length },
  ];

  return (
    <div style={{ padding:32, minHeight:'100%' }}>

      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:28, flexWrap:'wrap', gap:16 }}>
        <div>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
            <span style={{ width:4, height:20, borderRadius:4, background:'#d7263d', flexShrink:0 }} />
            <span style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.18em', color:'#d7263d' }}>My Training</span>
          </div>
          <h1 style={{ fontSize:26, fontWeight:800, color:'#1f1f27', margin:'0 0 6px' }}>My Assigned Courses</h1>
          <p style={{ fontSize:14, color:'#7a7a8c', margin:0 }}>Track your progress on assigned training courses.</p>
        </div>
        <button className="ghost-btn" onClick={() => navigate(`${BASE}/all-courses`)}>Browse All Courses</button>
      </div>

      {/* Filter tabs */}
      <div style={{ display:'flex', gap:8, marginBottom:28, flexWrap:'wrap' }}>
        {filters.map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)} style={{
            padding:'8px 18px', borderRadius:10,
            border: filter === f.key ? '1px solid #d7263d' : '1px solid #e0e0e6',
            background: filter === f.key ? '#fff0f2' : '#fff',
            color: filter === f.key ? '#d7263d' : '#595966',
            fontSize:13, fontWeight:600, cursor:'pointer', transition:'all 0.18s',
          }}>
            {f.label} <span style={{ opacity:0.6, marginLeft:4 }}>({f.count})</span>
          </button>
        ))}
      </div>

      {/* Empty */}
      {filteredCourses.length === 0 ? (
        <div style={{ textAlign:'center', padding:'80px 20px', background:'#fafafa', borderRadius:16, border:'2px dashed #e0e0e6' }}>
          <div style={{ fontSize:56, marginBottom:16 }}>📚</div>
          <h3 style={{ color:'#1f1f27', marginBottom:8 }}>
            {assignedCourses.length === 0 ? 'No courses assigned yet' : 'No courses in this category'}
          </h3>
          <p style={{ color:'#7a7a8c', fontSize:14 }}>
            {assignedCourses.length === 0 ? 'Browse available courses and request access.' : 'Try a different filter.'}
          </p>
          {assignedCourses.length === 0 && (
            <button className="primary-btn" style={{ marginTop:20 }} onClick={() => navigate(`${BASE}/all-courses`)}>
              Browse All Courses
            </button>
          )}
        </div>
      ) : (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(300px,1fr))', gap:20 }}>
          {filteredCourses.map(course => {
            const statusLabel = getStatusLabel(course);
            const statusClr   = getStatusColor(course);
            return (
              <div key={course.id} onClick={() => handleCourseClick(course)} style={{
                background:'#fff', border:`1px solid #e8e8ee`,
                borderRadius:16, padding:22, cursor:'pointer',
                transition:'all 0.22s ease', display:'flex', flexDirection:'column', gap:14,
                boxShadow:'0 2px 8px rgba(0,0,0,0.04)',
              }}
                onMouseEnter={e => { e.currentTarget.style.transform='translateY(-4px)'; e.currentTarget.style.boxShadow='0 12px 32px rgba(0,0,0,0.1)'; e.currentTarget.style.borderColor='#d7263d44'; }}
                onMouseLeave={e => { e.currentTarget.style.transform=''; e.currentTarget.style.boxShadow='0 2px 8px rgba(0,0,0,0.04)'; e.currentTarget.style.borderColor='#e8e8ee'; }}
              >
                {/* Top */}
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <div style={{ width:44, height:44, borderRadius:10, background:'#f4f4f7', display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, overflow:'hidden', flexShrink:0 }}>
                    {course.thumbnail ? <img src={course.thumbnail} alt="" style={{ width:'100%', height:'100%', objectFit:'cover', borderRadius:10 }} /> : '📚'}
                  </div>
                  <span style={{ fontSize:11, fontWeight:700, padding:'4px 10px', borderRadius:6,
                    background:`${statusClr}15`, color:statusClr, border:`1px solid ${statusClr}44` }}>
                    {statusLabel}
                  </span>
                </div>

                {/* Title */}
                <div>
                  <p style={{ fontSize:11, color:'#b0b0c0', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.8px', margin:'0 0 4px' }}>{course.category}</p>
                  <h3 style={{ fontSize:15, fontWeight:700, color:'#1f1f27', lineHeight:1.35, margin:0 }}>{course.course_title}</h3>
                </div>

                {/* Meta */}
                <div style={{ display:'flex', gap:16 }}>
                  <span style={{ fontSize:12, color:'#7a7a8c' }}>📚 {course.creditHours}h</span>
                  {course.deadline && <span style={{ fontSize:12, color:'#7a7a8c' }}>📅 {new Date(course.deadline).toLocaleDateString()}</span>}
                </div>

                {/* Time tracked */}
                {course.isStarted && (
                  <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                    <span style={{ fontSize:11, background:'#f4f4f7', padding:'3px 8px', borderRadius:5, color:'#595966' }}>🎥 {fmt(course.videoSeconds)}</span>
                    <span style={{ fontSize:11, background:'#f4f4f7', padding:'3px 8px', borderRadius:5, color:'#595966' }}>📄 {fmt(course.pptSeconds)}</span>
                  </div>
                )}

                {/* Progress bar */}
                <div>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
                    <span style={{ fontSize:11, color:'#b0b0c0' }}>Progress</span>
                    <span style={{ fontSize:11, fontWeight:700, color:statusClr }}>{course.localProgress}%</span>
                  </div>
                  <div style={{ height:5, background:'#f0f0f5', borderRadius:3, overflow:'hidden' }}>
                    <div style={{ height:'100%', width:`${course.localProgress}%`, background:statusClr, borderRadius:3, transition:'width 0.4s ease' }} />
                  </div>
                </div>

                {/* CTA */}
                <div style={{ display:'flex', justifyContent:'flex-end', marginTop:4 }}>
                  <span style={{ fontSize:13, fontWeight:700, color:'#d7263d', display:'flex', alignItems:'center', gap:6 }}>
                    {statusLabel === 'Completed' ? 'Review Course' : course.isStarted ? 'Continue Learning' : 'Start Course'} →
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Start Course Modal */}
      {startModal.show && (
        <div className="modal-overlay" onClick={() => setStartModal({ show:false, course:null })}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth:460 }}>
            <div className="modal-header">
              <h2>Ready to Start?</h2>
              <button className="close-modal-btn" onClick={() => setStartModal({ show:false, course:null })}>✕</button>
            </div>
            <div style={{ padding:24 }}>
              <div style={{ textAlign:'center', marginBottom:24 }}>
                <div style={{ fontSize:52, marginBottom:12 }}>🎓</div>
                <h3 style={{ marginBottom:8, fontSize:17, color:'#1f1f27' }}>{startModal.course?.course_title}</h3>
                <p style={{ color:'#7a7a8c', fontSize:13, lineHeight:1.6 }}>
                  Once you start, your progress will be tracked — video watch time and study material
                  time will be visible to your administrator.
                </p>
              </div>
              <div style={{ background:'#f8f8fb', borderRadius:10, padding:16, marginBottom:24, display:'flex', gap:24, justifyContent:'center' }}>
                <div style={{ textAlign:'center' }}>
                  <div style={{ fontSize:20, fontWeight:800, color:'#1f1f27' }}>{startModal.course?.creditHours}h</div>
                  <div style={{ fontSize:12, color:'#7a7a8c' }}>Credit Hours</div>
                </div>
                {startModal.course?.deadline && (
                  <div style={{ textAlign:'center' }}>
                    <div style={{ fontSize:16, fontWeight:700, color:'#1f1f27' }}>{new Date(startModal.course.deadline).toLocaleDateString()}</div>
                    <div style={{ fontSize:12, color:'#7a7a8c' }}>Deadline</div>
                  </div>
                )}
              </div>
              <div className="modal-actions">
                <button className="ghost-btn" onClick={() => setStartModal({ show:false, course:null })}>Not Now</button>
                <button className="primary-btn" onClick={handleStartCourse}>Start Learning →</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyCourses;
