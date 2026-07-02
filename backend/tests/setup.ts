import dotenv from 'dotenv';
import { beforeAll, beforeEach, afterAll } from 'vitest';
import { applyMigrations } from '../src/db/migration';
import { pool } from '../src/repositories/db';

dotenv.config();

async function resetDb() {
  await pool.query(`
    TRUNCATE TABLE
      dead_letter_queue,
      job_logs,
      job_executions,
      jobs,
      scheduled_jobs,
      worker_heartbeats,
      workers,
      queues,
      projects,
      organization_members,
      organizations,
      users,
      retry_policies
    RESTART IDENTITY CASCADE
  `);
}

beforeAll(async () => {
  await applyMigrations();
});

beforeEach(async () => {
  await resetDb();
});

afterAll(async () => {
  await pool.end();
});
