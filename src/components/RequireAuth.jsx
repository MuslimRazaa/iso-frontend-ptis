import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'

// Guards every /user/* route. Clicking a link from an email or a push
// notification while logged out — or in a browser that's never logged in on
// this device at all, which is exactly what a fresh click from an email
// client is — used to render the page anyway, against an empty identity:
// broken fetches, blank data, nothing explaining why. This sends them to
// Login instead, and remembers exactly where they were headed (as a URL
// query param, since there's no prior in-app navigation state to carry yet
// on a first-ever page load) so Login can send them straight back the
// moment they sign in, instead of dropping them on the generic dashboard
// and losing the link they clicked.
//
// Links in e-mails carry `login=1`. The browser keeps the last login for good,
// so without it a click from an e-mail opened straight onto whoever happened to
// be signed in. With it, that login is dropped and the person signs in first;
// the address they are sent back to no longer carries the flag, so it opens.
//
// `admin` guards the admin pages. They used to have no guard at all, so pasting
// /dashboard into a browser that had never signed in opened the admin panel. Now
// only an admin login opens them; anyone else signs in first, and an employee is
// sent to their own dashboard — unless `permission` names a permission they hold
// (the PTIS Portal tile on an employee's dashboard opens the admin portal).
// `user` is the other way round, for the employee pages: they need an employee
// login, and an admin who opens one is sent to the admin dashboard.
const AUTH_KEYS = ['userType', 'userEmail', 'userEmployeeId', 'userFullName', 'userPermissions', 'adminPassword']

const holds = (permission) => {
  try { return Boolean(permission && JSON.parse(localStorage.getItem('userPermissions') || '{}')[permission]) }
  catch { return false }
}

const RequireAuth = ({ children, admin = false, user = false, permission }) => {
  const location = useLocation()
  const params = new URLSearchParams(location.search)
  const fromEmail = params.get('login') === '1'

  if (fromEmail) {
    AUTH_KEYS.forEach(k => localStorage.removeItem(k))
    params.delete('login')
    const rest = params.toString()
    const intendedPath = location.pathname + (rest ? `?${rest}` : '')
    return <Navigate to={`/?redirect=${encodeURIComponent(intendedPath)}`} replace />
  }

  const isAdmin = localStorage.getItem('userType') === 'admin'
  const isLoggedIn = Boolean(localStorage.getItem('userEmail')) || isAdmin

  if (admin && !isAdmin && isLoggedIn && !holds(permission)) return <Navigate to="/user/dashboard" replace />
  if (user && isAdmin) return <Navigate to="/dashboard" replace />

  if (!isLoggedIn) {
    const intendedPath = location.pathname + location.search
    return <Navigate to={`/?redirect=${encodeURIComponent(intendedPath)}`} replace />
  }

  return children
}

export default RequireAuth
