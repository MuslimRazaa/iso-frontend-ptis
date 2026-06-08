import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_ENDPOINTS, API_BASE_URL } from '../../config/api';

const BASE = '/user/learning-management-system';

const AllLmsCourses = () => {
  const [courses, setCourses]           = useState([]);
  const [myAssignedTitles, setMyAssignedTitles] = useState(new Set());
  const [courseIdMap, setCourseIdMap]   = useState({});   // title (lower) → course.id
  const [pendingRequests, setPendingRequests]   = useState(new Set());
  const [loading, setLoading]           = useState(true);
  const [toastMsg, setToastMsg]         = useState('');
  const [searchQuery, setSearchQuery]   = useState('');
  const navigate = useNavigate();

  const userFullName = localStorage.getItem('userFullName') || '';
  const userEmail    = localStorage.getItem('userEmail')    || '';

  useEffect(() => { fetchData(); loadPendingRequests(); }, []);

  const loadPendingRequests = () => {
    const reqs = JSON.parse(localStorage.getItem(`courseRequests_${userEmail}`) || '[]');
    setPendingRequests(new Set(reqs.map(r => r.courseId)));
  };

  const fetchData = async () => {
    try {
      const [coursesRes, tasksRes] = await Promise.all([
        fetch(API_ENDPOINTS.COURSES),
        fetch(API_ENDPOINTS.TASK_ALLOCATIONS),
      ]);
      const allCourses = await coursesRes.json();
      const allTasks   = await tasksRes.json();

      const myTasks = allTasks.filter(t =>
        t.employee_name?.toLowerCase().trim() === userFullName.toLowerCase().trim()
      );
      const assignedTitles = new Set(myTasks.map(t => t.course_title?.toLowerCase()));
      setMyAssignedTitles(assignedTitles);

      // Map title → id for direct navigation
      const idMap = {};
      allCourses.forEach(c => { idMap[c.course_title?.toLowerCase()] = c.id; });
      setCourseIdMap(idMap);

      setCourses(allCourses.filter(c => c.is_published === true || c.is_published === 1));
    } catch (e) {
      console.error('Error fetching data:', e);
    } finally {
      setLoading(false);
    }
  };

  const showToast = (msg) => { setToastMsg(msg); setTimeout(() => setToastMsg(''), 3500); };

  const handleRequest = async (course) => {
    try {
      await fetch(`${API_BASE_URL}/api/course-requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          course_id: course.id, course_title: course.course_title,
          employee_email: userEmail, employee_name: userFullName,
          requested_at: new Date().toISOString(),
        }),
      });
    } catch { /* saved locally anyway */ }

    const key      = `courseRequests_${userEmail}`;
    const existing = JSON.parse(localStorage.getItem(key) || '[]');
    localStorage.setItem(key, JSON.stringify([
      ...existing.filter(r => r.courseId !== course.id),
      { courseId: course.id, courseTitle: course.course_title, requestedAt: new Date().toISOString(), status: 'pending' },
    ]));
    setPendingRequests(prev => new Set([...prev, course.id]));
    showToast(`Request sent for "${course.course_title}". Admin will assign it to you.`);
  };

  const isAssigned = (course) => myAssignedTitles.has(course.course_title?.toLowerCase());

  const filtered = courses.filter(c =>
    c.course_title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.course_category?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'60vh', flexDirection:'column', gap:16 }}>
      <div style={{ width:36, height:36, border:'3px solid #f0e0e3', borderTopColor:'#d7263d', borderRadius:'50%', animation:'spin 0.8s linear infinite' }} />
      <p style={{ color:'#7a7a8c', fontSize:14 }}>Loading courses…</p>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return (
    <div style={{ padding:32, minHeight:'100%' }}>

      {/* Toast */}
      {toastMsg && (
        <div style={{ position:'fixed', bottom:32, left:'50%', transform:'translateX(-50%)',
          background:'#fff', border:'1px solid #c3ecd4', color:'#1d814c',
          padding:'14px 28px', borderRadius:12, zIndex:9999, fontSize:14,
          fontWeight:600, boxShadow:'0 8px 32px rgba(0,0,0,0.12)', maxWidth:440, textAlign:'center' }}>
          ✅ {toastMsg}
        </div>
      )}

      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:28, flexWrap:'wrap', gap:16 }}>
        <div>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
            <span style={{ width:4, height:20, borderRadius:4, background:'#d7263d', flexShrink:0 }} />
            <span style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.18em', color:'#d7263d' }}>Course Library</span>
          </div>
          <h1 style={{ fontSize:26, fontWeight:800, color:'#1f1f27', margin:'0 0 6px' }}>Browse Courses</h1>
          <p style={{ fontSize:14, color:'#7a7a8c', margin:0 }}>All published courses — request access or open assigned ones.</p>
        </div>
        <button className="ghost-btn" onClick={() => navigate(`${BASE}/my-courses`)}>My Assigned Courses</button>
      </div>

      {/* Stats */}
      <div style={{ display:'flex', gap:16, marginBottom:28, flexWrap:'wrap' }}>
        {[
          { label:'Total Courses',    value: courses.length,           accent:'#595966' },
          { label:'Assigned to Me',   value: myAssignedTitles.size,    accent:'#1d814c' },
          { label:'Requests Pending', value: pendingRequests.size,     accent:'#c87e1c' },
        ].map(s => (
          <div key={s.label} style={{ background:'#fff', border:`1px solid ${s.accent}22`,
            borderRadius:12, padding:'14px 20px', boxShadow:`0 2px 8px ${s.accent}10` }}>
            <div style={{ fontSize:24, fontWeight:800, color:s.accent }}>{s.value}</div>
            <div style={{ fontSize:11, color:'#7a7a8c', fontWeight:600, marginTop:2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div style={{ marginBottom:28, position:'relative', maxWidth:440 }}>
        <span style={{ position:'absolute', left:14, top:'50%', transform:'translateY(-50%)', fontSize:15, color:'#b0b0c0', pointerEvents:'none' }}>🔍</span>
        <input
          type="text"
          placeholder="Search by name or category…"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          style={{ width:'100%', padding:'11px 16px 11px 40px', background:'#fff',
            border:'1px solid #e0e0e6', borderRadius:10, color:'#1f1f27',
            fontSize:14, outline:'none', boxSizing:'border-box' }}
        />
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div style={{ textAlign:'center', padding:'80px 20px', background:'#fafafa', borderRadius:16, border:'2px dashed #e0e0e6' }}>
          <div style={{ fontSize:56, marginBottom:16 }}>🔍</div>
          <h3 style={{ color:'#1f1f27', marginBottom:8 }}>No courses found</h3>
          <p style={{ color:'#7a7a8c', fontSize:14 }}>Try a different search term.</p>
        </div>
      ) : (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(300px,1fr))', gap:20 }}>
          {filtered.map(course => {
            const assigned    = isAssigned(course);
            const pending     = pendingRequests.has(course.id);
            const statusLabel = assigned ? 'Assigned' : pending ? 'Requested' : 'Available';
            const statusColor = assigned ? '#1d814c' : pending ? '#c87e1c' : '#7a7a8c';
            const courseId    = courseIdMap[course.course_title?.toLowerCase()];

            return (
              <div key={course.id} style={{
                background:'#fff', border:`1px solid ${assigned ? '#c3ecd4' : pending ? '#ffe4c4' : '#e8e8ee'}`,
                borderRadius:16, padding:22, display:'flex', flexDirection:'column', gap:14,
                transition:'all 0.22s ease', boxShadow:'0 2px 8px rgba(0,0,0,0.04)',
              }}
                onMouseEnter={e => { e.currentTarget.style.transform='translateY(-3px)'; e.currentTarget.style.boxShadow='0 12px 28px rgba(0,0,0,0.09)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform=''; e.currentTarget.style.boxShadow='0 2px 8px rgba(0,0,0,0.04)'; }}
              >
                {/* Top */}
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <div style={{ width:44, height:44, borderRadius:10, background:'#f4f4f7',
                    display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, overflow:'hidden', flexShrink:0 }}>
                    {course.course_thumbnail
                      ? <img src={`${API_BASE_URL}/${course.course_thumbnail}`} alt="" style={{ width:'100%', height:'100%', objectFit:'cover', borderRadius:10 }} />
                      : '📚'}
                  </div>
                  <span style={{ fontSize:11, fontWeight:700, padding:'4px 10px', borderRadius:6,
                    background:`${statusColor}15`, color:statusColor, border:`1px solid ${statusColor}44` }}>
                    {statusLabel}
                  </span>
                </div>

                {/* Title */}
                <div>
                  <p style={{ fontSize:11, color:'#b0b0c0', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.8px', margin:'0 0 4px' }}>
                    {course.course_category || 'General'}
                  </p>
                  <h3 style={{ fontSize:15, fontWeight:700, color:'#1f1f27', lineHeight:1.35, margin:0 }}>{course.course_title}</h3>
                </div>

                {/* Description */}
                {course.course_description && (
                  <p style={{ fontSize:13, color:'#7a7a8c', lineHeight:1.5, margin:0,
                    display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' }}>
                    {course.course_description}
                  </p>
                )}

                {/* Meta */}
                <div style={{ display:'flex', gap:14 }}>
                  {course.credit_hours && <span style={{ fontSize:12, color:'#7a7a8c' }}>📚 {course.credit_hours}h</span>}
                  {course.standard_name && <span style={{ fontSize:12, color:'#7a7a8c' }}>📋 {course.standard_name}</span>}
                </div>

                {/* Action button */}
                <div style={{ marginTop:'auto', paddingTop:4 }}>
                  {assigned && courseId ? (
                    <button
                      onClick={() => navigate(`${BASE}/course/${courseId}`)}
                      style={{ width:'100%', padding:'10px', borderRadius:8,
                        border:'1px solid #c3ecd4', background:'#e8fff3',
                        color:'#1d814c', fontSize:13, fontWeight:700, cursor:'pointer', transition:'all 0.18s' }}
                      onMouseEnter={e => e.currentTarget.style.background='#d4f8e3'}
                      onMouseLeave={e => e.currentTarget.style.background='#e8fff3'}
                    >
                      Open Course →
                    </button>
                  ) : pending ? (
                    <button disabled style={{ width:'100%', padding:'10px', borderRadius:8,
                      border:'1px solid #ffe4c4', background:'#fff8ef',
                      color:'#c87e1c', fontSize:13, fontWeight:700, cursor:'not-allowed' }}>
                      ⏳ Request Pending
                    </button>
                  ) : (
                    <button
                      onClick={() => handleRequest(course)}
                      style={{ width:'100%', padding:'10px', borderRadius:8,
                        border:'1px solid #ffd1d8', background:'#fff5f6',
                        color:'#d7263d', fontSize:13, fontWeight:700, cursor:'pointer', transition:'all 0.18s' }}
                      onMouseEnter={e => e.currentTarget.style.background='#ffe8ea'}
                      onMouseLeave={e => e.currentTarget.style.background='#fff5f6'}
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
