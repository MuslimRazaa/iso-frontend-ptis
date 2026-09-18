import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { API_BASE_URL } from '../../config/api';
import { showToast } from '../../components/Toast';

const Testing = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const courseId = searchParams.get('courseId');
  const standardIdParam = searchParams.get('standardId');
  const standardTypeParam = searchParams.get('standardType');
  
  const [loading, setLoading] = useState(true);
  const [courseData, setCourseData] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [testStarted, setTestStarted] = useState(false);
  const [testCompleted, setTestCompleted] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [showResultPopup, setShowResultPopup] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [startTime, setStartTime] = useState(null);
  const [error, setError] = useState(null);
  const [showWarning, setShowWarning] = useState(false);
  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [previousResult, setPreviousResult] = useState(null);
  const [showRetestModal, setShowRetestModal] = useState(false);

  // Session storage key for this test
  const sessionKey = `test_session_${courseId}_${standardIdParam || 'default'}`;

  // Check previous results on mount (NO SESSION RESTORE)
  useEffect(() => {
    const initializeTest = async () => {
      if (!courseId) {
        setError('No course selected for testing');
        setLoading(false);
        return;
      }

      // Clear any previous session - NO RESTORE ALLOWED
      sessionStorage.removeItem(sessionKey);
      console.log('🚫 Session storage cleared - Fresh test required');

      // Check if user has already completed this test
      try {
        const userEmail = localStorage.getItem('userEmail');
        if (userEmail) {
          console.log('🔍 Checking if test was already completed for:', { userEmail, courseId });
          
          const resultUrl = new URL(`${API_BASE_URL}/api/test-results/user/${userEmail}/course/${courseId}`);
          if (standardIdParam) {
            resultUrl.searchParams.set('standardId', standardIdParam);
          }

          const response = await fetch(resultUrl.toString());
          if (response.ok) {
            const data = await response.json();
            console.log('📡 Backend Response:', data);
            
            // Check if valid test result exists with all required fields
            if (data.success && 
                data.data && 
                data.data.id && 
                typeof data.data.score_percentage !== 'undefined' &&
                typeof data.data.correct_answers !== 'undefined' &&
                typeof data.data.total_questions !== 'undefined') {
              
              console.log('📊 Valid test result found. Showing results:', data.data);
              setPreviousResult(data.data);
              setShowRetestModal(true);
              setLoading(false);
              return; // Don't load test questions
            } else {
              console.log('⚠️ Invalid or incomplete test result data, allowing fresh test');
            }
          } else {
            console.log('✅ No previous result (404) - Starting fresh test');
          }
        }
      } catch (error) {
        console.log('✅ No previous result found:', error.message);
      }

      // Fresh test - load course and questions
      console.log('✅ Starting fresh test');
      loadCourseTest();
    };

    initializeTest();
  }, [courseId, standardIdParam]);

  // NO AUTO-SAVE - Test must be completed in one session

  // Timer countdown effect
  useEffect(() => {
    if (testStarted && !testCompleted && timeRemaining > 0) {
      const timer = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            handleSubmitTest(true); // Auto-submit when time runs out
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [testStarted, testCompleted, timeRemaining]);

  // Prevent page leave during test
  useEffect(() => {
    if (testStarted && !testCompleted) {
      const handleBeforeUnload = (e) => {
        e.preventDefault();
        e.returnValue = '❌ TEST WILL BE CANCELLED! Leaving this page will end your test and you cannot retake it. Are you sure?';
        return e.returnValue;
      };

      window.addEventListener('beforeunload', handleBeforeUnload);
      
      // Prevent back button
      const handlePopState = (e) => {
        if (!window.confirm('❌ WARNING: Going back will CANCEL your test permanently! Continue?')) {
          window.history.pushState(null, '', window.location.href);
        }
      };
      
      window.history.pushState(null, '', window.location.href);
      window.addEventListener('popstate', handlePopState);

      return () => {
        window.removeEventListener('beforeunload', handleBeforeUnload);
        window.removeEventListener('popstate', handlePopState);
      };
    }
  }, [testStarted, testCompleted]);

  const toggleFullScreen = () => {
    if (!isFullScreen) {
      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
    setIsFullScreen(!isFullScreen);
  };

  // Detect tab switching
  useEffect(() => {
    if (testStarted && !testCompleted) {
      const handleVisibilityChange = () => {
        if (document.hidden) {
          setTabSwitchCount(prev => {
            const newCount = prev + 1;
            if (newCount >= 3) {
              showToast('WARNING: Multiple tab switches detected! This may be reported to your instructor.', 'error');
            } else {
              showToast(`Tab switch detected! (${newCount}/3 warnings)`, 'error');
            }
            return newCount;
          });
        }
      };

      document.addEventListener('visibilitychange', handleVisibilityChange);

      return () => {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      };
    }
  }, [testStarted, testCompleted]);

  // Prevent copy/paste and right-click during test
  useEffect(() => {
    if (testStarted && !testCompleted) {
      const preventCopy = (e) => {
        e.preventDefault();
        showToast('Copying is disabled during the test.', 'error');
        return false;
      };

      const preventPaste = (e) => {
        e.preventDefault();
        showToast('Pasting is disabled during the test.', 'error');
        return false;
      };

      const preventRightClick = (e) => {
        e.preventDefault();
        showToast('Right-click is disabled during the test.', 'error');
        return false;
      };

      document.addEventListener('copy', preventCopy);
      document.addEventListener('paste', preventPaste);
      document.addEventListener('contextmenu', preventRightClick);

      return () => {
        document.removeEventListener('copy', preventCopy);
        document.removeEventListener('paste', preventPaste);
        document.removeEventListener('contextmenu', preventRightClick);
      };
    }
  }, [testStarted, testCompleted]);

  const loadCourseTest = async () => {
    try {
      console.log('═══════════════════════════════════════');
      console.log('🔄 LOADING COURSE TEST');
      console.log('═══════════════════════════════════════');
      
      setLoading(true);
      setError(null);

      console.log('📝 Course ID:', courseId);
      console.log('🌐 API Base URL:', API_BASE_URL);

      // Step 1: Fetch course details to get standard_id
      console.log('\n📡 Step 1: Fetching course details...');
      const courseUrl = `${API_BASE_URL}/api/courses/${courseId}`;
      console.log('URL:', courseUrl);
      
      const courseResponse = await fetch(courseUrl);
      console.log('Response status:', courseResponse.status);
      
      if (!courseResponse.ok) {
        throw new Error('Failed to load course details');
      }
      const course = await courseResponse.json();
      console.log('✅ Course data received:', course);
      setCourseData(course);

      const selectedStandardId = standardIdParam
        ? parseInt(standardIdParam)
        : (standardTypeParam === 'general'
            ? course.general_standard_id
            : standardTypeParam === 'specific'
              ? course.specific_standard_id
              : (course.standard_id || course.general_standard_id || course.specific_standard_id));

      if (!selectedStandardId) {
        console.log('❌ Course does not have selected standard assigned!');
        throw new Error('Course does not have a standard assigned');
      }

      console.log('✅ Standard ID found:', selectedStandardId);
      console.log('\n📡 Step 2: Fetching questions for standard...');

      // Step 2: Fetch questions by standard_id
      const questionsUrl = `${API_BASE_URL}/api/questions/standard/${selectedStandardId}`;
      console.log('URL:', questionsUrl);
      
      const questionsResponse = await fetch(questionsUrl);
      console.log('Response status:', questionsResponse.status);
      
      if (!questionsResponse.ok) {
        console.log('❌ Questions API returned error:', questionsResponse.status);
        throw new Error('Failed to load test questions');
      }
      
      const questionsData = await questionsResponse.json();
      console.log('✅ Questions data received:', questionsData);
      console.log('📊 Number of questions:', questionsData.data?.length || 0);
      
      if (!questionsData.success || !questionsData.data || questionsData.data.length === 0) {
        console.log('❌ No questions in response!');
        throw new Error('No questions available for this course standard');
      }

      console.log('\n🔧 Step 3: Formatting questions...');
      console.log('📋 Raw question data (first question):', JSON.stringify(questionsData.data[0], null, 2));
      
      // Step 3: Format questions for the test
      const formattedQuestions = questionsData.data.map((q, idx) => {
        console.log(`\n🔨 Formatting question ${idx + 1}:`, {
          id: q.id,
          prompt: q.prompt,
          question: q.question,
          question_text: q.question_text,
          text: q.text,
          questionPrompt: q.questionPrompt,
          'All keys': Object.keys(q),
          option_a: q.option_a,
          option_b: q.option_b,
          option_c: q.option_c,
          option_d: q.option_d,
          correct_answer: q.correct_answer
        });
        
        const options = [q.option_a, q.option_b, q.option_c, q.option_d].filter(o => o); // Remove null/undefined
        
        if (options.length !== 4) {
          console.warn('⚠️ Question has missing options:', q);
        }
        
        // Try multiple possible field names for the question text
        const questionText = q.prompt || q.question || q.question_text || q.text || q.questionPrompt || '';
        
        if (!questionText) {
          console.error('❌ QUESTION TEXT IS EMPTY! Raw data:', q);
        }
        
        const formatted = {
          id: q.id,
          question: questionText,
          options: options.length === 4 ? options : [...options, ...Array(4 - options.length).fill('N/A')],
          correctAnswer: ['A', 'B', 'C', 'D'].indexOf(q.correct_answer.toUpperCase()),
          marks: q.marks || 5
        };
        
        console.log(`✅ Formatted result:`, formatted);
        return formatted;
      });

      console.log('✅ Formatted questions count:', formattedQuestions.length);
      console.log('✅ First question preview:', {
        id: formattedQuestions[0]?.id,
        question: formattedQuestions[0]?.question,
        optionsCount: formattedQuestions[0]?.options?.length
      });
      
      if (formattedQuestions.length === 0) {
        console.log('❌ Questions formatted but array is empty!');
        throw new Error('Questions formatted but array is empty');
      }
      
      console.log('\n💾 Setting questions state...');
      setQuestions(formattedQuestions);
      
      // Set timer: 2 minutes per question
      const totalMinutes = formattedQuestions.length * 2;
      setTimeRemaining(totalMinutes * 60);
      
      console.log('✅ Timer set:', totalMinutes, 'minutes');
      console.log('✅ TEST LOADED SUCCESSFULLY!');
      console.log('═══════════════════════════════════════\n');
      setLoading(false);
    } catch (err) {
      console.error('Error loading test:', err);
      setError(err.message);
      setLoading(false);
    }
  };

  const handleStartTest = () => {
    console.log('═══════════════════════════════════════');
    console.log('🚀 STARTING TEST');
    console.log('═══════════════════════════════════════');
    console.log('📊 Questions state:', questions);
    console.log('📊 Questions count:', questions.length);
    
    if (questions.length > 0) {
      console.log('📝 First question details:', {
        id: questions[0].id,
        question: questions[0].question,
        questionLength: questions[0].question?.length,
        options: questions[0].options,
        marks: questions[0].marks
      });
    }
    
    if (questions.length === 0) {
      console.error('❌ NO QUESTIONS LOADED!');
      showToast('No questions loaded! Please refresh and try again.', 'error');
      return;
    }
    
    console.log('✅ Setting testStarted = true');
    setTestStarted(true);
    setStartTime(Date.now());
    setCurrentQuestionIndex(0);
    setAnswers({});
    setShowRetestModal(false);
    console.log('═══════════════════════════════════════\n');
  };

  const handleViewPreviousResult = () => {
    console.log('👀 Viewing previous result');
    setShowRetestModal(false);
    
    // Safe calculation with defaults
    const correctAnswers = previousResult.correct_answers || 0;
    const totalQuestions = previousResult.total_questions || 0;
    const totalMarks = totalQuestions * 5; // 5 marks per question
    const percentage = previousResult.score_percentage || 0;
    const passed = previousResult.passed || false;
    
    setTestResult({
      correct: correctAnswers,
      total: totalMarks,
      percentage: percentage,
      passed: passed,
      totalQuestions: totalQuestions,
      answeredQuestions: totalQuestions,
      autoSubmit: false
    });
    setTestCompleted(true);
    setShowResultPopup(true);
  };

  const handleAnswerSelect = (questionId, optionIndex) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: optionIndex
    }));
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };

  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  const handleSubmitTest = async (autoSubmit = false) => {
    if (!autoSubmit) {
      const unanswered = questions.length - Object.keys(answers).length;
      if (unanswered > 0) {
        if (!window.confirm(`⚠️ You have ${unanswered} unanswered question(s).\n\nAre you sure you want to submit?`)) {
          return;
        }
      } else {
        if (!window.confirm('✅ All questions answered!\n\nReady to submit your test?')) {
          return;
        }
      }
    }

    const endTime = Date.now();
    const durationSeconds = Math.floor((endTime - startTime) / 1000);

    // Calculate score
    let correctCount = 0;
    let totalMarks = 0;
    
    const answersData = questions.map(q => {
      totalMarks += q.marks;
      const isCorrect = answers[q.id] === q.correctAnswer;
      if (isCorrect) {
        correctCount += q.marks;
      }
      return {
        question_id: q.id,
        selected_answer: answers[q.id] !== undefined ? answers[q.id] : null,
        correct_answer: q.correctAnswer,
        is_correct: isCorrect
      };
    });

    const scorePercentage = totalMarks > 0 ? (correctCount / totalMarks) * 100 : 0;
    const passed = scorePercentage >= 50; // 50% passing score

    const result = {
      correct: correctCount,
      total: totalMarks,
      percentage: scorePercentage.toFixed(2),
      passed,
      totalQuestions: questions.length,
      answeredQuestions: Object.keys(answers).length,
      autoSubmit
    };

    setTestResult(result);
    setTestCompleted(true);
    setShowResultPopup(true);

    // Submit to backend
    try {
      const userEmail = localStorage.getItem('userEmail');
      if (!userEmail) {
        console.error('User email not found');
        return;
      }

      const submitData = {
        user_email: userEmail,
        course_id: parseInt(courseId),
        standard_id: standardIdParam
          ? parseInt(standardIdParam)
          : (courseData.general_standard_id || courseData.specific_standard_id || courseData.standard_id),
        total_questions: questions.length,
        correct_answers: correctCount,
        score_percentage: parseFloat(scorePercentage.toFixed(2)),
        passed,
        test_duration_seconds: durationSeconds,
        answers_data: answersData
      };

      console.log('📤 Submitting test data:', submitData);

      const response = await fetch(`${API_BASE_URL}/api/test-results/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submitData)
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✓ Test results saved successfully:', data);
        
        // Clear session storage after successful submission
        sessionStorage.removeItem(sessionKey);
        console.log('🗑️ Session cleared after test submission');
      } else {
        const errorData = await response.json();
        console.error('Failed to save test results:', errorData);
      }
    } catch (error) {
      console.error('Error submitting test:', error);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleCloseResult = () => {
    setShowResultPopup(false);
    // Test done → the course is now locked / in History; return to the LMS.
    navigate('/user/learning-management-system/my-courses');
  };

  console.log('Testing Component Render State:', {
    loading,
    error,
    showResultPopup,
    testStarted,
    testCompleted,
    questionsCount: questions.length,
    courseId,
    courseData
  });

  // Retest Modal - Show previous result before allowing retest
  if (showRetestModal && previousResult) {
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.85)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 9999,
        padding: '1rem'
      }}>
        <div style={{
          background: '#fff',
          borderRadius: '25px',
          padding: '3rem',
          maxWidth: '550px',
          width: '100%',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>✅</div>
          
          <h2 style={{ 
            fontSize: '1.8rem', 
            color: '#2c3e50',
            marginBottom: '1rem',
            fontWeight: '700'
          }}>
            Test Already Completed
          </h2>

          <p style={{ 
            color: '#6c757d', 
            fontSize: '1.1rem', 
            marginBottom: '2rem' 
          }}>
            You have already submitted this test. You cannot retake it. Here are your results:
          </p>

          {/* Previous Result Stats */}
          <div style={{
            background: previousResult.passed ? '#e8f5e9' : '#ffebee',
            borderRadius: '15px',
            padding: '2rem',
            marginBottom: '2rem'
          }}>
            <div style={{
              fontSize: '3rem',
              fontWeight: '700',
              color: previousResult.passed ? '#4caf50' : '#f44336',
              marginBottom: '0.5rem'
            }}>
              {previousResult.score_percentage}%
            </div>
            <div style={{
              fontSize: '1rem',
              color: '#6c757d',
              marginBottom: '1rem'
            }}>
              {previousResult.correct_answers} / {previousResult.total_questions} correct
            </div>
            <div style={{
              display: 'inline-block',
              padding: '8px 20px',
              background: previousResult.passed ? '#4caf50' : '#f44336',
              color: '#fff',
              borderRadius: '20px',
              fontWeight: '700',
              fontSize: '0.9rem'
            }}>
              {previousResult.passed ? '✓ PASSED' : '✗ FAILED'}
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '1rem', flexDirection: 'column' }}>
            <button
              onClick={handleViewPreviousResult}
              style={{
                padding: '16px 32px',
                background: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
                color: '#fff',
                border: 'none',
                borderRadius: '15px',
                fontWeight: '700',
                fontSize: '1.1rem',
                cursor: 'pointer',
                boxShadow: '0 6px 20px rgba(239, 68, 68, 0.4)',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 8px 25px rgba(239, 68, 68, 0.5)';
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = '0 6px 20px rgba(239, 68, 68, 0.4)';
              }}
            >
              📋 View Test Details
            </button>

            <button
              onClick={() => navigate('/user/learning-management-system/my-courses')}
              style={{
                padding: '12px 32px',
                background: 'transparent',
                color: '#6c757d',
                border: 'none',
                borderRadius: '10px',
                fontWeight: '600',
                fontSize: '1rem',
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = '#f8f9fa';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'transparent';
              }}
            >
              ← Back to Courses
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Loading State
  if (loading) {
    return (
      <div className="lms-home" style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '400px',
        flexDirection: 'column',
        gap: '1rem'
      }}>
        <div style={{ 
          width: '50px', 
          height: '50px', 
          border: '5px solid #f3f3f3', 
          borderTop: '5px solid #EF4444', 
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }}></div>
        <p style={{ color: '#6c757d', fontSize: '1.1rem' }}>Loading test...</p>
        <style>
          {`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}
        </style>
      </div>
    );
  }

  // Error State
  if (error) {
    return (
      <div className="lms-home">
        <div style={{
          maxWidth: '600px',
          margin: '2rem auto',
          background: '#fff',
          borderRadius: '20px',
          padding: '3rem',
          textAlign: 'center',
          boxShadow: '0 10px 40px rgba(0,0,0,0.1)'
        }}>
          <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>⚠️</div>
          <h2 style={{ fontSize: '1.8rem', color: '#f44336', marginBottom: '1rem' }}>
            Unable to Load Test
          </h2>
          <p style={{ color: '#6c757d', fontSize: '1.1rem', marginBottom: '2rem' }}>
            {error}
          </p>
          <button
            onClick={() => navigate('/user/learning-management-system/my-courses')}
            style={{
              padding: '12px 32px',
              background: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
              color: '#fff',
              border: 'none',
              borderRadius: '12px',
              fontWeight: '700',
              fontSize: '1rem',
              cursor: 'pointer',
              boxShadow: '0 4px 15px rgba(239, 68, 68, 0.3)'
            }}
          >
            Back to Courses
          </button>
        </div>
      </div>
    );
  }

  // Result Popup Modal
  if (showResultPopup && testResult) {
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.85)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 9999,
        padding: '1rem'
      }}>
        <div style={{
          background: '#fff',
          borderRadius: '30px',
          padding: '3rem',
          maxWidth: '600px',
          width: '100%',
          textAlign: 'center',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          animation: 'slideUp 0.5s ease-out'
        }}>
          <style>
            {`
              @keyframes slideUp {
                from {
                  opacity: 0;
                  transform: translateY(50px);
                }
                to {
                  opacity: 1;
                  transform: translateY(0);
                }
              }
              @keyframes pulse {
                0%, 100% { transform: scale(1); }
                50% { transform: scale(1.05); }
              }
            `}
          </style>

          {/* Icon */}
          <div style={{
            fontSize: '6rem',
            marginBottom: '1.5rem',
            animation: 'pulse 2s ease-in-out infinite'
          }}>
            {testResult.passed ? '🎉' : '📚'}
          </div>

          {/* Title */}
          <h2 style={{
            fontSize: '2.5rem',
            fontWeight: '800',
            color: testResult.passed ? '#4caf50' : '#ff9800',
            marginBottom: '1rem'
          }}>
            {testResult.passed ? 'Test Passed!' : 'Result Awaiting'}
          </h2>

          {/* Message */}
          <p style={{
            fontSize: '1.2rem',
            color: '#6c757d',
            marginBottom: '2.5rem',
            lineHeight: '1.6'
          }}>
            {testResult.passed 
              ? 'Congratulations! You have successfully completed the course test.' 
              : 'Your test has been submitted. You scored below the passing threshold. Keep practicing and try again!'}
          </p>

          {/* Score Details */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '1.5rem',
            marginBottom: '2.5rem',
            padding: '2rem',
            background: '#f8f9fa',
            borderRadius: '20px'
          }}>
            <div>
              <div style={{ 
                fontSize: '2.5rem', 
                fontWeight: '700', 
                color: '#EF4444',
                marginBottom: '0.5rem'
              }}>
                {testResult.percentage}%
              </div>
              <div style={{ fontSize: '0.9rem', color: '#6c757d', fontWeight: '600' }}>
                Score
              </div>
            </div>
            <div>
              <div style={{ 
                fontSize: '2.5rem', 
                fontWeight: '700', 
                color: '#4caf50',
                marginBottom: '0.5rem'
              }}>
                {testResult.correct}/{testResult.total}
              </div>
              <div style={{ fontSize: '0.9rem', color: '#6c757d', fontWeight: '600' }}>
                Marks
              </div>
            </div>
            <div>
              <div style={{ 
                fontSize: '2.5rem', 
                fontWeight: '700', 
                color: testResult.passed ? '#4caf50' : '#ff9800',
                marginBottom: '0.5rem'
              }}>
                {testResult.passed ? '✓' : '−'}
              </div>
              <div style={{ fontSize: '0.9rem', color: '#6c757d', fontWeight: '600' }}>
                Status
              </div>
            </div>
          </div>

          {/* Additional Info */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-around',
            marginBottom: '2rem',
            padding: '1.5rem',
            background: '#f0f4ff',
            borderRadius: '15px'
          }}>
            <div>
              <div style={{ fontSize: '1.1rem', fontWeight: '700', color: '#EF4444' }}>
                {testResult.answeredQuestions} / {testResult.totalQuestions}
              </div>
              <div style={{ fontSize: '0.85rem', color: '#6c757d' }}>
                Answered
              </div>
            </div>
            {testResult.autoSubmit && (
              <div>
                <div style={{ fontSize: '1.1rem', fontWeight: '700', color: '#f44336' }}>
                  Time Up
                </div>
                <div style={{ fontSize: '0.85rem', color: '#6c757d' }}>
                  Auto-submitted
                </div>
              </div>
            )}
          </div>

          {/* Close Button */}
          <button
            onClick={handleCloseResult}
            style={{
              width: '100%',
              padding: '16px',
              background: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
              color: '#fff',
              border: 'none',
              borderRadius: '15px',
              fontWeight: '700',
              fontSize: '1.1rem',
              cursor: 'pointer',
              boxShadow: '0 6px 20px rgba(239, 68, 68, 0.4)',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = 'translateY(-2px)';
              e.target.style.boxShadow = '0 8px 25px rgba(239, 68, 68, 0.5)';
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = '0 6px 20px rgba(239, 68, 68, 0.4)';
            }}
          >
            Back to Courses
          </button>
        </div>
      </div>
    );
  }

  // Test Start Screen
  if (!testStarted && questions.length > 0) {
    const totalMinutes = Math.floor(timeRemaining / 60);
    
    return (
      <div className="lms-home">
        <div style={{
          maxWidth: '800px',
          margin: '0 auto',
          background: '#fff',
          borderRadius: '30px',
          overflow: 'hidden',
          boxShadow: '0 10px 40px rgba(0,0,0,0.1)'
        }}>
          {/* Header Banner */}
          <div style={{
            background: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
            padding: '3rem 2rem',
            textAlign: 'center',
            color: '#fff'
          }}>
            <div style={{ fontSize: '5rem', marginBottom: '1rem' }}>📝</div>
            <h2 style={{ fontSize: '2.5rem', fontWeight: '800', marginBottom: '0.5rem' }}>
              Course Completion Test
            </h2>
            <p style={{ fontSize: '1.1rem', opacity: 0.95 }}>
              {courseData?.title || 'Test Your Knowledge'}
            </p>
          </div>

          {/* Test Information */}
          <div style={{ padding: '3rem' }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '2rem',
              marginBottom: '3rem'
            }}>
              <div style={{
                textAlign: 'center',
                padding: '2rem',
                background: '#f8f9fa',
                borderRadius: '20px'
              }}>
                <div style={{ 
                  fontSize: '3rem', 
                  fontWeight: '700', 
                  color: '#EF4444',
                  marginBottom: '0.5rem'
                }}>
                  {questions.length}
                </div>
                <div style={{ fontSize: '1rem', color: '#6c757d', fontWeight: '600' }}>
                  Questions
                </div>
              </div>
              
              <div style={{
                textAlign: 'center',
                padding: '2rem',
                background: '#f8f9fa',
                borderRadius: '20px'
              }}>
                <div style={{ 
                  fontSize: '3rem', 
                  fontWeight: '700', 
                  color: '#EF4444',
                  marginBottom: '0.5rem'
                }}>
                  {totalMinutes}
                </div>
                <div style={{ fontSize: '1rem', color: '#6c757d', fontWeight: '600' }}>
                  Minutes
                </div>
              </div>
              
              <div style={{
                textAlign: 'center',
                padding: '2rem',
                background: '#f8f9fa',
                borderRadius: '20px'
              }}>
                <div style={{ 
                  fontSize: '3rem', 
                  fontWeight: '700', 
                  color: '#EF4444',
                  marginBottom: '0.5rem'
                }}>
                  50%
                </div>
                <div style={{ fontSize: '1rem', color: '#6c757d', fontWeight: '600' }}>
                  Pass Score
                </div>
              </div>
            </div>

            {/* Instructions */}
            <div style={{
              background: '#fff3cd',
              border: '2px solid #ffc107',
              borderRadius: '15px',
              padding: '2rem',
              marginBottom: '2.5rem'
            }}>
              <h3 style={{ 
                fontSize: '1.3rem', 
                fontWeight: '700', 
                color: '#856404',
                marginBottom: '1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                ⚠️ Instructions
              </h3>
              <ul style={{ 
                listStyle: 'none', 
                padding: 0, 
                margin: 0,
                color: '#856404',
                fontSize: '1rem',
                lineHeight: '1.8'
              }}>
                <li style={{ marginBottom: '0.75rem' }}>
                  ✓ Each question has 4 options, only one is correct
                </li>
                <li style={{ marginBottom: '0.75rem' }}>
                  ✓ You have {totalMinutes} minutes to complete the test
                </li>
                <li style={{ marginBottom: '0.75rem' }}>
                  ✓ You need at least 50% to pass the test
                </li>
                <li style={{ marginBottom: '0.75rem' }}>
                  ✓ Test will auto-submit when time runs out
                </li>
                <li style={{ marginBottom: '0.75rem' }}>
                  ✓ You can navigate between questions and change your answers
                </li>
                <li style={{ marginBottom: '0.75rem' }}>
                  ⚠️ Copying, pasting, and right-click are disabled
                </li>
                <li style={{ marginBottom: '0.75rem' }}>
                  ⚠️ Tab switching is monitored (max 3 warnings)
                </li>
                <li style={{ 
                  marginBottom: '0.75rem',
                  fontWeight: '700',
                  color: '#d32f2f'
                }}>
                  🚫 Leaving page will CANCEL your test
                </li>
                <li style={{ 
                  fontWeight: '700',
                  color: '#d32f2f',
                  background: '#ffebee',
                  padding: '0.5rem',
                  borderRadius: '8px'
                }}>
                  🚫 Once submitted, you CANNOT retake this test
                </li>
              </ul>
            </div>

            {/* Start Button */}
            <button
              onClick={handleStartTest}
              style={{
                width: '100%',
                padding: '18px',
                background: 'linear-gradient(135deg, #4caf50 0%, #45a049 100%)',
                color: '#fff',
                border: 'none',
                borderRadius: '15px',
                fontWeight: '700',
                fontSize: '1.2rem',
                cursor: 'pointer',
                boxShadow: '0 6px 20px rgba(76, 175, 80, 0.4)',
                transition: 'all 0.3s ease',
                textTransform: 'uppercase',
                letterSpacing: '1px'
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = 'translateY(-3px)';
                e.target.style.boxShadow = '0 8px 25px rgba(76, 175, 80, 0.5)';
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = '0 6px 20px rgba(76, 175, 80, 0.4)';
              }}
            >
              🚀 Start Test Now
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Test Taking Screen
  if (testStarted && !testCompleted && questions.length > 0) {
    const currentQuestion = questions[currentQuestionIndex];
    
    // Safety check
    if (!currentQuestion) {
      console.error('Current question is undefined!', {
        currentQuestionIndex,
        questionsLength: questions.length,
        questions
      });
      return (
        <div className="lms-home" style={{ textAlign: 'center', padding: '3rem' }}>
          <h2>Error loading question</h2>
          <p>Question index: {currentQuestionIndex}</p>
          <p>Total questions: {questions.length}</p>
          <button onClick={() => setCurrentQuestionIndex(0)}>Reset to First Question</button>
        </div>
      );
    }

    const progress = ((currentQuestionIndex + 1) / questions.length) * 100;
    const isLowTime = timeRemaining <= 60; // Less than 1 minute
    const isAnswered = answers[currentQuestion.id] !== undefined;

    console.log('Rendering question:', {
      index: currentQuestionIndex,
      question: currentQuestion,
      isAnswered,
      progress
    });

    return (
      <div className="lms-home" style={{ userSelect: 'none' }}>
        {/* Test Header */}
        <div style={{
          background: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
          borderRadius: '20px',
          padding: '1.5rem 2.5rem',
          marginBottom: '2rem',
          color: '#fff',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1.5rem',
          boxShadow: '0 10px 40px rgba(239, 68, 68, 0.3)'
        }}>
          <div style={{ flex: 1 }}>
            <h2 style={{ fontSize: '1.8rem', fontWeight: '700', marginBottom: '0.5rem' }}>
              {courseData?.title || 'Course Test'}
            </h2>
            <div style={{ fontSize: '1rem', opacity: 0.95, display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <span>Question {currentQuestionIndex + 1} of {questions.length}</span>
              {tabSwitchCount > 0 && (
                <span style={{ 
                  background: 'rgba(255, 193, 7, 0.3)', 
                  padding: '2px 12px', 
                  borderRadius: '12px',
                  fontSize: '0.9rem',
                  fontWeight: '700'
                }}>
                  ⚠️ {tabSwitchCount} Tab Switch{tabSwitchCount > 1 ? 'es' : ''}
                </span>
              )}
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            {/* Full Screen Button */}
            <button
              onClick={toggleFullScreen}
              style={{
                padding: '10px 16px',
                background: 'rgba(255, 255, 255, 0.2)',
                color: '#fff',
                border: '2px solid rgba(255, 255, 255, 0.4)',
                borderRadius: '10px',
                cursor: 'pointer',
                fontSize: '0.9rem',
                fontWeight: '600',
                transition: 'all 0.3s ease'
              }}
              title={isFullScreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
            >
              {isFullScreen ? '⛶' : '⛶'} {isFullScreen ? 'Exit' : 'Fullscreen'}
            </button>
            
            {/* Timer */}
            <div style={{
              textAlign: 'center',
              padding: '1rem 2rem',
              background: isLowTime ? 'rgba(244, 67, 54, 0.3)' : 'rgba(255, 255, 255, 0.2)',
              borderRadius: '15px',
              border: isLowTime ? '2px solid #f44336' : '2px solid rgba(255, 255, 255, 0.3)'
            }}>
            <div style={{ 
              fontSize: '2.5rem', 
              fontWeight: '700',
              color: isLowTime ? '#ffeb3b' : '#fff'
            }}>
              {formatTime(timeRemaining)}
            </div>
            <div style={{ fontSize: '0.85rem', opacity: 0.95 }}>
              Time Remaining
            </div>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
        <div style={{
          width: '100%',
          height: '10px',
          background: '#e9ecef',
          borderRadius: '10px',
          overflow: 'hidden',
          marginBottom: '2rem',
          boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <div style={{
            width: `${progress}%`,
            height: '100%',
            background: 'linear-gradient(90deg, #EF4444 0%, #DC2626 100%)',
            transition: 'width 0.4s ease',
            boxShadow: '0 0 10px rgba(239, 68, 68, 0.5)'
          }} />
        </div>

        {/* Question Card */}
        <div style={{
          background: '#fff',
          borderRadius: '25px',
          padding: '3rem',
          marginBottom: '2rem',
          boxShadow: '0 8px 30px rgba(0,0,0,0.1)',
          minHeight: '450px',
          border: '1px solid rgba(0,0,0,0.05)'
        }}>
          {/* Question Header */}
          <div style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '1.5rem',
            marginBottom: '2.5rem'
          }}>
            <div style={{
              minWidth: '60px',
              height: '60px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontSize: '1.8rem',
              fontWeight: '700',
              boxShadow: '0 4px 15px rgba(239, 68, 68, 0.3)'
            }}>
              {currentQuestionIndex + 1}
            </div>
            <div style={{ flex: 1 }}>
              <h3 style={{
                fontSize: '1.4rem',
                fontWeight: '700',
                color: '#2c3e50',
                marginBottom: '0.75rem',
                lineHeight: '1.5'
              }}>
                {currentQuestion.question}
              </h3>
              <div style={{
                display: 'flex',
                gap: '1rem',
                alignItems: 'center'
              }}>
                <span style={{
                  padding: '6px 16px',
                  background: '#fee2e2',
                  color: '#EF4444',
                  borderRadius: '20px',
                  fontSize: '0.85rem',
                  fontWeight: '700'
                }}>
                  {currentQuestion.marks} marks
                </span>
                {isAnswered && (
                  <span style={{
                    padding: '6px 16px',
                    background: '#c8e6c9',
                    color: '#2e7d32',
                    borderRadius: '20px',
                    fontSize: '0.85rem',
                    fontWeight: '700'
                  }}>
                    ✓ Answered
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Options */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem'
          }}>
            {currentQuestion.options && currentQuestion.options.length > 0 ? (
              currentQuestion.options.map((option, index) => {
                const isSelected = answers[currentQuestion.id] === index;
                const optionLabel = ['A', 'B', 'C', 'D'][index];
                
                return (
                  <label
                    key={index}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '1.5rem 2rem',
                      background: isSelected ? '#fee2e2' : '#f8f9fa',
                      border: isSelected ? '3px solid #EF4444' : '2px solid #e9ecef',
                    borderRadius: '15px',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    fontSize: '1.05rem',
                    fontWeight: '500',
                    color: '#2c3e50'
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.background = '#e9ecef';
                      e.currentTarget.style.borderColor = '#EF4444';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.background = '#f8f9fa';
                      e.currentTarget.style.borderColor = '#e9ecef';
                    }
                  }}
                >
                  <div style={{
                    minWidth: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    background: isSelected ? '#EF4444' : '#fff',
                    border: isSelected ? 'none' : '2px solid #ced4da',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: '1.5rem',
                    fontWeight: '700',
                    fontSize: '1.1rem',
                    color: isSelected ? '#fff' : '#6c757d',
                    transition: 'all 0.3s ease'
                  }}>
                    {optionLabel}
                  </div>
                  <input
                    type="radio"
                    name={`question-${currentQuestion.id}`}
                    value={index}
                    checked={isSelected}
                    onChange={() => handleAnswerSelect(currentQuestion.id, index)}
                    style={{ display: 'none' }}
                  />
                  <span style={{ flex: 1 }}>{option}</span>
                </label>
              );
            })
            ) : (
              <div style={{ 
                padding: '2rem', 
                textAlign: 'center', 
                color: '#f44336',
                background: '#ffebee',
                borderRadius: '10px'
              }}>
                ⚠️ No options available for this question
              </div>
            )}
          </div>
        </div>

        {/* Navigation Buttons */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1.5rem'
        }}>
          <button
            onClick={handlePreviousQuestion}
            disabled={currentQuestionIndex === 0}
            style={{
              padding: '14px 32px',
              background: currentQuestionIndex === 0 ? '#e9ecef' : '#fff',
              color: currentQuestionIndex === 0 ? '#adb5bd' : '#EF4444',
              border: currentQuestionIndex === 0 ? '2px solid #e9ecef' : '2px solid #EF4444',
              borderRadius: '15px',
              fontWeight: '700',
              fontSize: '1rem',
              cursor: currentQuestionIndex === 0 ? 'not-allowed' : 'pointer',
              transition: 'all 0.3s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            ← Previous
          </button>

          <div style={{ 
            fontSize: '1rem', 
            color: '#6c757d', 
            fontWeight: '600',
            padding: '0.5rem 1rem',
            background: '#f8f9fa',
            borderRadius: '10px'
          }}>
            {Object.keys(answers).length} / {questions.length} answered
          </div>

          <div style={{ display: 'flex', gap: '1rem' }}>
            {currentQuestionIndex === questions.length - 1 ? (
              <button
                onClick={() => handleSubmitTest(false)}
                style={{
                  padding: '14px 40px',
                  background: 'linear-gradient(135deg, #4caf50 0%, #45a049 100%)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '15px',
                  fontWeight: '700',
                  fontSize: '1rem',
                  cursor: 'pointer',
                  boxShadow: '0 4px 15px rgba(76, 175, 80, 0.4)',
                  transition: 'all 0.3s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
                onMouseEnter={(e) => {
                  e.target.style.transform = 'translateY(-2px)';
                  e.target.style.boxShadow = '0 6px 20px rgba(76, 175, 80, 0.5)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = 'translateY(0)';
                  e.target.style.boxShadow = '0 4px 15px rgba(76, 175, 80, 0.4)';
                }}
              >
                Submit Test ✓
              </button>
            ) : (
              <button
                onClick={handleNextQuestion}
                style={{
                  padding: '14px 40px',
                  background: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '15px',
                  fontWeight: '700',
                  fontSize: '1rem',
                  cursor: 'pointer',
                  boxShadow: '0 4px 15px rgba(239, 68, 68, 0.4)',
                  transition: 'all 0.3s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
                onMouseEnter={(e) => {
                  e.target.style.transform = 'translateY(-2px)';
                  e.target.style.boxShadow = '0 6px 20px rgba(239, 68, 68, 0.5)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = 'translateY(0)';
                  e.target.style.boxShadow = '0 4px 15px rgba(239, 68, 68, 0.4)';
                }}
              >
                Next →
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Fallback: If we're here, something went wrong
  return (
    <div className="lms-home">
      <div style={{
        maxWidth: '600px',
        margin: '2rem auto',
        background: '#fff',
        borderRadius: '20px',
        padding: '3rem',
        textAlign: 'center',
        boxShadow: '0 10px 40px rgba(0,0,0,0.1)'
      }}>
        <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🔍</div>
        <h2 style={{ fontSize: '1.8rem', color: '#ff9800', marginBottom: '1rem' }}>
          No Test Available
        </h2>
        <p style={{ color: '#6c757d', fontSize: '1.1rem', marginBottom: '1rem' }}>
          Unable to load test questions. This could be because:
        </p>
        <ul style={{ 
          textAlign: 'left', 
          color: '#6c757d', 
          marginBottom: '2rem',
          listStyle: 'none',
          padding: 0
        }}>
          <li>✗ No course ID provided</li>
          <li>✗ Course has no standard assigned</li>  
          <li>✗ No questions available for this standard</li>
        </ul>
        <div style={{ marginBottom: '1rem', padding: '1rem', background: '#f8f9fa', borderRadius: '10px' }}>
          <p style={{ fontSize: '0.9rem', color: '#6c757d', marginBottom: '0.5rem' }}>
            <strong>Debug Info:</strong>
          </p>
          <p style={{ fontSize: '0.85rem', color: '#6c757d' }}>
            Course ID: {courseId || 'Not provided'}<br/>
            Questions Loaded: {questions.length}<br/>
            Test Started: {testStarted ? 'Yes' : 'No'}
          </p>
        </div>
        <button
          onClick={() => navigate('/user/learning-management-system/my-courses')}
          style={{
            padding: '12px 32px',
            background: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
            color: '#fff',
            border: 'none',
            borderRadius: '12px',
            fontWeight: '700',
            fontSize: '1rem',
            cursor: 'pointer',
            boxShadow: '0 4px 15px rgba(239, 68, 68, 0.3)'
          }}
        >
          Back to Courses
        </button>
      </div>
    </div>
  );
};

export default Testing;

