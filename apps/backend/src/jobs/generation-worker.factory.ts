import { UnrecoverableError, Worker, type Job, type WorkerOptions } from "bullmq";
import {
  BOOK_GENERATION_QUEUE,
  PICTURE_GENERATION_QUEUE
} from "./queue.constants";
import { sanitizeQueueError, QueuePipelineError } from "./queue.errors";
import type {
  BookGenerationProcessorPort,
  GenerationProcessorContext,
  GenerationQueueLifecyclePort,
  PictureGenerationProcessorPort
} from "./queue.lifecycle";
import {
  parseBookGenerationPayload,
  parsePictureGenerationPayload,
  type BookGenerationPayload,
  type PictureGenerationPayload
} from "./queue.payloads";

const createProcessorContext = (
  jobId: string,
  payload: BookGenerationPayload | PictureGenerationPayload,
  attempt: number,
  lifecycle: GenerationQueueLifecyclePort
): GenerationProcessorContext => ({
  reportProgress: async ({ stage, percent }) => {
    if (
      percent !== undefined &&
      (!Number.isInteger(percent) || percent < 0 || percent > 100)
    ) {
      throw new QueuePipelineError(
        "QUEUE_PAYLOAD_INVALID",
        "Queue progress percent must be an integer from 0 to 100.",
        false
      );
    }

    await lifecycle.progress({
      jobId,
      payload,
      stage,
      attempt,
      percent
    });
  }
});

export const processBookGenerationJob = async (
  job: Job<BookGenerationPayload>,
  processor: BookGenerationProcessorPort,
  lifecycle: GenerationQueueLifecyclePort
): Promise<void> => {
  const payload = parseBookGenerationPayload(job.data);
  const jobId = job.id ?? "";
  const attempt = job.attemptsMade + 1;
  await lifecycle.active({
    jobId,
    payload,
    attemptsMade: job.attemptsMade
  });

  try {
    await processor.process(
      payload,
      createProcessorContext(jobId, payload, attempt, lifecycle)
    );
    await lifecycle.completed({
      jobId,
      payload,
      attemptsMade: attempt
    });
  } catch (error) {
    await lifecycle.failed({
      jobId,
      payload,
      attemptsMade: attempt,
      error: sanitizeQueueError(error)
    });

    if (error instanceof QueuePipelineError && !error.retryable) {
      throw new UnrecoverableError(error.message);
    }

    throw error;
  }
};

export const processPictureGenerationJob = async (
  job: Job<PictureGenerationPayload>,
  processor: PictureGenerationProcessorPort,
  lifecycle: GenerationQueueLifecyclePort
): Promise<void> => {
  const payload = parsePictureGenerationPayload(job.data);
  const jobId = job.id ?? "";
  const attempt = job.attemptsMade + 1;
  await lifecycle.active({
    jobId,
    payload,
    attemptsMade: job.attemptsMade
  });

  try {
    await processor.process(
      payload,
      createProcessorContext(jobId, payload, attempt, lifecycle)
    );
    await lifecycle.completed({
      jobId,
      payload,
      attemptsMade: attempt
    });
  } catch (error) {
    await lifecycle.failed({
      jobId,
      payload,
      attemptsMade: attempt,
      error: sanitizeQueueError(error)
    });

    if (error instanceof QueuePipelineError && !error.retryable) {
      throw new UnrecoverableError(error.message);
    }

    throw error;
  }
};

export const createBookGenerationWorker = (
  processor: BookGenerationProcessorPort,
  lifecycle: GenerationQueueLifecyclePort,
  options: WorkerOptions
): Worker<BookGenerationPayload> =>
  new Worker(
    BOOK_GENERATION_QUEUE,
    (job) => processBookGenerationJob(job, processor, lifecycle),
    options
  );

export const createPictureGenerationWorker = (
  processor: PictureGenerationProcessorPort,
  lifecycle: GenerationQueueLifecyclePort,
  options: WorkerOptions
): Worker<PictureGenerationPayload> =>
  new Worker(
    PICTURE_GENERATION_QUEUE,
    (job) => processPictureGenerationJob(job, processor, lifecycle),
    options
  );
