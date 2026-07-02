import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { clearStoredAuthSession, createQueue, getHealth, getMetrics, getQueueStats, getStoredAuthSession, listJobs, listProjects, listQueues, listWorkers, login, register } from './api/client';
import { usePolling } from './hooks/usePolling';
import { Dashboard } from './pages/Dashboard';
import { Jobs } from './pages/Jobs';
import { Login } from './pages/Login';
import { Metrics } from './pages/Metrics';
import { Queues } from './pages/Queues';
import { Workers } from './pages/Workers';
import type { JobSummary, MetricsSummary, ProjectSummary, QueueStatsSummary, QueueSummary, WorkerSummary } from './types';
import './styles/global.css';

type View = 'auth' | 'dashboard' | 'queues' | 'jobs' | 'workers' | 'metrics';

function App() {
  const [view, setView] = useState<View>('auth');
  const [session, setSession] = useState(getStoredAuthSession());
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [queues, setQueues] = useState<QueueSummary[]>([]);
  const [selectedQueueId, setSelectedQueueId] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [jobs, setJobs] = useState<JobSummary[]>([]);
  const [workers, setWorkers] = useState<WorkerSummary[]>([]);
  const [metrics, setMetrics] = useState<MetricsSummary | null>(null);
  const [prevMetrics, setPrevMetrics] = useState<MetricsSummary | null>(null);
  const [queueStats, setQueueStats] = useState<QueueStatsSummary | null>(null);
  const [health, setHealth] = useState<{ status: string; database: string; timestamp: string } | null>(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [jobsLoading, setJobsLoading] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authForm, setAuthForm] = useState({ email: '', password: '', name: '' });
  const [queueForm, setQueueForm] = useState({ name: '', priority: '100', maxConcurrency: '1', isPaused: 'false' });
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const isAuthenticated = Boolean(session?.token);

  const refreshProjects = useCallback(async () => {
    try {
      const data = await listProjects();
      const nextProjects = data as ProjectSummary[];
      setProjects((prev) => (JSON.stringify(prev) === JSON.stringify(nextProjects) ? prev : nextProjects));
      if (!selectedProjectId && nextProjects[0]) {
        setSelectedProjectId(nextProjects[0].id);
      }
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load projects');
    }
  }, [selectedProjectId]);

  const refreshQueues = useCallback(async (projectId = selectedProjectId) => {
    if (!projectId) {
      setQueues([]);
      return;
    }

    try {
      const data = await listQueues(projectId);
      const nextQueues = data as QueueSummary[];
      setQueues((prev) => (JSON.stringify(prev) === JSON.stringify(nextQueues) ? prev : nextQueues));
      if (!selectedQueueId && nextQueues[0]) {
        setSelectedQueueId(nextQueues[0].id);
      }
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load queues');
    }
  }, [selectedProjectId, selectedQueueId]);

  const refreshHealth = useCallback(async () => {
    try {
      const data = await getHealth();
      setHealth(data);
    } catch {
      setHealth(null);
    }
  }, []);

  const refreshWorkers = useCallback(async () => {
    try {
      const data = await listWorkers();
      const nextWorkers = data as WorkerSummary[];
      setWorkers((prev) => (JSON.stringify(prev) === JSON.stringify(nextWorkers) ? prev : nextWorkers));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load workers');
    }
  }, []);

  const refreshMetrics = useCallback(async () => {
    try {
      const data = await getMetrics();
      const nextMetrics = data as MetricsSummary;
      setPrevMetrics(metrics);
      setMetrics(nextMetrics);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load metrics');
    }
  }, [metrics]);

  const refreshJobs = useCallback(async (queueId: string, currentPage = 1, currentStatus = 'all') => {
    try {
      setJobsLoading(true);
      const data = await listJobs(queueId, currentPage, 20, currentStatus === 'all' ? undefined : currentStatus);
      const nextJobs = data as JobSummary[];
      setJobs((prev) => (JSON.stringify(prev) === JSON.stringify(nextJobs) ? prev : nextJobs));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load jobs');
    } finally {
      setJobsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      setView('dashboard');
      setIsLoading(true);
      void Promise.all([refreshProjects(), refreshWorkers(), refreshMetrics(), refreshHealth()]).finally(() => setIsLoading(false));
    }
  }, [isAuthenticated, refreshProjects, refreshWorkers, refreshMetrics, refreshHealth]);

  useEffect(() => {
    if (isAuthenticated && selectedProjectId) {
      void refreshQueues(selectedProjectId);
    }
  }, [isAuthenticated, refreshQueues, selectedProjectId]);

  useEffect(() => {
    if (isAuthenticated && selectedQueueId) {
      void refreshJobs(selectedQueueId, 1, statusFilter);
      void getQueueStats(selectedQueueId).then((data) => setQueueStats(data as QueueStatsSummary)).catch(() => setQueueStats(null));
    }
  }, [isAuthenticated, refreshJobs, selectedQueueId, statusFilter]);

  const pollDashboard = useCallback(async () => {
    if (!isAuthenticated) return;

    await Promise.all([refreshProjects(), refreshWorkers(), refreshMetrics(), refreshHealth()]);

    if (selectedQueueId) {
      await refreshJobs(selectedQueueId, 1, statusFilter);
    }
  }, [isAuthenticated, refreshJobs, refreshMetrics, refreshProjects, refreshWorkers, refreshHealth, selectedQueueId, statusFilter]);

  usePolling(pollDashboard, 4000);

  async function handleSelectQueue(queueId: string) {
    setSelectedQueueId(queueId);
    await refreshJobs(queueId, 1, statusFilter);
    try {
      const data = await getQueueStats(queueId);
      setQueueStats(data as QueueStatsSummary);
    } catch {
      setQueueStats(null);
    }
  }

  async function handleCreateQueue() {
    try {
      if (!selectedProjectId) {
        setError('Select a project before creating a queue.');
        return;
      }
      await createQueue(selectedProjectId, {
        name: queueForm.name,
        priority: Number(queueForm.priority),
        max_concurrency: Number(queueForm.maxConcurrency),
        is_paused: queueForm.isPaused === 'true',
      });
      setQueueForm({ name: '', priority: '100', maxConcurrency: '1', isPaused: 'false' });
      await refreshProjects();
      await refreshQueues(selectedProjectId);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Queue creation failed');
    }
  }

  async function handleAuthSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      if (authMode === 'login') {
        const result = await login(authForm.email, authForm.password);
        setSession(result);
      } else {
        const result = await register(authForm.email, authForm.password, authForm.name);
        setSession(result);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
    }
  }

  const staleWorkerCount = useMemo(() => workers.filter((worker) => {
    const lastSeen = Date.parse(worker.last_seen_at);
    return Number.isFinite(lastSeen) && Date.now() - lastSeen > 20000;
  }).length, [workers]);

  const visibleView = view === 'auth' ? 'dashboard' : view;

  if (!isAuthenticated) {
    return <Login authMode={authMode} onModeChange={setAuthMode} email={authForm.email} password={authForm.password} name={authForm.name} error={error} onEmailChange={(value) => setAuthForm((prev) => ({ ...prev, email: value }))} onPasswordChange={(value) => setAuthForm((prev) => ({ ...prev, password: value }))} onNameChange={(value) => setAuthForm((prev) => ({ ...prev, name: value }))} onSubmit={handleAuthSubmit} />;
  }

  return (
    <div className="app-shell">
      <div className="top-nav">
        <div className="top-nav-brand">
          <div className="brand-mark">D</div>
          <div>
            <div className="brand-name">Distributed Job Scheduler</div>
            <div className="brand-note">Operations console</div>
          </div>
        </div>

        <button type="button" className="nav-menu-button" aria-expanded={mobileNavOpen} aria-controls="primary-nav" onClick={() => setMobileNavOpen((open) => !open)}>
          <span />
          <span />
          <span />
        </button>

        <nav id="primary-nav" className={mobileNavOpen ? 'top-nav-links open' : 'top-nav-links'} aria-label="Primary navigation">
          <button type="button" className={visibleView === 'dashboard' ? 'nav-link active' : 'nav-link'} onClick={() => { setView('dashboard'); setMobileNavOpen(false); }}>Dashboard</button>
          <button type="button" className={visibleView === 'queues' ? 'nav-link active' : 'nav-link'} onClick={() => { setView('queues'); setMobileNavOpen(false); }}>Queues</button>
          <button type="button" className={visibleView === 'jobs' ? 'nav-link active' : 'nav-link'} onClick={() => { setView('jobs'); setMobileNavOpen(false); }}>Jobs</button>
          <button type="button" className={visibleView === 'workers' ? 'nav-link active' : 'nav-link'} onClick={() => { setView('workers'); setMobileNavOpen(false); }}>Workers</button>
          <button type="button" className={visibleView === 'metrics' ? 'nav-link active' : 'nav-link'} onClick={() => { setView('metrics'); setMobileNavOpen(false); }}>Metrics</button>
          </nav>

        <div className="top-nav-meta">
          <div className="meta-item">
            <span className="meta-label">Current user</span>
            <span>{session?.user?.name ?? 'Operator'}</span>
          </div>
          <div className="meta-item">
            <span className="meta-label">System status</span>
            <span>{health?.status ?? 'Unknown'}</span>
          </div>
          <button type="button" className="button button-ghost" onClick={() => { clearStoredAuthSession(); setSession(null); setView('auth'); }}>Logout</button>
        </div>
      </div>

      <main className="main-column">
        <div className="main-content">
          {error ? <div className="inline-error">{error}</div> : null}
          {view === 'dashboard' ? (
            <Dashboard
              metrics={metrics}
              prevMetrics={prevMetrics}
              queues={queues}
              queueStats={queueStats}
              health={health}
              jobs={jobs}
              workers={workers}
              projects={projects}
              selectedProjectId={selectedProjectId}
              selectedQueueId={selectedQueueId}
              queueForm={queueForm}
              onProjectChange={setSelectedProjectId}
              onQueueChange={handleSelectQueue}
              onQueueFormChange={(nextForm) => setQueueForm(nextForm)}
              onCreateQueue={handleCreateQueue}
              onRefresh={() => { void refreshProjects(); void refreshWorkers(); void refreshMetrics(); void refreshHealth(); }}
              refreshing={isLoading || jobsLoading}
              loading={isLoading}
              jobsLoading={jobsLoading}
              error={error}
              userName={session?.user?.name ?? 'Operator'}
            />
          ) : null}
          {view === 'queues' ? (
            <Queues queues={queues} onRefresh={() => { void refreshQueues(selectedProjectId); }} refreshing={isLoading} userName={session?.user?.name ?? 'Operator'} loading={isLoading} error={error} onCreateQueue={() => setView('dashboard')} />
          ) : null}
          {view === 'jobs' ? (
            <Jobs jobs={jobs} onRefresh={() => { if (selectedQueueId) void refreshJobs(selectedQueueId, 1, statusFilter); }} refreshing={jobsLoading} userName={session?.user?.name ?? 'Operator'} loading={jobsLoading} error={error} />
          ) : null}
          {view === 'workers' ? (
            <Workers workers={workers} onRefresh={() => { void refreshWorkers(); }} refreshing={isLoading} userName={session?.user?.name ?? 'Operator'} loading={isLoading} error={error} />
          ) : null}
          {view === 'metrics' ? (
            <Metrics metrics={metrics} onRefresh={() => { void refreshMetrics(); }} refreshing={isLoading} userName={session?.user?.name ?? 'Operator'} loading={isLoading} error={error} />
          ) : null}
        </div>
      </main>
    </div>
  );
}

export default App;
