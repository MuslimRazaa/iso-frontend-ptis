import React, { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import Login from './mainScreens/Login'
import VideoLoader from './components/VideoLoader'
import './assets/style.css'

// ============================================
// ADMIN` MODULES IMPORTS
// ============================================
import MainDashboard from './dashboards/MainDashboard'

// Admin - Learning Management System
import LearningManagementSystem from './LMS/LearningManagementSystem'
import LmsHome from './LMS/pages/LmsHome'
import AddCourse from './LMS/pages/AddCourse'
import AllCourses from './LMS/pages/AllCourses'
import TaskAllocation from './LMS/pages/TaskAllocation'
import CourseCategories from './LMS/pages/CourseCategories'
import CourseDetail from './LMS/pages/CourseDetail'
import AddEmployee from './LMS/pages/AddEmployee'
import AllEmployees from './LMS/pages/AllEmployees'
import SetStandards from './LMS/pages/SetStandards'
import QuestionBank from './LMS/pages/QuestionBank'
import Certificates from './LMS/pages/Certificates'

// Admin - PTIS Portal
import PtisPortal from './Portal/PtisPortal'
import PortalDashboard from './Portal/pages/PortalDashboard'
import AddAdmin from './Portal/pages/AddAdmin'
import AddClient from './Portal/pages/AddClient'
import InsertRecord from './Portal/pages/InsertRecord'
import AllRecords from './Portal/pages/AllRecords'
import UnprocessedRecords from './Portal/pages/UnprocessedRecords'

// ============================================
// USER MODULES IMPORTS
// ============================================
import UserPanel from './UserPanel/UserPanel'
import UserDashboard from './UserPanel/pages/UserDashboard'
import MyCourses from './UserPanel/pages/MyCourses'
import UserCertificates from './UserPanel/pages/UserCertificates'
import JobLogDescription from './UserPanel/pages/JobLogDescription'
import AllLmsCourses from './UserPanel/pages/AllLmsCourses'

function App() {
  const [showLoader, setShowLoader] = useState(true)
  const [hasSeenLoader, setHasSeenLoader] = useState(false)

  useEffect(() => {
    // Check if user has already seen the loader in this session
    const loaderSeen = sessionStorage.getItem('loaderSeen')
    if (loaderSeen === 'true') {
      setShowLoader(false)
      setHasSeenLoader(true)
    }
  }, [])

  const handleLoadingComplete = () => {
    setShowLoader(false)
    setHasSeenLoader(true)
    sessionStorage.setItem('loaderSeen', 'true')
  }

  return (
    <>
      {showLoader && !hasSeenLoader ? (
        <VideoLoader onLoadingComplete={handleLoadingComplete} />
      ) : (
        <Router>
          <Routes>
            {/* ============================================ */}
            {/* PUBLIC ROUTES */}
            {/* ============================================ */}
            <Route path="/" element={<Login />} />

            {/* ============================================ */}
            {/* ADMIN ROUTES - Full Access to All Modules */}
            {/* ============================================ */}
            <Route path="/dashboard" element={<MainDashboard />} />
            
            {/* Admin - Learning Management System */}
            <Route path="/learning-management-system/*" element={<LearningManagementSystem />}>
              <Route index element={<LmsHome />} />
              <Route path="add-course" element={<AddCourse />} />
              <Route path="all-courses" element={<AllCourses />} />
              <Route path="task-allocation" element={<TaskAllocation />} />
              <Route path="course-categories" element={<CourseCategories />} />
              <Route path="add-employee" element={<AddEmployee />} />
              <Route path="all-employees" element={<AllEmployees />} />
              <Route path="set-standards" element={<SetStandards />} />
              <Route path="question-bank" element={<QuestionBank defaultTab="add" />} />
              <Route path="question-bank/view-all" element={<QuestionBank defaultTab="view" />} />
              <Route path="certificates" element={<Certificates />} />
              <Route path="course/:courseId" element={<CourseDetail />} />
            </Route>

            {/* Admin - PTIS Portal */}
            <Route path="/portal/*" element={<PtisPortal />}>
              <Route index element={<PortalDashboard />} />
              <Route path="add-admin" element={<AddAdmin />} />
              <Route path="add-client" element={<AddClient />} />
              <Route path="insert-record" element={<InsertRecord />} />
              <Route path="all-records" element={<AllRecords />} />
              <Route path="unprocessed-records" element={<UnprocessedRecords />} />
            </Route>

            {/* ============================================ */}
            {/* USER ROUTES - Role-Based Access */}
            {/* ============================================ */}
            <Route path="/user/*" element={<UserPanel />}>
              <Route index element={<Navigate to="/user/dashboard" replace />} />
              <Route path="dashboard" element={<UserDashboard />} />
              <Route path="my-courses" element={<MyCourses />} />
              <Route path="all-courses" element={<AllLmsCourses />} />
              <Route path="my-certificates" element={<UserCertificates />} />
              <Route path="course/:courseId" element={<CourseDetail />} />
              <Route path="cvs-access" element={<JobLogDescription />} />
              
              {/* User access to LMS (if permission granted) */}
              <Route path="lms-access" element={<div style={{padding: '40px', textAlign: 'center'}}>
                <h2> LMS Access Portal</h2>
                <p>View courses and manage training</p>
              </div>} />
              
              {/* User access to Portal (if permission granted) */}
              <Route path="portal-access" element={<div style={{padding: '40px', textAlign: 'center'}}>
                <h2> PTIS Portal Access</h2>
                <p>View inspection records</p>
              </div>} />
              
              {/* User Reports */}
              <Route path="reports" element={<div style={{padding: '40px', textAlign: 'center'}}>
                <h2>Reports</h2>
                <p>Generate and view reports</p>
              </div>} />
              
              {/* Help Center */}
              <Route path="help" element={<div style={{padding: '40px', textAlign: 'center'}}>
                <h2> Help Center</h2>
                <p>Get support and documentation</p>
              </div>} />
            </Route>

            {/* Redirect unknown routes to login */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
      )}
    </>
  )
}

export default App
