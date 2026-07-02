import {
  getHealthSnapshot,
  getMetricsOverview,
  getQueueStats,
  getWorkersOverview,
  getWorkerDetails,
} from '../repositories/metricsRepository';

export async function getHealthStatus() {
  const health = await getHealthSnapshot();
  return {
    status: health.database === 'connected' ? 'ok' : 'error',
    database: health.database,
    timestamp: new Date().toISOString(),
  };
}

export async function getReadinessStatus() {
  const health = await getHealthSnapshot();
  return { ready: health.database === 'connected' };
}

export async function getMetrics() {
  return getMetricsOverview();
}

export async function getQueueStatistics(queueId: string) {
  return getQueueStats(queueId);
}

export async function getWorkers() {
  return getWorkersOverview();
}

export async function getWorker(workerId: string) {
  return getWorkerDetails(workerId);
}
