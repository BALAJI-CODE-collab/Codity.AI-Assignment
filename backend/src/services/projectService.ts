import { AppError } from '../types/errors';
import { pool } from '../repositories/db';
import { createProject, findProjectByNameInOrg, listProjectsForUser } from '../repositories/projectRepository';

export async function createProjectForOrg(userId: string, orgId: string, name: string) {
  const authorization = await pool.query(
    `SELECT 1
     FROM organization_members om
     WHERE om.org_id = $1 AND om.user_id = $2`,
    [orgId, userId]
  );
  if (!authorization.rows[0]) {
    throw new AppError(403, 'forbidden', 'User is not a member of the organization');
  }

  const existing = await findProjectByNameInOrg(orgId, name);
  if (existing) {
    throw new AppError(409, 'conflict', 'Project already exists in organization');
  }

  return createProject(orgId, name);
}

export async function listProjectsForAuthenticatedUser(userId: string, page: number, perPage: number) {
  return listProjectsForUser(userId, page, perPage);
}
