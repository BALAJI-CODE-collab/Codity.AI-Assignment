import type { WorkerSummary } from '../types';

interface WorkerCardProps {
  worker: WorkerSummary;
}

export function WorkerCard({ worker }: WorkerCardProps) {
  const lastSeen = Date.parse(worker.last_seen_at);
  const stale = Number.isFinite(lastSeen) && Date.now() - lastSeen > 20000;

  return (
    <div className="worker-card">
      <div className="queue-card-head">
        <div>
          <div className="queue-card-name">{worker.hostname}</div>
          <div className="queue-card-subtitle">{stale ? 'Heartbeat stale' : 'Heartbeat active'}</div>
        </div>
        <span className={`status-badge ${stale ? 'status-dead' : 'status-running'}`}>{worker.status}</span>
      </div>
      <div className="queue-card-meta">
        <span>{worker.current_running_jobs} jobs</span>
        <span>{new Date(worker.last_seen_at).toLocaleTimeString()}</span>
      </div>
    </div>
  );
}
