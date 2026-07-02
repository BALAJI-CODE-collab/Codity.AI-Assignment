import { Card } from '../components/Card';
import { Header } from '../components/Header';
import { MetricCard } from '../components/MetricCard';
import { JobsChart } from '../components/charts/JobsChart';
import { QueueChart } from '../components/charts/QueueChart';
import { WorkerChart } from '../components/charts/WorkerChart';
import { PipelineFlow } from '../components/charts/PipelineFlow';
import type { MetricsSummary } from '../types';
import { EmptyState } from '../components/EmptyState';

interface MetricsProps {
  metrics: MetricsSummary | null;
  onRefresh: () => void;
  refreshing: boolean;
  userName: string;
  loading?: boolean;
  error?: string | null;
}

export function Metrics({ metrics, onRefresh, refreshing, userName, loading, error }: MetricsProps) {
  const statusData = [
    { name: 'Queued', value: metrics?.queued_jobs ?? 0 },
    { name: 'Running', value: metrics?.running_jobs ?? 0 },
    { name: 'Failed', value: metrics?.failed_jobs ?? 0 },
    { name: 'Completed', value: metrics?.completed_jobs ?? 0 },
  ];

  const workerData = [
    { name: 'Active', value: metrics?.active_workers ?? 0 },
    { name: 'Dead', value: metrics?.dead_workers ?? 0 },
  ];

  const queueData = [
    { name: 'Queues', value: metrics?.queues ?? 0 },
    { name: 'Projects', value: metrics?.projects ?? 0 },
  ];

  return (
    <div className="page-stack">
      <Header title="Metrics" subtitle="Operational health and reliability" userName={userName} status="Updated" onRefresh={onRefresh} isRefreshing={refreshing} />
      <div className="page-hero">
        <div>
          <div className="hero-eyebrow">Reliability metrics</div>
          <h2 className="hero-title">Performance, throughput, and failure trends</h2>
          <p className="hero-copy">Follow the system’s health story through charts, aggregate counts, and queue-level signal strength.</p>
        </div>
        <div className="hero-badges">
          <span className="hero-chip">Throughput</span>
          <span className="hero-chip">Failure trends</span>
          <span className="hero-chip">Live status</span>
        </div>
      </div>
      {error ? (
        <div className="inline-error">
          <span>{error}</span>
          <button type="button" className="button button-secondary" onClick={onRefresh}>Retry</button>
        </div>
      ) : null}
      <Card title="Live pipeline" subtitle="Real-time lifecycle flow from queued to completion">
        {loading && !metrics ? <div className="skeleton skeleton-chart" /> : <PipelineFlow metrics={metrics} />}
      </Card>
      <div className="metric-grid">
        <MetricCard label="Total jobs" value={metrics?.total_jobs ?? 0} detail="Recorded" loading={loading && !metrics} />
        <MetricCard label="Completed" value={metrics?.completed_jobs ?? 0} detail="Successful" loading={loading && !metrics} />
        <MetricCard label="Failed" value={metrics?.failed_jobs ?? 0} detail="Needs attention" loading={loading && !metrics} />
        <MetricCard label="Projects" value={metrics?.projects ?? 0} detail="In scope" loading={loading && !metrics} />
      </div>
      <div className="page-grid page-grid-2">
        <Card title="Job status" subtitle="Current distribution">
          {loading && !metrics ? <div className="skeleton skeleton-chart" /> : <JobsChart data={statusData} />}
        </Card>
        <Card title="Worker state" subtitle="Heartbeat distribution">
          {loading && !metrics ? <div className="skeleton skeleton-chart" /> : <WorkerChart data={workerData} />}
        </Card>
      </div>
      <Card title="Queue mix" subtitle="Operational queue composition">
        {loading && !metrics ? <div className="skeleton skeleton-chart" /> : metrics ? <QueueChart data={queueData} /> : <EmptyState title="No metrics snapshot yet" description="Metrics will appear here once the backend reports activity." />}
      </Card>
    </div>
  );
}
