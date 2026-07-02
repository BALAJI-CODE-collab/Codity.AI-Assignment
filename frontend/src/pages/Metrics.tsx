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
}

export function Metrics({ metrics, onRefresh, refreshing, userName }: MetricsProps) {
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
      <Card title="Live pipeline" subtitle="Real-time lifecycle flow from queued to completion">
        <PipelineFlow metrics={metrics} />
      </Card>
      <div className="metric-grid">
        <MetricCard label="Total jobs" value={metrics?.total_jobs ?? 0} detail="Recorded" />
        <MetricCard label="Completed" value={metrics?.completed_jobs ?? 0} detail="Successful" />
        <MetricCard label="Failed" value={metrics?.failed_jobs ?? 0} detail="Needs attention" />
        <MetricCard label="Projects" value={metrics?.projects ?? 0} detail="In scope" />
      </div>
      <div className="page-grid page-grid-2">
        <Card title="Job status" subtitle="Current distribution">
          <JobsChart data={statusData} />
        </Card>
        <Card title="Worker state" subtitle="Heartbeat distribution">
          <WorkerChart data={workerData} />
        </Card>
      </div>
      <Card title="Queue mix" subtitle="Operational queue composition">
        {metrics ? <QueueChart data={statusData} /> : <EmptyState title="No metrics snapshot yet" description="Metrics will appear here once the backend reports activity." />}
      </Card>
    </div>
  );
}
