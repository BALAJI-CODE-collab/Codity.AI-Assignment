import { createJobExecution, finalizeJobExecution, finalizeJobOutcome, transitionJobToRunning } from '../repositories/jobRepository';
import { handleJob } from '../workers/jobHandler';
import { handleJobFailure } from './reliabilityService';

export interface JobExecutionJob {
  id: string;
  queue_id: string;
  payload?: Record<string, unknown>;
}

export async function executeJobLifecycle(workerId: string, job: JobExecutionJob) {
  const transitionedJob = await transitionJobToRunning(job.id, workerId);
  if (!transitionedJob) {
    throw new Error(`Unable to transition job ${job.id} to running`);
  }

  const execution = await createJobExecution(job.id, workerId);
  if (!execution?.id) {
    throw new Error(`Unable to create execution row for job ${job.id}`);
  }

  const startedAt = Date.now();

  try {
    await handleJob({ payload: job.payload });
    const durationMs = Date.now() - startedAt;
    await finalizeJobExecution(execution.id, 'succeeded', durationMs, null);
    await finalizeJobOutcome(job.id, 'completed');
    return { status: 'completed' as const, executionId: execution.id };
  } catch (error) {
    const durationMs = Date.now() - startedAt;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    await finalizeJobExecution(execution.id, 'failed', durationMs, errorMessage);
    await finalizeJobOutcome(job.id, 'failed');
    await handleJobFailure(job.id, job.queue_id, job.payload ?? {}, errorMessage);
    throw error;
  }
}
