import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { AppError } from '../types/errors';
import { findUserByEmail } from '../repositories/authRepository';
import { listOrganizationsForUser } from '../repositories/organizationRepository';
import { pool } from '../repositories/db';

export async function registerUser(email: string, password: string, name: string) {
  const existing = await findUserByEmail(email);
  if (existing) {
    throw new AppError(409, 'conflict', 'Email already registered');
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const client = await pool.connect();
  let user;

  try {
    await client.query('BEGIN');
    const userResult = await client.query(
      'INSERT INTO users (email, password_hash, name) VALUES ($1, $2, $3) RETURNING id, email, name, created_at',
      [email, passwordHash, name]
    );
    user = userResult.rows[0];

    const organizationResult = await client.query(
      'INSERT INTO organizations (name) VALUES ($1) RETURNING id, name, created_at',
      [`${name}'s Organization (${user.id.slice(0, 8)})`]
    );
    const organization = organizationResult.rows[0];

    await client.query(
      'INSERT INTO organization_members (org_id, user_id, role) VALUES ($1, $2, $3)',
      [organization.id, user.id, 'owner']
    );
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }

  const token = createToken(user.id, user.email, user.name);
  return { user: { id: user.id, email: user.email, name: user.name }, token };
}

export async function loginUser(email: string, password: string) {
  const user = await findUserByEmail(email);
  if (!user) {
    throw new AppError(401, 'unauthorized', 'Invalid credentials');
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    throw new AppError(401, 'unauthorized', 'Invalid credentials');
  }

  const token = createToken(user.id, user.email, user.name);
  return { user: { id: user.id, email: user.email, name: user.name }, token };
}

export async function listUserOrganizations(userId: string) {
  return listOrganizationsForUser(userId);
}

function createToken(sub: string, email: string, name: string) {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new AppError(500, 'server_error', 'JWT secret not configured');
  }
  return jwt.sign({ sub, email, name }, secret, { expiresIn: '1h' });
}
