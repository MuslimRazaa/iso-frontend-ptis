import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

// Debounced search box + results dropdown, originally built inline inside
// UserHeader for employees. The UI/debounce/navigation shell lives here;
// what it actually searches is supplied by the caller via `onSearch`, since
// employee search is scoped to that one person's data (their own forms,
// their own courses) while admin search spans every record in a module —
// different enough per caller that forcing one hardcoded query into a
// shared component would mean branching on a "who's asking" flag instead of
// just letting each caller bring its own query.
const HeaderSearchBar = ({ onSearch, placeholder = 'Search…', minChars = 2, onFocus, dropdownAlign = 'left', closeSignal }) => {
  const [query, setQuery] = useState('');
  const [showResults, setShowResults] = useState(false);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const boxRef = useRef(null);

  // Lets a sibling control (e.g. the profile menu) close this dropdown when
  // it opens, same as the three dropdowns closing each other used to do
  // before notifications/search were split out into their own components.
  useEffect(() => {
    if (closeSignal !== undefined) setShowResults(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [closeSignal]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) {
        setShowResults(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < minChars) {
      setResults([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const rows = await onSearch(trimmed);
        if (!cancelled) setResults(rows || []);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 300);
    return () => { cancelled = true; clearTimeout(timer); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, minChars]);

  const handleResultClick = (result) => {
    navigate(result.path);
    setQuery('');
    setShowResults(false);
  };

  return (
    <div className="search-cluster-wrapper" ref={boxRef} style={{ position: 'relative' }}>
      <div className="search-cluster" style={{
        background: 'rgba(255, 255, 255, 0.15)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        padding: '10px 18px',
        borderRadius: '12px'
      }}>
        <svg viewBox="0 0 20 20" fill="none" style={{ width: '18px', height: '18px', opacity: 0.9, color: 'white', flexShrink: 0 }}>
          <circle cx="8.5" cy="8.5" r="5.75" stroke="currentColor" strokeWidth="1.5"/>
          <path d="M12.5 12.5L16 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
        <input
          type="text"
          placeholder={placeholder}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setShowResults(true);
          }}
          onFocus={() => {
            setShowResults(true);
            onFocus?.();
          }}
          className="search-cluster-input"
          style={{
            background: 'transparent',
            border: 'none',
            outline: 'none',
            fontSize: '14px',
            color: 'white',
            width: '100%',
            minWidth: 0
          }}
        />
      </div>

      {showResults && query.trim().length >= minChars && (
        <div className="notif-dropdown" style={{
          position: 'absolute',
          top: 'calc(100% + 12px)',
          [dropdownAlign]: 0,
          width: 'min(380px, calc(100vw - 32px))',
          background: 'radial-gradient(circle at 20% 20%, #2a2b36 0%, transparent 45%), radial-gradient(circle at 80% 0%, rgba(255, 0, 0, 0.15) 0%, transparent 40%), #0e0f14',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          boxShadow: '0 8px 32px rgba(102, 126, 234, 0.3)',
          borderRadius: '14px',
          zIndex: 1000,
          overflow: 'hidden',
          color: 'white'
        }}>
          <div style={{
            padding: '12px 16px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.15)',
            background: 'rgba(255, 255, 255, 0.06)',
          }}>
            <strong style={{ fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.5px', opacity: 0.8 }}>
              {loading ? 'Searching…' : `Results (${results.length})`}
            </strong>
          </div>
          <div style={{ maxHeight: '360px', overflowY: 'auto' }}>
            {!loading && results.length === 0 && (
              <div style={{ padding: '24px', textAlign: 'center', color: 'rgba(255,255,255,0.6)' }}>
                <p style={{ fontSize: '13px', margin: 0 }}>No matches for "{query}"</p>
              </div>
            )}
            {results.map(result => (
              <div
                key={result.id}
                onClick={() => handleResultClick(result)}
                style={{
                  padding: '12px 16px',
                  borderBottom: '1px solid rgba(255,255,255,0.08)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  transition: 'background 0.2s ease'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <div style={{
                  width: '34px', height: '34px', borderRadius: '9px', flexShrink: 0,
                  background: 'rgba(255, 93, 93, 0.15)', display: 'flex',
                  alignItems: 'center', justifyContent: 'center', fontSize: '16px'
                }}>{result.icon}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: '13px', fontWeight: 600, margin: '0 0 2px 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {result.title}
                  </p>
                  <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.55)', margin: 0 }}>{result.subtitle}</p>
                </div>
                <span style={{
                  fontSize: '10px', fontWeight: 700, textTransform: 'uppercase',
                  color: '#ff5d5d', background: 'rgba(255, 93, 93, 0.15)',
                  padding: '3px 8px', borderRadius: 999, flexShrink: 0
                }}>{result.type}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      <style jsx>{`
        .search-cluster-wrapper {
          width: clamp(140px, 22vw, 220px);
          flex-shrink: 1;
        }

        .search-cluster {
          display: flex;
          align-items: center;
          gap: 8px;
          transition: all 0.3s ease;
          width: 100%;
          box-sizing: border-box;
        }

        .search-cluster:hover {
          background: rgba(255, 255, 255, 0.25) !important;
          transform: translateY(-1px);
        }

        .search-cluster input::placeholder {
          color: rgba(255, 255, 255, 0.75);
        }

        @media (max-width: 640px) {
          .search-cluster-wrapper {
            width: 100%;
            order: 1;
          }
        }
      `}</style>
    </div>
  );
};

export default HeaderSearchBar;
