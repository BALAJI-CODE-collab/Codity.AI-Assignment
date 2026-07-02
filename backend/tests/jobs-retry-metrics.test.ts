import request from 'supertest';
import { describe, expect, it } from 'vitest';
import app from '../src/app';

async function createQueueContext() {
  const unique = `${Date.now()}-${Math.round(Math.random() * 1000)}`;
  const email = `jobs-${unique}@example.com`;
  const authResponse = await request(app)
    .post('/auth/register')
    .send({ email, password: 'password123', name: `Jobs User ${unique}` });
  const token = authResponse.body.token;

  const orgResponse = await request(app)
    .post('/organizations')
    .set('Authorization', `Bearer ${token}`)
    .send({ name: `Jobs Org ${Date.now()}` });
  const orgId = orgResponse.body.id;

  const projectResponse = await request(app)
    .post('/projects')
    .set('Authorization', `Bearer ${token}`)
    .send({ org_id: orgId, name: `Jobs Project ${Date.now()}` });
  const projectId = projectResponse.body.id;

  const queueResponse = await request(app)
    .post(`/projects/${projectId}/queues`)
    .set('Authorization', `Bearer ${token}`)
    .send({ name: `Jobs Queue ${Date.now()}`, priority: 1, max_concurrency: 1, is_paused: false });
  const queueId = queueResponse.body.id;

  return { token, queueId };
}

describe('jobs, retry and metrics', () => {
  it('creates a job for an authenticated queue', async () => {
    const { token, queueId } = await createQueueContext();
    const response = await request(app)
      .post(`/queues/${queueId}/jobs`)
      .set('Authorization', `Bearer ${token}`)
      .send({ type: 'immediate', payload: { hello: 'world' }, priority: 2, max_attempts: 3 });

    expect(response.status).toBe(201);
    expect(response.body.status).toBe('queued');
  });

  it('lists jobs for the queue', async () => {
    const { token, queueId } = await createQueueContext();
    await request(app)
      .post(`/queues/${queueId}/jobs`)
      .set('Authorization', `Bearer ${token}`)
      .send({ type: 'immediate', payload: { hello: 'world' }, priority: 2, max_attempts: 3 });

    const response = await request(app)
      .get(`/queues/${queueId}/jobs`)
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.length).toBeGreaterThan(0);
  });

  it('retrieves a job by id', async () => {
    const { token, queueId } = await createQueueContext();
    const created = await request(app)
      .post(`/queues/${queueId}/jobs`)
      .set('Authorization', `Bearer ${token}`)
      .send({ type: 'immediate', payload: { hello: 'world' }, priority: 2, max_attempts: 3 });

    const response = await request(app)
      .get(`/jobs/${created.body.id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.id).toBe(created.body.id);
  });

  it('supports retry for failed or dead-letter jobs', async () => {
    const { token, queueId } = await createQueueContext();
    const created = await request(app)
      .post(`/queues/${queueId}/jobs`)
      .set('Authorization', `Bearer ${token}`)
      .send({ type: 'immediate', payload: { hello: 'world' }, priority: 2, max_attempts: 3 });

    const response = await request(app)
      .post(`/jobs/${created.body.id}/retry`)
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(409);
  });

  it('returns health, readiness and metrics endpoints', async () => {
    const { token } = await createQueueContext();
    const health = await request(app).get('/health');
    const ready = await request(app).get('/ready');
    const metrics = await request(app).get('/metrics').set('Authorization', `Bearer ${token}`);

    expect(health.status).toBe(200);
    expect(ready.status).toBe(200);
    expect(metrics.status).toBe(200);
    expect(metrics.body).toHaveProperty('total_jobs');
  });

  it('rejects queue stats access for users outside the queue organization', async () => {
    const ownerContext = await createQueueContext();
    const outsiderContext = await createQueueContext();

    const response = await request(app)
      .get(`/queues/${ownerContext.queueId}/stats`)
      .set('Authorization', `Bearer ${outsiderContext.token}`);

    expect(response.status).toBe(403);
  });
});
