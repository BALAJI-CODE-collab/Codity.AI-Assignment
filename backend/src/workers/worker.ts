import os from 'os';
import process from 'process';
import { claimNextJob, createWorker, updateWorkerStatus } from '../repositories/jobRepository';
import { executeJobLifecycle } from '../services/jobLifecycleService';

export interface WorkerContext {
  workerId: string;
  isShuttingDown: boolean;
  pollInterval: number;
  inFlightJobsPerQueue: Map<string, number>;
  runningPromises: Set<Promise<void>>;
  config: {
    batchSize: number;
  };
}

function createWorkerContext(workerId: string): WorkerContext {
  return {
    workerId,
    isShuttingDown: false,
    pollInterval: Number(process.env.WORKER_POLL_INTERVAL_MS ?? 1000),
    inFlightJobsPerQueue: new Map<string, number>(),
    runningPromises: new Set<Promise<void>>(),
    config: {
      batchSize: Number(process.env.WORKER_BATCH_SIZE ?? 1),
    },
  };
}

async function runWorkerLoop(context: WorkerContext) {
  while (!context.isShuttingDown) {
    await pollForJobs(context);
    await sleep(context.pollInterval);
  }
}

async function pollForJobs(context: WorkerContext) {
  if (context.isShuttingDown) {
    return;
  }

  const candidates = [] as Array<{ id: string; queueId: string }>;
  for (let index = 0; index < context.config.batchSize; index += 1) {
    const nextJob = await claimNextJob(context.workerId);
    if (!nextJob) {
      break;
    }
    const queueId = nextJob.queue_id as string;
    const inFlight = context.inFlightJobsPerQueue.get(queueId) ?? 0;
    const queueLimit = Number(process.env.WORKER_QUEUE_CONCURRENCY_LIMIT ?? 1);
    if (inFlight >= queueLimit) {
      break;
    }
    context.inFlightJobsPerQueue.set(queueId, inFlight + 1);
    candidates.push({ id: nextJob.id as string, queueId });
  }

  for (const candidate of candidates) {
    const executionPromise = executeJob(context, candidate.id, candidate.queueId);
    context.runningPromises.add(executionPromise);
    void executionPromise.finally(() => {
      context.runningPromises.delete(executionPromise);
      const current = context.inFlightJobsPerQueue.get(candidate.queueId) ?? 0;
      if (current > 0) {
        context.inFlightJobsPerQueue.set(candidate.queueId, current - 1);
      }
      if (context.runningPromises.size === 0) {
        void updateWorkerStatus(context.workerId, 'idle');
      }
    });
  }

  if (candidates.length > 0) {
    await updateWorkerStatus(context.workerId, 'busy');
  }
}

async function executeJob(context: WorkerContext, jobId: string, queueId: string) {
  if (context.isShuttingDown) {
    return;
  }

  try {
    await executeJobLifecycle(context.workerId, { id: jobId, queue_id: queueId, payload: {} });
    console.log(`Worker ${os.hostname()} executed job ${jobId} on queue ${queueId}`);
  } catch (error) {
    console.error(`Job ${jobId} failed:`, error);
  }
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function registerWorker() {
  const worker = await createWorker(os.hostname());
  if (!worker?.id) {
    throw new Error('Failed to register worker');
  }
  return worker.id as string;
}

async function handleShutdown(context: WorkerContext) {
  context.isShuttingDown = true;
  await Promise.allSettled([...context.runningPromises]);
}

async function main() {
  const workerId = await registerWorker();
  const context = createWorkerContext(workerId);
  await updateWorkerStatus(workerId, 'idle');

  process.on('SIGTERM', () => {
    void handleShutdown(context);
  });

  process.on('SIGINT', () => {
    void handleShutdown(context);
  });

  await runWorkerLoop(context);
}

void main().catch((error) => {
  console.error('Worker failed:', error);
  process.exit(1);
});
