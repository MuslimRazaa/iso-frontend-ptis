// Shared sign-in with Premier ERP (erp.ptis.co).
//
// Signing in here or in the ERP leaves an HttpOnly cookie on .ptis.co that
// this code never sees; the backend reads it (iso-server-backend-PTIS
// routes/sso.js). So:
//   - the login page asks /api/sso/session first and, when the person is
//     already signed in on this browser, signs them in with no password;
//   - SsoWatcher (App.jsx) asks again on focus and every minute, and signs
//     this tab out when the shared session has ended (signed out in the ERP),
//     or follows a different person who has signed in on this browser;
//   - every Logout button calls ssoLogout(), which ends it for both apps.
//
// Only sessions known to be tied to the shared one ("ssoLinked") are ever
// signed out by the watcher, so an ISO login on a browser that cannot keep
// the cookie (or the backend not being updated yet) carries on exactly as
// before instead of being thrown out a minute later. The admin password
// login is not an employee and is never touched.
import { API_BASE_URL } from '../config/api'

export const AUTH_KEYS = ['userType', 'userEmail', 'userEmployeeId', 'userFullName', 'userPermissions', 'adminPassword', 'ssoLinked']

export const DEFAULT_PERMISSIONS = { lms: false, portal: false, cvs: false, reports: false, testing: false }

// { enabled, active, employee, permissions } — or null when the server could
// not be asked (offline, old backend, 500): unknown, which is not "signed out".
export async function fetchSsoSession() {
  try {
    const res = await fetch(`${API_BASE_URL}/api/sso/session`, { credentials: 'include', cache: 'no-store' })
    if (!res.ok) return null
    const data = await res.json()
    return data && typeof data.active === 'boolean' ? data : null
  } catch {
    return null
  }
}

// Store the shared session's employee the same way the login form does.
export function applySsoSession(s) {
  const e = s.employee
  localStorage.removeItem('adminPassword')
  localStorage.setItem('userType', 'user')
  localStorage.setItem('userEmail', e.email || '')
  localStorage.setItem('userEmployeeId', e.employee_id)
  localStorage.setItem('userFullName', e.full_name || '')
  localStorage.setItem('userPermissions', JSON.stringify(s.permissions || DEFAULT_PERMISSIONS))
  localStorage.setItem('ssoLinked', '1')
}

export function clearAuthKeys() {
  AUTH_KEYS.forEach((k) => localStorage.removeItem(k))
}

// Sign out of the ERP too. Fire-and-forget: the local sign-out never waits on it.
export function ssoLogout() {
  try {
    return fetch(`${API_BASE_URL}/api/sso/logout`, { method: 'POST', credentials: 'include', keepalive: true }).catch(() => {})
  } catch {
    return Promise.resolve()
  }
}
