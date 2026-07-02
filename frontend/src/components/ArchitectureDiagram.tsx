export function ArchitectureDiagram() {
  return (
    <div className="architecture-shell architecture-blackbox-shell">
      <svg viewBox="0 0 900 300" className="architecture-svg architecture-blackbox-svg" role="img" aria-label="Scheduler architecture blackbox diagram">
        <defs>
          <linearGradient id="linkGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#4ae6ff" stopOpacity="0.58" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.92" />
          </linearGradient>
          <marker id="blackboxArrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#4ae6ff" />
          </marker>
        </defs>

        <rect x="70" y="70" width="160" height="110" rx="16" className="architecture-box" />
        <rect x="250" y="70" width="140" height="110" rx="18" className="architecture-box architecture-box-inset" />
        <rect x="540" y="70" width="160" height="110" rx="16" className="architecture-box" />

        <rect x="277" y="88" width="86" height="44" rx="10" className="architecture-blackbox" />
        <path d="M 293 110 L 312 110" className="architecture-blackbox-detail" />
        <path d="M 293 118 L 330 118" className="architecture-blackbox-detail" />
        <path d="M 293 126 L 338 126" className="architecture-blackbox-detail" />

        <text x="150" y="48" className="architecture-blackbox-label">YOUR DEVICE</text>
        <text x="150" y="70" className="architecture-blackbox-subtitle">Client</text>

        <text x="320" y="48" className="architecture-blackbox-label">BLACKBOX</text>
        <text x="320" y="70" className="architecture-blackbox-subtitle">Execution proxy</text>

        <text x="620" y="48" className="architecture-blackbox-label">MODEL END</text>
        <text x="620" y="70" className="architecture-blackbox-subtitle">Backend service</text>

        <g className="architecture-link-group">
          <line x1="230" y1="120" x2="250" y2="120" className="architecture-blackbox-link" />
          <line x1="390" y1="120" x2="540" y2="120" className="architecture-blackbox-link" markerEnd="url(#blackboxArrow)" />
        </g>

        <g className="architecture-link-text">
          <text x="272" y="104" className="architecture-link-note">ENCRYPTED</text>
          <text x="455" y="104" className="architecture-link-note">ENCRYPTED</text>
        </g>
      </svg>

      <div className="architecture-legend architecture-blackbox-legend">
        <div className="legend-pill">Client to proxy</div>
        <div className="legend-pill">Encrypted transport</div>
        <div className="legend-pill">Backend processing</div>
      </div>
    </div>
  );
}
