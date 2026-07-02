import { pool } from './db';

export async function createProject(orgId: string, name: string) {
  const result = await pool.query(
    'INSERT INTO projects (org_id, name) VALUES ($1, $2) RETURNING id, org_id, name, created_at',
    [orgId, name]
  );
  return result.rows[0];
}

export async function findProjectByNameInOrg(orgId: string, name: string) {
  const result = await pool.query('SELECT id FROM projects WHERE org_id = $1 AND name = $2', [orgId, name]);
  return result.rows[0] ?? null;
}

export async function listProjectsForUser(userId: string, page: number, perPage: number) {
  const offset = (page - 1) * perPage;
  const result = await pool.query(
    `SELECT p.id, p.org_id, p.name, p.created_at
     FROM projects p
     JOIN organization_members om ON om.org_id = p.org_id
     WHERE om.user_id = $1
     ORDER BY p.created_at ASC
     LIMIT $2 OFFSET $3`,
    [userId, perPage, offset]
  );
  return result.rows;
}
