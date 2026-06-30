import { API_ENDPOINTS } from '../../config/api'

// Resolves the logged-in user's numeric employee `id` (the FK used everywhere
// else in the app, e.g. ManageUserAccess.jsx's /api/employees/{id}/permissions)
// from the email stored at login (Login.jsx -> localStorage 'userEmail').
// Cached in localStorage so pages don't refetch the whole employee list every time.
export async function getCurrentEmployeeId() {
  const cached = localStorage.getItem('isoFormsCurrentEmployeeId')
  if (cached) return cached

  const email = localStorage.getItem('userEmail')
  if (!email) return null

  try {
    const res = await fetch(API_ENDPOINTS.EMPLOYEES)
    if (!res.ok) return null
    const employees = await res.json()
    const me = Array.isArray(employees) ? employees.find(e => e.email === email) : null
    if (!me) return null
    localStorage.setItem('isoFormsCurrentEmployeeId', String(me.id))
    return String(me.id)
  } catch {
    return null
  }
}
