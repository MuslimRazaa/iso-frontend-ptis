// Shared jsPDF letterhead + watermark so every PDF exported from the app
// (audit logs today, more later) looks like it came from the same company
// instead of a bare title + table. One place to keep it consistent.

let cachedLogoDataUrl = null;

// jsPDF's addImage needs a data URL or raster data, not a plain <img> src —
// draw the public logo onto a canvas once and cache the result for the rest
// of the session instead of re-fetching/re-encoding it on every export.
export function loadPtisLogoDataUrl() {
  if (cachedLogoDataUrl) return Promise.resolve(cachedLogoDataUrl);
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        canvas.getContext('2d').drawImage(img, 0, 0);
        cachedLogoDataUrl = canvas.toDataURL('image/png');
        resolve(cachedLogoDataUrl);
      } catch {
        resolve(null); // canvas tainted or unsupported — PDFs still work, just without the logo
      }
    };
    img.onerror = () => resolve(null);
    img.src = '/ptisLogo.png';
  });
}

const BRAND_RED = [215, 38, 61]; // #d7263d, the site's accent red

// A light, single centered watermark — call from autoTable's didDrawPage
// (AFTER that page's content, not before): autoTable paints an OPAQUE
// background on every cell, so anything drawn earlier is completely hidden
// underneath the table. Drawing it on top afterward, at very low opacity,
// keeps it subtle while still actually being visible over the rows.
export function drawPdfWatermark(doc, logoDataUrl) {
  if (!logoDataUrl) return;
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const size = Math.max(pageW, pageH) * 0.65;
  doc.saveGraphicsState();
  doc.setGState(new doc.GState({ opacity: 0.05 }));
  doc.addImage(logoDataUrl, 'PNG', (pageW - size) / 2, (pageH - size) / 2, size, size);
  doc.restoreGraphicsState();
}

// The letterhead block: logo + company name top-left, report title beneath
// it, a red rule, and the generated timestamp top-right. Returns the Y
// coordinate content should start below.
export function drawPdfLetterhead(doc, { logoDataUrl, title, subtitle, generatedAt }) {
  const pageW = doc.internal.pageSize.getWidth();
  const marginX = 14;
  let y = 14;

  if (logoDataUrl) {
    doc.addImage(logoDataUrl, 'PNG', marginX, y - 3, 14, 14);
  }
  const textX = logoDataUrl ? marginX + 18 : marginX;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(20, 20, 28);
  doc.text('Premier Tubular Inspection Services', textX, y + 4);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(120, 120, 130);
  doc.text('PTIS', textX, y + 9);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(120, 120, 130);
  doc.text(`Generated: ${generatedAt || new Date().toLocaleString()}`, pageW - marginX, y + 4, { align: 'right' });

  y += 16;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(20, 20, 28);
  doc.text(title || 'Report', marginX, y);

  if (subtitle) {
    y += 6;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(90, 90, 100);
    doc.text(subtitle, marginX, y);
  }

  y += 4;
  doc.setDrawColor(...BRAND_RED);
  doc.setLineWidth(0.8);
  doc.line(marginX, y, pageW - marginX, y);

  doc.setTextColor(0, 0, 0);
  return y + 8;
}
