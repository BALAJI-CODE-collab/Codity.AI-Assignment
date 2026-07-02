import { findDueScheduledJobs, createScheduledJobRun, advanceScheduledJobNextRun, handleJobFailureWithRetry, findStaleWorkers } from '../repositories/jobRepository';

export interface ReliabilityContext {
  heartbeatIntervalMs: number;
  deadWorkerTimeoutMs: number;
  schedulerIntervalMs: number;
}

export async function heartbeatWorker(workerId: string, recordHeartbeat: (workerId: string) => Promise<void>) {
  await recordHeartbeat(workerId);
}

export async function recoverDeadWorkers(timeoutMs: number, markWorkerDead: (workerId: string) => Promise<void>, recoverJobs: (workerId: string) => Promise<unknown[]>) {
  const staleWorkers = await findStaleWorkers(timeoutMs);
  for (const worker of staleWorkers) {
    const workerId = worker.id as string;
    await markWorkerDead(workerId);
    await recoverJobs(workerId);
  }
}

function parseCronField(field: string, min: number, max: number): Set<number> {
  const values = new Set<number>();
  const parts = field.split(',');
  for (const part of parts) {
    if (part === '*') {
      for (let value = min; value <= max; value += 1) {
        values.add(value);
      }
      continue;
    }

    const stepMatch = part.match(/^(\*|\d+|\d+-\d+)(?:\/(\d+))?$/);
    if (!stepMatch) {
      continue;
    }

    const base = stepMatch[1];
    const step = stepMatch[2] ? Number(stepMatch[2]) : 1;
    if (base === '*') {
      for (let value = min; value <= max; value += step) {
        values.add(value);
      }
      continue;
    }

    if (base.includes('-')) {
      const [start, end] = base.split('-').map(Number);
      for (let value = start; value <= end; value += step) {
        values.add(value);
      }
      continue;
    }

    const single = Number(base);
    values.add(single);
  }
  return values;
}

function cronFieldMatches(field: string, value: number, min: number, max: number): boolean {
  const allowed = parseCronField(field, min, max);
  if (field === '0' || field === '7') {
    return allowed.has(value === 7 ? 0 : value);
  }
  return allowed.has(value);
}

function getNextCronOccurrence(cronExpression: string, fromDate: Date) {
  const fields = cronExpression.trim().split(/\s+/);
  if (fields.length !== 5) {
    throw new Error(`Unsupported cron expression: ${cronExpression}`);
  }

  const [minuteField, hourField, dayOfMonthField, monthField, dayOfWeekField] = fields;
  const candidate = new Date(fromDate);
  candidate.setSeconds(0, 0);
  candidate.setMinutes(candidate.getMinutes() + 1);

  const limit = new Date(candidate.getTime() + 5 * 365 * 24 * 60 * 60 * 1000);
  for (let current = new Date(candidate); current <= limit; current.setMinutes(current.getMinutes() + 1)) {
    const minute = current.getMinutes();
    const hour = current.getHours();
    const day = current.getDate();
    const month = current.getMonth() + 1;
    const dayOfWeek = current.getDay();

    const matchesMinute = cronFieldMatches(minuteField, minute, 0, 59);
    const matchesHour = cronFieldMatches(hourField, hour, 0, 23);
    const matchesDayOfMonth = cronFieldMatches(dayOfMonthField, day, 1, 31);
    const matchesMonth = cronFieldMatches(monthField, month, 1, 12);
    const matchesDayOfWeek = cronFieldMatches(dayOfWeekField, dayOfWeek, 0, 6);

    if (matchesMinute && matchesHour && matchesDayOfMonth && matchesMonth && matchesDayOfWeek) {
      return current;
    }
  }

  throw new Error(`Unable to compute next cron occurrence for ${cronExpression}`);
}

export async function handleJobFailure(jobId: string, queueId: string, payload: Record<string, unknown>, failureReason: string) {
  return handleJobFailureWithRetry(jobId, queueId, payload, failureReason);
}

export async function runSchedulerTick() {
  const dueJobs = await findDueScheduledJobs();
  for (const scheduledJob of dueJobs) {
    const scheduledJobId = scheduledJob.id as string;
    const queueId = scheduledJob.queue_id as string;
    const payload = typeof scheduledJob.payload === 'string' ? JSON.parse(scheduledJob.payload) : scheduledJob.payload;
    const nextRunAt = scheduledJob.next_run_at as string;
    await createScheduledJobRun(scheduledJobId, queueId, payload as Record<string, unknown>, nextRunAt);

    const nextOccurrence = getNextCronOccurrence(scheduledJob.cron_expression as string, new Date(nextRunAt));
    await advanceScheduledJobNextRun(scheduledJobId, nextOccurrence.toISOString());
  }
}
