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
// Re-assigning a course starts it fresh, but a test the employee has already PASSED does not have to be
// taken again: for each test with no result in the current assignment, the latest result from an earlier
// assignment that was a pass is carried over (`carried: true`, shown as done with its old score).
// Exception: when that would leave nothing to take (every test already passed), the re-assignment is
// treated as a full retake and nothing is carried.
// `tests` items need { standardId, hasResult, passed, score, submittedAt }; `earlier` are raw results.
export function withCarriedPasses(tests, earlier) {
  if (!earlier || earlier.length === 0) return tests;
  const best = {};
  earlier.forEach(r => {
    if (!r.passed) return;
    const prev = best[r.standard_id];
    if (!prev || new Date(r.submitted_at || 0) > new Date(prev.submitted_at || 0)) best[r.standard_id] = r;
  });
  const carriedTests = tests.map(t => {
    if (t.hasResult || !best[t.standardId]) return t;
    const r = best[t.standardId];
    return { ...t, hasResult: true, passed: true, hasPassed: true, carried: true, score: r.score_percentage, submittedAt: r.submitted_at };
  });
  const nothingLeft = carriedTests.length > 0 && carriedTests.every(t => t.carried);
  return nothingLeft ? tests : carriedTests;
}

export function computeCourseTests(courseDetail, allResults, deadline, assignedSince) {
  const courseId = courseDetail?.id;
  // An awareness course has no test: nothing to take, nothing to start or lock, and it is
  // never "finished" by tests — callers judge it by the course content's progress instead.
  if (Number(courseDetail?.requires_test) === 0) {
    return { tests: [], noTest: true, anyStarted: false, allDone: false, passedAll: false, lastSubmittedAt: null, overdue: false };
  }
  const courseResults = (allResults || []).filter(r => Number(r.course_id) === Number(courseId));
  let results = courseResults;
  let earlier = [];
  if (assignedSince) {
    const since = new Date(assignedSince);
    if (!isNaN(since)) {
      results = courseResults.filter(r => r.submitted_at && new Date(r.submitted_at) >= since);
      earlier = courseResults.filter(r => !(r.submitted_at && new Date(r.submitted_at) >= since));
    }
  }

  // Latest result per standard.
  const latestPerStandard = (list) => {
    const m = {};
    list.forEach(r => {
      const prev = m[r.standard_id];
      if (!prev || new Date(r.submitted_at || 0) > new Date(prev.submitted_at || 0)) m[r.standard_id] = r;
    });
    return m;
  };
  const byStd = latestPerStandard(results);

  let stds = Array.isArray(courseDetail?.standards) ? courseDetail.standards : [];
  if (stds.length === 0 && courseDetail?.standard_id) {
    stds = [{ standard_id: courseDetail.standard_id, standard_name: courseDetail.standard_name, standard_type: courseDetail.standard_type }];
  }

  const tests = withCarriedPasses(stds.map(s => {
    const result = byStd[s.standard_id] || null;
    return {
      standardId: s.standard_id,
      standardName: s.standard_name || '',
      hasResult: !!result,
      passed: !!(result && result.passed),
      score: result ? result.score_percentage : null,
      submittedAt: result ? result.submitted_at : null,
    };
  }), earlier);

  // A test passed in an earlier assignment (carried) is not an attempt in this one, so it neither
  // locks the course content nor counts as "started".
  const anyStarted = tests.some(t => t.hasResult && !t.carried);
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
