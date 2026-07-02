import { Card } from '../components/Card';
import { DataTable } from '../components/DataTable';
import { Header } from '../components/Header';
import { SearchBox } from '../components/SearchBox';
import { StatusBadge } from '../components/StatusBadge';
import type { JobSummary } from '../types';
import { useMemo, useState } from 'react';

interface JobsProps {
  jobs: JobSummary[];
  onRefresh: () => void;
  refreshing: boolean;
  userName: string;
  loading?: boolean;
  error?: string | null;
}

export function Jobs({ jobs, onRefresh, refreshing, userName, loading, error }: JobsProps) {
  const [search, setSearch] = useState('');
  const filtered = useMemo(() => jobs.filter((job) => job.type.toLowerCase().includes(search.toLowerCase()) || job.status.toLowerCase().includes(search.toLowerCase())), [jobs, search]);

  return (
    <div className="page-stack">
      <Header title="Jobs" subtitle="Inspect job state and retry readiness" userName={userName} status="Live" onRefresh={onRefresh} isRefreshing={refreshing} />
      <div className="page-hero">
        <div>
          <div className="hero-eyebrow">Job stream</div>
          <h2 className="hero-title">Execution activity with retry context</h2>
          <p className="hero-copy">Filter by status and inspect the active job feed with the same backend-backed data model as the scheduler.</p>
        </div>
        <div className="hero-badges">
          <span className="hero-chip">Retry ready</span>
          <span className="hero-chip">State filters</span>
          <span className="hero-chip">Live feed</span>
        </div>
      </div>
      {error ? (
        <div className="inline-error">
          <span>{error}</span>
          <button type="button" className="button button-secondary" onClick={onRefresh}>Retry</button>
        </div>
      ) : null}
      <Card title="Job stream" subtitle="Search jobs by type or state" action={<SearchBox value={search} onChange={setSearch} placeholder="Search jobs" />}>
        <DataTable
          columns={[
            { key: 'id', label: 'Job ID', render: (row) => String((row as JobSummary).id).slice(0, 8) },
            { key: 'type', label: 'Type' },
            { key: 'status', label: 'Status', render: (row) => <StatusBadge status={(row as JobSummary).status} /> },
            { key: 'priority', label: 'Priority' },
            { key: 'attempts', label: 'Attempts' },
            { key: 'created_at', label: 'Created', render: (row) => new Date((row as JobSummary).created_at).toLocaleString() },
          ]}
          rows={filtered}
          loading={loading && jobs.length === 0}
          emptyMessage={search ? 'No jobs match the current filters.' : 'No jobs yet. Jobs will appear here when the selected queue receives work.'}
        />
      </Card>
    </div>
  );
}
