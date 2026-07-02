interface ArchitectureNode {
  id: string;
  title: string;
  subtitle: string;
  accent: string;
}

const nodes: ArchitectureNode[] = [
  { id: 'client', title: 'Client', subtitle: 'Requests & events', accent: '#ff8a00' },
  { id: 'gateway', title: 'API Gateway', subtitle: 'Routing & ingress', accent: '#3b82f6' },
  { id: 'auth', title: 'Authentication', subtitle: 'JWT + sessions', accent: '#22c55e' },
  { id: 'scheduler', title: 'Scheduler', subtitle: 'Work orchestration', accent: '#f59e0b' },
  { id: 'queue', title: 'Priority Queue', subtitle: 'Buffered execution', accent: '#a855f7' },
  { id: 'workers', title: 'Worker Pool', subtitle: 'Concurrent execution', accent: '#06b6d4' },
  { id: 'db', title: 'Database', subtitle: 'State & metrics', accent: '#f43f5e' },
  { id: 'monitor', title: 'Metrics Service', subtitle: 'Operational telemetry', accent: '#84cc16' },
];

export function ArchitectureDiagram() {
  return (
    <div className="architecture-shell">
      <svg viewBox="0 0 900 420" className="architecture-svg" role="img" aria-label="Scheduler architecture diagram">
        <defs>
          <linearGradient id="flowGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ff8a00" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.9" />
          </linearGradient>
        </defs>
        {[
          ['client', 'gateway'],
          ['gateway', 'auth'],
          ['auth', 'scheduler'],
          ['scheduler', 'queue'],
          ['queue', 'workers'],
          ['workers', 'db'],
          ['db', 'monitor'],
          ['monitor', 'client'],
        ].map(([from, to], index) => (
          <line key={`${from}-${to}`} x1={140 + (index % 2) * 120} y1={90 + Math.floor(index / 2) * 70} x2={220 + (index % 2) * 140} y2={90 + Math.floor(index / 2) * 70 + 30} className="architecture-link" />
        ))}
        {nodes.map((node, index) => {
          const x = 70 + (index % 4) * 200;
          const y = 70 + Math.floor(index / 4) * 150;
          return (
            <g key={node.id}>
              <rect x={x} y={y} width="150" height="90" rx="18" className="architecture-node" />
              <circle cx={x + 24} cy={y + 24} r="8" fill={node.accent} />
              <text x={x + 42} y={y + 30} className="architecture-node-title">{node.title}</text>
              <text x={x + 24} y={y + 58} className="architecture-node-subtitle">{node.subtitle}</text>
            </g>
          );
        })}
      </svg>

      <div className="architecture-legend">
        <div className="legend-pill">Data flow</div>
        <div className="legend-pill">Heartbeat flow</div>
        <div className="legend-pill">Retry flow</div>
        <div className="legend-pill">Monitoring flow</div>
      </div>
    </div>
  );
}
