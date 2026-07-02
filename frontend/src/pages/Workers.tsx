import { Card } from '../components/Card';
import { DataTable } from '../components/DataTable';
import { Header } from '../components/Header';
import { StatusBadge } from '../components/StatusBadge';
import type { WorkerSummary } from '../types';

interface WorkersProps {
  workers: WorkerSummary[];
  onRefresh: () => void;
  refreshing: boolean;
  userName: string;
  loading?: boolean;
  error?: string | null;
}

export function Workers({ workers, onRefresh, refreshing, userName, loading, error }: WorkersProps) {
  return (
    <div className="page-stack">
      <Header title="Workers" subtitle="Track worker availability and heartbeat" userName={userName} status="Live" onRefresh={onRefresh} isRefreshing={refreshing} />
      <div className="page-hero">
        <div>
          <div className="hero-eyebrow">Worker fleet</div>
          <h2 className="hero-title">Heartbeat-aware workforce monitoring</h2>
          <p className="hero-copy">Inspect worker availability, current concurrency, and liveness signals from a dedicated operations view.</p>
        </div>
        <div className="hero-badges">
          <span className="hero-chip">Heartbeat health</span>
          <span className="hero-chip">Live fleet</span>
          <span className="hero-chip">Concurrency view</span>
        </div>
      </div>
      {error ? (
        <div className="inline-error">
          <span>{error}</span>
          <button type="button" className="button button-secondary" onClick={onRefresh}>Retry</button>
        </div>
      ) : null}
      <Card title="Worker fleet" subtitle="Current worker pool state">
        <DataTable
          columns={[
            { key: 'hostname', label: 'Hostname' },
            { key: 'status', label: 'Status', render: (row) => <StatusBadge status={(row as WorkerSummary).status} /> },
            { key: 'current_running_jobs', label: 'Running jobs' },
            { key: 'last_seen_at', label: 'Last seen', render: (row) => new Date((row as WorkerSummary).last_seen_at).toLocaleString() },
          ]}
          rows={workers}
          loading={loading}
          emptyMessage="No workers are currently reporting in."
        />
      </Card>
    </div>
  );
}
