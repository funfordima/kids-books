import { UnrecoverableError, Worker, type Job, type WorkerOptions } from "bullmq";
import {
  BOOK_GENERATION_QUEUE,
  PICTURE_GENERATION_QUEUE
} from "./queue.constants";
import { sanitizeQueueError, QueuePipelineError } from "./queue.errors";
import type {
  BookGenerationProcessorPort,
  GenerationQueueLifecyclePort,
  PictureGenerationProcessorPort
} from "./queue.lifecycle";
import {
  parseBookGenerationPayload,
  parsePictureGenerationPayload,
  type BookGenerationPayload,
  type PictureGenerationPayload
} from "./queue.payloads";

export const processBookGenerationJob = async (
  job: Job<BookGenerationPayload>,
  processor: BookGenerationProcessorPort,
  lifecycle: GenerationQueueLifecyclePort
): Promise<void> => {
  const payload = parseBookGenerationPayload(job.data);
  await lifecycle.active({
    jobId: job.id ?? "",
    payload,
    attemptsMade: job.attemptsMade
  });

  try {
    await processor.process(payload);
    await lifecycle.completed({
      jobId: job.id ?? "",
      payload,
      attemptsMade: job.attemptsMade + 1
    });
  } catch (error) {
    await lifecycle.failed({
      jobId: job.id ?? "",
      payload,
      attemptsMade: job.attemptsMade + 1,
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
  await lifecycle.active({
    jobId: job.id ?? "",
    payload,
    attemptsMade: job.attemptsMade
  });

  try {
    await processor.process(payload);
    await lifecycle.completed({
      jobId: job.id ?? "",
      payload,
      attemptsMade: job.attemptsMade + 1
    });
  } catch (error) {
    await lifecycle.failed({
      jobId: job.id ?? "",
      payload,
      attemptsMade: job.attemptsMade + 1,
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
