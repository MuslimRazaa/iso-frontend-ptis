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
const RequireAuth = ({ children }) => {
  const location = useLocation()
  const isLoggedIn = Boolean(localStorage.getItem('userEmail')) || localStorage.getItem('userType') === 'admin'

  if (!isLoggedIn) {
    const intendedPath = location.pathname + location.search
    return <Navigate to={`/?redirect=${encodeURIComponent(intendedPath)}`} replace />
  }

  return children
}

export default RequireAuth
