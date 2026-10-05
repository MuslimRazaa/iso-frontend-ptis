// `new Date().toISOString().slice(0, 10)` reads TODAY in UTC, not in the
// browser's local timezone. For Pakistan (UTC+5), that's wrong for roughly
// the first 5 hours of every local day (00:00–04:59 PKT): it reports
// YESTERDAY's date instead of today's — a deadline, certificate issue date,
// export filename, or "today" cutoff quietly lands on the wrong day.
// localToday()/localYmd() read the LOCAL calendar date instead, the same way
// the ERP backend's own toYmd()/localYmd() do.
export function localYmd(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function localToday() {
  return localYmd(new Date());
}
