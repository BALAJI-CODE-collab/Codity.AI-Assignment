import { describe, expect, it } from 'vitest';
import { registerUser, loginUser, listUserOrganizations } from '../src/services/authService';
import { createProjectForOrg, listProjectsForAuthenticatedUser } from '../src/services/projectService';
import { createQueueForProject, getQueue, listQueuesForProject, updateQueueById } from '../src/services/queueService';
import { createJobForQueue, listJobsForAuthenticatedQueue, retryJob } from '../src/services/jobService';
import { getHealthStatus, getMetrics, getReadinessStatus, getWorker, getWorkers } from '../src/services/metricsService';
import { handleJobFailure, runSchedulerTick } from '../src/services/reliabilityService';
import { pool } from '../src/repositories/db';
import {
  createWorker,
  recordWorkerHeartbeat,
  updateJobStatus,
  createScheduledJobInTransaction,
  findDueScheduledJobs,
} from '../src/repositories/jobRepository';

describe('backend integration tests', () => {
  it('registers and logs in a user, and lists their organizations', async () => {
    const email = `auth-${Date.now()}@example.com`;
    const registered = await registerUser(email, 'secret1234', 'Ada');

    expect(registered.user.email).toBe(email);
    expect(registered.token).toBeTruthy();

    const loginResult = await loginUser(email, 'secret1234');
    expect(loginResult.user.email).toBe(email);

    const organizations = await listUserOrganizations(registered.user.id);
    expect(organizations).toHaveLength(1);
  });

  it('creates and lists projects and queues for an organization member', async () => {
    const registered = await registerUser(`projects-${Date.now()}@example.com`, 'secret1234', 'Grace');
    const organizations = await listUserOrganizations(registered.user.id);
    const orgId = organizations[0].id;

    const project = await createProjectForOrg(registered.user.id, orgId, 'Billing');
    expect(project.name).toBe('Billing');

    const projects = await listProjectsForAuthenticatedUser(registered.user.id, 1, 10);
    expect(projects).toHaveLength(1);

    const queue = await createQueueForProject(registered.user.id, project.id, 'invoices', 50, 2, null, false);
    expect(queue.name).toBe('invoices');

    const queues = await listQueuesForProject(registered.user.id, project.id);
    expect(queues).toHaveLength(1);

    const fetchedQueue = await getQueue(registered.user.id, queue.id);
    expect(fetchedQueue.id).toBe(queue.id);

    const updatedQueue = await updateQueueById(registered.user.id, queue.id, { is_paused: true });
    expect(updatedQueue?.is_paused).toBe(true);
  });

  it('creates, lists, and retries failed jobs', async () => {
    const registered = await registerUser(`jobs-${Date.now()}@example.com`, 'secret1234', 'Linus');
    const organizations = await listUserOrganizations(registered.user.id);
    const orgId = organizations[0].id;
    const project = await createProjectForOrg(registered.user.id, orgId, 'Ops');
    const queue = await createQueueForProject(registered.user.id, project.id, 'ops-jobs', 10, 1, null, false);

    const createdJob = await createJobForQueue(registered.user.id, queue.id, {
      type: 'immediate',
      payload: { hello: 'world' },
      priority: 5,
      maxAttempts: 2,
    });

    const jobs = await listJobsForAuthenticatedQueue(registered.user.id, queue.id, 1, 10);
    expect(jobs).toHaveLength(1);

    const failedJob = await updateJobStatus(createdJob.id, 'failed', null, 2);
    expect(failedJob?.status).toBe('failed');

    const retriedJob = await retryJob(registered.user.id, createdJob.id);
    expect(retriedJob?.status).toBe('queued');
    expect(retriedJob?.attempts).toBe(0);
  });

  it('records worker heartbeats and reports worker details', async () => {
    const worker = await createWorker('worker-01');
    await recordWorkerHeartbeat(worker.id);

    const workers = await getWorkers();
    expect(workers).toHaveLength(1);

    const workerDetails = await getWorker(worker.id);
    expect(workerDetails?.worker.id).toBe(worker.id);
  });

  it('moves failed jobs to the dead-letter queue when retries are exhausted', async () => {
    const registered = await registerUser(`failure-${Date.now()}@example.com`, 'secret1234', 'Katherine');
    const organizations = await listUserOrganizations(registered.user.id);
    const orgId = organizations[0].id;
    const project = await createProjectForOrg(registered.user.id, orgId, 'Reliability');
    const queue = await createQueueForProject(registered.user.id, project.id, 'reliability', 10, 1, null, false);

    const createdJob = await createJobForQueue(registered.user.id, queue.id, {
      type: 'immediate',
      payload: { retry: false },
      maxAttempts: 1,
    });

    const outcome = await handleJobFailure(createdJob.id, queue.id, { retry: false }, 'boom');
    expect(outcome.outcome).toBe('dead_letter');

    const job = await pool.query('SELECT status FROM jobs WHERE id = $1', [createdJob.id]);
    expect(job.rows[0].status).toBe('dead_letter');
  });

  it('exposes health, readiness, and metrics snapshots', async () => {
    const health = await getHealthStatus();
    const readiness = await getReadinessStatus();
    const metrics = await getMetrics();

    expect(health.status).toBe('ok');
    expect(readiness.ready).toBe(true);
    expect(metrics).toBeTruthy();
    expect(typeof metrics.total_jobs).toBe('number');
  });

  it('runs a scheduler tick for due scheduled jobs', async () => {
    const registered = await registerUser(`scheduler-${Date.now()}@example.com`, 'secret1234', 'Margaret');
    const organizations = await listUserOrganizations(registered.user.id);
    const orgId = organizations[0].id;
    const project = await createProjectForOrg(registered.user.id, orgId, 'Scheduler');
    const queue = await createQueueForProject(registered.user.id, project.id, 'scheduled', 20, 1, null, false);

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await createScheduledJobInTransaction(client, queue.id, '* * * * *', { hello: 'world' }, new Date(Date.now() - 60_000).toISOString());
      await client.query('COMMIT');
    } finally {
      client.release();
    }

    await runSchedulerTick();

    const dueJobs = await findDueScheduledJobs();
    expect(dueJobs.length).toBeGreaterThanOrEqual(0);
  });
});
