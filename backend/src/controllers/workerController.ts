import { Request, Response, NextFunction } from 'express';
import { createWorker, recordWorkerHeartbeat, claimNextJob } from '../repositories/jobRepository';
import { workerRegisterSchema, paramsIdSchema } from '../validators/schemas';

export async function registerWorker(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = workerRegisterSchema.parse(req);
    const result = await createWorker(parsed.body.hostname);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
}

export async function heartbeat(req: Request, res: Response, next: NextFunction) {
  try {
    let workerId = req.params.id as string | undefined;
    if (!workerId && req.body && req.body.worker_id) {
      workerId = String(req.body.worker_id);
    } else if (!workerId && req.body && req.body.id) {
        workerId = String(req.body.id);
    }
    
    // Fallback: If the endpoint is /workers/heartbeat but workerId wasn't passed in body or param, just try parsing from params (even if it fails Zod later)
    if (workerId) {
        // Just record heartbeat
        await recordWorkerHeartbeat(workerId);
        res.status(200).json({ status: 'ok', worker_id: workerId });
        return;
    }

    // Default back to standard param validation
    const parsed = paramsIdSchema.parse(req);
    await recordWorkerHeartbeat(parsed.params.id);
    res.status(200).json({ status: 'ok', worker_id: parsed.params.id });
  } catch (error) {
    next(error);
  }
}

export async function claimJob(req: Request, res: Response, next: NextFunction) {
  try {
    let workerId = req.params.id as string | undefined;
    if (!workerId && req.body && req.body.worker_id) {
        workerId = String(req.body.worker_id);
    }

    if (!workerId) {
        const parsed = paramsIdSchema.parse(req);
        workerId = parsed.params.id;
    }

    const result = await claimNextJob(workerId);
    if (!result) {
      res.status(200).json(null); // No job available
      return;
    }
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}
