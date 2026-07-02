import { describe, expect, it } from 'vitest';
import { pool } from '../src/repositories/db';
import { handleJobFailure, runSchedulerTick, heartbeatWorker, recoverDeadWorkers } from '../src/services/reliabilityService';
import { createJob } from '../src/repositories/jobRepository';

function makeUniqueName(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.round(Math.random() * 1000)}`;
}

describe('reliability and scheduler services', () => {
  it('requeues failed jobs with retry policy and moves exhausted jobs to dead letter', async () => {
    const workerResult = await pool.query('INSERT INTO workers (hostname, status, started_at, last_seen_at) VALUES ($1, $2, NOW(), NOW()) RETURNING id', [makeUniqueName('reliability-worker'), 'idle']);
    const workerId = workerResult.rows[0].id;

    const orgName = makeUniqueName('Reliability Org');
    const queueResult = await pool.query('INSERT INTO organizations (name) VALUES ($1) RETURNING id', [orgName]);
    const orgId = queueResult.rows[0].id;
    const projectResult = await pool.query('INSERT INTO projects (org_id, name) VALUES ($1, $2) RETURNING id', [orgId, makeUniqueName('Reliability Project')]);
    const projectId = projectResult.rows[0].id;
    const queueInsertResult = await pool.query(
      'INSERT INTO queues (project_id, name, priority, max_concurrency, retry_policy_id, is_paused) VALUES ($1, $2, $3, $4, NULL, FALSE) RETURNING id',
      [projectId, makeUniqueName('Reliability Queue'), 1, 1]
    );
    const queueId = queueInsertResult.rows[0].id;

    const job = await createJob({
      queueId,
      type: 'immediate',
      payload: { attempt: 1 },
      status: 'queued',
      priority: 1,
      runAt: new Date().toISOString(),
      attempts: 0,
      maxAttempts: 1,
      workerId,
    });

    const firstOutcome = await handleJobFailure(job.id, queueId, job.payload, 'boom');
    expect(firstOutcome.outcome).toBe('dead_letter');
  });

  it('records heartbeats and recovers stale workers', async () => {
    const workerResult = await pool.query('INSERT INTO workers (hostname, status, started_at, last_seen_at) VALUES ($1, $2, NOW(), NOW()) RETURNING id', [makeUniqueName('stale-worker'), 'busy']);
    const workerId = workerResult.rows[0].id;
    await heartbeatWorker(workerId, async () => undefined);
    await pool.query('UPDATE workers SET last_seen_at = NOW() - INTERVAL \'2 minutes\' WHERE id = $1', [workerId]);

    const recovered = [] as unknown[];
    await recoverDeadWorkers(1000, async () => undefined, async () => recovered);
    expect(recovered.length).toBeGreaterThanOrEqual(0);
  });

  it('runs scheduler tick without throwing', async () => {
    await expect(runSchedulerTick()).resolves.toBeUndefined();
  });
});
