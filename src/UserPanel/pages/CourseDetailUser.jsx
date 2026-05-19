import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { API_ENDPOINTS, API_BASE_URL } from '../../config/api';
import PdfViewer from '../../components/PdfViewer';

const CourseDetailUser = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedVideo, setSelectedVideo] = useState(0);
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pptUrl, setPptUrl] = useState(null);
  const [showModal, setShowModal] = useState(false);
  
  // Enrollment and tracking state
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [enrollmentLoading, setEnrollmentLoading] = useState(false);
  const [videoWatchTime, setVideoWatchTime] = useState(0);
  const [pptViewTime, setPptViewTime] = useState(0);
  const [totalTimeSpent, setTotalTimeSpent] = useState(0);
  
  // Test unlock state
  const [testUnlocked, setTestUnlocked] = useState(false);
  const [testUnlockInfo, setTestUnlockInfo] = useState(null);
  const [testCompleted, setTestCompleted] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [requiredTests, setRequiredTests] = useState([]);
  
  // Refs for tracking - THESE ARE THE SOURCE OF TRUTH for saving
  const videoRef = useRef(null);
  const pptStartTimeRef = useRef(null);
  const videoTrackingInterval = useRef(null);
  const saveProgressInterval = useRef(null);
  const lastVideoTimeRef = useRef(0);
  const isVideoPlayingRef = useRef(false);
  
  // Real-time tracking refs (immediately updated, not async like state)
  const videoWatchTimeRef = useRef(0);
  const pptViewTimeRef = useRef(0);
  const totalTimeSpentRef = useRef(0);

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

  // Check required test completion state for this course
  useEffect(() => {
    const checkTestCompletion = async () => {
      const userEmail = localStorage.getItem('userEmail');
      if (!userEmail || !courseId || !course) return;

      try {
        console.log('🔍 Checking test completion for:', { userEmail, courseId });

        const [resultsResponse, standardsResponse] = await Promise.all([
          fetch(`${API_BASE_URL}/api/test-results/user/${userEmail}`),
          fetch(API_ENDPOINTS.STANDARDS)
        ]);

        const resultsData = resultsResponse.ok ? await resultsResponse.json() : { success: false, data: [] };
        const standardsData = standardsResponse.ok ? await standardsResponse.json() : [];

        const courseResults = Array.isArray(resultsData.data)
          ? resultsData.data.filter((result) => Number(result.course_id) === Number(courseId))
          : [];

        const resultsByStandardId = {};
        courseResults.forEach((result) => {
          if (!resultsByStandardId[result.standard_id]) {
            resultsByStandardId[result.standard_id] = result;
          }
        });

        const mappedTests = [];
        if (course.general_standard_id) {
          const result = resultsByStandardId[course.general_standard_id] || null;
          mappedTests.push({
            standardId: course.general_standard_id,
            standardType: 'general',
            label: `${course.general_standard_name || course.title} (General)`,
            result,
            hasResult: Boolean(result),
            hasPassed: Boolean(result?.passed)
          });
        }

        if (course.specific_standard_id) {
          const result = resultsByStandardId[course.specific_standard_id] || null;
          mappedTests.push({
            standardId: course.specific_standard_id,
            standardType: 'specific',
            label: `${course.specific_standard_name || course.title} (Specific)`,
            result,
            hasResult: Boolean(result),
            hasPassed: Boolean(result?.passed)
          });
        }

        if (!mappedTests.length && course.standard_id) {
          const baseTest = {
            standardId: course.standard_id,
            standardType: course.standard_type || 'simple',
            label: course.standard_name || `${course.title} Test`,
            result: resultsByStandardId[course.standard_id] || null,
            hasResult: Boolean(resultsByStandardId[course.standard_id]),
            hasPassed: Boolean(resultsByStandardId[course.standard_id]?.passed)
          };
          mappedTests.push(baseTest);

          const currentType = (course.standard_type || 'simple').toLowerCase();
          if ((currentType === 'general' || currentType === 'specific') && Array.isArray(standardsData)) {
            const siblingType = currentType === 'general' ? 'specific' : 'general';
            const courseBase = normalizeBaseName(course.standard_name || course.title);
            const sibling = standardsData.find((std) => {
              return (std.standard_type || 'simple').toLowerCase() === siblingType
                && normalizeBaseName(std.standard_name || std.short_name) === courseBase;
            });

            if (sibling) {
              const siblingResult = resultsByStandardId[sibling.id] || null;
              mappedTests.push({
                standardId: sibling.id,
                standardType: siblingType,
                label: `${sibling.standard_name || course.title} (${siblingType === 'general' ? 'General' : 'Specific'})`,
                result: siblingResult,
                hasResult: Boolean(siblingResult),
                hasPassed: Boolean(siblingResult?.passed)
              });
            }
          }
        }

        const uniqueTests = mappedTests.filter((test, index, arr) => {
          return test.standardId && arr.findIndex((item) => Number(item.standardId) === Number(test.standardId)) === index;
        });

        const allPassed = uniqueTests.length > 0 && uniqueTests.every((test) => test.hasPassed);
        const latestCompleted = [...uniqueTests]
          .filter((test) => test.hasResult)
          .sort((a, b) => new Date(b.result?.submitted_at || 0) - new Date(a.result?.submitted_at || 0))[0] || null;

        setRequiredTests(uniqueTests);
        setTestCompleted(allPassed);
        setTestResult(latestCompleted?.result || null);
      } catch (error) {
        console.log('ℹ️ No previous test result found:', error.message);
        setRequiredTests([]);
        setTestCompleted(false);
        setTestResult(null);
      }
    };

    checkTestCompletion();
  }, [courseId, course]);

  useEffect(() => {
    const fetchCourseDetails = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${API_ENDPOINTS.COURSES}/${courseId}`);

        if (!response.ok) {
          throw new Error('Course not found');
        }

        const data = await response.json();

        // Parse videos if they're stored as JSON string
        let videos = [];
        if (data.course_videos) {
          try {
            videos = typeof data.course_videos === 'string'
              ? JSON.parse(data.course_videos)
              : data.course_videos;
          } catch (e) {
            console.error('Error parsing videos:', e);
          }
        }

        // Transform the API response to match component structure
        const transformedCourse = {
          id: data.id,
          title: data.course_title,
          description: data.course_description || 'No description available',
          thumbnail: data.course_thumbnail ? `${API_BASE_URL}/${data.course_thumbnail}` : null,
          instructor: data.course_owner || 'PTIS Academy',
          category: data.course_category || 'Technical Skills',
          level: 'Intermediate',
          creditHours: data.credit_hours || 0,
          durationWeeks: data.duration_weeks || 0,
          duration: data.duration_weeks ? `${(data.duration_weeks) * 54} h` : 'Self-paced',
          enrolled: 0,
          rating: 4.5,
          totalRatings: 0,
          prerequisites: data.prerequisites || 'None',
          learningOutcomes: [
            'Complete the course objectives',
            'Master the core concepts',
            'Apply learned skills in real scenarios',
            'Earn course completion certificate',
          ],
          syllabus: [],
          videos: videos,
          pdf_path: data.pdf_path || null,
          resources: data.primary_ppt ? [
            {
              name: 'Course Presentation',
              size: 'PPT',
              url: `${API_BASE_URL}${data.primary_ppt}`
            }
          ] : [],
          standard_id: data.standard_id,
          standard_name: data.standard_name,
          standard_type: data.standard_type,
          general_standard_id: data.general_standard_id,
          specific_standard_id: data.specific_standard_id,
          general_standard_name: data.general_standard_name,
          specific_standard_name: data.specific_standard_name,
          is_published: data.is_published,
        };

        setCourse(transformedCourse);
      } catch (err) {
        console.error('Error fetching course:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (courseId) {
      fetchCourseDetails();
    }
  }, [courseId]);

  // Check enrollment status and load progress on mount
  useEffect(() => {
    const checkEnrollmentAndLoadProgress = async () => {
      try {
        const userEmail = localStorage.getItem('userEmail');
        if (!userEmail || !courseId) return;

        // Check if user is enrolled
        const checkResponse = await fetch(
          `${API_BASE_URL}/api/course-progress/check/${userEmail}/${courseId}`
        );

        if (checkResponse.ok) {
          const checkData = await checkResponse.json();
          
          if (checkData.isEnrolled) {
            setIsEnrolled(true);
            
            // Load existing progress
            const progressResponse = await fetch(
              `${API_BASE_URL}/api/course-progress/${userEmail}/${courseId}`
            );
            
            if (progressResponse.ok) {
              const progressData = await progressResponse.json();
              
              if (progressData.success && progressData.data) {
                // Resume time from where user left off
                const loadedVideoTime = progressData.data.video_watch_time || 0;
                const loadedPptTime = progressData.data.ppt_view_time || 0;
                // Ensure consistency: Total = Video + PPT
                const loadedTotalTime = loadedVideoTime + loadedPptTime;
                
                // Update both state (for UI) and refs (for saving)
                setVideoWatchTime(loadedVideoTime);
                setPptViewTime(loadedPptTime);
                setTotalTimeSpent(loadedTotalTime);
                
                videoWatchTimeRef.current = loadedVideoTime;
                pptViewTimeRef.current = loadedPptTime;
                totalTimeSpentRef.current = loadedTotalTime;
                
                console.log('✓ Progress loaded successfully:');
                console.log('  - Video Time:', (loadedVideoTime / 3600).toFixed(3), 'hours');
                console.log('  - PPT Time:', (loadedPptTime / 3600).toFixed(3), 'hours');
                console.log('  - Total Time:', (loadedTotalTime / 3600).toFixed(3), 'hours');
                
                // Start progress tracking
                startProgressTracking();
              } else {
                console.log('No previous progress found, starting fresh');
              }
            }
          }
        }
      } catch (error) {
        console.error('Error checking enrollment:', error);
      }
    };

    checkEnrollmentAndLoadProgress();
  }, [courseId, API_BASE_URL]);

  // Check test unlock status when enrolled and progress changes
  useEffect(() => {
    const checkTestUnlock = async () => {
      if (!isEnrolled) {
        setTestUnlocked(false);
        setTestUnlockInfo(null);
        return;
      }

      try {
        const userEmail = localStorage.getItem('userEmail');
        if (!userEmail) return;

        const response = await fetch(
          `${API_BASE_URL}/api/course-progress/test-unlock/${userEmail}/${courseId}`
        );

        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            setTestUnlocked(data.data.unlocked);
            setTestUnlockInfo(data.data);
            
            if (data.data.unlocked) {
              console.log('✓ Test unlocked for this course!');
            }
          }
        }
      } catch (error) {
        console.error('Error checking test unlock:', error);
      }
    };

    checkTestUnlock();
  }, [courseId, isEnrolled, totalTimeSpent, videoWatchTime, pptViewTime, API_BASE_URL]);

  // Save progress before page unload (refresh, close tab, logout)
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (isEnrolled) {
        // Calculate final PPT time if modal is still open
        let finalPptTime = pptViewTimeRef.current;
        let finalTotalTime = totalTimeSpentRef.current;
        
        if (pptStartTimeRef.current) {
          const viewDuration = Math.floor((Date.now() - pptStartTimeRef.current) / 1000);
          finalPptTime = pptViewTimeRef.current + viewDuration;
          finalTotalTime = totalTimeSpentRef.current + viewDuration;
        }
        
        console.log('⚠️ Page unloading - saving progress');
        
        // Use sendBeacon for reliable save on page unload
        const userEmail = localStorage.getItem('userEmail');
        const progressData = {
          user_email: userEmail,
          course_id: courseId,
          video_watch_time: Math.floor(videoWatchTimeRef.current),
          ppt_view_time: Math.floor(finalPptTime),
          total_time_spent: Math.floor(finalTotalTime),
          progress_percentage: calculateProgress()
        };
        
        // Send data using fetch with keepalive flag (more reliable than sendBeacon for JSON)
        fetch(`${API_BASE_URL}/api/course-progress`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(progressData),
          keepalive: true // Ensures request completes even if page unloads
        }).catch(err => console.error('Failed to save on unload:', err));
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isEnrolled, courseId, API_BASE_URL]);

  // Handle Start Learning - Enroll user in course
  const handleStartLearning = async () => {
    try {
      setEnrollmentLoading(true);
      const userEmail = localStorage.getItem('userEmail');
      
      if (!userEmail) {
        alert('Please log in to start learning');
        navigate('/login');
        return;
      }

      // Create/check enrollment
      const response = await fetch(`${API_BASE_URL}/api/course-progress`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_email: userEmail,
          course_id: courseId,
          action: 'enroll'
        })
      });

      if (response.ok) {
        setIsEnrolled(true);
        alert('Course started! You can now access all videos and materials.');
        // Start the progress tracking
        startProgressTracking();
      } else {
        const error = await response.json();
        alert(error.message || 'Failed to enroll in course');
      }
    } catch (error) {
      console.error('Error enrolling in course:', error);
      alert('Failed to start course. Please try again.');
    } finally {
      setEnrollmentLoading(false);
    }
  };

  // Start progress tracking (called after enrollment)
  const startProgressTracking = () => {
    // Save progress every 30 seconds
    saveProgressInterval.current = setInterval(() => {
      saveProgress();
    }, 30000);
  };

  // Save progress to backend
  const saveProgress = async (forcedVideoTime = null, forcedPptTime = null, forcedTotalTime = null) => {
    if (!isEnrolled) return;
    
    try {
      const userEmail = localStorage.getItem('userEmail');
      
      // Use forced values if provided, otherwise use REF values (not state - refs are always current)
      const currentVideoTime = forcedVideoTime !== null ? forcedVideoTime : videoWatchTimeRef.current;
      const currentPptTime = forcedPptTime !== null ? forcedPptTime : pptViewTimeRef.current;
      const currentTotalTime = forcedTotalTime !== null ? forcedTotalTime : totalTimeSpentRef.current;
      
      const progressPercentage = calculateProgress();
      
      const progressData = {
        user_email: userEmail,
        course_id: courseId,
        video_watch_time: Math.floor(currentVideoTime),
        ppt_view_time: Math.floor(currentPptTime),
        total_time_spent: Math.floor(currentTotalTime),
        progress_percentage: progressPercentage
      };
      
      console.log('💾 Saving progress:', progressData);
      
      const response = await fetch(`${API_BASE_URL}/api/course-progress`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(progressData)
      });
      
      if (response.ok) {
        console.log('✓ Progress saved successfully');
      } else {
        console.error('✗ Failed to save progress:', response.status);
      }
    } catch (error) {
      console.error('✗ Error saving progress:', error);
    }
  };

  // Calculate progress percentage based on admin's Credit Hours & Duration
  const calculateProgress = () => {
    if (!course) return 0;
    
    // Total time spent by user (convert seconds to hours)
    const totalTimeSpentSeconds = totalTimeSpentRef.current;
    const totalTimeSpentHours = totalTimeSpentSeconds / 3600;
    
    // Calculate expected total hours based on admin settings
    let expectedTotalHours = 0;
    
    if (course.creditHours && course.creditHours > 0) {
      // Method 1: Use Credit Hours (1 credit hour = 15 total study hours - industry standard)
      expectedTotalHours = course.creditHours * 15;
      console.log(`📊 Progress Calculation: Using Credit Hours`);
      console.log(`   Credit Hours: ${course.creditHours} credits`);
      console.log(`   Expected Total: ${expectedTotalHours} hours`);
    } else if (course.durationWeeks && course.durationWeeks > 0) {
      // Method 2: Use Duration in Weeks (1 week = 10 study hours - standard estimate)
      expectedTotalHours = course.durationWeeks * 10;
      console.log(`📊 Progress Calculation: Using Duration Weeks`);
      console.log(`   Duration: ${course.durationWeeks} weeks`);
      console.log(`   Expected Total: ${expectedTotalHours} hours`);
    } else if (course.videos && course.videos.length > 0) {
      // Method 3: Fallback to video-based estimate (assume 5 min per video + materials)
      expectedTotalHours = (course.videos.length * 5) / 60; // 5 minutes per video in hours
      expectedTotalHours += 1; // Add 1 hour for materials/revision
      console.log(`📊 Progress Calculation: Using Video Count Fallback`);
      console.log(`   Videos: ${course.videos.length}`);
      console.log(`   Expected Total: ${expectedTotalHours.toFixed(2)} hours`);
    } else {
      // Method 4: Ultimate fallback - minimum 1 hour course
      expectedTotalHours = 1;
      console.log(`📊 Progress Calculation: Using Minimum Fallback (1 hour)`);
    }
    
    // Calculate progress percentage
    const progressPercentage = (totalTimeSpentHours / expectedTotalHours) * 100;
    
    // Cap at 100%
    const finalProgress = Math.min(Math.floor(progressPercentage), 100);
    
    console.log(`📈 Progress: ${totalTimeSpentHours.toFixed(2)} hours / ${expectedTotalHours} hours = ${finalProgress}%`);
    
    return finalProgress;
  };

  // Track video watch time using timeupdate event
  const handleVideoTimeUpdate = () => {
    if (!isEnrolled || !videoRef.current) return;
    
    const currentTime = Math.floor(videoRef.current.currentTime);
    const lastTime = lastVideoTimeRef.current;
    
    // Only count if video is actually playing forward (not seeking backwards)
    if (currentTime > lastTime && currentTime - lastTime <= 2) {
      const secondsWatched = currentTime - lastTime;
      
      // Update refs immediately (synchronous - source of truth)
      videoWatchTimeRef.current += secondsWatched;
      totalTimeSpentRef.current += secondsWatched;
      
      // Update state for UI display
      setVideoWatchTime(prev => {
        const newTime = prev + secondsWatched;
        return newTime;
      });
      
      setTotalTimeSpent(prev => {
        const newTotal = prev + secondsWatched;
        const videoHours = (videoWatchTimeRef.current / 3600).toFixed(3);
        const totalHours = (totalTimeSpentRef.current / 3600).toFixed(3);
        console.log(`📹 Video: ${videoHours} hours | Total: ${totalHours} hours`);
        return newTotal;
      });
    }
    
    lastVideoTimeRef.current = currentTime;
  };

  const handleVideoPlay = () => {
    if (!isEnrolled) return;
    
    console.log('▶ Video started playing');
    isVideoPlayingRef.current = true;
    
    // Record starting position
    if (videoRef.current) {
      lastVideoTimeRef.current = Math.floor(videoRef.current.currentTime);
    }
  };

  const handleVideoPause = () => {
    console.log('⏸ Video paused');
    isVideoPlayingRef.current = false;
    
    // Save progress when paused
    saveProgress();
  };

  const handleVideoEnded = () => {
    console.log('✓ Video ended');
    isVideoPlayingRef.current = false;
    
    // Save final progress
    saveProgress();
  };

  // Handle seeking (when user skips forward/backward)
  const handleVideoSeeking = () => {
    if (!videoRef.current) return;
    
    console.log('⏩ Video seeking to:', Math.floor(videoRef.current.currentTime) + 's');
    // Update last time to prevent counting skipped time
    lastVideoTimeRef.current = Math.floor(videoRef.current.currentTime);
  };

  // Handle PPT viewer - track view time
  const handlePPTviewer = (url) => {
    if (!isEnrolled) {
      alert('Please click "Start Learning" to access course materials');
      return;
    }
    
    setPptUrl(url);
    setShowModal(true);
    // Start PPT tracking
    pptStartTimeRef.current = Date.now();
  };

  const handleClosePPTModal = () => {
    setShowModal(false);
    setPptUrl(null);
    
    // Calculate PPT view time
    if (pptStartTimeRef.current) {
      const viewDuration = Math.floor((Date.now() - pptStartTimeRef.current) / 1000);
      
      // Update refs immediately (synchronous - source of truth)
      pptViewTimeRef.current += viewDuration;
      totalTimeSpentRef.current += viewDuration;
      
      const newPptTime = pptViewTimeRef.current;
      const newTotalTime = totalTimeSpentRef.current;
      
      console.log('📊 PPT Modal Closed:');
      console.log('  - View Duration:', (viewDuration / 3600).toFixed(3), 'hours');
      console.log('  - New PPT Time:', (newPptTime / 3600).toFixed(3), 'hours');
      console.log('  - New Total Time:', (newTotalTime / 3600).toFixed(3), 'hours');
      
      // Update state for UI display
      setPptViewTime(newPptTime);
      setTotalTimeSpent(newTotalTime);
      pptStartTimeRef.current = null;
      
      // Save with ref values (they're already updated)
      saveProgress();
    }
  };

  // Format time in seconds to readable string
  const formatTime = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hrs > 0) {
      return `${hrs}h ${mins}m ${secs}s`;
    } else if (mins > 0) {
      return `${mins}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (videoTrackingInterval.current) {
        clearInterval(videoTrackingInterval.current);
      }
      if (saveProgressInterval.current) {
        clearInterval(saveProgressInterval.current);
      }
      
      // Handle PPT modal still open when unmounting
      if (pptStartTimeRef.current) {
        const viewDuration = Math.floor((Date.now() - pptStartTimeRef.current) / 1000);
        
        // Update refs with final PPT time
        pptViewTimeRef.current += viewDuration;
        totalTimeSpentRef.current += viewDuration;
        
        console.log('🚪 Unmounting with open PPT - saving final progress');
        
        // Save final progress using updated refs
        saveProgress();
      } else if (isEnrolled) {
        // Save final progress before leaving
        console.log('🚪 Unmounting - saving final progress');
        saveProgress();
      }
    };
  }, [isEnrolled]); // Only depend on isEnrolled, not time values

  if (loading) {
    return (
      <div className="course-detail-error">
        <h2>Loading course...</h2>
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="course-detail-error">
        <h2>Course not found</h2>
        <button className="primary-btn" onClick={() => navigate('/user/my-courses')}>
          Back to My Courses
        </button>
      </div>
    );
  }

  const pendingTests = requiredTests.filter((test) => !test.hasPassed);
  const getTestingUrlForTest = (test) => `/user/testing?courseId=${courseId}&standardId=${test.standardId}&standardType=${test.standardType}`;

  return (
    <div className="course-detail-page">
      <div className="course-detail-header">
        <button className="back-btn" onClick={() => navigate(-1)}>
          ← Back
        </button>
        <div className="course-header-content">
          <div className="course-meta-tags">
            <span className="meta-tag">{course.category}</span>
            <span className="meta-tag level">{course.level}</span>
          </div>
          <h1>{course.title}</h1>
          <p className="course-intro">{course.description}</p>
          <>
             {/* Test Completed - Show result badge */}
            {testCompleted && testResult && (
              <div style={{
                marginTop: '1.5rem',
                padding: '2rem',
                background: testResult.passed 
                  ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                  : 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                borderRadius: '20px',
                textAlign: 'center',
                boxShadow: testResult.passed 
                  ? '0 10px 30px rgba(16, 185, 129, 0.3)'
                  : '0 10px 30px rgba(239, 68, 68, 0.3)',
                position: 'relative',
                overflow: 'hidden'
              }}>
                {/* Decorative background pattern */}
                <div style={{
                  position: 'absolute',
                  top: '-50px',
                  right: '-50px',
                  width: '150px',
                  height: '150px',
                  background: 'rgba(255, 255, 255, 0.1)',
                  borderRadius: '50%',
                  opacity: 0.3
                }}></div>
                <div style={{
                  position: 'absolute',
                  bottom: '-30px',
                  left: '-30px',
                  width: '100px',
                  height: '100px',
                  background: 'rgba(255, 255, 255, 0.1)',
                  borderRadius: '50%',
                  opacity: 0.3
                }}></div>

                {/* Icon with background */}
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '80px',
                  height: '80px',
                  background: 'rgba(255, 255, 255, 0.2)',
                  borderRadius: '50%',
                  marginBottom: '1rem',
                  fontSize: '3rem',
                  position: 'relative',
                  zIndex: 1
                }}>
                  {/* {testResult.passed ? '🎉' : '📝'} */}
                </div>

                {/* Title */}
                <div style={{
                  fontSize: '1.5rem',
                  fontWeight: '800',
                  color: '#ffffff',
                  marginBottom: '0.5rem',
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                  position: 'relative',
                  zIndex: 1
                }}>
                  Test {testResult.passed ? 'Passed!' : 'Completed'}
                </div>

                {/* Score Display */}
                <div style={{
                  display: 'inline-block',
                  background: 'rgba(255, 255, 255, 0.25)',
                  padding: '1.5rem 3rem',
                  borderRadius: '15px',
                  marginBottom: '1.5rem',
                  position: 'relative',
                  zIndex: 1
                }}>
                  <div style={{
                    fontSize: '0.9rem',
                    color: 'rgba(255, 255, 255, 0.9)',
                    fontWeight: '600',
                    marginBottom: '0.5rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>
                    Your Score
                  </div>
                  <div style={{
                    fontSize: '3rem',
                    fontWeight: '900',
                    color: '#ffffff',
                    lineHeight: '1',
                    fontFamily: 'monospace'
                  }}>
                    {testResult.score_percentage}%
                  </div>
                </div>

                {/* Stats Grid */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '1rem',
                  marginBottom: '1.5rem',
                  position: 'relative',
                  zIndex: 1
                }}>
                  <div style={{
                    background: 'rgba(255, 255, 255, 0.2)',
                    padding: '1rem',
                    borderRadius: '12px'
                  }}>
                    <div style={{
                      fontSize: '1.8rem',
                      fontWeight: '800',
                      color: '#ffffff',
                      marginBottom: '0.25rem'
                    }}>
                      {testResult.correct_answers}
                    </div>
                    <div style={{
                      fontSize: '0.8rem',
                      color: 'rgba(255, 255, 255, 0.9)',
                      fontWeight: '600'
                    }}>
                      Correct Answers
                    </div>
                  </div>
                  <div style={{
                    background: 'rgba(255, 255, 255, 0.2)',
                    padding: '1rem',
                    borderRadius: '12px'
                  }}>
                    <div style={{
                      fontSize: '1.8rem',
                      fontWeight: '800',
                      color: '#ffffff',
                      marginBottom: '0.25rem'
                    }}>
                      {testResult.total_questions}
                    </div>
                    <div style={{
                      fontSize: '0.8rem',
                      color: 'rgba(255, 255, 255, 0.9)',
                      fontWeight: '600'
                    }}>
                      Total Questions
                    </div>
                  </div>
                </div>

                {/* Warning Banner */}
                <div style={{
                  background: 'rgba(0, 0, 0, 0.2)',
                  padding: '1rem 1.5rem',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.75rem',
                  position: 'relative',
                  zIndex: 1
                }}>
                  <div style={{
                    fontSize: '1.5rem'
                  }}>
                    
                  </div>
                  <div style={{
                    fontSize: '0.9rem',
                    color: '#ffffff',
                    fontWeight: '700',
                    textAlign: 'left'
                  }}>
                    Test Locked - Can Only Be Taken Once
                  </div>
                </div>
              </div>
            )}
          </>
          
          <div className="course-stats">
            <div className="stat-item">
              <div>
                <strong>{course.instructor}</strong>
                <span>Instructor</span>
              </div>
            </div>
            <div className="stat-item">
              <div>
                <strong>{course.rating}</strong>
                <span>({course.totalRatings} ratings)</span>
              </div>
            </div>
            <div className="stat-item">
              <div>
                <strong>{course.enrolled}</strong>
                <span>Enrolled</span>
              </div>
            </div>
            <div className="stat-item">
              <div>
                <strong>{course.creditHours}h</strong>
                <span>Credit Hours</span>
              </div>
            </div>
            <div className="stat-item">
              <div>
                <strong>{course.duration}</strong>
                <span>Duration</span>
              </div>
            </div>
          </div>
          <div className="course-actions">
            <button 
              className="primary-btn large" 
              onClick={handleStartLearning}
              disabled={isEnrolled || enrollmentLoading}
              style={{
                opacity: isEnrolled ? 0.7 : 1,
                cursor: isEnrolled ? 'not-allowed' : 'pointer'
              }}
            >
              {enrollmentLoading ? 'Starting...' : isEnrolled ? 'Course Started ✓' : 'Start Learning'}
            </button>
            <button className="ghost-btn large" onClick={() => navigate('/user/my-courses')}>
              View All My Courses
            </button>
            
            {/* Debug: Log test state */}
            {console.log('🎯 Test Display State:', { 
              testUnlocked, 
              testCompleted, 
              hasTestResult: !!testResult,
              testResult,
              requiredTests
            })}
            
            {/* Test Choice Buttons - Show when test is unlocked */}
            {testUnlocked && pendingTests.length > 0 && (
              <div style={{ width: '100%', marginTop: '1rem' }}>
                <div style={{
                  marginBottom: '0.75rem',
                  padding: '0.9rem 1rem',
                  borderRadius: '10px',
                  background: 'rgba(16, 185, 129, 0.12)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  color: '#d1fae5'
                }}>
                  <div style={{ fontWeight: '700', fontSize: '0.95rem', marginBottom: '0.25rem' }}>
                    Select test to start first
                  </div>
                  <div style={{ fontSize: '0.8rem', opacity: 0.9 }}>
                    Course complete tab hoga jab tamam required tests pass ho jaayen.
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {requiredTests.map((test) => (
                    <div
                      key={test.standardId}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '0.75rem',
                        padding: '0.9rem 1rem',
                        borderRadius: '12px',
                        background: test.hasPassed ? 'rgba(16, 185, 129, 0.12)' : 'rgba(245, 158, 11, 0.12)',
                        border: `1px solid ${test.hasPassed ? 'rgba(16, 185, 129, 0.35)' : 'rgba(245, 158, 11, 0.35)'}`
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: '700', color: '#ffffff', fontSize: '0.92rem' }}>
                          {test.label}
                        </div>
                        <div style={{ fontSize: '0.78rem', color: test.hasPassed ? '#a7f3d0' : '#fde68a' }}>
                          {test.hasPassed ? 'Passed' : test.hasResult ? 'Attempted - pass required' : 'Not attempted yet'}
                        </div>
                      </div>

                      {test.hasPassed ? (
                        <span style={{
                          padding: '8px 12px',
                          borderRadius: '999px',
                          background: 'rgba(16, 185, 129, 0.2)',
                          color: '#a7f3d0',
                          fontWeight: '700',
                          fontSize: '0.78rem'
                        }}>
                          Done
                        </span>
                      ) : (
                        <button
                          className="primary-btn"
                          onClick={() => navigate(getTestingUrlForTest(test))}
                          style={{
                            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                            minWidth: '170px'
                          }}
                        >
                          {test.hasResult ? 'Retake' : 'Start'} {test.standardType === 'general' ? 'General' : test.standardType === 'specific' ? 'Specific' : ''} Test
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {testUnlocked && testCompleted && (
              <div style={{
                marginTop: '1rem',
                padding: '1rem',
                background: 'rgba(16, 185, 129, 0.12)',
                border: '1px solid rgba(16, 185, 129, 0.35)',
                borderRadius: '10px',
                color: '#a7f3d0',
                fontWeight: '700',
                textAlign: 'center'
              }}>
                ✅ All required tests completed
              </div>
            )}
            
            {/* Progress indicator when test not yet unlocked */}
            {isEnrolled && !testUnlocked && testUnlockInfo && (
              <div style={{
                marginTop: '1rem',
                padding: '1rem',
                background: 'rgba(251, 191, 36, 0.1)',
                border: '2px solid rgba(251, 191, 36, 0.3)',
                borderRadius: '10px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '0.9rem', color: '#fbbf24', marginBottom: '0.5rem' }}>
                  📚 Complete course to unlock test
                </div>
                <div style={{ fontSize: '0.8rem', color: 'rgba(255, 255, 255, 0.7)' }}>
                  {testUnlockInfo.reason}
                </div>
              </div>
            )}
          </div>

          {/* Time Tracking Widget - Only show if enrolled */}
          {isEnrolled && (
            <div style={{
              marginTop: '2rem',
              padding: '1.5rem',
              background: 'linear-gradient(135deg, rgba(230, 57, 70, 0.1) 0%, rgba(250, 82, 82, 0.05) 100%)',
              borderRadius: '15px',
              border: '2px solid rgba(230, 57, 70, 0.2)',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
              gap: '1rem'
            }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ 
                  fontSize: '0.75rem', 
                  color: '#64748b',
                  fontWeight: '600',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  marginBottom: '0.5rem'
                }}>
                  Total Time
                </div>
                <div style={{
                  fontSize: '1.5rem',
                  fontWeight: '800',
                  color: '#E63946',
                  fontFamily: 'monospace'
                }}>
                  {formatTime(totalTimeSpent)}
                </div>
              </div>

              <div style={{ textAlign: 'center' }}>
                <div style={{ 
                  fontSize: '0.75rem', 
                  color: '#64748b',
                  fontWeight: '600',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  marginBottom: '0.5rem'
                }}>
                  Video Time
                </div>
                <div style={{
                  fontSize: '1.5rem',
                  fontWeight: '800',
                  color: '#667eea',
                  fontFamily: 'monospace'
                }}>
                  {formatTime(videoWatchTime)}
                </div>
              </div>

              <div style={{ textAlign: 'center' }}>
                <div style={{ 
                  fontSize: '0.75rem', 
                  color: '#64748b',
                  fontWeight: '600',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  marginBottom: '0.5rem'
                }}>
                  Material Time
                </div>
                <div style={{
                  fontSize: '1.5rem',
                  fontWeight: '800',
                  color: '#10b981',
                  fontFamily: 'monospace'
                }}>
                  {formatTime(pptViewTime)}
                </div>
              </div>

              <div style={{ textAlign: 'center' }}>
                <div style={{ 
                  fontSize: '0.75rem', 
                  color: '#64748b',
                  fontWeight: '600',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  marginBottom: '0.5rem'
                }}>
                  Progress
                </div>
                <div style={{
                  fontSize: '1.5rem',
                  fontWeight: '800',
                  color: '#f59e0b',
                  fontFamily: 'monospace'
                }}>
                  {calculateProgress()}%
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="course-detail-body">
        <div className="course-main-content">
          <div className="video-player-section">
            {course.videos && course.videos.length > 0 ? (
              <>
                <div className="video-container" style={{ position: 'relative' }}>
                  {(() => {
                    const videoPath = course.videos[selectedVideo]?.url || course.videos[selectedVideo];
                    const videoUrl = videoPath.startsWith('http') ? videoPath : `${API_BASE_URL}${videoPath}`;

                    // Check if it's a YouTube/external video or local file
                    const isExternalVideo = videoPath.includes('youtube.com') ||
                      videoPath.includes('youtu.be') ||
                      videoPath.includes('vimeo.com');

                    if (isExternalVideo) {
                      return (
                        <>
                          <iframe
                            src={isEnrolled ? videoUrl : ''}
                            title={course.videos[selectedVideo]?.title || `Video ${selectedVideo + 1}`}
                            frameBorder="0"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                            style={{ filter: isEnrolled ? 'none' : 'blur(10px)' }}
                          />
                          {!isEnrolled && (
                            <div style={{
                              position: 'absolute',
                              top: 0,
                              left: 0,
                              right: 0,
                              bottom: 0,
                              background: 'rgba(0, 0, 0, 0.8)',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              justifyContent: 'center',
                              zIndex: 10,
                              textAlign: 'center',
                              padding: '2rem'
                            }}>
                              <svg width="64" height="64" fill="none" stroke="#E63946" strokeWidth="2" viewBox="0 0 24 24" style={{ marginBottom: '1rem' }}>
                                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                              </svg>
                              <h3 style={{ color: '#fff', fontSize: '1.5rem', marginBottom: '0.5rem' }}>Video Locked</h3>
                              <p style={{ color: 'rgba(255,255,255,0.7)', marginBottom: '1.5rem', maxWidth: '350px' }}>
                                Click "Start Learning" button to enroll and unlock all course videos
                              </p>
                            </div>
                          )}
                        </>
                      );
                    } else {
                      return (
                        <>
                          <video
                            ref={videoRef}
                            key={videoUrl}
                            controls={isEnrolled}
                            controlsList="nodownload"
                            className="course-video-player"
                            onPlay={handleVideoPlay}
                            onPause={handleVideoPause}
                            onEnded={handleVideoEnded}
                            onTimeUpdate={handleVideoTimeUpdate}
                            onSeeking={handleVideoSeeking}
                            style={{ filter: isEnrolled ? 'none' : 'blur(10px)' }}
                          >
                            <source src={videoUrl} type="video/mp4" />
                            <source src={videoUrl} type="video/webm" />
                            <source src={videoUrl} type="video/ogg" />
                            Your browser does not support the video tag.
                          </video>
                          {!isEnrolled && (
                            <div style={{
                              position: 'absolute',
                              top: 0,
                              left: 0,
                              right: 0,
                              bottom: 0,
                              background: 'rgba(0, 0, 0, 0.8)',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              justifyContent: 'center',
                              zIndex: 10,
                              textAlign: 'center',
                              padding: '2rem'
                            }}>
                              <svg width="64" height="64" fill="none" stroke="#E63946" strokeWidth="2" viewBox="0 0 24 24" style={{ marginBottom: '1rem' }}>
                                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                              </svg>
                              <h3 style={{ color: '#fff', fontSize: '1.5rem', marginBottom: '0.5rem' }}>Video Locked</h3>
                              <p style={{ color: 'rgba(255,255,255,0.7)', marginBottom: '1.5rem', maxWidth: '350px' }}>
                                Click "Start Learning" button to enroll and unlock all course videos
                              </p>
                            </div>
                          )}
                        </>
                      );
                    }
                  })()}
                </div>
                <div className="video-playlist">
                  <h3>Course Videos ({course.videos.length})</h3>
                  <ul>
                    {course.videos.map((video, index) => {
                      const videoPath = video?.url || video;
                      const isExternal = videoPath.includes('youtube') || videoPath.includes('vimeo');

                      return (
                        <li
                          key={index}
                          className={selectedVideo === index ? 'active' : ''}
                          onClick={() => {
                            if (isEnrolled) {
                              setSelectedVideo(index);
                            } else {
                              alert('Please click "Start Learning" to access videos');
                            }
                          }}
                          style={{
                            cursor: isEnrolled ? 'pointer' : 'not-allowed',
                            opacity: isEnrolled ? 1 : 0.6
                          }}
                        >
                          <span className="video-number">{index + 1}</span>
                          <div className="video-info">
                            <strong>
                              {video?.title || `Video ${index + 1}`}
                              {isExternal && <span style={{ marginLeft: '8px', fontSize: '0.85em' }}>[External]</span>}
                            </strong>
                            <span>{video?.duration || 'Video'}</span>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </>
            ) : (
              <div className="no-videos-placeholder">
                {course.thumbnail && <img src={course.thumbnail} alt={course.title} />}
                <p>Video content will be available soon</p>
              </div>
            )}
          </div>

          <div className="course-tabs">
            <div className="tab-headers">
              <button
                className={activeTab === 'overview' ? 'active' : ''}
                onClick={() => setActiveTab('overview')}
              >
                Overview
              </button>
              <button
                className={activeTab === 'syllabus' ? 'active' : ''}
                onClick={() => setActiveTab('syllabus')}
              >
                Syllabus
              </button>
              <button
                className={activeTab === 'resources' ? 'active' : ''}
                onClick={() => setActiveTab('resources')}
              >
                Resources
              </button>
            </div>

            <div className="tab-content">
              {activeTab === 'overview' && (
                <div className="overview-tab">
                  <section>
                    <h3>What You'll Learn</h3>
                    <ul className="outcomes-list">
                      {course.learningOutcomes.map((outcome, index) => (
                        <li key={index}>
                          <span className="check-icon">✓</span>
                          {outcome}
                        </li>
                      ))}
                    </ul>
                  </section>

                  <section>
                    <h3>Prerequisites</h3>
                    <p className="prerequisites-text">{course.prerequisites}</p>
                  </section>

                  <section>
                    <h3>Course Description</h3>
                    <p>{course.description}</p>
                  </section>
                </div>
              )}

              {activeTab === 'syllabus' && (
                <div className="syllabus-tab">
                  <h3>Course Curriculum</h3>
                  {course.syllabus && course.syllabus.length > 0 ? (
                    <div className="syllabus-list">
                      {course.syllabus.map((item, index) => (
                        <div className="syllabus-item" key={index}>
                          <div className="syllabus-header">
                            <span className="week-badge">Week {item.week}</span>
                            <h4>{item.title}</h4>
                          </div>
                          <ul className="topics-list">
                            {item.topics.map((topic, i) => (
                              <li key={i}>{topic}</li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ padding: '2rem', textAlign: 'center', color: 'rgba(255, 255, 255, 0.6)' }}>
                      <p>Course curriculum will be available soon.</p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'resources' && (
                <div className="resources-tab">
                  {course.pdf_path ? (
                    <>
                      <PdfViewer pdfUrl={course.pdf_path} />
                      <div style={{ marginTop: '20px', padding: '20px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
                        <h3 style={{ marginBottom: '15px' }}>Additional Resources</h3>
                        {course.resources && course.resources.length > 0 ? (
                          <ul className="resources-list">
                            {course.resources.map((resource, index) => (
                              <li key={index}>
                                <div className="resource-info">
                                  <span className="resource-icon">📄</span>
                                  <div>
                                    <strong>{resource.name}</strong>
                                    <span>{resource.size}</span>
                                  </div>
                                </div>
                                {resource.url ? (
                                  <button
                                    className="resource-open-btn"
                                    onClick={() => handlePPTviewer(resource.url)}
                                  >
                                    Open PPT
                                  </button>
                                ) : (
                                  <span className="resource-open-btn disabled">No Link</span>
                                )}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p style={{ color: 'rgba(255, 255, 255, 0.6)' }}>No additional resources available.</p>
                        )}
                      </div>
                    </>
                  ) : (
                    <>
                      <h3>Downloadable Resources</h3>
                      {course.resources && course.resources.length > 0 ? (
                        <ul className="resources-list">
                          {course.resources.map((resource, index) => (
                            <li key={index}>
                              <div className="resource-info">
                                <div>
                                  <strong>{resource.name}</strong>
                                  <span>{resource.size}</span>
                                </div>
                              </div>
                              {resource.url ? (
                                <button
                                  className="resource-open-btn"
                                  onClick={() => handlePPTviewer(resource.url)}
                                >
                                  Open in Browser
                                </button>
                              ) : (
                                <span className="resource-open-btn disabled">No Link</span>
                              )}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <div style={{ padding: '2rem', textAlign: 'center', color: 'rgba(255, 255, 255, 0.6)' }}>
                          <p>No downloadable resources available yet.</p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="course-sidebar">
          <div className="sidebar-card">
            {course.thumbnail ? (
              <img src={course.thumbnail} alt={course.title} className="sidebar-thumbnail" />
            ) : (
              <div className="sidebar-thumbnail" style={{ background: 'linear-gradient(135deg, rgba(230, 57, 70, 0.2), rgba(230, 57, 70, 0.05))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255, 255, 255, 0.5)', height: '200px' }}>
                No Image
              </div>
            )}
            <div className="sidebar-info">
              <h4>Course Includes:</h4>
              <ul>
                <li>
                  {course.videos?.length || 0} video lectures
                </li>
                <li>
                  {course.resources?.length || 0} downloadable resources
                </li>
                <li>
                  Access on mobile and desktop
                </li>
                <li>
                  Certificate of completion
                </li>
                <li>
                  Lifetime access
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {showModal && (
        <div className="ppt-overlay">
          <div className="ppt-modal">
            <button
              className="close-btn"
              onClick={handleClosePPTModal}
            >
              ✕
            </button>
            <iframe 
              src={pptUrl} 
              frameBorder="0" 
              width="100%" 
              height="500" 
              allowFullScreen={true}
              title="PPT Viewer"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default CourseDetailUser;
