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

export async function recordWorkerHeartbeat(workerId: string) {
  await pool.query(
    `UPDATE workers SET last_seen_at = NOW() WHERE id = $1`,
    [workerId]
  );
  await pool.query(
    `INSERT INTO worker_heartbeats (worker_id, timestamp, active_job_count) VALUES ($1, NOW(), 0)`,
    [workerId]
  );
}

export async function findStaleWorkers(timeoutMs: number) {
  const result = await pool.query(
    `SELECT id, hostname, status, started_at, last_seen_at
     FROM workers
     WHERE status <> 'dead' AND last_seen_at < NOW() - ($1::text || ' milliseconds')::interval`,
    [timeoutMs]
  );
  return result.rows;
}

export async function recoverJobsForWorker(workerId: string) {
  const result = await pool.query(
    `UPDATE jobs
     SET status = 'queued', worker_id = NULL, updated_at = NOW()
     WHERE worker_id = $1 AND status IN ('claimed', 'running')
     RETURNING id`,
    [workerId]
  );
  return result.rows;
}

export async function handleJobFailureWithRetry(jobId: string, queueId: string, payload: Record<string, unknown>, failureReason: string) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const policyResult = await client.query(
      `SELECT retry_policies.strategy, retry_policies.base_delay_ms, retry_policies.max_delay_ms, retry_policies.max_attempts
       FROM queues
       LEFT JOIN retry_policies ON queues.retry_policy_id = retry_policies.id
       WHERE queues.id = $1`,
      [queueId]
    );

    const jobResult = await client.query(
      `SELECT attempts, max_attempts FROM jobs WHERE id = $1 FOR UPDATE`,
      [jobId]
    );

    const job = jobResult.rows[0];
    const retryPolicy = policyResult.rows[0];

    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }

    const attempts = Number(job.attempts ?? 0);
    const maxAttempts = Number(job.max_attempts ?? 1);

    if (retryPolicy && attempts < maxAttempts) {
      const baseDelayMs = Number(retryPolicy.base_delay_ms ?? 0);
      const maxDelayMs = Number(retryPolicy.max_delay_ms ?? baseDelayMs);
      const strategy = retryPolicy.strategy as 'fixed' | 'linear' | 'exponential';
      let delayMs = baseDelayMs;

      if (strategy === 'linear') {
        delayMs = baseDelayMs * attempts;
      } else if (strategy === 'exponential') {
        delayMs = baseDelayMs * Math.pow(2, attempts - 1);
      }

      delayMs = Math.min(delayMs, maxDelayMs);
      const nextRunAt = new Date(Date.now() + delayMs).toISOString();

      await client.query(
        `UPDATE jobs
         SET status = 'queued', worker_id = NULL, run_at = $2, updated_at = NOW()
         WHERE id = $1`,
        [jobId, nextRunAt]
      );

      await client.query('COMMIT');
      return { outcome: 'queued' as const, nextRunAt };
    }

    await client.query(
      `INSERT INTO dead_letter_queue (original_job_id, queue_id, payload, failure_reason, moved_at)
       VALUES ($1, $2, $3, $4, NOW())`,
      [jobId, queueId, JSON.stringify(payload ?? {}), failureReason]
    );

    await client.query(
      `UPDATE jobs
       SET status = 'dead_letter', worker_id = NULL, updated_at = NOW()
       WHERE id = $1`,
      [jobId]
    );

    await client.query('COMMIT');
    return { outcome: 'dead_letter' as const };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function findDueScheduledJobs() {
  const result = await pool.query(
    `SELECT id, queue_id, cron_expression, payload, next_run_at
     FROM scheduled_jobs
     WHERE next_run_at <= NOW() AND is_active = TRUE`,
    []
  );
  return result.rows;
}

export async function createScheduledJobRun(scheduledJobId: string, queueId: string, payload: Record<string, unknown>, runAt: string) {
  const result = await pool.query(
    `INSERT INTO jobs (queue_id, worker_id, type, payload, status, priority, run_at, attempts, max_attempts)
     VALUES ($1, NULL, 'scheduled', $2, 'queued', 100, $3, 0, 1)
     RETURNING id, queue_id, worker_id, type, payload, status, priority, run_at, attempts, max_attempts, batch_id, created_at, updated_at`,
    [queueId, JSON.stringify(payload ?? {}), runAt]
  );
  return result.rows[0] ?? null;
}

export async function advanceScheduledJobNextRun(scheduledJobId: string, nextRunAt: string) {
  const result = await pool.query(
    `UPDATE scheduled_jobs SET next_run_at = $2 WHERE id = $1 RETURNING id, queue_id, cron_expression, payload, next_run_at, is_active, created_at`,
    [scheduledJobId, nextRunAt]
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
