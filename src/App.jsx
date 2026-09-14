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
import CourseTracking from './LMS/pages/CourseTracking'
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

// Admin - Employee Management (standalone, moved out of LMS)
import EmployeesLayout from './Employees/EmployeesLayout'

// Admin - Job Log Description (standalone module)
import JLRLayout from './JLR/JLRLayout'
import JLRHome from './JLR/pages/JLRHome'
import JLRBackups from './JLR/pages/JLRBackups'
import JLRAuditLog from './JLR/pages/JLRAuditLog'

// Admin - ISO Forms (standalone module, dynamic form builder)
import ISOFormsLayout from './ISOForms/ISOFormsLayout'
import ISOFormsHome from './ISOForms/pages/ISOFormsHome'
import TemplatesList from './ISOForms/admin/TemplatesList'
import TemplateBuilder from './ISOForms/admin/TemplateBuilder'
import ISOFormsAuditLog from './ISOForms/admin/AuditLog'
import FormFiller from './ISOForms/pages/FormFiller'
import FormEntriesList from './ISOForms/pages/FormEntriesList'
import FormDetail from './ISOForms/pages/FormDetail'

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
import CourseHistory from './UserPanel/pages/CourseHistory'
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
              <Route path="course-tracking"     element={<CourseTracking />} />
              {/* Employee management moved out of the LMS → standalone /employees */}
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

            {/* Admin — Employee Management (standalone, moved out of LMS) */}
            <Route path="/employees" element={<EmployeesLayout />}>
              <Route index                element={<AllEmployees />} />
              <Route path="all-employees" element={<AllEmployees />} />
              <Route path="add-employee"  element={<AddEmployee />} />
            </Route>
            {/* Old LMS employee URLs → redirect to the standalone area */}
            <Route path="/learning-management-system/all-employees" element={<Navigate to="/employees/all-employees" replace />} />
            <Route path="/learning-management-system/add-employee"  element={<Navigate to="/employees/add-employee" replace />} />

            {/* Admin — Testing Module (standalone, integrated from ptis-lms) */}
            <Route path="/testing" element={<TestingModulePage />} />

            {/* User — Testing Module (same module, host auth decides role).
                When opened from a course (from=course) it also records to the
                LMS test_results and returns to the LMS afterwards. */}
            <Route path="/user/testing" element={<TestingModulePage />} />

            {/* Admin — Job Log Description (standalone module) */}
            <Route path="/job-log/*" element={<JLRLayout />}>
              <Route index element={<JLRHome />} />
              <Route path="entries" element={<JobLogDescription />} />
              <Route path="backups" element={<JLRBackups />} />
              <Route path="audit-log" element={<JLRAuditLog />} />
            </Route>

            {/* User — Job Log Description (same standalone layout, role-based fields) */}
            <Route path="/user/job-log/*" element={<JLRLayout />}>
              <Route index element={<JLRHome />} />
              <Route path="entries" element={<JobLogDescription />} />
            </Route>

            {/* Admin — ISO Forms (standalone module, dynamic form builder) */}
            <Route path="/iso-forms/*" element={<ISOFormsLayout />}>
              <Route index element={<ISOFormsHome />} />
              <Route path="templates" element={<TemplatesList />} />
              <Route path="templates/new" element={<TemplateBuilder />} />
              <Route path="templates/:id/edit" element={<TemplateBuilder />} />
              <Route path="new" element={<FormFiller />} />
              <Route path="new/:templateId" element={<FormFiller />} />
              <Route path="entries" element={<FormEntriesList />} />
              <Route path="entries/:id" element={<FormDetail />} />
              <Route path="entries/:id/edit" element={<FormFiller />} />
              <Route path="audit-log" element={<ISOFormsAuditLog />} />
            </Route>

            {/* User — ISO Forms (same standalone layout, role-based fields) */}
            <Route path="/user/iso-forms/*" element={<ISOFormsLayout />}>
              <Route index element={<ISOFormsHome />} />
              <Route path="templates" element={<TemplatesList />} />
              <Route path="templates/new" element={<TemplateBuilder />} />
              <Route path="templates/:id/edit" element={<TemplateBuilder />} />
              <Route path="new" element={<FormFiller />} />
              <Route path="new/:templateId" element={<FormFiller />} />
              <Route path="entries" element={<FormEntriesList />} />
              <Route path="entries/:id" element={<FormDetail />} />
              <Route path="entries/:id/edit" element={<FormFiller />} />
              <Route path="audit-log" element={<ISOFormsAuditLog />} />
            </Route>

            {/* User — LMS (user-specific layout, no admin pages) */}
            <Route path="/user/learning-management-system/*" element={<UserLmsLayout />}>
              <Route index                      element={<UserLmsHome />} />
              {/* My Tasks & Browse merged into the single My Courses page */}
              <Route path="my-tasks"            element={<Navigate to="/user/learning-management-system/my-courses" replace />} />
              <Route path="all-courses"         element={<Navigate to="/user/learning-management-system/my-courses" replace />} />
              <Route path="my-courses"          element={<MyCourses />} />
              <Route path="history"             element={<CourseHistory />} />
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
