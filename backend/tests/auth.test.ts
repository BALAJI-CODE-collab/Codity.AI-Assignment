import request from 'supertest';
import { describe, expect, it } from 'vitest';
import app from '../src/app';

describe('auth routes', () => {
  it('registers a user and returns a token', async () => {
    const email = `auth-${Date.now()}@example.com`;
    const response = await request(app)
      .post('/auth/register')
      .send({ email, password: 'password123', name: 'Auth User' });

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('token');
    expect(response.body.user.email).toBe(email);
  });

  it('logs in an existing user', async () => {
    const email = `login-${Date.now()}@example.com`;
    await request(app)
      .post('/auth/register')
      .send({ email, password: 'password123', name: 'Auth User' });

    const response = await request(app)
      .post('/auth/login')
      .send({ email, password: 'password123' });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('token');
  });

  it('rejects invalid credentials', async () => {
    const email = `invalid-login-${Date.now()}@example.com`;
    await request(app)
      .post('/auth/register')
      .send({ email, password: 'password123', name: 'Auth User' });

    const response = await request(app)
      .post('/auth/login')
      .send({ email, password: 'wrong-password' });

    expect(response.status).toBe(401);
  });

  it('rejects unauthorized and invalid-token requests', async () => {
    const missingToken = await request(app).get('/organizations');
    const invalidToken = await request(app)
      .get('/organizations')
      .set('Authorization', 'Bearer not-a-valid-token');

    expect(missingToken.status).toBe(401);
    expect(invalidToken.status).toBe(401);
  });
});
