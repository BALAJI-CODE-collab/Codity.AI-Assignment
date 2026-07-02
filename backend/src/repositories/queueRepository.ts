import { pool } from './db';

export async function createQueue(projectId: string, name: string, priority: number, maxConcurrency: number, retryPolicyId: string | null, isPaused: boolean) {
  const result = await pool.query(
    `INSERT INTO queues (project_id, name, priority, max_concurrency, retry_policy_id, is_paused)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, project_id, name, priority, max_concurrency, retry_policy_id, is_paused, created_at`,
    [projectId, name, priority, maxConcurrency, retryPolicyId, isPaused]
  );
  return result.rows[0];
}

export async function findQueueById(queueId: string) {
  const result = await pool.query(
    'SELECT id, project_id, name, priority, max_concurrency, retry_policy_id, is_paused, created_at FROM queues WHERE id = $1',
    [queueId]
  );
  return result.rows[0] ?? null;
}

export async function findQueuesByProjectId(projectId: string) {
  const result = await pool.query(
    'SELECT id, project_id, name, priority, max_concurrency, retry_policy_id, is_paused, created_at FROM queues WHERE project_id = $1 ORDER BY created_at ASC, name ASC',
    [projectId]
  );
  return result.rows;
}

export async function updateQueue(queueId: string, updates: Record<string, unknown>) {
  const entries = Object.entries(updates);
  if (!entries.length) {
    return null;
  }

  const setClauses = entries.map(([key], index) => `${key} = $${index + 1}`).join(', ');
  const values = entries.map(([, value]) => value);
  const result = await pool.query(
    `UPDATE queues SET ${setClauses} WHERE id = $${entries.length + 1} RETURNING id, project_id, name, priority, max_concurrency, retry_policy_id, is_paused, created_at`,
    [...values, queueId]
  );
  return result.rows[0] ?? null;
}
