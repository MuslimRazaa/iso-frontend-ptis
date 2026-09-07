// What state a learner's course row is in.
//
// Course Tracking counts its cards with this, filters its table with it, and
// the LMS dashboard reports the same numbers from it. Kept in one place because
// a dashboard that says "12 in progress" and a page that then lists 9 is worse
// than no dashboard at all.

/** Past its deadline and not finished. */
export const isOverdue = (row) => {
  if (!row.deadline) return false
  if (row.status === 'completed') return false
  const due = new Date(row.deadline)
  if (Number.isNaN(due.getTime())) return false
  return due < new Date(new Date().toDateString())
}

/** One of: overdue | completed | in_progress | enrolled (not started). */
export const rowState = (row) => {
  if (isOverdue(row)) return 'overdue'
  if (row.status === 'completed') return 'completed'
  if (row.status === 'in_progress') return 'in_progress'
  return 'enrolled'
}

/** Counts per state, plus the total — the shape both stat bars are built from. */
export const summarise = (rows = []) => {
  const stats = { total: rows.length, in_progress: 0, completed: 0, enrolled: 0, overdue: 0 }
  rows.forEach(row => { stats[rowState(row)] += 1 })
  return stats
}

/** Average completion across every enrolment, as a whole percentage. */
export const averageCompletion = (rows = []) => {
  if (!rows.length) return 0
  const total = rows.reduce((sum, row) => sum + (Number(row.progress_percentage) || 0), 0)
  return Math.round(total / rows.length)
}
