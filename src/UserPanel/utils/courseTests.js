// Shared helper: given a course detail (with its `standards` array) and the
// user's test results, work out each standard's test status and whether the
// whole course is finished. Used by My Courses, History and the Overview so
// they all agree on what "done / passed / overdue" means.
//
// Rule (per product decision): a course is "finished" once EVERY required test
// has a result (pass or fail). Finished courses move to History; once any test
// is attempted the course content is locked (no going back, no retake).
// `assignedSince` (optional): only count test results submitted on/after this
// timestamp (the current task's created_at). This makes a re-assignment start
// fresh — results from a previous assignment don't mark the new one as done —
// while those old results still live on in History.
export function computeCourseTests(courseDetail, allResults, deadline, assignedSince) {
  const courseId = courseDetail?.id;
  let results = (allResults || []).filter(r => Number(r.course_id) === Number(courseId));
  if (assignedSince) {
    const since = new Date(assignedSince);
    if (!isNaN(since)) results = results.filter(r => r.submitted_at && new Date(r.submitted_at) >= since);
  }

  // Latest result per standard.
  const byStd = {};
  results.forEach(r => {
    const prev = byStd[r.standard_id];
    if (!prev || new Date(r.submitted_at || 0) > new Date(prev.submitted_at || 0)) byStd[r.standard_id] = r;
  });

  let stds = Array.isArray(courseDetail?.standards) ? courseDetail.standards : [];
  if (stds.length === 0 && courseDetail?.standard_id) {
    stds = [{ standard_id: courseDetail.standard_id, standard_name: courseDetail.standard_name, standard_type: courseDetail.standard_type }];
  }

  const tests = stds.map(s => {
    const result = byStd[s.standard_id] || null;
    return {
      standardId: s.standard_id,
      standardName: s.standard_name || '',
      hasResult: !!result,
      passed: !!(result && result.passed),
      score: result ? result.score_percentage : null,
      submittedAt: result ? result.submitted_at : null,
    };
  });

  const anyStarted = tests.some(t => t.hasResult);
  const allDone = tests.length > 0 && tests.every(t => t.hasResult);
  const passedAll = allDone && tests.every(t => t.passed);
  const lastSubmittedAt = tests.reduce((m, t) => {
    if (!t.submittedAt) return m;
    return (!m || new Date(t.submittedAt) > new Date(m)) ? t.submittedAt : m;
  }, null);

  // Overdue: finished after the deadline, or (not finished) the deadline passed.
  let overdue = false;
  if (deadline) {
    if (allDone && lastSubmittedAt) overdue = new Date(lastSubmittedAt) > new Date(deadline);
    else if (!allDone) overdue = new Date() > new Date(deadline);
  }

  return { tests, anyStarted, allDone, passedAll, lastSubmittedAt, overdue };
}
