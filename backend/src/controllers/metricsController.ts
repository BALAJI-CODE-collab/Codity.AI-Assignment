import type { Request, Response, NextFunction } from 'express';
import {
  getHealthStatus,
  getMetrics,
  getQueueStatistics,
  getReadinessStatus,
  getWorker,
  getWorkers,
} from '../services/metricsService';

export async function healthCheck(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await getHealthStatus();
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function readinessCheck(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await getReadinessStatus();
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function metricsOverview(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await getMetrics();
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function queueStats(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const queueId = Array.isArray(id) ? id[0] : id;
    const result = await getQueueStatistics(queueId);
    if (!result) {
      res.status(404).json({ error: { code: 'queue_not_found', message: 'Queue not found' } });
      return;
    }
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function listWorkers(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await getWorkers();
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function getWorkerDetailsHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const workerId = Array.isArray(id) ? id[0] : id;
    const result = await getWorker(workerId);
    if (!result) {
      res.status(404).json({ error: { code: 'worker_not_found', message: 'Worker not found' } });
      return;
    }
    res.json(result);
  } catch (error) {
    next(error);
  }
}
