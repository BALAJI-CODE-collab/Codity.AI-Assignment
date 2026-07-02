export interface JobHandlerInput {
  payload?: Record<string, unknown>;
}

export async function handleJob(job: JobHandlerInput) {
  const payload = job.payload ?? {};

  if (payload.forceFailure === true) {
    throw new Error('forced job failure');
  }

  return { success: true };
}
