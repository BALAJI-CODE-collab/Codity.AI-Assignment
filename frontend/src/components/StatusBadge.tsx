import { useEffect, useRef, useState } from 'react';

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
  const previousStatus = useRef(status);
  const [changed, setChanged] = useState(false);

  useEffect(() => {
    if (previousStatus.current === status) return;
    previousStatus.current = status;
    setChanged(true);
    const timer = window.setTimeout(() => setChanged(false), 520);
    return () => window.clearTimeout(timer);
  }, [status]);

  const label = status.replace(/_/g, ' ');
  return <span className={`status-badge ${statusStyles[status] ?? 'status-default'}${changed ? ' status-changed' : ''}`}>{label}</span>;
}
