import React, { useState, useEffect, Suspense, lazy } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import Login from './mainScreens/Login'
import VideoLoader from './components/VideoLoader'
import { ToastHost } from './components/Toast'
import { initModalScrollLock } from './utils/modalScrollLock'
import './assets/style.css'

// ============================================
// ADMIN MODULES IMPORTS
// ============================================
// Route-level code splitting: every page below used to be a static import, so
// visiting the Login page downloaded the same bundle as every admin module,
// PDF/Excel export libs included (~4.2MB). Lazy-loading means a route's code
// (and its dependencies) is only fetched when that route is actually visited.
const MainDashboard = lazy(() => import('./dashboards/MainDashboard'))

// Admin - Learning Management System
const LearningManagementSystem = lazy(() => import('./LMS/LearningManagementSystem'))
const LmsHome = lazy(() => import('./LMS/pages/LmsHome'))
const AddCourse = lazy(() => import('./LMS/pages/AddCourse'))
const AllCourses = lazy(() => import('./LMS/pages/AllCourses'))
const TaskAllocation = lazy(() => import('./LMS/pages/TaskAllocation'))
const CourseCategories = lazy(() => import('./LMS/pages/CourseCategories'))
const CourseTracking = lazy(() => import('./LMS/pages/CourseTracking'))
const CourseDetail = lazy(() => import('./LMS/pages/CourseDetail'))
const AddEmployee = lazy(() => import('./LMS/pages/AddEmployee'))
const AllEmployees = lazy(() => import('./LMS/pages/AllEmployees'))
const SetStandards = lazy(() => import('./LMS/pages/SetStandards'))
const QuestionBank = lazy(() => import('./LMS/pages/QuestionBank'))
const Certificates = lazy(() => import('./LMS/pages/Certificates'))


// Admin - PTIS Portal
const PtisPortal = lazy(() => import('./Portal/PtisPortal'))
const PortalDashboard = lazy(() => import('./Portal/pages/PortalDashboard'))
const AddAdmin = lazy(() => import('./Portal/pages/AddAdmin'))
const AddClient = lazy(() => import('./Portal/pages/AddClient'))
const InsertRecord = lazy(() => import('./Portal/pages/InsertRecord'))
const AllRecords = lazy(() => import('./Portal/pages/AllRecords'))
const UnprocessedRecords = lazy(() => import('./Portal/pages/UnprocessedRecords'))

// Admin - Employee Management (standalone, moved out of LMS)
const EmployeesLayout = lazy(() => import('./Employees/EmployeesLayout'))

// Admin - Job Log Description (standalone module)
const JLRLayout = lazy(() => import('./JLR/JLRLayout'))
const JLRHome = lazy(() => import('./JLR/pages/JLRHome'))
const JLRBackups = lazy(() => import('./JLR/pages/JLRBackups'))
const JLRAuditLog = lazy(() => import('./JLR/pages/JLRAuditLog'))

// Admin - ISO Forms (standalone module, dynamic form builder)
const ISOFormsLayout = lazy(() => import('./ISOForms/ISOFormsLayout'))
const ISOFormsHome = lazy(() => import('./ISOForms/pages/ISOFormsHome'))
const TemplatesList = lazy(() => import('./ISOForms/admin/TemplatesList'))
const TemplateBuilder = lazy(() => import('./ISOForms/admin/TemplateBuilder'))
const ISOFormsAuditLog = lazy(() => import('./ISOForms/admin/AuditLog'))
const FormFiller = lazy(() => import('./ISOForms/pages/FormFiller'))
const FormEntriesList = lazy(() => import('./ISOForms/pages/FormEntriesList'))
const FormDetail = lazy(() => import('./ISOForms/pages/FormDetail'))

// Testing Module (standalone, integrated from ptis-lms) — ThemeProvider is a
// named export (React.lazy only wraps default exports) and is a lightweight
// context, so it stays a normal import; the heavy module itself is lazy.
const TestingModule = lazy(() => import('./Testing/TestingModule'))
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
const UserPanel = lazy(() => import('./UserPanel/UserPanel'))
const UserDashboard = lazy(() => import('./UserPanel/pages/UserDashboard'))
const MyCourses = lazy(() => import('./UserPanel/pages/MyCourses'))
const UserCertificates = lazy(() => import('./UserPanel/pages/UserCertificates'))
const JobLogDescription = lazy(() => import('./UserPanel/pages/JobLogDescription'))
const CourseHistory = lazy(() => import('./UserPanel/pages/CourseHistory'))
const AllLmsCourses = lazy(() => import('./UserPanel/pages/AllLmsCourses'))
const TaskAllocations = lazy(() => import('./UserPanel/pages/TaskAllocations'))
const CourseDetailUser = lazy(() => import('./UserPanel/pages/CourseDetailUser'))

// User LMS standalone layout
const UserLmsLayout = lazy(() => import('./UserLMS/UserLmsLayout'))
const UserLmsHome = lazy(() => import('./UserLMS/UserLmsHome'))

// Shown while a lazy route's chunk is fetched — brief on a warm cache, so it
// stays minimal rather than a full branded loader (VideoLoader is reserved
// for the one-time app entry).
const RouteFallback = () => (
  <div style={{
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    minHeight: '60vh', color: '#94a3b8', fontSize: 14,
  }}>
    Loading…
  </div>
)

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

  useEffect(() => {
    initModalScrollLock()
  }, [])

  const handleLoadingComplete = () => {
    setShowLoader(false)
    setHasSeenLoader(true)
    sessionStorage.setItem('loaderSeen', 'true')
  }

  return (
    <>
      <ToastHost />
      {showLoader && !hasSeenLoader ? (
        <VideoLoader onLoadingComplete={handleLoadingComplete} />
      ) : (
        <Router>
          <Suspense fallback={<RouteFallback />}>
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
          </Suspense>
        </Router>
      )}
    </>
  )
}

export default App
