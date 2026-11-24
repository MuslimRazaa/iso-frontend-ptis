import React, { useCallback, useEffect, useRef, useState } from 'react';
import API_BASE_URL from '../config/api';
import { Icon } from '../UserLMS/lmsUI';

// View-only PDF reader for course material.
//
// It shows ONE page at a time, drawn on a canvas, so there is no browser toolbar (no download / print /
// new tab) and the reader always knows which page it is on. That is what makes the rest possible:
//   • a page box ("Page 201 of 350") you can type into to jump straight to a page;
//   • the ← and → arrow keys turn the pages (only those two); ↑ and ↓ move a zoomed-in or tall page up and down;
//   • the page you stopped at is remembered (per person and per document), and the reader opens there next
//     time, with one click to start again from page 1.
// If the PDF cannot be drawn this way (the server refuses the request, say), it falls back to the browser's
// own view-only frame, so the material can always be read.
//
// variant: 'inline' → compact reader inside the Resources tab (fixed height).
//          'fullscreen' → fills the modal.
// onOpenFullscreen: when given, the inline reader offers a button to open the same document full screen.

// Zoom moves 10 % at a time (100 % = the page fitted to the width, or to the whole page).
const ZOOM_STEP = 10;
const ZOOM_MIN = 30;
const ZOOM_MAX = 400;

const pageKey = (pdfUrl) => {
  let who = 'guest';
  try { who = localStorage.getItem('userEmail') || localStorage.getItem('userType') || 'guest'; } catch { /* storage unavailable */ }
  return `pdfPage:${who}:${pdfUrl}`;
};
const readSavedPage = (pdfUrl) => { try { return parseInt(localStorage.getItem(pageKey(pdfUrl)), 10) || 0; } catch { return 0; } };
const writeSavedPage = (pdfUrl, n) => { try { localStorage.setItem(pageKey(pdfUrl), String(n)); } catch { /* ignore */ } };

// Toolbar look = the app's ghost buttons (white pill, grey border, red + lift on hover).
const TOOLBAR_CSS = `
.pdfv-btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;min-width:34px;height:34px;padding:0 16px;
  border-radius:999px;border:1px solid #dcdce3;background:#fff;color:#2a2a32;font-size:13px;font-weight:600;cursor:pointer;
  transition:all .2s ease;font-family:inherit}
.pdfv-btn:hover:not(:disabled){border-color:#d7263d;color:#d7263d;transform:translateY(-2px);box-shadow:0 4px 10px rgba(215,38,61,.12)}
.pdfv-btn:active:not(:disabled){transform:translateY(0)}
.pdfv-btn:focus-visible{outline:none;border-color:#d7263d;box-shadow:0 0 0 3px rgba(215,38,61,.18)}
.pdfv-btn:disabled{opacity:.5;cursor:not-allowed}
.pdfv-btn.icon{padding:0;width:34px;font-size:17px}
.pdfv-input{height:34px;text-align:center;border:1px solid #dcdce3;border-radius:999px;font-size:14px;font-weight:700;color:#2a2a32;
  outline:none;background:#fff;transition:border-color .2s,box-shadow .2s;font-family:inherit}
.pdfv-input:hover{border-color:#d7263d}
.pdfv-input:focus{border-color:#d7263d;box-shadow:0 0 0 3px rgba(215,38,61,.18)}
.pdfv-link{border:none;background:none;color:#d7263d;font-weight:700;text-decoration:underline;cursor:pointer;font-size:13px;padding:0}
.pdfv-link:hover{color:#b01e31}
`;

