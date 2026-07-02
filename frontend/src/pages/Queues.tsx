import { Card } from '../components/Card';
import { DataTable } from '../components/DataTable';
import { Header } from '../components/Header';
import { SearchBox } from '../components/SearchBox';
import type { QueueSummary } from '../types';
import { useMemo, useState } from 'react';

interface QueuesProps {
  queues: QueueSummary[];
  onRefresh: () => void;
  refreshing: boolean;
  userName: string;
  loading?: boolean;
  error?: string | null;
  onCreateQueue?: () => void;
}

export function Queues({ queues, onRefresh, refreshing, userName, loading, error, onCreateQueue }: QueuesProps) {
  const [search, setSearch] = useState('');
  const filtered = useMemo(() => queues.filter((queue) => queue.name.toLowerCase().includes(search.toLowerCase())), [queues, search]);

  return (
    <div className="page-stack">
      <Header title="Queues" subtitle="Monitor queue health and throughput" userName={userName} status="Live" onRefresh={onRefresh} isRefreshing={refreshing} />
      <div className="page-hero">
        <div>
          <div className="hero-eyebrow">Queue operations</div>
          <h2 className="hero-title">Prioritized execution lanes</h2>
          <p className="hero-copy">Track queue readiness, concurrency, and pause state without leaving the monitoring workspace.</p>
        </div>
        <div className="hero-badges">
          <span className="hero-chip">Priority aware</span>
          <span className="hero-chip">Paused states</span>
          <span className="hero-chip">Searchable</span>
        </div>
      </div>
      {error ? (
        <div className="inline-error">
          <span>{error}</span>
          <button type="button" className="button button-secondary" onClick={onRefresh}>Retry</button>
        </div>
      ) : null}
      <Card title="Queue inventory" subtitle="Search and inspect available queues" action={<SearchBox value={search} onChange={setSearch} placeholder="Search queues" />}>
        <DataTable
          columns={[
            { key: 'name', label: 'Queue name' },
            { key: 'priority', label: 'Priority' },
            { key: 'max_concurrency', label: 'Concurrency' },
            { key: 'is_paused', label: 'Paused', render: (row) => ((row as QueueSummary).is_paused ? 'Yes' : 'No') },
            { key: 'created_at', label: 'Created', render: (row) => new Date((row as QueueSummary).created_at).toLocaleString() },
          ]}
          rows={filtered}
          loading={loading}
          emptyMessage={search ? 'No queues match the current search.' : 'No queues yet. Create your first queue to start scheduling jobs.'}
          emptyActionLabel={!search ? 'Create queue' : undefined}
          onEmptyAction={!search ? onCreateQueue : undefined}
        />
      </Card>
    </div>
  );
}
