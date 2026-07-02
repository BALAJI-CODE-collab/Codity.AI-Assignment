import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { AppError } from '../types/errors';
import { createOrgMembership, createUser, findUserByEmail } from '../repositories/authRepository';
import { createOrganization, listOrganizationsForUser } from '../repositories/organizationRepository';

export async function registerUser(email: string, password: string, name: string) {
  const existing = await findUserByEmail(email);
  if (existing) {
    throw new AppError(409, 'conflict', 'Email already registered');
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await createUser(email, passwordHash, name);
  const organization = await createOrganization(`${name}'s Organization`);
  await createOrgMembership(organization.id, user.id, 'owner');

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