const PdfViewer = ({ pdfUrl, variant = 'inline', onOpenFullscreen }) => {
  const isFull = variant === 'fullscreen';
  const fullPdfUrl = pdfUrl.startsWith('http') ? pdfUrl : `${API_BASE_URL}${pdfUrl}`;

  const [doc, setDoc] = useState(null);
  const [numPages, setNumPages] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('loading');           // loading | ready | failed
  const [fit, setFit] = useState('width');                   // width | page
  const [zoomPct, setZoomPct] = useState(100);
  const zoom = zoomPct / 100;
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [jump, setJump] = useState('1');
  const [resumedAt, setResumedAt] = useState(0);             // the page it opened on, when that was not page 1

  const areaRef = useRef(null);
  const canvasRef = useRef(null);
  const wrapRef = useRef(null);

  /* ── open the document ─────────────────────────────────── */
  useEffect(() => {
    let cancelled = false;
    let loaded = null;
    setStatus('loading'); setDoc(null); setResumedAt(0);
    (async () => {
      try {
        const { pdfjsLib } = await import('../ISOForms/utils/renderPdfPage');
        loaded = await pdfjsLib.getDocument({ url: fullPdfUrl }).promise;
        if (cancelled) { loaded.destroy(); return; }
        const saved = readSavedPage(pdfUrl);
        const start = saved > 1 && saved <= loaded.numPages ? saved : 1;
        setDoc(loaded); setNumPages(loaded.numPages); setPage(start); setJump(String(start));
        setResumedAt(start > 1 ? start : 0);
        setStatus('ready');
      } catch (err) {
        if (!cancelled) { console.warn('PDF reader fell back to the browser frame:', err?.message); setStatus('failed'); }
      }
    })();
    return () => { cancelled = true; if (loaded) { try { loaded.destroy(); } catch { /* already gone */ } } };
  }, [fullPdfUrl, pdfUrl]);

  /* ── remember where the reader is ──────────────────────── */
  useEffect(() => {
    if (status !== 'ready') return;
    writeSavedPage(pdfUrl, page);
    setJump(String(page));
  }, [page, status, pdfUrl]);

  // The "continuing from page N" note goes away on its own.
  useEffect(() => {
    if (!resumedAt) return undefined;
    const t = setTimeout(() => setResumedAt(0), 9000);
    return () => clearTimeout(t);
  }, [resumedAt]);

  /* ── how much room there is ────────────────────────────── */
  useEffect(() => {
    const el = areaRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(() => setSize({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    setSize({ w: el.clientWidth, h: el.clientHeight });
    return () => ro.disconnect();
  }, [status]);

  /* ── draw the page ─────────────────────────────────────── */
  useEffect(() => {
    if (!doc || !size.w) return undefined;
    let cancelled = false;
    let task = null;
    (async () => {
      try {
        const pg = await doc.getPage(page);
        const base = pg.getViewport({ scale: 1 });
        const pad = 24;
        const byWidth = (size.w - pad) / base.width;
        const byHeight = (size.h - pad) / base.height;
        const scale = Math.max(0.1, (fit === 'page' ? Math.min(byWidth, byHeight) : byWidth) * zoom);
        const vp = pg.getViewport({ scale });
        const ratio = window.devicePixelRatio || 1;
        // Drawn off screen first, so turning a page never shows a blank frame in between.
        const off = document.createElement('canvas');
        off.width = Math.floor(vp.width * ratio);
        off.height = Math.floor(vp.height * ratio);
        const ctx = off.getContext('2d');
        ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
        task = pg.render({ canvasContext: ctx, viewport: vp });
        await task.promise;
        if (cancelled || !canvasRef.current) return;
        const c = canvasRef.current;
        c.width = off.width; c.height = off.height;
        c.style.width = `${Math.floor(vp.width)}px`; c.style.height = `${Math.floor(vp.height)}px`;
        c.getContext('2d').drawImage(off, 0, 0);
      } catch (err) {
        if (err?.name !== 'RenderingCancelledException' && !cancelled) console.warn('PDF page could not be drawn:', err?.message);
      }
    })();
    return () => { cancelled = true; if (task) { try { task.cancel(); } catch { /* done already */ } } };
  }, [doc, page, size.w, size.h, fit, zoom]);

  // A new page starts at its top.
  useEffect(() => { if (areaRef.current) areaRef.current.scrollTop = 0; }, [page]);

  /* ── going to a page ───────────────────────────────────── */
  const goTo = useCallback((n) => {
    const target = Math.min(numPages || 1, Math.max(1, Math.round(Number(n) || 1)));
    setPage(target);
  }, [numPages]);
  const next = useCallback(() => setPage((p) => Math.min(numPages || 1, p + 1)), [numPages]);
  const prev = useCallback(() => setPage((p) => Math.max(1, p - 1)), []);

  const commitJump = () => {
    const n = parseInt(jump, 10);
    if (Number.isFinite(n)) goTo(n); else setJump(String(page));
  };

  /* ── the keyboard ──────────────────────────────────────── */
  // Only the left and right arrow keys turn pages. ↑ and ↓ move a tall or zoomed-in page up and down. Every other key is
  // left alone.
  const onKey = useCallback((e) => {
    if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
    const tag = (e.target && e.target.tagName) || '';
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
    if (e.key === 'ArrowRight') { e.preventDefault(); next(); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); prev(); }
    else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      // Moves the page itself up / down (a zoomed-in or tall page); never changes the page.
      const area = areaRef.current;
      if (area && area.scrollHeight > area.clientHeight + 1) {
        e.preventDefault();
        area.scrollBy({ top: (e.key === 'ArrowDown' ? 1 : -1) * 60 });
      }
    }
  }, [next, prev]);

  // Full screen is a modal on its own, so the keys work anywhere on the page while it is open. The compact
  // reader only listens while it has the focus (a click inside it), so it never steals keys from the page.
  useEffect(() => {
    if (!isFull || status !== 'ready') return undefined;
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isFull, status, onKey]);

  /* ── the parts ─────────────────────────────────────────── */
  const fallbackSrc = `${fullPdfUrl}#toolbar=0&navpanes=0&statusbar=0&view=FitH`;
  const fallbackFrame = (
    <iframe
      src={fallbackSrc}
      title="Course material"
      onContextMenu={(e) => e.preventDefault()}
      style={{ width: '100%', height: isFull ? '100%' : '78vh', minHeight: isFull ? 0 : 480, border: 'none', display: 'block', background: '#f4f5f7' }}
    />
  );

  const toolbar = (
    <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8, padding: '8px 12px', background: '#fff', borderBottom: '1px solid #e8e8ee', flexShrink: 0 }}>
      <style>{TOOLBAR_CSS}</style>
      <button type="button" className="pdfv-btn" disabled={page <= 1} onClick={prev} title="Previous page (←)">‹ Prev</button>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#595966' }}>
        Page
        <input
          type="text"
          inputMode="numeric"
          value={jump}
          aria-label="Go to page"
          title="Type a page number and press Enter"
          onChange={(e) => setJump(e.target.value.replace(/[^\d]/g, ''))}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); commitJump(); e.currentTarget.blur(); } }}
          onFocus={(e) => e.currentTarget.select()}
          onBlur={commitJump}
          className="pdfv-input"
          style={{ width: Math.max(52, String(numPages).length * 11 + 28) }}
        />
        of <strong style={{ color: '#1f1f27' }}>{numPages}</strong>
      </span>
      <button type="button" className="pdfv-btn" disabled={page >= numPages} onClick={next} title="Next page (→)">Next ›</button>

      <span style={{ flex: 1 }} />

      <button type="button" className="pdfv-btn icon" aria-label="Zoom out" disabled={zoomPct <= ZOOM_MIN} onClick={() => setZoomPct((p) => Math.max(ZOOM_MIN, p - ZOOM_STEP))} title="Zoom out 10%">−</button>
      <span style={{ minWidth: 44, textAlign: 'center', fontSize: 12.5, color: '#595966' }}>{zoomPct}%</span>
      <button type="button" className="pdfv-btn icon" aria-label="Zoom in" disabled={zoomPct >= ZOOM_MAX} onClick={() => setZoomPct((p) => Math.min(ZOOM_MAX, p + ZOOM_STEP))} title="Zoom in 10%">+</button>
      <button type="button" className="pdfv-btn" onClick={() => { setFit((f) => (f === 'width' ? 'page' : 'width')); setZoomPct(100); }} title="Switch between fitting the page width and the whole page">
        {fit === 'width' ? 'Fit page' : 'Fit width'}
      </button>
    </div>
  );

  const reader = (
    <div
      ref={wrapRef}
      tabIndex={0}
      onKeyDown={isFull ? undefined : onKey}
      onContextMenu={(e) => e.preventDefault()}
      style={{ display: 'flex', flexDirection: 'column', height: isFull ? '100%' : '78vh', minHeight: isFull ? 0 : 480, width: '100%', background: '#f4f5f7', outline: 'none' }}
    >
      {status === 'ready' && toolbar}
      {status === 'ready' && resumedAt > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 14px', background: '#fff5f6', borderBottom: '1px solid #f6d3d8', fontSize: 13, color: '#2a2a32', flexShrink: 0 }}>
          <style>{TOOLBAR_CSS}</style>
          <span>Continuing from page <strong>{resumedAt}</strong>.</span>
          <button type="button" className="pdfv-link" onClick={() => { goTo(1); setResumedAt(0); }}>
            Start from page 1
          </button>
          <span style={{ flex: 1 }} />
          <button type="button" aria-label="Dismiss" onClick={() => setResumedAt(0)} className="pdfv-link" style={{ textDecoration: 'none', color: '#6b6b7a', fontSize: 18, lineHeight: 1 }}>×</button>
        </div>
      )}
      <div
        ref={areaRef}
        onMouseDown={() => { if (!isFull && wrapRef.current) wrapRef.current.focus({ preventScroll: true }); }}
        style={{ flex: 1, minHeight: 0, overflow: 'auto', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', padding: 12, userSelect: 'none' }}
      >
        {status === 'loading' && <p style={{ margin: 'auto', color: '#7a7a8c', fontSize: 14 }}>Loading document…</p>}
        {status === 'ready' && <canvas ref={canvasRef} style={{ display: 'block', background: '#fff', boxShadow: '0 2px 14px rgba(0,0,0,0.14)', maxWidth: 'none' }} />}
      </div>
    </div>
  );

  const body = status === 'failed' ? fallbackFrame : reader;

  if (isFull) {
    return <div className="pdf-viewer-fullscreen-frame">{body}</div>;
  }

  return (
    <div className="pdf-viewer-container">
      <div className="pdf-viewer-header">
        <h3>Course Presentation</h3>
        {/* View-only material — no download / print / new-tab. */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 12 }}>
          {onOpenFullscreen && (
            <button
              type="button"
              onClick={onOpenFullscreen}
              style={{
                background: 'rgba(255,255,255,0.18)',
                border: '1px solid rgba(255,255,255,0.45)',
                color: '#fff',
                padding: '8px 14px',
                borderRadius: 10,
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Open full screen
            </button>
          )}
          <span className="pdf-viewonly-tag" style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <Icon name="lock" size={13} /> View only
          </span>
        </div>
      </div>
      {body}
    </div>
  );
};

export default PdfViewer;
