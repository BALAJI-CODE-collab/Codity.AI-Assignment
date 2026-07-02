import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { clearStoredAuthSession, createQueue, getMetrics, getQueueStats, getStoredAuthSession, listJobs, listProjects, listQueues, listWorkers, login, patchQueue, register, retryJob } from './api/client';
import { usePolling } from './hooks/usePolling';
import { Sidebar, type ViewKey } from './components/Sidebar';
import { Dashboard } from './pages/Dashboard';
import { Queues } from './pages/Queues';
import { Jobs } from './pages/Jobs';
import { Workers } from './pages/Workers';
import { Metrics } from './pages/Metrics';
import { Architecture } from './pages/Architecture';
import { Login } from './pages/Login';
import type { JobSummary, MetricsSummary, ProjectSummary, QueueStatsSummary, QueueSummary, WorkerSummary } from './types';
import './styles/global.css';

type View = 'auth' | ViewKey;

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
  const [queueStats, setQueueStats] = useState<QueueStatsSummary | null>(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authForm, setAuthForm] = useState({ email: '', password: '', name: '' });
  const [queueForm, setQueueForm] = useState({ name: '', priority: '100', maxConcurrency: '1', isPaused: 'false' });

  const isAuthenticated = Boolean(session?.token);

  const refreshProjects = useCallback(async () => {
    try {
      const data = await listProjects();
      const nextProjects = data as ProjectSummary[];
      setProjects((prev) => (JSON.stringify(prev) === JSON.stringify(nextProjects) ? prev : nextProjects));
      if (!selectedProjectId && nextProjects[0]) {
        setSelectedProjectId(nextProjects[0].id);
      }
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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load queues');
    }
  }, [selectedProjectId]);

  const refreshWorkers = useCallback(async () => {
    try {
      const data = await listWorkers();
      const nextWorkers = data as WorkerSummary[];
      setWorkers((prev) => (JSON.stringify(prev) === JSON.stringify(nextWorkers) ? prev : nextWorkers));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load workers');
    }
  }, []);

  const refreshMetrics = useCallback(async () => {
    try {
      const data = await getMetrics();
      const nextMetrics = data as MetricsSummary;
      setMetrics((prev) => (JSON.stringify(prev) === JSON.stringify(nextMetrics) ? prev : nextMetrics));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load metrics');
    }
  }, []);

  const refreshJobs = useCallback(async (queueId: string, currentPage = 1, currentStatus = 'all') => {
    try {
      setIsLoading(true);
      const data = await listJobs(queueId, currentPage, 20, currentStatus === 'all' ? undefined : currentStatus);
      const nextJobs = data as JobSummary[];
      setJobs((prev) => (JSON.stringify(prev) === JSON.stringify(nextJobs) ? prev : nextJobs));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load jobs');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      setView('dashboard');
      void refreshProjects();
      void refreshWorkers();
      void refreshMetrics();
    }
  }, [isAuthenticated, refreshProjects, refreshWorkers, refreshMetrics]);

  useEffect(() => {
    if (isAuthenticated && selectedProjectId) {
      void refreshQueues(selectedProjectId);
    }
  }, [isAuthenticated, refreshQueues, selectedProjectId]);

  const pollDashboard = useCallback(async () => {
    if (!isAuthenticated) return;

    await Promise.all([refreshProjects(), refreshWorkers(), refreshMetrics()]);

    if (selectedQueueId) {
      await refreshJobs(selectedQueueId, 1, statusFilter);
    }
  }, [isAuthenticated, refreshJobs, refreshMetrics, refreshProjects, refreshWorkers, selectedQueueId, statusFilter]);

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
      <Sidebar
        activeView={visibleView}
        onNavigate={(nextView) => setView(nextView)}
        onLogout={() => { clearStoredAuthSession(); setSession(null); setView('auth'); }}
        userName={session?.user?.name ?? 'Operator'}
      />
      <div className="main-column">
        <main className="main-content">
          {error ? <div className="inline-error">{error}</div> : null}
          {view === 'dashboard' ? (
            <Dashboard metrics={metrics} queues={queues} jobs={jobs} workers={workers} onRefresh={() => { void refreshProjects(); void refreshWorkers(); void refreshMetrics(); }} refreshing={isLoading} userName={session?.user?.name ?? 'Operator'} />
          ) : null}
          {view === 'queues' ? (
            <Queues queues={queues} onRefresh={() => { void refreshQueues(selectedProjectId); }} refreshing={isLoading} userName={session?.user?.name ?? 'Operator'} />
          ) : null}
          {view === 'jobs' ? (
            <Jobs jobs={jobs} onRefresh={() => { if (selectedQueueId) void refreshJobs(selectedQueueId, 1, statusFilter); }} refreshing={isLoading} userName={session?.user?.name ?? 'Operator'} />
          ) : null}
          {view === 'workers' ? (
            <Workers workers={workers} onRefresh={() => { void refreshWorkers(); }} refreshing={isLoading} userName={session?.user?.name ?? 'Operator'} />
          ) : null}
          {view === 'metrics' ? (
            <Metrics metrics={metrics} onRefresh={() => { void refreshMetrics(); }} refreshing={isLoading} userName={session?.user?.name ?? 'Operator'} />
          ) : null}
          {view === 'architecture' ? (
            <Architecture onRefresh={() => { void refreshMetrics(); }} refreshing={isLoading} userName={session?.user?.name ?? 'Operator'} />
          ) : null}
        </main>
      </div>
    </div>
  );
}

export default App;
