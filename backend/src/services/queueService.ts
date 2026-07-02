import { AppError } from '../types/errors';
import { createQueue, findQueueById, updateQueue } from '../repositories/queueRepository';
import { pool } from '../repositories/db';

export async function createQueueForProject(userId: string, projectId: string, name: string, priority: number, maxConcurrency: number, retryPolicyId: string | null, isPaused: boolean) {
  const authorization = await pool.query(
    `SELECT p.org_id
     FROM projects p
     JOIN organization_members om ON om.org_id = p.org_id
     WHERE p.id = $1 AND om.user_id = $2`,
    [projectId, userId]
  );
  const orgId = authorization.rows[0]?.org_id;
  if (!orgId) {
    const project = await pool.query('SELECT id FROM projects WHERE id = $1', [projectId]);
    if (!project.rows[0]) {
      throw new AppError(404, 'not_found', 'Project not found');
    }
    throw new AppError(403, 'forbidden', 'User is not a member of the organization');
  }

  return createQueue(projectId, name, priority, maxConcurrency, retryPolicyId, isPaused);
}

export async function getQueue(userId: string, queueId: string) {
  const queue = await findQueueById(queueId);
  if (!queue) {
    throw new AppError(404, 'not_found', 'Queue not found');
  }

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
    throw new AppError(403, 'forbidden', 'User is not a member of the organization');
  }

  return queue;
}

export async function updateQueueById(userId: string, queueId: string, changes: Record<string, unknown>) {
  const queue = await findQueueById(queueId);
  if (!queue) {
    throw new AppError(404, 'not_found', 'Queue not found');
  }

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
    throw new AppError(403, 'forbidden', 'User is not a member of the organization');
  }

  return updateQueue(queueId, changes);
}
