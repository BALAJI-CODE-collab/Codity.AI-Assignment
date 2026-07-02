import type { PoolClient } from 'pg';
import { pool } from './db';

export type JobStatus = 'queued' | 'scheduled' | 'claimed' | 'running' | 'completed' | 'failed' | 'dead_letter';
export type JobType = 'immediate' | 'delayed' | 'scheduled' | 'recurring' | 'batch';

export async function createJob(input: {
  queueId: string;
  type: JobType;
  payload: Record<string, unknown>;
  status: JobStatus;
  priority: number;
  runAt: string;
  attempts: number;
  maxAttempts: number;
  workerId?: string | null;
  batchId?: string | null;
}) {
  const result = await pool.query(
    `INSERT INTO jobs (queue_id, worker_id, type, payload, status, priority, run_at, attempts, max_attempts, batch_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     RETURNING id, queue_id, worker_id, type, payload, status, priority, run_at, attempts, max_attempts, batch_id, created_at, updated_at`,
    [input.queueId, input.workerId ?? null, input.type, JSON.stringify(input.payload), input.status, input.priority, input.runAt, input.attempts, input.maxAttempts, input.batchId ?? null]
  );
  return result.rows[0];
}

export async function findJobById(jobId: string) {
  const result = await pool.query(
    'SELECT id, queue_id, worker_id, type, payload, status, priority, run_at, attempts, max_attempts, batch_id, created_at, updated_at FROM jobs WHERE id = $1',
    [jobId]
  );
  return result.rows[0] ?? null;
}

export async function listJobsForQueue(queueId: string, page: number, perPage: number, status?: JobStatus) {
  const offset = (page - 1) * perPage;
  const query = status
    ? 'SELECT id, queue_id, worker_id, type, payload, status, priority, run_at, attempts, max_attempts, batch_id, created_at, updated_at FROM jobs WHERE queue_id = $1 AND status = $2 ORDER BY created_at DESC LIMIT $3 OFFSET $4'
    : 'SELECT id, queue_id, worker_id, type, payload, status, priority, run_at, attempts, max_attempts, batch_id, created_at, updated_at FROM jobs WHERE queue_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3';
  const values = status ? [queueId, status, perPage, offset] : [queueId, perPage, offset];
  const result = await pool.query(query, values);
  return result.rows;
}

export async function updateJobStatus(jobId: string, status: JobStatus, workerId: string | null, attempts: number) {
  const result = await pool.query(
    `UPDATE jobs SET status = $1, worker_id = $2, attempts = $3, updated_at = NOW() WHERE id = $4 RETURNING id, queue_id, worker_id, type, payload, status, priority, run_at, attempts, max_attempts, batch_id, created_at, updated_at`,
    [status, workerId, attempts, jobId]
  );
  return result.rows[0] ?? null;
}

export async function transitionJobToRunning(jobId: string, workerId: string) {
  const result = await pool.query(
    `UPDATE jobs
     SET status = 'running', worker_id = $1, attempts = attempts + 1, updated_at = NOW()
     WHERE id = $2 AND status = 'claimed'
     RETURNING id, queue_id, worker_id, type, payload, status, priority, run_at, attempts, max_attempts, batch_id, created_at, updated_at`,
    [workerId, jobId]
  );
  return result.rows[0] ?? null;
}

export async function createJobExecution(jobId: string, workerId: string) {
  const result = await pool.query(
    `INSERT INTO job_executions (job_id, worker_id, started_at, status)
     VALUES ($1, $2, NOW(), 'running')
     RETURNING id, job_id, worker_id, started_at, finished_at, status, error_message, duration_ms`,
    [jobId, workerId]
  );
  return result.rows[0] ?? null;
}

export async function finalizeJobExecution(executionId: string, status: 'completed' | 'failed', durationMs: number, errorMessage: string | null) {
  const result = await pool.query(
    `UPDATE job_executions
     SET finished_at = NOW(), status = $1, duration_ms = $2, error_message = $3
     WHERE id = $4
     RETURNING id, job_id, worker_id, started_at, finished_at, status, error_message, duration_ms`,
    [status, durationMs, errorMessage, executionId]
  );
  return result.rows[0] ?? null;
}

export async function finalizeJobOutcome(jobId: string, status: JobStatus) {
  const result = await pool.query(
    `UPDATE jobs
     SET status = $1, updated_at = NOW()
     WHERE id = $2
     RETURNING id, queue_id, worker_id, type, payload, status, priority, run_at, attempts, max_attempts, batch_id, created_at, updated_at`,
    [status, jobId]
  );
  return result.rows[0] ?? null;
}

export async function claimNextJob(workerId: string) {
  const result = await pool.query(
    `WITH next_job AS (
        SELECT jobs.id
        FROM jobs
        WHERE jobs.status = 'queued'
          AND jobs.run_at <= NOW()
        ORDER BY jobs.priority DESC, jobs.run_at ASC, jobs.created_at ASC
        LIMIT 1
        FOR UPDATE SKIP LOCKED
      )
      UPDATE jobs
      SET
        status = 'claimed',
        worker_id = $1,
        updated_at = NOW()
      FROM next_job
      WHERE jobs.id = next_job.id
      RETURNING
        jobs.id,
        jobs.queue_id,
        jobs.worker_id,
        jobs.type,
        jobs.payload,
        jobs.status,
        jobs.priority,
        jobs.run_at,
        jobs.attempts,
        jobs.max_attempts,
        jobs.batch_id,
        jobs.created_at,
        jobs.updated_at`,
    [workerId]
  );
  return result.rows[0] ?? null;
}

export async function createWorker(hostname: string) {
  const result = await pool.query(
    `INSERT INTO workers (hostname, status, started_at, last_seen_at)
     VALUES ($1, 'idle', NOW(), NOW())
     RETURNING id, hostname, status, started_at, last_seen_at`,
    [hostname]
  );
  return result.rows[0] ?? null;
}

export async function updateWorkerStatus(workerId: string, status: 'idle' | 'busy' | 'dead') {
  const result = await pool.query(
    `UPDATE workers SET status = $1, last_seen_at = NOW() WHERE id = $2 RETURNING id, hostname, status, started_at, last_seen_at`,
    [status, workerId]
  );
  return result.rows[0] ?? null;
}

export async function createJobInTransaction(client: PoolClient, input: {
  queueId: string;
  type: JobType;
  payload: Record<string, unknown>;
  status: JobStatus;
  priority: number;
  runAt: string;
  attempts: number;
  maxAttempts: number;
  batchId?: string | null;
}) {
  const result = await client.query(
    `INSERT INTO jobs (queue_id, worker_id, type, payload, status, priority, run_at, attempts, max_attempts, batch_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     RETURNING id, queue_id, worker_id, type, payload, status, priority, run_at, attempts, max_attempts, batch_id, created_at, updated_at`,
    [input.queueId, null, input.type, JSON.stringify(input.payload), input.status, input.priority, input.runAt, input.attempts, input.maxAttempts, input.batchId ?? null]
  );
  return result.rows[0];
}

export async function createScheduledJobInTransaction(client: PoolClient, queueId: string, cronExpression: string, payload: Record<string, unknown>, nextRunAt: string) {
  const result = await client.query(
    `INSERT INTO scheduled_jobs (queue_id, cron_expression, payload, next_run_at)
     VALUES ($1, $2, $3, $4)
     RETURNING id, queue_id, cron_expression, payload, next_run_at, is_active, created_at`,
    [queueId, cronExpression, JSON.stringify(payload), nextRunAt]
  );
  return result.rows[0];
}
