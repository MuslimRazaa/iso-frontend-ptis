// Whoever is "acting" right now, for audit trails and record authorship —
// this app has no server-side session, so every module that needs to say
// who did something reads it straight from localStorage and sends it along
// as a query param / form field.
//
// An admin session carries no employee identity of its own. Checked first,
// so a stale userFullName/userEmployeeId left over from an earlier employee
// login on the same browser (or from an admin testing as a specific person)
// can never get silently attributed to "Admin" actions instead of showing
// as Admin. Without this check, that stale identity leaks into every audit
// log entry an admin creates on that machine until the browser's storage is
// cleared by hand.
export function getActorId() {
  if (localStorage.getItem('userType') === 'admin') return ''
  return localStorage.getItem('userEmployeeId') || localStorage.getItem('userEmail') || ''
}

export function getActorName() {
  if (localStorage.getItem('userType') === 'admin') return 'Admin'
  return localStorage.getItem('userFullName') || localStorage.getItem('userEmail') || 'Admin'
}
