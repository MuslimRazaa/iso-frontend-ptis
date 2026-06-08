import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_ENDPOINTS, API_BASE_URL } from '../../config/api';

const TaskAllocations = () => {
  const [tasks, setTasks] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [testSelectorTaskId, setTestSelectorTaskId] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchTasks();
  }, []);

  const normalizeBaseName = (value) => {
    return (value || '')
      .toString()
      .toLowerCase()
      .replace(/\((general|specific|simple)\)/gi, '')
      .replace(/\b(general|specific|simple)\b/gi, '')
      .replace(/[^a-z0-9]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  };

  async function fetchTasks() {
    try {
      setLoading(true);
      setError(null);
      
      const userEmail = localStorage.getItem('userEmail');
      if (!userEmail) {
        setError('User not logged in');
        setLoading(false);
        return;
      }

      // Get all employees to find user's employee ID
      const employeesResponse = await fetch(API_ENDPOINTS.EMPLOYEES);
      const employeesData = await employeesResponse.json();
      
      const currentEmployee = employeesData.find(emp => emp.email === userEmail);
      
      if (!currentEmployee) {
        setError('Employee profile not found');
        setLoading(false);
        return;
      }

      // Fetch task allocations for this employee
      const tasksResponse = await fetch(`${API_ENDPOINTS.TASK_ALLOCATIONS}/employee/${currentEmployee.id}`);
      const tasksData = await tasksResponse.json();

      // Fetch course progress for each task
      let progressMap = {};
      try {
        const progressResponse = await fetch(`${API_BASE_URL}/api/course-progress/user/${userEmail}`);
        if (progressResponse.ok) {
          const progressData = await progressResponse.json();
          
          if (progressData.success && progressData.data) {
            progressData.data.forEach(prog => {
              progressMap[prog.course_id] = prog;
            });
          }
        }
      } catch (progressError) {
        console.error('Error fetching course progress:', progressError);
        // Continue without progress data
      }

      // Fetch test results to check which course standards have been tested
      let testResultsMap = {};
      try {
        const testResultsResponse = await fetch(`${API_BASE_URL}/api/test-results/user/${userEmail}`);
        const testResultsData = await testResultsResponse.json();
        
        console.log('🔍 Test Results Data:', testResultsData);
        
        if (testResultsData.success && testResultsData.data && Array.isArray(testResultsData.data)) {
          testResultsData.data.forEach(result => {
            if (!testResultsMap[result.course_id]) {
              testResultsMap[result.course_id] = {};
            }

            if (!testResultsMap[result.course_id][result.standard_id]) {
              testResultsMap[result.course_id][result.standard_id] = result;
            }
          });
        }
        
        console.log('📊 Test Results Map:', testResultsMap);
      } catch (testError) {
        console.error('Error fetching test results:', testError);
        // Continue without test results - tasks will just show as not completed
      }

      // Fetch standards for legacy course pairing fallback (general/specific sibling detection)
      let standardsLookup = [];
      try {
        const standardsResponse = await fetch(API_ENDPOINTS.STANDARDS);
        if (standardsResponse.ok) {
          standardsLookup = await standardsResponse.json();
        }
      } catch (standardsError) {
        console.error('Error fetching standards lookup:', standardsError);
      }

      // Transform tasks data
      const transformedTasks = tasksData.map(task => {
        const progress = progressMap[task.course_id];
        const progressPercentage = progress?.progress_percentage || 0;
        const taskResultMap = testResultsMap[task.course_id] || {};

        const requiredTests = [];
        if (task.general_standard_id) {
          const result = taskResultMap[task.general_standard_id] || null;
          requiredTests.push({
            standardId: task.general_standard_id,
            standardName: task.general_standard_name || '',
            standardType: 'general',
            label: `${task.general_standard_name || task.course_title} (General)`,
            hasResult: Boolean(result),
            hasPassed: Boolean(result?.passed),
            result
          });
        }

        if (task.specific_standard_id) {
          const result = taskResultMap[task.specific_standard_id] || null;
          requiredTests.push({
            standardId: task.specific_standard_id,
            standardName: task.specific_standard_name || '',
            standardType: 'specific',
            label: `${task.specific_standard_name || task.course_title} (Specific)`,
            hasResult: Boolean(result),
            hasPassed: Boolean(result?.passed),
            result
          });
        }

        if (!requiredTests.length && task.standard_id) {
          const result = taskResultMap[task.standard_id] || null;
          requiredTests.push({
            standardId: task.standard_id,
            standardName: task.standard_name || '',
            standardType: task.standard_type || 'simple',
            label: task.standard_name || `${task.course_title} Test`,
            hasResult: Boolean(result),
            hasPassed: Boolean(result?.passed),
            result
          });

          const currentType = (task.standard_type || 'simple').toLowerCase();
          if ((currentType === 'general' || currentType === 'specific') && standardsLookup.length > 0) {
            const siblingType = currentType === 'general' ? 'specific' : 'general';
            const taskBase = normalizeBaseName(task.standard_name || task.course_title);

            const sibling = standardsLookup.find((std) => {
              const stdType = (std.standard_type || 'simple').toLowerCase();
              const stdBase = normalizeBaseName(std.standard_name || std.short_name);
              return stdType === siblingType && stdBase && stdBase === taskBase;
            });

            if (sibling && !requiredTests.some((test) => Number(test.standardId) === Number(sibling.id))) {
              const siblingResult = taskResultMap[sibling.id] || null;
              requiredTests.push({
                standardId: sibling.id,
                standardName: sibling.standard_name || '',
                standardType: siblingType,
                label: `${sibling.standard_name || task.course_title} (${siblingType === 'general' ? 'General' : 'Specific'})`,
                hasResult: Boolean(siblingResult),
                hasPassed: Boolean(siblingResult?.passed),
                result: siblingResult
              });
            }
          }
        }

        const hasAnyTestResult = requiredTests.some(test => test.hasResult);
        const allRequiredTestsPassed = requiredTests.length > 0 && requiredTests.every(test => test.hasPassed);
        const pendingTests = requiredTests.filter(test => !test.hasPassed);
        const nextPendingTest = requiredTests.find(test => !test.hasPassed) || null;
        
        // Determine status based on test result, progress and deadline
        let status = 'Pending';
        const today = new Date();
        const deadline = new Date(task.deadline);
        const isOverdue = deadline < today && !allRequiredTestsPassed;
        
        if (allRequiredTestsPassed) {
          status = 'Completed';
        } else if (progressPercentage >= 100) {
          status = isOverdue ? 'Overdue' : 'In Progress';
        } else if (progressPercentage > 0) {
          status = isOverdue ? 'Overdue' : 'In Progress';
        } else {
          status = isOverdue ? 'Overdue' : 'Pending';
        }

        return {
          id: task.id,
          courseId: task.course_id,
          title: task.course_title,
          description: `Complete the ${task.course_title} course by the deadline`,
          courseTitle: task.course_title,
          thumbnail: task.course_thumbnail ? `${API_BASE_URL}${task.course_thumbnail}` : null,
          category: task.course_category || 'General',
          dueDate: task.deadline,
          status: status,
          progress: progressPercentage,
          assignedDate: task.assigned_date,
          totalHours: task.total_hours || 0,
          completedHours: progress?.total_time_spent ? (progress.total_time_spent / 3600).toFixed(2) : 0,
          isOverdue: isOverdue,
          hasTestResult: hasAnyTestResult,
          hasPassedTest: allRequiredTestsPassed,
          testResult: nextPendingTest?.result || null,
          requiredTests,
          pendingTests,
          nextPendingTest,
          allRequiredTestsPassed
        };
      });

      setTasks(transformedTasks);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      setError('Failed to load task allocations');
      setLoading(false);
    }
  }

  const filteredTasks = tasks.filter(task => {
    if (filter === 'all') return true;
    if (filter === 'pending') return task.status === 'Pending';
    if (filter === 'in-progress') return task.status === 'In Progress';
    if (filter === 'completed') return task.status === 'Completed';
    if (filter === 'overdue') return task.status === 'Overdue';
    return true;
  }).sort((a, b) => {
    // Sort overdue tasks first
    if (a.status === 'Overdue' && b.status !== 'Overdue') return -1;
    if (a.status !== 'Overdue' && b.status === 'Overdue') return 1;
    // Then sort by deadline
    return new Date(a.dueDate) - new Date(b.dueDate);
  });

  const getStatusColor = (status) => {
    switch(status) {
      case 'Completed': return '#10b981';
      case 'In Progress': return '#3b82f6';
      case 'Pending': return '#f59e0b';
      case 'Overdue': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getDaysRemaining = (dueDate) => {
    const today = new Date();
    const due = new Date(dueDate);
    const diffTime = due - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const handleStartTask = (courseId) => {
    navigate(`/user/course/${courseId}`);
  };

  const handleTestButtonClick = (task) => {
    if (task?.pendingTests?.length > 1) {
      setTestSelectorTaskId((current) => (current === task.id ? null : task.id));
      return;
    }

    setTestSelectorTaskId(null);
    navigate(getTestingUrl(task));
  };

  // Builds a testing URL that pre-selects + locks the standard. The standard
  // NAME is passed (matches the testing module's Standard_List) along with
  // from=course so the test page fixes the standard to this task's test.
  const buildTestingUrl = (task, test) => {
    const params = new URLSearchParams({ courseId: String(task.courseId) });
    if (test?.standardId) {
      params.set('standardId', String(test.standardId));
      params.set('standardType', String(test.standardType || ''));
      params.set('standard', test.standardName || '');
      params.set('from', 'course');
    }
    return `/user/testing?${params.toString()}`;
  };

  const getTestingUrl = (task) => buildTestingUrl(task, task?.nextPendingTest);

  const getTestingUrlForTest = (task, test) =>
    test?.standardId ? buildTestingUrl(task, test) : getTestingUrl(task);

  if (loading) {
    return (
      <div className="lms-home" style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '60vh',
        flexDirection: 'column',
        gap: '1rem'
      }}>
        <div style={{ 
          width: '50px', 
          height: '50px', 
          border: '5px solid #f3f4f6', 
          borderTop: '5px solid #E63946', 
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }}></div>
        <p style={{ color: '#6b7280', fontSize: '1rem' }}>Loading your assigned tasks...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="lms-home" style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '60vh',
        flexDirection: 'column',
        gap: '1rem'
      }}>
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="#ef4444" style={{ width: '5rem', height: '5rem' }}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
        </svg>
        <h3 style={{ color: '#ef4444', margin: 0 }}>{error}</h3>
        <button
          onClick={fetchTasks}
          style={{
            padding: '12px 24px',
            background: 'linear-gradient(135deg, #E63946 0%, #A4161A 100%)',
            color: '#fff',
            border: 'none',
            borderRadius: '12px',
            fontSize: '1rem',
            fontWeight: '600',
            cursor: 'pointer'
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="lms-home">
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
      
      {/* Header */}
      {/* <header style={{
        background: 'linear-gradient(135deg, #E63946 0%, #A4161A 100%)',
        borderRadius: '20px',
        padding: '2.5rem',
        color: '#fff',
        boxShadow: '0 10px 30px rgba(230, 57, 70, 0.4)',
        marginBottom: '2rem'
      }}>
        <p style={{
          opacity: 0.9,
          fontSize: '0.85rem',
          fontWeight: '600',
          textTransform: 'uppercase',
          letterSpacing: '1px',
          marginBottom: '0.5rem'
        }}>
          Task Management
        </p>
        <h2 style={{
          fontSize: '2rem',
          fontWeight: '700',
          marginBottom: '0.5rem'
        }}>
          My Assigned Tasks
        </h2>
        <p style={{
          fontSize: '1rem',
          opacity: 0.9,
          maxWidth: '600px'
        }}>
          Track and complete your assigned courses and training modules
        </p>
      </header> */}

      {/* Statistics Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '1.5rem',
        marginBottom: '2rem'
      }}>
        {[
          { 
            label: 'Total Tasks', 
            value: tasks.length, 
            color: '#E63946', 
            icon: (
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{ width: '2rem', height: '2rem' }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
              </svg>
            ),
            bgGradient: 'linear-gradient(135deg, #E63946 0%, #A4161A 100%)'
          },
          { 
            label: 'In Progress', 
            value: tasks.filter(t => t.status === 'In Progress').length, 
            color: '#F59E0B', 
            icon: (
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{ width: '2rem', height: '2rem' }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ),
            bgGradient: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)'
          },
          { 
            label: 'Completed', 
            value: tasks.filter(t => t.status === 'Completed').length, 
            color: '#10B981', 
            icon: (
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{ width: '2rem', height: '2rem' }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ),
            bgGradient: 'linear-gradient(135deg, #10B981 0%, #059669 100%)'
          },
          { 
            label: 'Overdue', 
            value: tasks.filter(t => t.status === 'Overdue').length, 
            color: '#EF4444', 
            icon: (
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{ width: '2rem', height: '2rem' }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
            ),
            bgGradient: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)'
          }
        ].map((stat, index) => (
          <div
            key={index}
            style={{
              background: '#fff',
              borderRadius: '16px',
              padding: '1.5rem',
              boxShadow: '0 4px 6px rgba(0,0,0,0.07)',
              border: '1px solid rgba(0,0,0,0.06)',
              transition: 'all 0.3s ease',
              cursor: 'pointer',
              position: 'relative',
              overflow: 'hidden'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-4px)';
              e.currentTarget.style.boxShadow = '0 12px 24px rgba(0,0,0,0.15)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.07)';
            }}
          >
            <div style={{
              position: 'absolute',
              top: '-20px',
              right: '-20px',
              width: '100px',
              height: '100px',
              background: stat.bgGradient,
              opacity: 0.1,
              borderRadius: '50%'
            }}></div>
            <div style={{ 
              marginBottom: '0.75rem', 
              position: 'relative', 
              zIndex: 1,
              color: stat.color
            }}>
              {stat.icon}
            </div>
            <p style={{
              fontSize: '0.85rem',
              color: '#6b7280',
              fontWeight: '600',
              marginBottom: '0.5rem',
              position: 'relative',
              zIndex: 1
            }}>
              {stat.label}
            </p>
            <h3 style={{
              fontSize: '2rem',
              fontWeight: '700',
              color: stat.color,
              margin: 0,
              position: 'relative',
              zIndex: 1
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
        marginBottom: '2rem',
        flexWrap: 'wrap'
      }}>
        {[
          { 
            key: 'all', 
            label: 'All Tasks', 
            icon: (
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={{ width: '1.1rem', height: '1.1rem' }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" />
              </svg>
            )
          },
          { 
            key: 'pending', 
            label: 'Pending', 
            icon: (
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={{ width: '1.1rem', height: '1.1rem' }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )
          },
          { 
            key: 'in-progress', 
            label: 'In Progress', 
            icon: (
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={{ width: '1.1rem', height: '1.1rem' }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
              </svg>
            )
          },
          { 
            key: 'completed', 
            label: 'Completed', 
            icon: (
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={{ width: '1.1rem', height: '1.1rem' }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )
          },
          { 
            key: 'overdue', 
            label: 'Overdue', 
            icon: (
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={{ width: '1.1rem', height: '1.1rem' }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
            )
          }
        ].map(btn => (
          <button
            key={btn.key}
            onClick={() => setFilter(btn.key)}
            style={{
              padding: '12px 24px',
              border: 'none',
              background: filter === btn.key
                ? 'linear-gradient(135deg, #E63946 0%, #A4161A 100%)'
                : '#fff',
              color: filter === btn.key ? '#fff' : '#4b5563',
              borderRadius: '12px',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '0.95rem',
              transition: 'all 0.3s ease',
              boxShadow: filter === btn.key 
                ? '0 4px 12px rgba(230, 57, 70, 0.4)' 
                : '0 2px 4px rgba(0,0,0,0.1)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px'
            }}
            onMouseEnter={(e) => {
              if (filter !== btn.key) {
                e.target.style.background = '#f3f4f6';
                e.target.style.transform = 'translateY(-2px)';
              }
            }}
            onMouseLeave={(e) => {
              if (filter !== btn.key) {
                e.target.style.background = '#fff';
                e.target.style.transform = 'translateY(0)';
              }
            }}
          >
            {btn.icon}
            <span>{btn.label}</span>
          </button>
        ))}
      </div>

      {/* Tasks List */}
      {filteredTasks.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '4rem 2rem',
          background: '#fff',
          borderRadius: '16px',
          border: '2px dashed #e5e7eb',
          boxShadow: '0 4px 6px rgba(0,0,0,0.05)'
        }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            marginBottom: '1.5rem' 
          }}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="#9ca3af" style={{ width: '5rem', height: '5rem' }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
            </svg>
          </div>
          <h3 style={{
            marginBottom: '0.5rem',
            color: '#1f2937',
            fontSize: '1.5rem',
            fontWeight: '700'
          }}>
            No tasks found
          </h3>
          <p style={{ color: '#6b7280', fontSize: '1rem' }}>
            {filter === 'all' 
              ? 'You have no assigned tasks at the moment' 
              : 'No tasks match the selected filter'}
          </p>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
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
                  borderRadius: '16px',
                  padding: '1.5rem',
                  boxShadow: isOverdue 
                    ? '0 4px 6px rgba(239, 68, 68, 0.15)' 
                    : '0 4px 6px rgba(0,0,0,0.07)',
                  border: isOverdue 
                    ? '2px solid #fca5a5' 
                    : '1px solid rgba(0,0,0,0.06)',
                  transition: 'all 0.3s ease',
                  cursor: 'pointer',
                  position: 'relative',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = isOverdue
                    ? '0 12px 24px rgba(239, 68, 68, 0.25)'
                    : '0 12px 24px rgba(0,0,0,0.15)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = isOverdue
                    ? '0 4px 6px rgba(239, 68, 68, 0.15)'
                    : '0 4px 6px rgba(0,0,0,0.07)';
                }}
              >
                {/* Status Bar */}
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '4px',
                  background: getStatusColor(task.status)
                }}></div>

                {/* Small Overdue Badge - Top Right Corner */}
                {task.status === 'Overdue' && (
                  <div style={{
                    position: 'absolute',
                    top: '12px',
                    right: '12px',
                    background: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
                    color: '#fff',
                    padding: '4px 10px',
                    borderRadius: '20px',
                    fontSize: '0.65rem',
                    fontWeight: '700',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    boxShadow: '0 2px 8px rgba(239, 68, 68, 0.4)',
                    zIndex: 10,
                    animation: 'pulse 2s ease-in-out infinite'
                  }}>
                    ⚠️ Overdue
                  </div>
                )}

                {/* Course Thumbnail */}
                {task.thumbnail && (
                  <div style={{
                    width: '100%',
                    height: '150px',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    marginBottom: '1rem',
                    background: '#f3f4f6'
                  }}>
                    <img 
                      src={task.thumbnail} 
                      alt={task.title}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover'
                      }}
                    />
                  </div>
                )}

                {/* Status Badge */}
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  marginBottom: '1rem'
                }}>
                  <span style={{
                    padding: '6px 12px',
                    borderRadius: '8px',
                    fontSize: '0.75rem',
                    fontWeight: '700',
                    background: getStatusColor(task.status),
                    color: '#fff',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    animation: task.status === 'Overdue' ? 'pulse 2s ease-in-out infinite' : 'none'
                  }}>
                    {task.status}
                  </span>
                  {task.category && (
                    <span style={{
                      padding: '6px 12px',
                      borderRadius: '8px',
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      background: '#f3f4f6',
                      color: '#6b7280'
                    }}>
                      {task.category}
                    </span>
                  )}
                </div>

                {/* Task Title */}
                <h3 style={{
                  fontSize: '1.15rem',
                  fontWeight: '700',
                  color: '#1f2937',
                  marginBottom: '0.75rem',
                  lineHeight: '1.4'
                }}>
                  {task.courseTitle}
                </h3>

                {/* Task Description */}
                <p style={{
                  fontSize: '0.9rem',
                  color: '#6b7280',
                  lineHeight: '1.5',
                  marginBottom: '1rem',
                  flex: 1
                }}>
                  {task.description}
                </p>

                {/* Progress Bar */}
                {task.progress > 0 && task.status !== 'Completed' && (
                  <div style={{ marginBottom: '1rem' }}>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '6px'
                    }}>
                      <span style={{
                        fontSize: '0.75rem',
                        color: '#6b7280',
                        fontWeight: '600'
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
                      height: '6px',
                      background: '#e5e7eb',
                      borderRadius: '10px',
                      overflow: 'hidden'
                    }}>
                      <div style={{
                        width: `${task.progress}%`,
                        height: '100%',
                        background: getStatusColor(task.status),
                        borderRadius: '10px',
                        transition: 'width 0.5s ease'
                      }} />
                    </div>
                  </div>
                )}

                {/* Course/Test Notice */}
                {(task.status === 'Completed' || (task.progress >= 100 && !task.allRequiredTestsPassed)) && (
                  <div style={{
                    marginBottom: '1rem',
                    padding: '1rem',
                    background: task.allRequiredTestsPassed
                      ? 'linear-gradient(135deg, #10b98115 0%, #05966915 100%)'
                      : 'linear-gradient(135deg, #f59e0b15 0%, #d9770615 100%)',
                    borderRadius: '10px',
                    border: task.allRequiredTestsPassed ? '2px solid #10b981' : '2px solid #f59e0b'
                  }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      marginBottom: '0.5rem'
                    }}>
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill={task.allRequiredTestsPassed ? '#10b981' : '#f59e0b'} style={{ width: '1.5rem', height: '1.5rem' }}>
                        <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" />
                      </svg>
                      <div>
                        {task.allRequiredTestsPassed ? (
                          <>
                            <div style={{
                              fontSize: '0.9rem',
                              fontWeight: '700',
                              color: '#10b981',
                              marginBottom: '0.15rem'
                            }}>
                              ✅ Test Completed - Score: {parseFloat(task.testResult?.score_percentage || 0).toFixed(1)}%
                            </div>
                            <div style={{
                              fontSize: '0.75rem',
                              color: '#059669',
                              fontWeight: '600'
                            }}>
                              🏆 All required tests passed
                            </div>
                          </>
                        ) : (
                          <>
                            <div style={{
                              fontSize: '0.9rem',
                              fontWeight: '700',
                              color: '#b45309',
                              marginBottom: '0.15rem'
                            }}>
                              ✓ Course Completed - Tests Remaining
                            </div>
                            <div style={{
                              fontSize: '0.75rem',
                              color: '#92400e',
                              fontWeight: '600'
                            }}>
                              🎯 Aap choose kar sakte ho ke pehle konsa pending test dena hai
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Hours Info */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '0.75rem',
                  background: '#f9fafb',
                  borderRadius: '8px',
                  marginBottom: '1rem'
                }}>
                  <div>
                    <div style={{
                      fontSize: '0.7rem',
                      color: '#6b7280',
                      marginBottom: '0.25rem'
                    }}>
                      Completed
                    </div>
                    <div style={{
                      fontSize: '0.95rem',
                      fontWeight: '700',
                      color: '#1f2937'
                    }}>
                      {task.completedHours}h
                    </div>
                  </div>
                  <div>
                    <div style={{
                      fontSize: '0.7rem',
                      color: '#6b7280',
                      marginBottom: '0.25rem'
                    }}>
                      Total Hours
                    </div>
                    <div style={{
                      fontSize: '0.95rem',
                      fontWeight: '700',
                      color: '#1f2937'
                    }}>
                      {task.totalHours}h
                    </div>
                  </div>
                </div>

                {/* Due Date */}
                <div style={{
                  padding: '0.75rem',
                  background: isOverdue ? '#fef2f2' : isDueSoon ? '#fffbeb' : '#f9fafb',
                  borderRadius: '8px',
                  marginBottom: '1rem',
                  border: isOverdue ? '2px solid #fecaca' : 'none'
                }}>
                  <div style={{
                    fontSize: '0.7rem',
                    color: '#6b7280',
                    fontWeight: '600',
                    marginBottom: '0.25rem'
                  }}>
                    Deadline
                  </div>
                  <div style={{
                    fontSize: '0.95rem',
                    fontWeight: '700',
                    color: isOverdue ? '#ef4444' : isDueSoon ? '#f59e0b' : '#1f2937',
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
                    color: isOverdue ? '#ef4444' : isDueSoon ? '#f59e0b' : '#6b7280',
                    fontWeight: '600'
                  }}>
                    {isOverdue
                      ? `⚠️ ${Math.abs(daysRemaining)} days overdue`
                      : daysRemaining === 0
                      ? 'Due today!'
                      : `${daysRemaining} days remaining`
                    }
                  </div>
                  {isOverdue && (
                    <div style={{
                      marginTop: '0.5rem',
                      padding: '0.5rem',
                      background: '#fee2e2',
                      borderRadius: '6px',
                      fontSize: '0.75rem',
                      color: '#991b1b',
                      fontWeight: '600',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}>
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={{ width: '1rem', height: '1rem', flexShrink: 0 }}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                      </svg>
                      <span>Take test immediately to complete</span>
                    </div>
                  )}
                </div>

                {task.pendingTests?.length > 0 && (task.progress >= 100 || task.status === 'Overdue') && (
                  <div style={{
                    marginBottom: '1rem',
                    padding: '0.85rem',
                    borderRadius: '10px',
                    background: '#f8fafc',
                    border: '1px solid #e5e7eb'
                  }}>
                    <div style={{
                      fontSize: '0.78rem',
                      fontWeight: '700',
                      color: '#374151',
                      marginBottom: '0.6rem',
                      textTransform: 'uppercase',
                      letterSpacing: '0.4px'
                    }}>
                      Pending Tests
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {task.requiredTests.map((test) => (
                        <div
                          key={`${task.id}-${test.standardId}`}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '0.75rem',
                            padding: '0.6rem 0.75rem',
                            borderRadius: '8px',
                            background: test.hasPassed ? '#ecfdf5' : '#fff7ed',
                            border: `1px solid ${test.hasPassed ? '#a7f3d0' : '#fed7aa'}`
                          }}
                        >
                          <div>
                            <div style={{ fontSize: '0.86rem', fontWeight: '700', color: '#1f2937' }}>
                              {test.label}
                            </div>
                            <div style={{ fontSize: '0.74rem', color: test.hasPassed ? '#047857' : '#9a3412', fontWeight: '600' }}>
                              {test.hasPassed ? 'Passed' : test.hasResult ? 'Attempted - pending pass' : 'Not attempted'}
                            </div>
                          </div>
                          <span style={{
                            fontSize: '0.72rem',
                            fontWeight: '700',
                            color: test.hasPassed ? '#047857' : '#b45309',
                            background: test.hasPassed ? '#d1fae5' : '#ffedd5',
                            borderRadius: '999px',
                            padding: '6px 10px',
                            whiteSpace: 'nowrap'
                          }}>
                            {test.hasPassed ? 'Done' : 'Pending'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Action Button */}
                {task.status !== 'Completed' && (
                  <>
                    {(task.status === 'Overdue' || task.progress >= 100) && task.pendingTests?.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        <button
                          onClick={() => handleTestButtonClick(task)}
                          style={{
                            width: '100%',
                            padding: '12px',
                            background: task.status === 'Overdue'
                              ? 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)'
                              : 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '10px',
                            fontWeight: '700',
                            fontSize: '0.95rem',
                            cursor: 'pointer',
                            boxShadow: task.status === 'Overdue'
                              ? '0 4px 12px rgba(239, 68, 68, 0.4)'
                              : '0 4px 12px rgba(245, 158, 11, 0.4)',
                            transition: 'all 0.3s ease',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px'
                          }}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" style={{ width: '1rem', height: '1rem' }}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
                          </svg>
                          <span>
                            {task.pendingTests.length > 1
                              ? `Choose Test${task.status === 'Overdue' ? ' (Overdue)' : ''}`
                              : `${task.pendingTests[0]?.hasResult ? 'Retake' : 'Start'} ${task.pendingTests[0]?.standardType === 'general' ? 'General' : task.pendingTests[0]?.standardType === 'specific' ? 'Specific' : ''} Test${task.status === 'Overdue' ? ' (Overdue)' : ''}`}
                          </span>
                          {task.pendingTests.length > 1 && (
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" style={{ width: '1rem', height: '1rem' }}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                            </svg>
                          )}
                        </button>

                        {task.pendingTests.length > 1 && testSelectorTaskId === task.id && (
                          <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.5rem',
                            padding: '0.75rem',
                            background: '#fff',
                            border: '1px solid #e5e7eb',
                            borderRadius: '10px',
                            boxShadow: '0 8px 20px rgba(0,0,0,0.08)'
                          }}>
                            {task.pendingTests.map((test) => (
                              <button
                                key={`${task.id}-option-${test.standardId}`}
                                onClick={() => {
                                  setTestSelectorTaskId(null);
                                  navigate(getTestingUrlForTest(task, test));
                                }}
                                style={{
                                  width: '100%',
                                  padding: '11px 12px',
                                  background: '#f9fafb',
                                  color: '#1f2937',
                                  border: '1px solid #e5e7eb',
                                  borderRadius: '8px',
                                  fontWeight: '700',
                                  fontSize: '0.9rem',
                                  cursor: 'pointer',
                                  textAlign: 'left',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  gap: '0.75rem'
                                }}
                              >
                                <span>
                                  {test.hasResult ? 'Retake' : 'Start'} {test.standardType === 'general' ? 'General' : 'Specific'} Test
                                </span>
                                <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                                  {test.label}
                                </span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      // Show Start/Continue Course for non-overdue tasks
                      <button
                        onClick={() => handleStartTask(task.courseId)}
                        style={{
                          width: '100%',
                          padding: '12px',
                          background: 'linear-gradient(135deg, #E63946 0%, #A4161A 100%)',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '10px',
                          fontWeight: '700',
                          fontSize: '0.95rem',
                          cursor: 'pointer',
                          boxShadow: '0 4px 12px rgba(230, 57, 70, 0.4)',
                          transition: 'all 0.3s ease',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px'
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.transform = 'translateY(-2px)';
                          e.target.style.boxShadow = '0 6px 16px rgba(230, 57, 70, 0.5)';
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.transform = 'translateY(0)';
                          e.target.style.boxShadow = '0 4px 12px rgba(230, 57, 70, 0.4)';
                        }}
                      >
                        <span>{task.status === 'In Progress' ? 'Continue Course' : 'Start Course'}</span>
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" style={{ width: '1rem', height: '1rem' }}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                        </svg>
                      </button>
                    )}
                  </>
                )}

                {task.status === 'Completed' && (
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.75rem'
                  }}>
                    {!task.hasTestResult ? (
                      // Show "Take Test" button if test not yet taken
                      <button
                        onClick={() => navigate(getTestingUrl(task))}
                        style={{
                          width: '100%',
                          padding: '12px',
                          background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '10px',
                          fontWeight: '700',
                          fontSize: '0.95rem',
                          cursor: 'pointer',
                          transition: 'all 0.3s ease',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px',
                          boxShadow: '0 4px 12px rgba(16, 185, 129, 0.4)'
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.transform = 'translateY(-2px)'
                          e.target.style.boxShadow = '0 6px 16px rgba(16, 185, 129, 0.5)';
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.transform = 'translateY(0)'
                          e.target.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.4)';
                        }}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" style={{ width: '1rem', height: '1rem' }}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" />
                        </svg>
                        <span>🎯 Take Required Test</span>
                      </button>
                    ) : !task.hasPassedTest ? (
                      // Show "Retake Test" button if failed
                      <button
                        onClick={() => navigate(getTestingUrl(task))}
                        style={{
                          width: '100%',
                          padding: '12px',
                          background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '10px',
                          fontWeight: '700',
                          fontSize: '0.95rem',
                          cursor: 'pointer',
                          transition: 'all 0.3s ease',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px',
                          boxShadow: '0 4px 12px rgba(245, 158, 11, 0.4)'
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.transform = 'translateY(-2px)'
                          e.target.style.boxShadow = '0 6px 16px rgba(245, 158, 11, 0.5)';
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.transform = 'translateY(0)'
                          e.target.style.boxShadow = '0 4px 12px rgba(245, 158, 11, 0.4)';
                        }}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" style={{ width: '1rem', height: '1rem' }}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                        </svg>
                        <span>🔄 Retake Pending Test</span>
                      </button>
                    ) : (
                      // Show "Task Complete" button if passed
                      <button
                        disabled
                        style={{
                          width: '100%',
                          padding: '12px',
                          background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '10px',
                          fontWeight: '700',
                          fontSize: '0.95rem',
                          cursor: 'not-allowed',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px',
                          opacity: 0.8
                        }}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" style={{ width: '1rem', height: '1rem' }}>
                          <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" />
                        </svg>
                        <span>✅ Task Complete</span>
                      </button>
                    )}
                    
                    <button
                      onClick={() => handleStartTask(task.courseId)}
                      style={{
                        width: '100%',
                        padding: '12px',
                        background: '#fff',
                        color: '#10b981',
                        border: '2px solid #10b981',
                        borderRadius: '10px',
                        fontWeight: '600',
                        fontSize: '0.9rem',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px'
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.background = '#f0fdf4';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.background = '#fff';
                      }}
                    >
                      <span>View Course</span>
                    </button>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default TaskAllocations;
