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
const AUTH_KEYS = ['userType', 'userEmail', 'userEmployeeId', 'userFullName', 'userPermissions', 'adminPassword']

const RequireAuth = ({ children }) => {
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

  const isLoggedIn = Boolean(localStorage.getItem('userEmail')) || localStorage.getItem('userType') === 'admin'

  if (!isLoggedIn) {
    const intendedPath = location.pathname + location.search
    return <Navigate to={`/?redirect=${encodeURIComponent(intendedPath)}`} replace />
  }

  return children
}

export default RequireAuth
