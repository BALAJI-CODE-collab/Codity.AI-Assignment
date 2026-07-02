import { Card } from '../components/Card';
import { Header } from '../components/Header';
import { MetricCard } from '../components/MetricCard';
import { JobsChart } from '../components/charts/JobsChart';
import { QueueChart } from '../components/charts/QueueChart';
import { WorkerChart } from '../components/charts/WorkerChart';
import type { JobSummary, MetricsSummary, QueueSummary, WorkerSummary } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { DataTable } from '../components/DataTable';
import { QueueCard } from '../components/QueueCard';
import { WorkerCard } from '../components/WorkerCard';

interface DashboardProps {
  metrics: MetricsSummary | null;
  queues: QueueSummary[];
  jobs: JobSummary[];
  workers: WorkerSummary[];
  onRefresh: () => void;
  refreshing: boolean;
  userName: string;
}

export function Dashboard({ metrics, queues, jobs, workers, onRefresh, refreshing, userName }: DashboardProps) {
  const overviewData = [
    { name: 'Queued', value: metrics?.queued_jobs ?? 0 },
    { name: 'Running', value: metrics?.running_jobs ?? 0 },
    { name: 'Failed', value: metrics?.failed_jobs ?? 0 },
    { name: 'Dead', value: metrics?.dead_letter_jobs ?? 0 },
  ];

  const workerData = [
    { name: 'Active', value: metrics?.active_workers ?? 0 },
    { name: 'Dead', value: metrics?.dead_workers ?? 0 },
  ];

  return (
    <div className="page-stack">
      <Header title="Operations Dashboard" subtitle="Live view of queues, jobs, and workforce health" userName={userName} status="System healthy" onRefresh={onRefresh} isRefreshing={refreshing} />
      <div className="page-hero">
        <div>
          <div className="hero-eyebrow">Operations pulse</div>
          <h2 className="hero-title">Mission control for every execution lane</h2>
          <p className="hero-copy">Observe queue depth, worker health, and throughput from one refined surface with live backend-backed telemetry.</p>
        </div>
        <div className="hero-badges">
          <span className="hero-chip">Live polling</span>
          <span className="hero-chip">Realtime metrics</span>
          <span className="hero-chip">Backend synced</span>
        </div>
      </div>
      <div className="metric-grid">
        <MetricCard label="Total jobs" value={metrics?.total_jobs ?? 0} detail="Across all queues" />
        <MetricCard label="Queued" value={metrics?.queued_jobs ?? 0} detail="Waiting to run" />
        <MetricCard label="Running" value={metrics?.running_jobs ?? 0} detail="In progress" />
        <MetricCard label="Active workers" value={metrics?.active_workers ?? 0} detail="Heartbeat active" />
      </div>

      <div className="page-grid page-grid-2">
        <Card title="Job flow" subtitle="Recent operational mix">
          <JobsChart data={overviewData} />
        </Card>
        <Card title="Worker health" subtitle="Active vs dead workers">
          <WorkerChart data={workerData} />
        </Card>
      </div>

      <div className="page-grid page-grid-2">
        <Card title="Queue overview" subtitle="Currently visible queues">
          <QueueChart data={overviewData} />
        </Card>
        <Card title="Latest jobs" subtitle="Most recent activity">
          <DataTable
            columns={[
              { key: 'id', label: 'Job ID', render: (row) => String((row as JobSummary).id).slice(0, 8) },
              { key: 'status', label: 'Status', render: (row) => <StatusBadge status={(row as JobSummary).status} /> },
              { key: 'priority', label: 'Priority', render: (row) => (row as JobSummary).priority },
            ]}
            rows={jobs.slice(0, 6)}
            emptyMessage="No jobs available yet."
          />
        </Card>
      </div>

      <div className="page-grid page-grid-2">
        <Card title="Queue inventory" subtitle="Operational queue list">
          <div className="stack-list">
            {queues.length > 0 ? queues.slice(0, 4).map((queue) => <QueueCard key={queue.id} queue={queue} />) : <div className="empty-state compact">No queues available.</div>}
          </div>
        </Card>
        <Card title="Worker fleet" subtitle="Current worker pool state">
          <div className="stack-list">
            {workers.length > 0 ? workers.slice(0, 4).map((worker) => <WorkerCard key={worker.id} worker={worker} />) : <div className="empty-state compact">No workers currently reporting in.</div>}
          </div>
        </Card>
      </div>
    </div>
  );
}
