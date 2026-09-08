import { API_ENDPOINTS } from '../../config/api'

// Resolves the logged-in user's numeric employee `id` (the FK used everywhere
// else in the app, e.g. ManageUserAccess.jsx's /api/employees/{id}/permissions)
// from the email stored at login (Login.jsx -> localStorage 'userEmail').
// Cached in localStorage so pages don't refetch the whole employee list every time.
//
// The cache is keyed to the email it was resolved for. Without that check, a
// browser that had ever logged in as someone else on this app carried that
// EMPLOYEE'S id forever — nothing clears it on login, only a full
// localStorage.clear() logout does — so a later login as a different person
// picked up the earlier person's id. ISO Forms then filtered "my forms" and
// "can I edit this" by the wrong identity, which read as forms belonging to
// someone else, or edit rights on forms that were not this user's.
export async function getCurrentEmployeeId() {
  const email = localStorage.getItem('userEmail')
  const cachedEmail = localStorage.getItem('isoFormsCurrentEmployeeEmail')
  const cached = localStorage.getItem('isoFormsCurrentEmployeeId')
  if (cached && cachedEmail && email && cachedEmail === email) return cached

  if (!email) return null

  try {
    const res = await fetch(API_ENDPOINTS.EMPLOYEES)
    if (!res.ok) return null
    const employees = await res.json()
    const me = Array.isArray(employees) ? employees.find(e => e.email === email) : null
    if (!me) return null
    localStorage.setItem('isoFormsCurrentEmployeeId', String(me.id))
    localStorage.setItem('isoFormsCurrentEmployeeEmail', email)
    return String(me.id)
  } catch {
    return null
  }
}
