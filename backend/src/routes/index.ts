import { Router } from 'express';
import { login, register, listOrganizations } from '../controllers/authController';
import { createProject, listProjects } from '../controllers/projectController';
import { createQueue, getQueueById, listQueues, patchQueue } from '../controllers/queueController';
import { createJob, getJobById, listJobs, retryJobById } from '../controllers/jobController';
import {
  getWorkerDetailsHandler,
  healthCheck,
  listWorkers,
  metricsOverview,
  queueStats,
  readinessCheck,
} from '../controllers/metricsController';
import { registerWorker, heartbeat, claimJob } from '../controllers/workerController';
import { authenticateToken } from '../middleware/auth';
import { createOrganization } from '../services/organizationService';

const router = Router();

router.get('/', (_req, res) => {
  res.json({ status: 'ok' });
});

router.post('/auth/register', register);
router.post('/auth/login', login);

router.get('/organizations', authenticateToken, listOrganizations);
router.post('/organizations', authenticateToken, createOrganization);

router.post('/projects', authenticateToken, createProject);
router.get('/projects', authenticateToken, listProjects);

router.get('/projects/:id/queues', authenticateToken, listQueues);
router.post('/projects/:id/queues', authenticateToken, createQueue);
router.get('/queues/:id', authenticateToken, getQueueById);
router.patch('/queues/:id', authenticateToken, patchQueue);

router.post('/queues/:id/jobs', authenticateToken, createJob);
router.get('/jobs/:id', authenticateToken, getJobById);
router.get('/queues/:id/jobs', authenticateToken, listJobs);
router.post('/jobs/:id/retry', authenticateToken, retryJobById);

router.get('/health', healthCheck);
router.get('/ready', readinessCheck);
router.get('/metrics', authenticateToken, metricsOverview);
router.get('/queues/:id/stats', authenticateToken, queueStats);
router.get('/workers', authenticateToken, listWorkers);
router.get('/workers/:id', authenticateToken, getWorkerDetailsHandler);
router.post('/workers/register', authenticateToken, registerWorker);
router.post('/workers/heartbeat', authenticateToken, heartbeat);
router.post('/workers/:id/heartbeat', authenticateToken, heartbeat);
router.post('/workers/claim', authenticateToken, claimJob);
router.post('/workers/:id/claim', authenticateToken, claimJob);

export default router;
