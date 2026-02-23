import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_ENDPOINTS } from '../../config/api';

const MyCourses = () => {
  const [assignedCourses, setAssignedCourses] = useState([]);
  const [filter, setFilter] = useState('all'); // all, in-progress, completed
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchAssignedCourses();
  }, []);

  const fetchAssignedCourses = async () => {
    try {
      // Mock data - in real app, fetch based on user email/ID
      const mockCourses = [
        {
          id: 1,
          title: 'ISO 17020 Training',
          thumbnail: 'https://via.placeholder.com/300x180',
          category: 'Safety & Compliance',
          progress: 100,
          status: 'completed',
          deadline: '2024-02-01',
          creditHours: 40
        },
        {
          id: 2,
          title: 'Quality Control Basics',
          thumbnail: 'https://via.placeholder.com/300x180',
          category: 'Quality Management',
          progress: 60,
          status: 'in-progress',
          deadline: '2024-02-20',
          creditHours: 30
        },
        {
          id: 3,
          title: 'Safety Standards 2024',
          thumbnail: 'https://via.placeholder.com/300x180',
          category: 'Safety & Compliance',
          progress: 100,
          status: 'completed',
          deadline: '2024-01-15',
          creditHours: 25
        },
        {
          id: 4,
          title: 'Inspection Procedures',
          thumbnail: 'https://via.placeholder.com/300x180',
          category: 'Technical Skills',
          progress: 30,
          status: 'in-progress',
          deadline: '2024-03-01',
          creditHours: 50
        },
        {
          id: 5,
          title: 'Tubular Inspection Methods',
          thumbnail: 'https://via.placeholder.com/300x180',
          category: 'Technical Skills',
          progress: 0,
          status: 'not-started',
          deadline: '2024-03-15',
          creditHours: 60
        }
      ];
      
      setAssignedCourses(mockCourses);
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
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading your courses...</p>
      </div>
    );
  }

  return (
    <div className="all-courses-page">
      <div className="page-header">
        <div>
          <h1>My Assigned Courses</h1>
          <p>Courses assigned to you by your administrator</p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="course-filters">
        <button 
          className={filter === 'all' ? 'filter-btn active' : 'filter-btn'}
          onClick={() => setFilter('all')}
        >
          All Courses ({assignedCourses.length})
        </button>
        <button 
          className={filter === 'in-progress' ? 'filter-btn active' : 'filter-btn'}
          onClick={() => setFilter('in-progress')}
        >
          In Progress ({assignedCourses.filter(c => c.status === 'in-progress').length})
        </button>
        <button 
          className={filter === 'completed' ? 'filter-btn active' : 'filter-btn'}
          onClick={() => setFilter('completed')}
        >
          Completed ({assignedCourses.filter(c => c.status === 'completed').length})
        </button>
        <button 
          className={filter === 'not-started' ? 'filter-btn active' : 'filter-btn'}
          onClick={() => setFilter('not-started')}
        >
          Not Started ({assignedCourses.filter(c => c.status === 'not-started').length})
        </button>
      </div>

      {/* Courses Grid */}
      {filteredCourses.length === 0 ? (
        <div className="no-courses">
          <div className="no-courses-icon">📚</div>
          <h3>No courses found</h3>
          <p>Try changing the filter or wait for new course assignments</p>
        </div>
      ) : (
        <div className="courses-grid">
          {filteredCourses.map((course) => (
            <div key={course.id} className="course-card" onClick={() => handleCourseClick(course.id)}>
              <div className="course-thumbnail">
                <img src={course.thumbnail} alt={course.title} />
                <span 
                  className="course-status-badge" 
                  style={{ backgroundColor: getStatusColor(course.status) }}
                >
                  {getStatusLabel(course.status)}
                </span>
              </div>
              
              <div className="course-content">
                <span className="course-category">{course.category}</span>
                <h3 className="course-title">{course.title}</h3>
                
                <div className="course-meta">
                  <span>⏱️ {course.creditHours}h</span>
                  <span>📅 Due: {new Date(course.deadline).toLocaleDateString()}</span>
                </div>

                {/* Progress Bar */}
                <div className="course-progress">
                  <div className="progress-bar-container">
                    <div 
                      className="progress-bar-fill" 
                      style={{ 
                        width: `${course.progress}%`,
                        backgroundColor: getStatusColor(course.status)
                      }}
                    ></div>
                  </div>
                  <span className="progress-text">{course.progress}% Complete</span>
                </div>

                <button className="course-action-btn">
                  {course.status === 'completed' ? 'Review Course' : 
                   course.status === 'in-progress' ? 'Continue Learning' : 
                   'Start Course'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyCourses;
