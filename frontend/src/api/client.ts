import type { ApiErrorShape, AuthSession, JobSummary, MetricsSummary, OrganizationSummary, ProjectSummary, QueueStatsSummary, QueueSummary, WorkerSummary } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

function getStoredSession(): AuthSession | null {
  const raw = window.localStorage.getItem('scheduler-session');
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthSession;
  } catch {
    return null;
  }
}

function persistSession(session: AuthSession | null) {
  if (!session) {
    window.localStorage.removeItem('scheduler-session');
    return;
  }
  window.localStorage.setItem('scheduler-session', JSON.stringify(session));
}

export function getStoredAuthSession() {
  return getStoredSession();
}

export function clearStoredAuthSession() {
  persistSession(null);
}

export async function request<T>(path: string, init: RequestInit = {}, requireAuth = true): Promise<T> {
  const headers = new Headers(init.headers || {});
  const session = getStoredSession();
  if (requireAuth && session?.token) {
    headers.set('Authorization', `Bearer ${session.token}`);
  }
  if (!(init.body instanceof FormData) && !headers.has('Content-Type') && init.body) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers,
  });

  if (response.status === 401) {
    clearStoredAuthSession();
    window.location.assign('/');
    throw new Error('Session expired. Please sign in again.');
  }

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = payload as ApiErrorShape;
    throw new Error(error.error?.message || 'Request failed');
  }

  return payload as T;
}

export async function login(email: string, password: string) {
  const payload = await request<{ user: AuthSession['user']; token: string }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  }, false);
  const session = { token: payload.token, user: payload.user };
  persistSession(session);
  return session;
}

export async function register(email: string, password: string, name: string) {
  const payload = await request<{ user: AuthSession['user']; token: string }>('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password, name }),
  }, false);
  const session = { token: payload.token, user: payload.user };
  persistSession(session);
  return session;
}

export async function listProjects() {
  return request<ProjectSummary[]>('/projects');
}

export async function listOrganizations() {
  return request<OrganizationSummary[]>('/organizations');
}

export async function createOrganization(payload: { name: string }) {
  return request<OrganizationSummary>('/organizations', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function createProject(payload: { org_id: string; name: string }) {
  return request<ProjectSummary>('/projects', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function listQueues(projectId?: string) {
  if (!projectId) {
    return [] as QueueSummary[];
  }
  return request<QueueSummary[]>(`/projects/${projectId}/queues`);
}

export async function getQueue(queueId: string) {
  return request<QueueSummary>(`/queues/${queueId}`);
}

export async function patchQueue(queueId: string, updates: Partial<Pick<QueueSummary, 'priority' | 'max_concurrency' | 'is_paused'>>) {
  return request<QueueSummary>(`/queues/${queueId}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  });
}

export async function createQueue(projectId: string, payload: { name: string; priority?: number; max_concurrency?: number; is_paused?: boolean }) {
  return request<QueueSummary>(`/projects/${projectId}/queues`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function listJobs(queueId: string, page = 1, perPage = 20, status?: string) {
  const search = new URLSearchParams({ page: String(page), per_page: String(perPage) });
  if (status) search.set('status', status);
  return request<JobSummary[]>(`/queues/${queueId}/jobs?${search.toString()}`);
}

export async function getJob(jobId: string) {
  return request<JobSummary>(`/jobs/${jobId}`);
}

export async function createJob(queueId: string, payload: { type: string; payload?: Record<string, unknown>; priority?: number; run_at?: string; max_attempts?: number; cron_expression?: string; job_count?: number }) {
  return request<JobSummary | JobSummary[]>(`/queues/${queueId}/jobs`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function retryJob(jobId: string) {
  return request<{ id: string }>(`/jobs/${jobId}/retry`, { method: 'POST' });
}

export async function listWorkers() {
  return request<WorkerSummary[]>('/workers');
}

export async function getMetrics() {
  return request<MetricsSummary>('/metrics');
}

export async function getQueueStats(queueId: string) {
  return request<QueueStatsSummary>(`/queues/${queueId}/stats`);
}

export async function getHealth() {
  return request<{ status: string; database: string; timestamp: string }>('/health', {}, false);
}
