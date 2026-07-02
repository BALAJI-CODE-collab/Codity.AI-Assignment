import { useEffect, useMemo, useState } from 'react';
import { DataTable } from '../components/DataTable';
import { EmptyState } from '../components/EmptyState';
import { MetricCard } from '../components/MetricCard';
import { StatusBadge } from '../components/StatusBadge';
import { ArchitectureDiagram } from '../components/ArchitectureDiagram';
import { JobsChart } from '../components/charts/JobsChart';
import { QueueChart } from '../components/charts/QueueChart';
import { WorkerChart } from '../components/charts/WorkerChart';
import type { JobSummary, MetricsSummary, ProjectSummary, QueueSummary, WorkerSummary } from '../types';

interface QueueFormState {
  name: string;
  priority: string;
  maxConcurrency: string;
  isPaused: string;
}

interface DashboardProps {
  metrics: MetricsSummary | null;
  prevMetrics: MetricsSummary | null;
  queues: QueueSummary[];
  queueStats: { queue_id: string; queue_name: string; queued_jobs: number; running_jobs: number; completed_jobs: number; failed_jobs: number; dead_letter_jobs: number; average_execution_time_ms: number; oldest_queued_job: string | null } | null;
  health: { status: string; database: string; timestamp: string } | null;
  jobs: JobSummary[];
  workers: WorkerSummary[];
  projects: ProjectSummary[];
  selectedProjectId: string;
  selectedQueueId: string;
  queueForm: QueueFormState;
  onProjectChange: (projectId: string) => void;
  onQueueChange: (queueId: string) => void;
  onQueueFormChange: (nextForm: QueueFormState) => void;
  onCreateQueue: () => void;
  onRefresh: () => void;
  refreshing: boolean;
  loading?: boolean;
  jobsLoading?: boolean;
  error?: string | null;
  userName: string;
}

interface MetricTile {
  title: string;
  value: number | string;
  trend: string;
  updated: string;
  health: 'Healthy' | 'Degraded' | 'Offline';
}

const trendValue = (current?: number, previous?: number) => {
  if (current == null || previous == null) return '-';
  const delta = current - previous;
  if (delta === 0) return 'Stable';
  return `${delta > 0 ? 'Up' : 'Down'} ${Math.abs(delta)}`;
};

const formatLatency = (milliseconds: number) => `${Math.round(milliseconds / 1000)}s`;

const relativeAge = (timestamp: string | null) => {
  if (!timestamp) return 'Unknown';
  const diff = Date.now() - Date.parse(timestamp);
  if (!Number.isFinite(diff)) return 'Unknown';
  if (diff < 1000) return 'now';
  if (diff < 60000) return `${Math.round(diff / 1000)}s ago`;
  if (diff < 3600000) return `${Math.round(diff / 60000)}m ago`;
  return `${Math.round(diff / 3600000)}h ago`;
};

