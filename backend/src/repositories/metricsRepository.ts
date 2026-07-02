import { pool } from './db';

export async function getHealthSnapshot() {
  try {
    await pool.query('SELECT 1');
    return { database: 'connected' as const };
  } catch (error) {
    return { database: 'disconnected' as const };
  }
}

export async function getMetricsOverview() {
  const result = await pool.query(`
    SELECT
      (SELECT COUNT(*)::INTEGER FROM jobs) AS total_jobs,
      (SELECT COUNT(*)::INTEGER FROM jobs WHERE status = 'queued') AS queued_jobs,
      (SELECT COUNT(*)::INTEGER FROM jobs WHERE status = 'claimed') AS claimed_jobs,
      (SELECT COUNT(*)::INTEGER FROM jobs WHERE status = 'running') AS running_jobs,
      (SELECT COUNT(*)::INTEGER FROM jobs WHERE status = 'completed') AS completed_jobs,
      (SELECT COUNT(*)::INTEGER FROM jobs WHERE status = 'failed') AS failed_jobs,
      (SELECT COUNT(*)::INTEGER FROM jobs WHERE status = 'dead_letter') AS dead_letter_jobs,
      (SELECT COUNT(*)::INTEGER FROM scheduled_jobs) AS scheduled_jobs,
      (SELECT COUNT(*)::INTEGER FROM workers WHERE status = 'idle' OR status = 'busy') AS active_workers,
      (SELECT COUNT(*)::INTEGER FROM workers WHERE status = 'dead') AS dead_workers,
      (SELECT COUNT(*)::INTEGER FROM organizations) AS organizations,
      (SELECT COUNT(*)::INTEGER FROM projects) AS projects,
      (SELECT COUNT(*)::INTEGER FROM queues) AS queues
  `);
  return result.rows[0];
}

export async function getQueueStats(queueId: string) {
  const result = await pool.query(`
    SELECT
      queues.id AS queue_id,
      queues.name AS queue_name,
      (SELECT COUNT(*)::INTEGER FROM jobs WHERE jobs.queue_id = queues.id AND jobs.status = 'queued') AS queued_jobs,
      (SELECT COUNT(*)::INTEGER FROM jobs WHERE jobs.queue_id = queues.id AND jobs.status = 'running') AS running_jobs,
      (SELECT COUNT(*)::INTEGER FROM jobs WHERE jobs.queue_id = queues.id AND jobs.status = 'completed') AS completed_jobs,
      (SELECT COUNT(*)::INTEGER FROM jobs WHERE jobs.queue_id = queues.id AND jobs.status = 'failed') AS failed_jobs,
      (SELECT COUNT(*)::INTEGER FROM jobs WHERE jobs.queue_id = queues.id AND jobs.status = 'dead_letter') AS dead_letter_jobs,
      (SELECT COALESCE(AVG(EXTRACT(EPOCH FROM (job_executions.finished_at - job_executions.started_at)) * 1000), 0)
       FROM job_executions
       JOIN jobs ON jobs.id = job_executions.job_id
       WHERE jobs.queue_id = queues.id AND job_executions.status = 'succeeded') AS average_execution_time_ms,
      (SELECT MIN(jobs.run_at) FROM jobs WHERE jobs.queue_id = queues.id AND jobs.status = 'queued') AS oldest_queued_job
    FROM queues
    WHERE queues.id = $1
    GROUP BY queues.id, queues.name
  `, [queueId]);
  return result.rows[0] ?? null;
}

export async function getWorkersOverview() {
  const result = await pool.query(`
    SELECT
      workers.id,
      workers.hostname,
      workers.status,
      workers.started_at,
      workers.last_seen_at,
      (SELECT COUNT(*)::INTEGER FROM jobs WHERE jobs.worker_id = workers.id AND jobs.status = 'running') AS current_running_jobs
    FROM workers
    ORDER BY workers.started_at DESC
  `);
  return result.rows;
}

export async function getWorkerDetails(workerId: string) {
  const workerResult = await pool.query(`
    SELECT id, hostname, status, started_at, last_seen_at
    FROM workers
    WHERE id = $1
  `, [workerId]);
  const worker = workerResult.rows[0] ?? null;

  if (!worker) {
    return null;
  }

  const claimedResult = await pool.query(`
    SELECT id, queue_id, status, priority, run_at, attempts, max_attempts
    FROM jobs
    WHERE worker_id = $1 AND status = 'claimed'
    ORDER BY created_at DESC
  `, [workerId]);

  const runningResult = await pool.query(`
    SELECT id, queue_id, status, priority, run_at, attempts, max_attempts
    FROM jobs
    WHERE worker_id = $1 AND status = 'running'
    ORDER BY created_at DESC
  `, [workerId]);

  return {
    worker,
    claimedJobs: claimedResult.rows,
    runningJobs: runningResult.rows,
  };
}
