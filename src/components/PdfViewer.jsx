import React, { useState } from 'react';
import API_BASE_URL from '../config/api';
import { Document, Page, pdfjs } from 'react-pdf';

// Set worker path for pdfjs
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

const PdfViewer = ({ pdfUrl }) => {
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Build full URL for local files
  const fullPdfUrl = pdfUrl.startsWith('http') 
    ? pdfUrl 
    : `${API_BASE_URL}${pdfUrl}`;

  const onDocumentLoadSuccess = ({ numPages }) => {
    setNumPages(numPages);
    setLoading(false);
    setError(null);
  };

  const onDocumentLoadError = (error) => {
    console.error('Error loading PDF:', error);
    setError('Failed to load PDF. Please try again.');
    setLoading(false);
  };

  const goToPrevPage = () => {
    setPageNumber(prev => Math.max(prev - 1, 1));
  };

  const goToNextPage = () => {
    setPageNumber(prev => Math.min(prev + 1, numPages || 1));
  };

  const goToPage = (page) => {
    const pageNum = parseInt(page);
    if (pageNum >= 1 && pageNum <= numPages) {
      setPageNumber(pageNum);
    }
  };

  return (
    <div className="pdf-viewer-container">
      <div className="pdf-viewer-header">
        <h3>Course Presentation</h3>
        {!loading && !error && (
          <div className="pdf-controls">
            <button 
              onClick={goToPrevPage} 
              disabled={pageNumber <= 1}
              className="pdf-nav-btn"
            >
              Previous
            </button>
            
            <div className="pdf-page-info">
              <input
                type="number"
                min="1"
                max={numPages || 1}
                value={pageNumber}
                onChange={(e) => goToPage(e.target.value)}
                className="pdf-page-input"
              />
              <span>of {numPages}</span>
            </div>
            
            <button 
              onClick={goToNextPage} 
              disabled={pageNumber >= numPages}
              className="pdf-nav-btn"
            >
              Next
            </button>
            
            <a 
              href={fullPdfUrl} 
              download 
              className="pdf-download-btn"
              target="_blank"
              rel="noopener noreferrer"
            >
              Download PDF
            </a>
          </div>
        )}
      </div>

      <div className="pdf-viewer-content">
        {loading && (
          <div className="pdf-loading">
            <div className="spinner"></div>
            <p>Loading PDF...</p>
          </div>
        )}

        {error && (
          <div className="pdf-error">
            <p>{error}</p>
            <a href={fullPdfUrl} target="_blank" rel="noopener noreferrer">
              Open PDF in new tab
            </a>
          </div>
        )}

        <Document
          file={fullPdfUrl}
          onLoadSuccess={onDocumentLoadSuccess}
          onLoadError={onDocumentLoadError}
          loading=""
          options={{
            cMapUrl: `https://unpkg.com/pdfjs-dist@${pdfjs.version}/cmaps/`,
            cMapPacked: true,
          }}
        >
          <Page 
            pageNumber={pageNumber} 
            renderTextLayer={false}
            renderAnnotationLayer={false}
            className="pdf-page"
            width={Math.min(window.innerWidth * 0.8, 1000)}
          />
        </Document>
      </div>
    </div>
  );
};

export default PdfViewer;