export function Dashboard({ metrics, prevMetrics, queues, queueStats, health, jobs, workers, projects, selectedProjectId, selectedQueueId, queueForm, onProjectChange, onQueueChange, onQueueFormChange, onCreateQueue, onRefresh, refreshing, loading, jobsLoading, userName }: DashboardProps) {
  const [lastPoll, setLastPoll] = useState('-');

  useEffect(() => {
    if (metrics) {
      setLastPoll(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    }
  }, [metrics]);

  const jobCountsByQueue = useMemo(() => {
    return jobs.reduce<Record<string, number>>((acc, job) => {
      acc[job.queue_id] = (acc[job.queue_id] ?? 0) + 1;
      return acc;
    }, {});
  }, [jobs]);

  const statusCounters = useMemo(
    () => ({
      backend: metrics ? 'Connected' : 'Disconnected',
      workers: metrics?.active_workers ?? workers.length,
      queues: metrics?.queues ?? queues.length,
      runningJobs: metrics?.running_jobs ?? 0,
    }),
    [metrics, queues.length, workers.length],
  );

  const metricCards: MetricTile[] = [
    { title: 'Total Jobs', value: metrics?.total_jobs ?? 0, trend: trendValue(metrics?.total_jobs, prevMetrics?.total_jobs), updated: lastPoll, health: metrics ? 'Healthy' : 'Offline' },
    { title: 'Running Jobs', value: metrics?.running_jobs ?? 0, trend: trendValue(metrics?.running_jobs, prevMetrics?.running_jobs), updated: lastPoll, health: metrics ? 'Healthy' : 'Offline' },
    { title: 'Queued Jobs', value: metrics?.queued_jobs ?? 0, trend: trendValue(metrics?.queued_jobs, prevMetrics?.queued_jobs), updated: lastPoll, health: metrics ? 'Healthy' : 'Offline' },
    { title: 'Workers', value: metrics?.active_workers ?? workers.length, trend: trendValue(metrics?.active_workers, prevMetrics?.active_workers), updated: lastPoll, health: metrics ? 'Healthy' : 'Healthy' },
    { title: 'Dead Workers', value: metrics?.dead_workers ?? 0, trend: trendValue(metrics?.dead_workers, prevMetrics?.dead_workers), updated: lastPoll, health: metrics?.dead_workers ? 'Degraded' : 'Healthy' },
    { title: 'Retry Queue', value: metrics?.dead_letter_jobs ?? 0, trend: trendValue(metrics?.dead_letter_jobs, prevMetrics?.dead_letter_jobs), updated: lastPoll, health: 'Healthy' },
    { title: 'Projects', value: metrics?.projects ?? 0, trend: trendValue(metrics?.projects, prevMetrics?.projects), updated: lastPoll, health: 'Healthy' },
    { title: 'Queues', value: metrics?.queues ?? queues.length, trend: trendValue(metrics?.queues, prevMetrics?.queues), updated: lastPoll, health: queues.length ? 'Healthy' : 'Degraded' },
  ];

  const nodeSequence = useMemo(
    () => [
      { id: 'browser', title: 'CLIENT', label: 'Browser', status: 'online' },
      { id: 'api', title: 'API', label: 'Gateway', status: 'online' },
      { id: 'auth', title: 'AUTH', label: 'JWT', status: 'online' },
      { id: 'project', title: 'PROJECT', label: 'Project', status: 'online' },
      { id: 'queue', title: 'QUEUE', label: 'Priority queue', status: queues.length > 0 ? 'active' : 'idle' },
      { id: 'scheduler', title: 'SCHEDULER', label: 'Dispatcher', status: metrics?.running_jobs ? 'active' : 'online' },
      { id: 'workers', title: 'WORKERS', label: 'Worker pool', status: workers.length > 0 ? 'active' : 'idle' },
      { id: 'database', title: 'DATABASE', label: 'State store', status: metrics ? 'online' : 'offline' },
      { id: 'metrics', title: 'METRICS', label: 'Telemetry', status: metrics ? 'online' : 'offline' },
    ],
    [metrics, queues.length, workers.length],
  );

  const pipelineStages = useMemo(
    () => [
      { key: 'queued', label: 'Queued', count: metrics?.queued_jobs ?? 0 },
      { key: 'running', label: 'Running', count: metrics?.running_jobs ?? 0 },
      { key: 'retry', label: 'Retry', count: metrics?.dead_letter_jobs ?? 0 },
      { key: 'completed', label: 'Completed', count: metrics?.completed_jobs ?? 0 },
      { key: 'failed', label: 'Failed', count: metrics?.failed_jobs ?? 0 },
    ],
    [metrics],
  );

  const chartStatusData = useMemo(
    () => [
      { name: 'Queued', value: metrics?.queued_jobs ?? 0 },
      { name: 'Running', value: metrics?.running_jobs ?? 0 },
      { name: 'Failed', value: metrics?.failed_jobs ?? 0 },
      { name: 'Completed', value: metrics?.completed_jobs ?? 0 },
    ],
    [metrics],
  );

  const workerChartData = useMemo(
    () => [
      { name: 'Active', value: metrics?.active_workers ?? workers.length },
      { name: 'Dead', value: metrics?.dead_workers ?? 0 },
    ],
    [metrics, workers.length],
  );

  const queueChartData = useMemo(
    () => [
      { name: 'Open', value: metrics?.queues ?? queues.length },
      { name: 'Projects', value: metrics?.projects ?? 0 },
    ],
    [metrics, queues.length],
  );

  return (
    <div className="page-stack">
      <div className="page-hero">
        <div>
          <div className="hero-eyebrow">Distributed Job Scheduler</div>
          <h2>Control every job.<br />Orchestrate every worker.</h2>
          <p>Live operations for distributed scheduling, workforce health, and execution reliability.</p>
          <div className="hero-badges">
            <span className="hero-chip">Backend {statusCounters.backend}</span>
            <span className="hero-chip">Workers {statusCounters.workers}</span>
            <span className="hero-chip">Queues {statusCounters.queues}</span>
            <span className="hero-chip">Running {statusCounters.runningJobs}</span>
          </div>
        </div>

        <div className="hero-panel">
          <div className="page-title">
            <div>
              <p className="page-subtitle">Operator</p>
              <h1 style={{ margin: 0, fontSize: '1.3rem' }}>{userName}</h1>
            </div>
          </div>
          <p className="page-subtitle">Realtime backend polling is active.</p>
          <button type="button" className="button button-secondary" onClick={onRefresh}>
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
          <div style={{ marginTop: '20px' }}>
            <div className="metric-card" style={{ padding: '16px' }}>
              <div className="metric-label">Last poll</div>
              <div className="metric-value">{lastPoll}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="metric-grid">
        {metricCards.map((card) => (
          <MetricCard key={card.title} label={card.title} value={card.value} detail={`${card.updated} | ${card.trend}`} loading={loading && !metrics} />
        ))}
      </div>

      <div className="card">
        <div className="card-header">
          <div>
            <h3>Queue controls</h3>
            <div className="card-subtitle">Create queues and inspect the selected queue snapshot</div>
          </div>
          <div className="header-status">{health?.status ?? 'Unknown'}</div>
        </div>
        <div className="control-grid">
          <label className="field-stack">
            <span>Project</span>
            <select className="select" value={selectedProjectId} onChange={(event) => onProjectChange(event.target.value)}>
              {projects.length > 0 ? (
                projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)
              ) : (
                <option value="">No projects available</option>
              )}
            </select>
          </label>
          <label className="field-stack">
            <span>Queue</span>
            <select className="select" value={selectedQueueId} onChange={(event) => onQueueChange(event.target.value)} disabled={queues.length === 0}>
              {queues.length > 0 ? (
                queues.map((queue) => <option key={queue.id} value={queue.id}>{queue.name}</option>)
              ) : (
                <option value="">No queues available</option>
              )}
            </select>
          </label>
          <label className="field-stack">
            <span>New queue</span>
            <input className="input" value={queueForm.name} onChange={(event) => onQueueFormChange({ ...queueForm, name: event.target.value })} placeholder="Queue name" />
          </label>
          <label className="field-stack">
            <span>Priority</span>
            <input className="input" type="number" min="0" value={queueForm.priority} onChange={(event) => onQueueFormChange({ ...queueForm, priority: event.target.value })} />
          </label>
          <label className="field-stack">
            <span>Concurrency</span>
            <input className="input" type="number" min="1" value={queueForm.maxConcurrency} onChange={(event) => onQueueFormChange({ ...queueForm, maxConcurrency: event.target.value })} />
          </label>
          <label className="field-stack">
            <span>Paused</span>
            <select className="select" value={queueForm.isPaused} onChange={(event) => onQueueFormChange({ ...queueForm, isPaused: event.target.value })}>
              <option value="false">No</option>
              <option value="true">Yes</option>
            </select>
          </label>
          <button type="button" className="button button-primary" onClick={onCreateQueue} disabled={!selectedProjectId || !queueForm.name.trim()}>
            Create queue
          </button>
        </div>
        {queueStats ? (
          <div className="queue-stat-strip">
            <span>{queueStats.queue_name}</span>
            <span>Queued {queueStats.queued_jobs}</span>
            <span>Running {queueStats.running_jobs}</span>
            <span>Completed {queueStats.completed_jobs}</span>
            <span>Failed {queueStats.failed_jobs}</span>
          </div>
        ) : null}
      </div>

      <div className="card">
        <div className="card-header">
          <div>
            <h3>System architecture</h3>
            <div className="card-subtitle">Distributed scheduler pipeline</div>
          </div>
        </div>
        <ArchitectureDiagram />
      </div>

      <div className="page-grid page-grid-2">
        <div className="card">
          <div className="card-header">
            <div>
              <h3>Queue health</h3>
              <div className="card-subtitle">Priority queue inventory</div>
            </div>
          </div>
          <DataTable
            columns={[
              { key: 'name', label: 'Queue' },
              { key: 'priority', label: 'Priority' },
              { key: 'max_concurrency', label: 'Concurrency' },
              { key: 'status', label: 'Status', render: (row) => <StatusBadge status={(row as QueueSummary).is_paused ? 'failed' : 'running'} /> },
              { key: 'jobs', label: 'Jobs', render: (row) => String(jobCountsByQueue[(row as QueueSummary).id] ?? '-') },
              { key: 'created_at', label: 'Created', render: (row) => new Date((row as QueueSummary).created_at).toLocaleDateString() },
            ]}
            rows={queues}
            loading={loading}
            emptyMessage="No queues yet. Create your first queue from the dashboard setup panel."
          />
        </div>

        <div className="card">
          <div className="card-header">
            <div>
              <h3>Worker health</h3>
              <div className="card-subtitle">Worker fleet readiness</div>
            </div>
          </div>
          <DataTable
            columns={[
              { key: 'hostname', label: 'Worker' },
              { key: 'heartbeat', label: 'Heartbeat', render: (row) => relativeAge((row as WorkerSummary).last_seen_at) },
              { key: 'current_running_jobs', label: 'Current Job', render: (row) => ((row as WorkerSummary).current_running_jobs > 0 ? `${(row as WorkerSummary).current_running_jobs} active` : 'Idle') },
              { key: 'latency', label: 'Latency', render: (row) => formatLatency(Math.max(0, Date.now() - Date.parse((row as WorkerSummary).last_seen_at))) },
              { key: 'status', label: 'Status', render: (row) => <StatusBadge status={(row as WorkerSummary).status} /> },
            ]}
            rows={workers}
            loading={loading}
            emptyMessage="No workers are currently reporting in."
          />
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div>
            <h3>Job execution pipeline</h3>
            <div className="card-subtitle">Lifecycle flow visualization</div>
          </div>
        </div>
        <div className="pipeline-shell" style={{ padding: '18px' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px' }}>
            {pipelineStages.map((stage) => (
              <div key={stage.key} className="metric-card" style={{ flex: '1 1 160px', minWidth: '140px', padding: '16px' }}>
                <div className="metric-label">{stage.label}</div>
                <div className="metric-value">{stage.count}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div>
            <h3>Event stream</h3>
            <div className="card-subtitle">Live scheduler activity</div>
          </div>
        </div>
        <div className="terminal-log-shell">
          {jobs.length > 0 ? (
            jobs.slice(0, 6).map((job) => (
              <span key={`${job.id}-${job.updated_at}`} className="terminal-log-line">
                [{new Date(job.updated_at).toLocaleTimeString()}] {job.type} {job.status.replace(/_/g, ' ')} after {job.attempts}/{job.max_attempts} attempts
              </span>
            ))
          ) : (
            <EmptyState title="No live job events" description="Job activity will appear here after the selected queue receives real jobs." />
          )}
        </div>
      </div>

      <div className="page-grid page-grid-3">
        <div className="card">
          <div className="card-header">
            <div>
              <h3>Job status</h3>
              <div className="card-subtitle">Queued, running, failed, completed</div>
            </div>
          </div>
          {loading && !metrics ? <div className="skeleton skeleton-chart" /> : <JobsChart data={chartStatusData} />}
        </div>

        <div className="card">
          <div className="card-header">
            <div>
              <h3>Worker state</h3>
              <div className="card-subtitle">Active vs dead</div>
            </div>
          </div>
          {loading && !metrics ? <div className="skeleton skeleton-chart" /> : <WorkerChart data={workerChartData} />}
        </div>

        <div className="card">
          <div className="card-header">
            <div>
              <h3>Queue mix</h3>
              <div className="card-subtitle">Open queues and projects</div>
            </div>
          </div>
          {loading && !metrics ? <div className="skeleton skeleton-chart" /> : <QueueChart data={queueChartData} />}
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div>
            <h3>Recent jobs</h3>
            <div className="card-subtitle">Most recent executions</div>
          </div>
        </div>
        <DataTable
          columns={[
            { key: 'id', label: 'Job ID', render: (row) => String((row as JobSummary).id).slice(0, 8) },
            { key: 'type', label: 'Type' },
            { key: 'status', label: 'Status', render: (row) => <StatusBadge status={(row as JobSummary).status} /> },
            { key: 'attempts', label: 'Attempts' },
            { key: 'updated_at', label: 'Updated', render: (row) => new Date((row as JobSummary).updated_at).toLocaleTimeString() },
          ]}
          rows={jobs.slice(0, 8)}
          loading={jobsLoading && jobs.length === 0}
          emptyMessage="No recent jobs yet."
        />
      </div>
    </div>
  );
}
