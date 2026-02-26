import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const TaskAllocations = () => {
  const [tasks, setTasks] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      // Mock data - In real app, fetch from backend
      const mockTasks = [
        {
          id: 1,
          title: "Complete ISO 17020 Training Module",
          description: "Complete all lessons and pass the final assessment for ISO 17020 certification training",
          course: "ISO 17020 Certification",
          dueDate: "2026-03-15",
          priority: "high",
          status: "in-progress",
          progress: 65,
          assignedBy: "John Smith",
          assignedDate: "2026-02-01"
        },
        {
          id: 2,
          title: "Review Safety Standards 2024",
          description: "Study and review the latest safety standards and protocols for workplace safety",
          course: "Safety Standards 2024",
          dueDate: "2026-03-20",
          priority: "medium",
          status: "pending",
          progress: 0,
          assignedBy: "Sarah Johnson",
          assignedDate: "2026-02-15"
        },
        {
          id: 3,
          title: "Quality Control Assessment",
          description: "Complete the quality control fundamentals assessment and submit the assignment",
          course: "Quality Control Fundamentals",
          dueDate: "2026-03-10",
          priority: "high",
          status: "in-progress",
          progress: 45,
          assignedBy: "Mike Anderson",
          assignedDate: "2026-02-10"
        },
        {
          id: 4,
          title: "Update Inspection Checklist",
          description: "Review and update the standard inspection checklist based on new guidelines",
          course: null,
          dueDate: "2026-03-05",
          priority: "low",
          status: "completed",
          progress: 100,
          assignedBy: "Emily Davis",
          assignedDate: "2026-02-01"
        },
        {
          id: 5,
          title: "Attend Virtual Workshop",
          description: "Participate in the virtual workshop on advanced inspection techniques",
          course: null,
          dueDate: "2026-03-18",
          priority: "medium",
          status: "pending",
          progress: 0,
          assignedBy: "John Smith",
          assignedDate: "2026-02-20"
        }
      ];
      setTasks(mockTasks);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      setLoading(false);
    }
  };

  const filteredTasks = tasks.filter(task => {
    if (filter === 'all') return true;
    return task.status === filter;
  });

  const getPriorityColor = (priority) => {
    switch(priority) {
      case 'high': return '#f44336';
      case 'medium': return '#ff9800';
      case 'low': return '#4caf50';
      default: return '#9e9e9e';
    }
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'completed': return '#4caf50';
      case 'in-progress': return '#2196f3';
      case 'pending': return '#ff9800';
      default: return '#9e9e9e';
    }
  };

  const getStatusLabel = (status) => {
    switch(status) {
      case 'completed': return 'Completed';
      case 'in-progress': return 'In Progress';
      case 'pending': return 'Pending';
      default: return 'Unknown';
    }
  };

  const getDaysRemaining = (dueDate) => {
    const today = new Date();
    const due = new Date(dueDate);
    const diffTime = due - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  if (loading) {
    return (
      <div className="lms-home" style={{ textAlign: 'center' }}>
        <div style={{ 
          display: 'inline-block', 
          width: '40px', 
          height: '40px', 
          border: '4px solid #f3f3f3', 
          borderTop: '4px solid #667eea', 
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }}></div>
        <p style={{ marginTop: '1rem', color: '#6c757d' }}>Loading tasks...</p>
      </div>
    );
  }

  return (
    <div className="lms-home">
      {/* Header */}
      <header style={{
        background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
        borderRadius: '20px',
        padding: '2.5rem',
        color: '#fff',
        boxShadow: '0 10px 40px rgba(79, 172, 254, 0.3)',
        marginBottom: '2.5rem'
      }}>
        <p style={{
          opacity: 0.95,
          fontSize: '0.8rem',
          fontWeight: '700',
          textTransform: 'uppercase',
          letterSpacing: '1.5px',
          marginBottom: '0.75rem'
        }}>
          ✅ Task Management
        </p>
        <h2 style={{
          fontSize: '2.25rem',
          fontWeight: '800',
          marginBottom: '0.75rem',
          textShadow: '0 2px 10px rgba(0,0,0,0.1)'
        }}>
          My Task Allocations
        </h2>
        <p style={{
          fontSize: '1rem',
          opacity: 0.95,
          maxWidth: '600px'
        }}>
          Track and manage your assigned tasks, courses, and deadlines
        </p>
      </header>

      {/* Statistics Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '1.5rem',
        marginBottom: '2.5rem'
      }}>
        {[
          { label: 'Total Tasks', value: tasks.length, color: '#667eea', emoji: '📋' },
          { label: 'In Progress', value: tasks.filter(t => t.status === 'in-progress').length, color: '#2196f3', emoji: '⏳' },
          { label: 'Completed', value: tasks.filter(t => t.status === 'completed').length, color: '#4caf50', emoji: '✅' },
          { label: 'Pending', value: tasks.filter(t => t.status === 'pending').length, color: '#ff9800', emoji: '⏰' }
        ].map((stat, index) => (
          <div
            key={index}
            style={{
              background: '#fff',
              borderRadius: '16px',
              padding: '1.75rem',
              boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
              border: '1px solid rgba(0,0,0,0.06)',
              transition: 'all 0.3s ease',
              cursor: 'pointer'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-5px)';
              e.currentTarget.style.boxShadow = '0 12px 35px rgba(0,0,0,0.12)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.08)';
            }}
          >
            <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>{stat.emoji}</div>
            <p style={{
              fontSize: '0.85rem',
              color: '#6c757d',
              fontWeight: '600',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              marginBottom: '0.5rem'
            }}>
              {stat.label}
            </p>
            <h3 style={{
              fontSize: '2.25rem',
              fontWeight: '700',
              color: stat.color,
              margin: 0
            }}>
              {stat.value}
            </h3>
          </div>
        ))}
      </div>

      {/* Filter Buttons */}
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
          { key: 'all', label: 'All Tasks', emoji: '📋' },
          { key: 'pending', label: 'Pending', emoji: '⏰' },
          { key: 'in-progress', label: 'In Progress', emoji: '⏳' },
          { key: 'completed', label: 'Completed', emoji: '✅' }
        ].map(btn => (
          <button
            key={btn.key}
            onClick={() => setFilter(btn.key)}
            style={{
              padding: '12px 24px',
              border: 'none',
              background: filter === btn.key
                ? 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)'
                : '#f8f9fa',
              color: filter === btn.key ? '#fff' : '#495057',
              borderRadius: '12px',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '0.9rem',
              transition: 'all 0.3s ease',
              boxShadow: filter === btn.key ? '0 4px 15px rgba(79, 172, 254, 0.3)' : 'none',
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
          </button>
        ))}
      </div>

      {/* Tasks List */}
      {filteredTasks.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '5rem 2rem',
          background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
          borderRadius: '20px',
          border: '2px dashed rgba(0,0,0,0.1)',
          boxShadow: '0 4px 20px rgba(0,0,0,0.06)'
        }}>
          <div style={{ fontSize: '5rem', marginBottom: '1.5rem' }}>📋</div>
          <h3 style={{
            marginBottom: '0.75rem',
            color: '#2c3e50',
            fontSize: '1.75rem',
            fontWeight: '700'
          }}>
            No tasks found
          </h3>
          <p style={{ color: '#6c757d', fontSize: '1.05rem' }}>
            Try changing the filter or check back later for new assignments
          </p>
        </div>
      ) : (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '1.5rem'
        }}>
          {filteredTasks.map((task) => {
            const daysRemaining = getDaysRemaining(task.dueDate);
            const isOverdue = daysRemaining < 0;
            const isDueSoon = daysRemaining >= 0 && daysRemaining <= 3;

            return (
              <article
                key={task.id}
                style={{
                  background: '#fff',
                  borderRadius: '20px',
                  padding: '2rem',
                  boxShadow: '0 6px 25px rgba(0,0,0,0.08)',
                  border: '1px solid rgba(0,0,0,0.06)',
                  transition: 'all 0.3s ease',
                  cursor: 'pointer',
                  position: 'relative',
                  overflow: 'hidden'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateX(5px)';
                  e.currentTarget.style.boxShadow = '0 10px 35px rgba(0,0,0,0.12)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateX(0)';
                  e.currentTarget.style.boxShadow = '0 6px 25px rgba(0,0,0,0.08)';
                }}
              >
                {/* Priority Bar */}
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '5px',
                  height: '100%',
                  background: getPriorityColor(task.priority)
                }}></div>

                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  gap: '2rem',
                  flexWrap: 'wrap'
                }}>
                  {/* Task Content */}
                  <div style={{ flex: 1, minWidth: '300px' }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '1rem',
                      marginBottom: '1rem'
                    }}>
                      <span style={{
                        padding: '6px 14px',
                        borderRadius: '20px',
                        fontSize: '0.75rem',
                        fontWeight: '700',
                        background: getStatusColor(task.status),
                        color: '#fff',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                      }}>
                        {getStatusLabel(task.status)}
                      </span>
                      <span style={{
                        padding: '6px 14px',
                        borderRadius: '20px',
                        fontSize: '0.75rem',
                        fontWeight: '700',
                        background: `${getPriorityColor(task.priority)}20`,
                        color: getPriorityColor(task.priority),
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                      }}>
                        {task.priority} Priority
                      </span>
                    </div>

                    <h3 style={{
                      fontSize: '1.35rem',
                      fontWeight: '700',
                      color: '#2c3e50',
                      marginBottom: '0.75rem'
                    }}>
                      {task.title}
                    </h3>

                    <p style={{
                      fontSize: '0.95rem',
                      color: '#6c757d',
                      lineHeight: '1.6',
                      marginBottom: '1.25rem'
                    }}>
                      {task.description}
                    </p>

                    {task.course && (
                      <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '8px 16px',
                        background: '#f8f9fa',
                        borderRadius: '12px',
                        marginBottom: '1rem'
                      }}>
                        <span style={{ fontSize: '1rem' }}>📚</span>
                        <span style={{
                          fontSize: '0.85rem',
                          color: '#495057',
                          fontWeight: '600'
                        }}>
                          {task.course}
                        </span>
                      </div>
                    )}

                    {/* Progress Bar */}
                    {task.progress > 0 && (
                      <div style={{ marginTop: '1rem' }}>
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
                            color: getStatusColor(task.status),
                            fontWeight: '700'
                          }}>
                            {task.progress}%
                          </span>
                        </div>
                        <div style={{
                          width: '100%',
                          height: '8px',
                          background: '#f0f0f0',
                          borderRadius: '10px',
                          overflow: 'hidden'
                        }}>
                          <div style={{
                            width: `${task.progress}%`,
                            height: '100%',
                            background: `linear-gradient(90deg, ${getStatusColor(task.status)} 0%, ${getStatusColor(task.status)}dd 100%)`,
                            borderRadius: '10px',
                            transition: 'width 0.5s ease'
                          }} />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Task Meta Info */}
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1rem',
                    minWidth: '200px'
                  }}>
                    <div style={{
                      padding: '1.25rem',
                      background: isOverdue ? '#ffebee' : isDueSoon ? '#fff3e0' : '#f8f9fa',
                      borderRadius: '12px',
                      textAlign: 'center'
                    }}>
                      <div style={{
                        fontSize: '0.75rem',
                        color: '#6c757d',
                        fontWeight: '600',
                        textTransform: 'uppercase',
                        letterSpacing: '1px',
                        marginBottom: '0.5rem'
                      }}>
                        Due Date
                      </div>
                      <div style={{
                        fontSize: '1.1rem',
                        fontWeight: '700',
                        color: isOverdue ? '#f44336' : isDueSoon ? '#ff9800' : '#2c3e50',
                        marginBottom: '0.25rem'
                      }}>
                        {new Date(task.dueDate).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </div>
                      <div style={{
                        fontSize: '0.8rem',
                        color: isOverdue ? '#f44336' : isDueSoon ? '#ff9800' : '#6c757d',
                        fontWeight: '600'
                      }}>
                        {isOverdue
                          ? `${Math.abs(daysRemaining)} days overdue`
                          : daysRemaining === 0
                          ? 'Due today!'
                          : `${daysRemaining} days left`
                        }
                      </div>
                    </div>

                    <div style={{
                      padding: '1rem',
                      background: '#f8f9fa',
                      borderRadius: '12px',
                      fontSize: '0.85rem'
                    }}>
                      <div style={{
                        color: '#6c757d',
                        marginBottom: '0.5rem'
                      }}>
                        Assigned by:
                      </div>
                      <div style={{
                        fontWeight: '700',
                        color: '#2c3e50'
                      }}>
                        {task.assignedBy}
                      </div>
                    </div>

                    {task.status !== 'completed' && task.course && (
                      <Link
                        to={`/user/my-courses`}
                        style={{
                          textDecoration: 'none',
                          padding: '12px',
                          background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                          color: '#fff',
                          borderRadius: '12px',
                          fontWeight: '700',
                          fontSize: '0.9rem',
                          textAlign: 'center',
                          boxShadow: '0 4px 15px rgba(79, 172, 254, 0.3)',
                          transition: 'all 0.3s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.transform = 'translateY(-2px)';
                          e.target.style.boxShadow = '0 6px 20px rgba(79, 172, 254, 0.4)';
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.transform = 'translateY(0)';
                          e.target.style.boxShadow = '0 4px 15px rgba(79, 172, 254, 0.3)';
                        }}
                      >
                        Start Task →
                      </Link>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default TaskAllocations;
