import { NextFunction, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { AppError } from '../types/errors';
import { jobCreateSchema, paginationSchema, paramsIdSchema } from '../validators/schemas';
import { createJobForQueue, getJob, listJobsForAuthenticatedQueue, retryJob } from '../services/jobService';

export async function createJob(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      throw new AppError(401, 'unauthorized', 'Authentication required');
    }
    const parsed = jobCreateSchema.merge(paramsIdSchema).parse(req);
    const result = await createJobForQueue(req.user.id, parsed.params.id, {
      type: parsed.body.type,
      payload: parsed.body.payload,
      priority: parsed.body.priority,
      runAt: parsed.body.run_at,
      maxAttempts: parsed.body.max_attempts,
      cronExpression: parsed.body.cron_expression,
      jobCount: parsed.body.job_count,
      batchSize: parsed.body.batch_size,
    });
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
}

export async function getJobById(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      throw new AppError(401, 'unauthorized', 'Authentication required');
    }
    const parsed = paramsIdSchema.parse(req);
    const result = await getJob(req.user.id, parsed.params.id);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function listJobs(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      throw new AppError(401, 'unauthorized', 'Authentication required');
    }
    const parsed = paginationSchema.merge(paramsIdSchema).parse(req);
    const result = await listJobsForAuthenticatedQueue(req.user.id, parsed.params.id, parsed.query.page ?? 1, parsed.query.per_page ?? 20, parsed.query.status);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function retryJobById(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      throw new AppError(401, 'unauthorized', 'Authentication required');
    }
    const parsed = paramsIdSchema.parse(req);
    const result = await retryJob(req.user.id, parsed.params.id);
    res.json(result);
  } catch (error) {
    next(error);
  }
}
