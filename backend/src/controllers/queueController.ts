import { NextFunction, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { createQueueForProject, getQueue, listQueuesForProject, updateQueueById } from '../services/queueService';
import { AppError } from '../types/errors';
import { queuePatchSchema, queueSchema, queueParamsSchema, paramsIdSchema } from '../validators/schemas';

export async function createQueue(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      throw new AppError(401, 'unauthorized', 'Authentication required');
    }
    const parsed = queueSchema.merge(queueParamsSchema).parse(req);
    const result = await createQueueForProject(req.user.id, parsed.params.id, parsed.body.name, parsed.body.priority ?? 100, parsed.body.max_concurrency ?? 1, parsed.body.retry_policy_id ?? null, parsed.body.is_paused ?? false);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
}

export async function listQueues(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      throw new AppError(401, 'unauthorized', 'Authentication required');
    }
    const parsed = queueParamsSchema.parse(req);
    const result = await listQueuesForProject(req.user.id, parsed.params.id);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function getQueueById(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      throw new AppError(401, 'unauthorized', 'Authentication required');
    }
    const parsed = queueParamsSchema.parse(req);
    const result = await getQueue(req.user.id, parsed.params.id);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function patchQueue(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      throw new AppError(401, 'unauthorized', 'Authentication required');
    }
    const parsed = queuePatchSchema.merge(paramsIdSchema).parse(req);
    const result = await updateQueueById(req.user.id, parsed.params.id, parsed.body);
    res.json(result);
  } catch (error) {
    next(error);
  }
}
