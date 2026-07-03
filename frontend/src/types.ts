export interface UserSummary {
  id: string;
  email: string;
  name: string;
}

export interface AuthSession {
  token: string;
  user: UserSummary;
}

export interface ProjectSummary {
  id: string;
  name: string;
  org_id: string;
  created_at: string;
}

export interface OrganizationSummary {
  id: string;
  name: string;
  created_at: string;
}

export interface QueueSummary {
  id: string;
  project_id: string;
  name: string;
  priority: number;
  max_concurrency: number;
  retry_policy_id: string | null;
  is_paused: boolean;
  created_at: string;
}

export interface JobSummary {
  id: string;
  queue_id: string;
  worker_id: string | null;
  type: string;
  payload: Record<string, unknown>;
  status: JobStatus;
  priority: number;
  run_at: string;
  attempts: number;
  max_attempts: number;
  batch_id: string | null;
  created_at: string;
  updated_at: string;
}

export type JobStatus = 'queued' | 'scheduled' | 'claimed' | 'running' | 'completed' | 'failed' | 'dead_letter';

export interface MetricsSummary {
  total_jobs: number;
  queued_jobs: number;
  claimed_jobs: number;
  running_jobs: number;
  completed_jobs: number;
  failed_jobs: number;
  dead_letter_jobs: number;
  scheduled_jobs: number;
  active_workers: number;
  dead_workers: number;
  organizations: number;
  projects: number;
  queues: number;
}

export interface QueueStatsSummary {
  queue_id: string;
  queue_name: string;
  queued_jobs: number;
  running_jobs: number;
  completed_jobs: number;
  failed_jobs: number;
  dead_letter_jobs: number;
  average_execution_time_ms: number;
  oldest_queued_job: string | null;
}

export interface WorkerSummary {
  id: string;
  hostname: string;
  status: string;
  started_at: string;
  last_seen_at: string;
  current_running_jobs: number;
}

export interface ApiErrorShape {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}
