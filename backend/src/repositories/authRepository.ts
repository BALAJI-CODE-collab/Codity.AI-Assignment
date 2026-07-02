import { pool } from './db';
import { AppError } from '../types/errors';

export async function findUserByEmail(email: string) {
  const result = await pool.query('SELECT id, email, password_hash, name FROM users WHERE email = $1', [email]);
  return result.rows[0] ?? null;
}

export async function createUser(email: string, passwordHash: string, name: string) {
  const result = await pool.query(
    'INSERT INTO users (email, password_hash, name) VALUES ($1, $2, $3) RETURNING id, email, name, created_at',
    [email, passwordHash, name]
  );
  return result.rows[0];
}

export async function getOrgMembership(orgId: string, userId: string) {
  const result = await pool.query(
    'SELECT role FROM organization_members WHERE org_id = $1 AND user_id = $2',
    [orgId, userId]
  );
  return result.rows[0] ?? null;
}

export async function createOrgMembership(orgId: string, userId: string, role: string) {
  await pool.query(
    'INSERT INTO organization_members (org_id, user_id, role) VALUES ($1, $2, $3)',
    [orgId, userId, role]
  );
}
