import { useLocation } from 'react-router-dom'

/**
 * Returns the correct LMS base path depending on which side the user is on:
 *   /user/learning-management-system   (user side)
 *   /learning-management-system        (admin side)
 *
 * Use to build internal LMS links so a user click never escapes to the admin route.
 */
export default function useLmsBase() {
  const { pathname } = useLocation()
  // Employee pages now also live under the standalone /employees area
  // (moved out of the LMS module). Keep their internal links self-contained.
  if (pathname.startsWith('/employees')) return '/employees'
  const isUserSide = pathname.startsWith('/user')
  return isUserSide ? '/user/learning-management-system' : '/learning-management-system'
}
