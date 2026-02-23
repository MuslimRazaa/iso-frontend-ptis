import React from "react";

const canvasWidth = 900;
const canvasHeight = 420;

function SystemMap({ modules = [], connections = [], onClose }) {
  const getCoords = (nodeId) => {
    const node = modules.find((item) => item.id === nodeId);
    if (!node) return { x: 0, y: 0 };
    return {
      x: (node.x / 100) * canvasWidth,
      y: (node.y / 100) * canvasHeight,
    };
  };

  return (
    <div className="system-map-overlay">
      <div className="system-map-panel">
        <div className="system-map-header">
          <div>
            <p className="eyebrow">Holistic View</p>
            <h2>Live PTIS System Map</h2>
            <p className="map-subcopy">
              Watch how each module exchanges data, which touchpoints are under
              load, and what to prioritize next.
            </p>
          </div>
          <div>
            <button
              className="close-btn"
              onClick={onClose}
              aria-label="Close system map"
            >
              <span>Dismiss</span>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </div>
        </div>

        <div className="system-map-visual">
          <svg
            className="system-map-svg"
            viewBox={`0 0 ${canvasWidth} ${canvasHeight}`}
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id="mapLine" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#ff5d5d" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#ffb347" stopOpacity="0.85" />
              </linearGradient>
              <filter id="glow">
                <feGaussianBlur stdDeviation="4" result="coloredBlur" />
                <feMerge>
                  <feMergeNode in="coloredBlur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            {connections.map((conn) => {
              const start = getCoords(conn.from);
              const end = getCoords(conn.to);
              return (
                <line
                  key={`${conn.from}-${conn.to}`}
                  x1={start.x}
                  y1={start.y}
                  x2={end.x}
                  y2={end.y}
                  className={`map-connection ${conn.status}`}
                  stroke="url(#mapLine)"
                  strokeWidth="2.8"
                  strokeLinecap="round"
                  filter="url(#glow)"
                />
              );
            })}
          </svg>

          {modules.map((module) => (
            <div
              key={module.id}
              className="map-node"
              style={{ left: `${module.x}%`, top: `${module.y}%` }}
            >
              <span className="node-pulse" />
              <div className="node-chip">{module.tag}</div>
              <h3>{module.label}</h3>
            </div>
          ))}

          <div className="map-gradient" />
        </div>

        <div className="system-map-footer">
          <div className="legend-group">
            <span className="legend-dot stable" /> Stable
            <span className="legend-dot degraded" /> Degraded
          </div>
          <div className="sync-indicator">
            <span className="pulse" />
            Synced 58 seconds ago
          </div>
        </div>

        <div className="connection-grid">
          {connections.map((conn) => {
            const start = modules.find((m) => m.id === conn.from);
            const end = modules.find((m) => m.id === conn.to);
            return (
              <div key={`${conn.from}-${conn.to}`} className="connection-card">
                <p className="connection-title">
                  {start?.label} → {end?.label}
                </p>
                <span className={`status-chip ${conn.status}`}>
                  {conn.status === "stable" ? "Healthy" : "Needs attention"}
                </span>
                <p className="connection-meta">Throughput 1.8k events / min</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default SystemMap;
