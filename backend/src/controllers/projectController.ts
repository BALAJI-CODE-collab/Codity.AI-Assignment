import { NextFunction, Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { createProjectForOrg, listProjectsForAuthenticatedUser } from '../services/projectService';
import { AppError } from '../types/errors';
import { paginationSchema, projectSchema } from '../validators/schemas';

export async function createProject(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      throw new AppError(401, 'unauthorized', 'Authentication required');
    }
    const parsed = projectSchema.parse(req);
    const result = await createProjectForOrg(req.user.id, parsed.body.org_id, parsed.body.name);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
}

export async function listProjects(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      throw new AppError(401, 'unauthorized', 'Authentication required');
    }
    const parsed = paginationSchema.parse(req);
    const result = await listProjectsForAuthenticatedUser(req.user.id, parsed.query.page ?? 1, parsed.query.per_page ?? 20);
    res.json(result);
  } catch (error) {
    next(error);
  }
}
