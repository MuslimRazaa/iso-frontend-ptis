import React, { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import Login from './mainScreens/Login'
import VideoLoader from './components/VideoLoader'
import './assets/style.css'

// ============================================
// ADMIN MODULES IMPORTS
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

// Admin - Job Log Description (standalone module)
import JLRLayout from './JLR/JLRLayout'
import JLRHome from './JLR/pages/JLRHome'

// Testing Module (standalone, integrated from ptis-lms)
import TestingModule from './Testing/TestingModule'
import { ThemeProvider as TestingThemeProvider } from './Testing/contexts/ThemeContext'

// Wraps the testing module in its own ThemeProvider so it can mount as a route.
const TestingModulePage = () => (
  <TestingThemeProvider>
    <TestingModule />
  </TestingThemeProvider>
)

// ============================================
// USER MODULES IMPORTS
// ============================================
import UserPanel from './UserPanel/UserPanel'
import UserDashboard from './UserPanel/pages/UserDashboard'
import MyCourses from './UserPanel/pages/MyCourses'
import UserCertificates from './UserPanel/pages/UserCertificates'
import JobLogDescription from './UserPanel/pages/JobLogDescription'
import AllLmsCourses from './UserPanel/pages/AllLmsCourses'
import TaskAllocations from './UserPanel/pages/TaskAllocations'
import CourseDetailUser from './UserPanel/pages/CourseDetailUser'

// User LMS standalone layout
import UserLmsLayout from './UserLMS/UserLmsLayout'
import UserLmsHome from './UserLMS/UserLmsHome'

function App() {
  const [showLoader, setShowLoader] = useState(true)
  const [hasSeenLoader, setHasSeenLoader] = useState(false)

  useEffect(() => {
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
            {/* PUBLIC ROUTES                               */}
            {/* ============================================ */}
            <Route path="/" element={<Login />} />

            {/* ============================================ */}
            {/* ADMIN ROUTES                                */}
            {/* ============================================ */}
            <Route path="/dashboard" element={<MainDashboard />} />

            {/* Admin — Learning Management System */}
            <Route path="/learning-management-system/*" element={<LearningManagementSystem />}>
              <Route index element={<LmsHome />} />
              <Route path="add-course"          element={<AddCourse />} />
              <Route path="all-courses"         element={<AllCourses />} />
              <Route path="task-allocation"     element={<TaskAllocation />} />
              <Route path="course-categories"   element={<CourseCategories />} />
              <Route path="add-employee"        element={<AddEmployee />} />
              <Route path="all-employees"       element={<AllEmployees />} />
              <Route path="set-standards"       element={<SetStandards />} />
              {/* Question Bank & Certificates moved to the dedicated Testing module */}
              <Route path="course/:courseId"    element={<CourseDetail />} />
            </Route>

            {/* Admin — PTIS Portal */}
            <Route path="/portal/*" element={<PtisPortal />}>
              <Route index element={<PortalDashboard />} />
              <Route path="add-admin"            element={<AddAdmin />} />
              <Route path="add-client"           element={<AddClient />} />
              <Route path="insert-record"        element={<InsertRecord />} />
              <Route path="all-records"          element={<AllRecords />} />
              <Route path="unprocessed-records"  element={<UnprocessedRecords />} />
            </Route>

            {/* Admin — Testing Module (standalone, integrated from ptis-lms) */}
            <Route path="/testing" element={<TestingModulePage />} />

            {/* User — Testing Module (same module, host auth decides role) */}
            <Route path="/user/testing" element={<TestingModulePage />} />

            {/* Admin — Job Log Description (standalone module) */}
            <Route path="/job-log/*" element={<JLRLayout />}>
              <Route index element={<JLRHome />} />
              <Route path="entries" element={<JobLogDescription />} />
            </Route>

            {/* User — Job Log Description (same standalone layout, role-based fields) */}
            <Route path="/user/job-log/*" element={<JLRLayout />}>
              <Route index element={<JLRHome />} />
              <Route path="entries" element={<JobLogDescription />} />
            </Route>

            {/* User — LMS (user-specific layout, no admin pages) */}
            <Route path="/user/learning-management-system/*" element={<UserLmsLayout />}>
              <Route index                      element={<UserLmsHome />} />
              <Route path="my-tasks"            element={<TaskAllocations />} />
              <Route path="all-courses"         element={<AllLmsCourses />} />
              <Route path="my-courses"          element={<MyCourses />} />
              <Route path="certificates"        element={<UserCertificates />} />
              <Route path="course/:courseId"    element={<CourseDetailUser />} />
            </Route>

            {/* ============================================ */}
            {/* USER ROUTES                                 */}
            {/* ============================================ */}
            <Route path="/user/*" element={<UserPanel />}>
              <Route index element={<Navigate to="/user/dashboard" replace />} />
              <Route path="dashboard"       element={<UserDashboard />} />
              {/* Old short URLs → redirect to user LMS */}
              <Route path="my-courses"      element={<Navigate to="/user/learning-management-system/my-courses"   replace />} />
              <Route path="all-courses"     element={<Navigate to="/user/learning-management-system/all-courses"  replace />} />
              <Route path="my-certificates" element={<Navigate to="/user/learning-management-system/certificates" replace />} />
              <Route path="course/:courseId" element={<Navigate to="/user/learning-management-system/my-courses" replace />} />
              {/* Old JLR link → redirects to the standalone module */}
              <Route path="cvs-access" element={<Navigate to="/user/job-log" replace />} />
              {/* Old LMS-access stub → redirect to the real LMS */}
              <Route path="lms-access" element={<Navigate to="/user/learning-management-system" replace />} />
              <Route path="portal-access" element={
                <div style={{ padding: '40px', textAlign: 'center' }}>
                  <h2>PTIS Portal Access</h2><p>View inspection records</p>
                </div>} />
              <Route path="reports" element={
                <div style={{ padding: '40px', textAlign: 'center' }}>
                  <h2>Reports</h2><p>Generate and view reports</p>
                </div>} />
              <Route path="help" element={
                <div style={{ padding: '40px', textAlign: 'center' }}>
                  <h2>Help Center</h2><p>Get support and documentation</p>
                </div>} />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
      )}
    </>
  )
}

export default App
