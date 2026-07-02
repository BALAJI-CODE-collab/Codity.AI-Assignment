import { pool } from './db';

export async function createOrganization(name: string) {
  const result = await pool.query(
    'INSERT INTO organizations (name) VALUES ($1) RETURNING id, name, created_at',
    [name]
  );
  return result.rows[0];
}

export async function listOrganizationsForUser(userId: string) {
  const result = await pool.query(
    `SELECT o.id, o.name, o.created_at
     FROM organizations o
     JOIN organization_members om ON om.org_id = o.id
     WHERE om.user_id = $1
     ORDER BY o.created_at ASC`,
    [userId]
  );
  return result.rows;
}
