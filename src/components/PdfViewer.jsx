import React from 'react';
import API_BASE_URL from '../config/api';
import { Icon } from '../UserLMS/lmsUI';

// View-only PDF viewer using the browser's built-in PDF renderer via an <iframe>.
// `#toolbar=0&navpanes=0` hides the native toolbar (download / print / rotate)
// and the side thumbnail pane, so it reads as view-only and never opens a new
// tab. This is far more reliable than a canvas renderer (no pdf.js worker /
// version pitfalls) and always displays on localhost and live.
//
// variant: 'inline' → compact reader inside the Resources tab (fixed height).
//          'fullscreen' → fills the modal.
// onOpenFullscreen: when given, the inline reader offers a button to open the
// same document in a full-screen modal — the compact frame is fine for a glance
// but unreadable for an actual page of a form.
const PdfViewer = ({ pdfUrl, variant = 'inline', onOpenFullscreen }) => {
  const isFull = variant === 'fullscreen';
  const fullPdfUrl = pdfUrl.startsWith('http') ? pdfUrl : `${API_BASE_URL}${pdfUrl}`;
  // FitH = fit page width; toolbar/navpanes/scrollbar tuned for clean view-only.
  const src = `${fullPdfUrl}#toolbar=0&navpanes=0&statusbar=0&view=FitH`;

  const frame = (
    <iframe
      src={src}
      title="Course material"
      onContextMenu={(e) => e.preventDefault()}
      style={{
        width: '100%',
        height: isFull ? '100%' : '78vh',
        minHeight: isFull ? 0 : 480,
        border: 'none',
        display: 'block',
        background: '#f4f5f7',
      }}
    />
  );

  if (isFull) {
    return <div className="pdf-viewer-fullscreen-frame">{frame}</div>;
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
      {frame}
    </div>
  );
};

export default PdfViewer;
