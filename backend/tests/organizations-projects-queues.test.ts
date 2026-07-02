import request from 'supertest';
import { describe, expect, it } from 'vitest';
import app from '../src/app';

async function createAuthenticatedContext() {
  const email = `orgs-${Date.now()}@example.com`;
  const registerResponse = await request(app)
    .post('/auth/register')
    .send({ email, password: 'password123', name: 'Orgs User' });
  const token = registerResponse.body.token;

  const orgResponse = await request(app)
    .post('/organizations')
    .set('Authorization', `Bearer ${token}`)
    .send({ name: `Org ${Date.now()}` });
  const orgId = orgResponse.body.id;

  const projectResponse = await request(app)
    .post('/projects')
    .set('Authorization', `Bearer ${token}`)
    .send({ org_id: orgId, name: `Project ${Date.now()}` });
  const projectId = projectResponse.body.id;

  return { token, orgId, projectId };
}

describe('organizations, projects and queues', () => {
  it('creates an organization for the authenticated user', async () => {
    const { token } = await createAuthenticatedContext();
    const response = await request(app)
      .post('/organizations')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: `Test Org ${Date.now()}` });

    expect(response.status).toBe(201);
    expect(response.body.name).toContain('Test Org');
  });

  it('creates a project inside the organization', async () => {
    const { token, orgId } = await createAuthenticatedContext();
    const response = await request(app)
      .post('/projects')
      .set('Authorization', `Bearer ${token}`)
      .send({ org_id: orgId, name: `Test Project ${Date.now()}` });

    expect(response.status).toBe(201);
    expect(response.body.name).toContain('Test Project');
  });

  it('creates and lists queues for the project', async () => {
    const { token, projectId } = await createAuthenticatedContext();
    const createResponse = await request(app)
      .post(`/projects/${projectId}/queues`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: `Test Queue ${Date.now()}`, priority: 10, max_concurrency: 2, is_paused: false });

    expect(createResponse.status).toBe(201);
    expect(createResponse.body.name).toContain('Test Queue');

    const listResponse = await request(app)
      .get(`/projects/${projectId}/queues`)
      .set('Authorization', `Bearer ${token}`);

    expect(listResponse.status).toBe(200);
    expect(listResponse.body.some((queue: { id: string }) => queue.id === createResponse.body.id)).toBe(true);
  });

  it('updates a queue', async () => {
    const { token, projectId } = await createAuthenticatedContext();
    const createResponse = await request(app)
      .post(`/projects/${projectId}/queues`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: `Queue ${Date.now()}`, priority: 10, max_concurrency: 2, is_paused: false });

    const response = await request(app)
      .patch(`/queues/${createResponse.body.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ is_paused: true });

    expect(response.status).toBe(200);
    expect(response.body.is_paused).toBe(true);
  });
});
