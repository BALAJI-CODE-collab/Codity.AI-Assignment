import type { JobStatus } from '../types';

interface StatusBadgeProps {
  status: string;
}

const statusStyles: Record<string, string> = {
  queued: 'status-queued',
  scheduled: 'status-scheduled',
  claimed: 'status-claimed',
  running: 'status-running',
  completed: 'status-completed',
  failed: 'status-failed',
  dead_letter: 'status-dead-letter',
  idle: 'status-idle',
  busy: 'status-busy',
  dead: 'status-dead',
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const label = status.replace(/_/g, ' ');
  return <span className={`status-badge ${statusStyles[status] ?? 'status-default'}`}>{label}</span>;
}
