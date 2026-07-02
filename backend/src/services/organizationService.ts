import { NextFunction, Request, Response } from 'express';
import { AppError } from '../types/errors';
import { createOrganization as createOrgRecord } from '../repositories/organizationRepository';
import { createOrgMembership } from '../repositories/authRepository';
import { AuthRequest } from '../middleware/auth';
import { organizationSchema } from '../validators/schemas';

export async function createOrganization(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      throw new AppError(401, 'unauthorized', 'Authentication required');
    }
    const parsed = organizationSchema.parse(req);
    const organization = await createOrgRecord(parsed.body.name);
    await createOrgMembership(organization.id, req.user.id, 'owner');
    res.status(201).json(organization);
  } catch (error) {
    next(error);
  }
}
