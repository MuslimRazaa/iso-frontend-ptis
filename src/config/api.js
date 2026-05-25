// API Configuration
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://iso-server.ptis.co';
// export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
// export const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://ptis-erp-backend.onrender.com';

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
};

export default API_BASE_URL;
