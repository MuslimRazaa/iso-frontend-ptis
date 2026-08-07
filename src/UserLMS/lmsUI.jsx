import React from 'react';

// ── Shared LMS design tokens ──────────────────────────────────────────────
// A restrained, professional palette (slate neutrals + one brand accent + a
// reserved status set). Used across the Dashboard, My Courses and History so
// the whole LMS reads as one product. Prefer these over ad-hoc hex values.
export const C = {
  ink:      '#1e293b', // headings
  body:     '#475569', // body text
  muted:    '#94a3b8', // secondary / captions
  border:   '#e2e8f0', // hairlines / card borders
  line:     '#eef2f6', // very light dividers / gridlines
  surface:  '#ffffff',
  bg:       '#f1f5f9', // soft neutral fill (card banners, chips)
  brand:    '#b91c1c', // PTIS red — used sparingly as the accent
  brandTint:'#fef2f2',
  // Reserved status colours — always paired with a text label, never colour-alone.
  notStarted: '#64748b',
  inProgress: '#2563eb',
  passed:     '#16a34a',
  failed:     '#dc2626',
  overdue:    '#d97706',
};

// ── Professional stroke icon set (Feather-style, 24×24, currentColor) ──────
// One consistent line weight everywhere; replaces the old emoji glyphs.
const PATHS = {
  dashboard: <><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /></>,
  book:      <><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" /></>,
  bookOpen:  <><path d="M12 7c-1.6-1.4-4.1-2-7-2v14c2.9 0 5.4.6 7 2 1.6-1.4 4.1-2 7-2V5c-2.9 0-5.4.6-7 2z" /><path d="M12 7v14" /></>,
  test:      <><rect x="8" y="3" width="8" height="4" rx="1" /><path d="M16 5h2a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2" /><path d="M9 13.5l2 2 4-4" /></>,
  clock:     <><circle cx="12" cy="12" r="9" /><path d="M12 7.5V12l3 1.8" /></>,
  history:   <><path d="M3 12a9 9 0 1 0 3-6.7L3 8" /><path d="M3 3v5h5" /><path d="M12 8v4l3 2" /></>,
  lock:      <><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></>,
  calendar:  <><rect x="3" y="4.5" width="18" height="16.5" rx="2" /><path d="M3 9.5h18M8 2.5v4M16 2.5v4" /></>,
  video:     <><rect x="2.5" y="5.5" width="14" height="13" rx="2" /><path d="M16.5 9.5l5-3v11l-5-3z" /></>,
  search:    <><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" /></>,
  check:     <path d="M20 6L9 17l-5-5" />,
  arrowRight:<><path d="M5 12h13" /><path d="M13 6l6 6-6 6" /></>,
  award:     <><circle cx="12" cy="8.5" r="6" /><path d="M8.5 13.5L7 22l5-3 5 3-1.5-8.5" /></>,
  folder:    <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />,
  play:      <path d="M7 5l12 7-12 7z" />,
  trend:     <><path d="M3 17l6-6 4 4 8-8" /><path d="M17 7h4v4" /></>,
  layers:    <><path d="M12 3l9 5-9 5-9-5z" /><path d="M3 13l9 5 9-5" /></>,
  target:    <><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1.5" /></>,
};

// Icons that read better filled than stroked.
const FILLED = new Set(['play']);

export function Icon({ name, size = 18, color = 'currentColor', strokeWidth = 1.8, style }) {
  const filled = FILLED.has(name);
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? color : 'none'}
      stroke={filled ? 'none' : color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ display: 'block', flexShrink: 0, ...style }}
    >
      {PATHS[name] || PATHS.book}
    </svg>
  );
}

export default Icon;
