// API Configuration
//
// The base URL is resolved at runtime so the SAME build works in both places:
//   - local development (served from localhost) -> talks to the local backend
//   - the deployed/live site (any other host)   -> talks to the public backend
//
// This matters for uploaded files (PPT, video, thumbnails): on the live site the
// URL must be PUBLIC so the browser — and external viewers like the Microsoft
// Office Online viewer — can actually fetch them. A localhost URL is unreachable
// from those services, which is why PPTs were downloading instead of opening.
// You can still override everything by setting VITE_API_URL at build time.
const LOCAL_API = 'http://localhost:5000';
const LIVE_API = 'https://iso-server.ptis.co';

const isLocalHost =
  typeof window !== 'undefined' &&
  /^(localhost|127\.0\.0\.1|0\.0\.0\.0|::1)$/.test(window.location.hostname);

export const API_BASE_URL =
  import.meta.env.VITE_API_URL || (isLocalHost ? LOCAL_API : LIVE_API);

export const API_ENDPOINTS = {
  COURSES: `${API_BASE_URL}/api/courses`,
  USERS: `${API_BASE_URL}/api/users`,
  EMPLOYEES: `${API_BASE_URL}/api/employees`,
  STANDARDS: `${API_BASE_URL}/api/standards`,
  CATEGORIES: `${API_BASE_URL}/api/categories`,
  DEPARTMENTS: `${API_BASE_URL}/api/departments`,
  LOCATIONS: `${API_BASE_URL}/api/locations`,
  TASK_ALLOCATIONS: `${API_BASE_URL}/api/task-allocations`,
  QUESTIONS: `${API_BASE_URL}/api/questions`,
  COURSE_PROGRESS: `${API_BASE_URL}/api/course-progress`,
  COURSE_REQUESTS: `${API_BASE_URL}/api/course-requests`,
  JOB_LOG: `${API_BASE_URL}/api/job-log`,
  ISO_FORMS_TEMPLATES: `${API_BASE_URL}/api/iso-forms/templates`,
  ISO_FORMS_ENTRIES: `${API_BASE_URL}/api/iso-forms/entries`,
};

export default API_BASE_URL;
