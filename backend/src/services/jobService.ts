import { randomUUID } from 'crypto';
import { AppError } from '../types/errors';
import { pool } from '../repositories/db';
import { createJob, createJobInTransaction, createScheduledJobInTransaction, findJobById, listJobsForQueue, updateJobStatus, type JobStatus, type JobType } from '../repositories/jobRepository';

export async function createJobForQueue(userId: string, queueId: string, input: {
  type: JobType;
  payload?: Record<string, unknown>;
  priority?: number;
  runAt?: string;
  maxAttempts?: number;
  cronExpression?: string;
  jobCount?: number;
  batchSize?: number;
}) {
  const authorization = await pool.query(
    `SELECT p.org_id
     FROM queues q
     JOIN projects p ON p.id = q.project_id
     JOIN organization_members om ON om.org_id = p.org_id
     WHERE q.id = $1 AND om.user_id = $2`,
    [queueId, userId]
  );
  const orgId = authorization.rows[0]?.org_id;
  if (!orgId) {
    const queue = await pool.query('SELECT id FROM queues WHERE id = $1', [queueId]);
    if (!queue.rows[0]) {
      throw new AppError(404, 'not_found', 'Queue not found');
    }
    throw new AppError(403, 'forbidden', 'User is not a member of the organization');
  }

  if (input.type === 'scheduled' || input.type === 'delayed') {
    if (!input.runAt) {
      throw new AppError(400, 'invalid_request', 'run_at is required for delayed and scheduled jobs');
    }
  }

  if (input.type === 'recurring') {
    if (!input.cronExpression || !input.cronExpression.trim()) {
      throw new AppError(400, 'invalid_request', 'cron_expression is required for recurring jobs');
    }
  }

  const payload = input.payload ?? {};
  const priority = input.priority ?? 100;
  const maxAttempts = input.maxAttempts ?? 1;
  const runAt = input.runAt ?? new Date().toISOString();

  if (input.type === 'batch') {
    const count = input.jobCount ?? input.batchSize ?? 1;
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const batchId = randomUUID();
      const created = [] as Array<Record<string, unknown>>;
      for (let i = 0; i < count; i += 1) {
        const job = await createJobInTransaction(client, {
          queueId,
          type: 'batch',
          payload: { ...payload, index: i },
          status: 'queued',
          priority,
          runAt,
          attempts: 0,
          maxAttempts,
          batchId,
        });
        created.push(job);
      }
      await client.query('COMMIT');
      return created;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  if (input.type === 'recurring') {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await createScheduledJobInTransaction(client, queueId, input.cronExpression ?? '', payload, runAt);
      const job = await createJobInTransaction(client, {
        queueId,
        type: 'recurring',
        payload,
        status: 'queued',
        priority,
        runAt,
        attempts: 0,
        maxAttempts,
      });
      await client.query('COMMIT');
      return job;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  return createJob({
    queueId,
    type: input.type,
    payload,
    status: 'queued',
    priority,
    runAt,
    attempts: 0,
    maxAttempts,
  });
}

export async function getJob(userId: string, jobId: string) {
  const job = await findJobById(jobId);
  if (!job) {
    throw new AppError(404, 'not_found', 'Job not found');
  }

  await getAuthorizedOrgId(userId, job.queue_id);
  return job;
}

export async function listJobsForAuthenticatedQueue(userId: string, queueId: string, page: number, perPage: number, status?: JobStatus) {
  await getAuthorizedOrgId(userId, queueId);
  return listJobsForQueue(queueId, page, perPage, status);
}

export async function retryJob(userId: string, jobId: string) {
  const job = await findJobById(jobId);
  if (!job) {
    throw new AppError(404, 'not_found', 'Job not found');
  }

  await getAuthorizedOrgId(userId, job.queue_id);

  if (job.status !== 'failed' && job.status !== 'dead_letter') {
    throw new AppError(409, 'conflict', 'Job cannot be retried in its current state');
  }

  return updateJobStatus(jobId, 'queued', null, 0);
}

async function getAuthorizedOrgId(userId: string, queueId: string) {
  const authorization = await pool.query(
    `SELECT p.org_id
     FROM queues q
     JOIN projects p ON p.id = q.project_id
     JOIN organization_members om ON om.org_id = p.org_id
     WHERE q.id = $1 AND om.user_id = $2`,
    [queueId, userId]
  );
  const orgId = authorization.rows[0]?.org_id;
  if (!orgId) {
    const queue = await pool.query('SELECT id FROM queues WHERE id = $1', [queueId]);
    if (!queue.rows[0]) {
      throw new AppError(404, 'not_found', 'Queue not found');
    }
    throw new AppError(403, 'forbidden', 'User is not a member of the organization');
  }
  return orgId as string;
}

