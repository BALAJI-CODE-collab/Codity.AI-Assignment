import type { QueueSummary } from '../types';

interface QueueCardProps {
  queue: QueueSummary;
}

export function QueueCard({ queue }: QueueCardProps) {
  return (
    <div className="queue-card">
      <div className="queue-card-head">
        <div>
          <div className="queue-card-name">{queue.name}</div>
          <div className="queue-card-subtitle">Priority {queue.priority}</div>
        </div>
        <span className={`status-badge ${queue.is_paused ? 'status-dead' : 'status-running'}`}>{queue.is_paused ? 'Paused' : 'Running'}</span>
      </div>
      <div className="queue-card-meta">
        <span>Concurrency {queue.max_concurrency}</span>
        <span>Created {new Date(queue.created_at).toLocaleDateString()}</span>
      </div>
    </div>
  );
}
