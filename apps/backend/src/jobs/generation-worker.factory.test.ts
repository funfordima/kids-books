import { UnrecoverableError, type Job } from "bullmq";
import { describe, expect, it, vi, type Mock } from "vitest";
import { processBookGenerationJob } from "./generation-worker.factory";
import { processPictureGenerationJob } from "./generation-worker.factory";
import {
  createNonRetryableQueueError,
  createRetryableQueueError
} from "./queue.errors";
import type { GenerationQueueLifecyclePort } from "./queue.lifecycle";
import type { BookGenerationPayload } from "./queue.payloads";
import type { PictureGenerationPayload } from "./queue.payloads";

const payload: BookGenerationPayload = {
  kind: "book-generation",
  version: 1,
  operationVersion: "v1",
  userId: "user-1",
  bookId: "book-1",
  correlationId: "corr-1"
};

const createJob = (): Job<BookGenerationPayload> =>
  ({
    id: "job-1",
    data: payload,
    attemptsMade: 0
  }) as Job<BookGenerationPayload>;

interface MockLifecycle {
  port: GenerationQueueLifecyclePort;
  active: Mock;
  completed: Mock;
  failed: Mock;
}

const createLifecycle = (): MockLifecycle => {
  const active = vi.fn();
  const completed = vi.fn();
  const failed = vi.fn();

  return {
    port: {
      queued: vi.fn(),
      active,
      progress: vi.fn(),
      completed,
      failed
    },
    active,
    completed,
    failed
  };
};

describe("generation worker processing", () => {
  it("dispatches valid jobs to the injected processor", async () => {
    const lifecycle = createLifecycle();
    const process = vi.fn().mockResolvedValue(undefined);
    const processor = { process };

    await processBookGenerationJob(createJob(), processor, lifecycle.port);

    expect(process).toHaveBeenCalledWith(payload);
    expect(lifecycle.active).toHaveBeenCalledOnce();
    expect(lifecycle.completed).toHaveBeenCalledOnce();
  });

  it("lets retryable processor failures retry under BullMQ policy", async () => {
    const lifecycle = createLifecycle();
    const error = createRetryableQueueError();
    const process = vi.fn().mockRejectedValue(error);
    const processor = { process };

    await expect(
      processBookGenerationJob(createJob(), processor, lifecycle.port)
    ).rejects.toBe(error);
    expect(lifecycle.failed).toHaveBeenCalledOnce();
  });

  it("marks non-retryable processor failures unrecoverable", async () => {
    const lifecycle = createLifecycle();
    const processor = {
      process: vi.fn().mockRejectedValue(createNonRetryableQueueError())
    };

    await expect(
      processBookGenerationJob(createJob(), processor, lifecycle.port)
    ).rejects.toBeInstanceOf(UnrecoverableError);
  });

  it("dispatches picture jobs through the picture processor", async () => {
    const picturePayload: PictureGenerationPayload = {
      kind: "picture-generation",
      version: 1,
      operationVersion: "v1",
      userId: "user-1",
      bookId: "book-1",
      pageId: "page-1",
      pictureId: "picture-1",
      correlationId: "corr-1"
    };
    const job = {
      id: "picture-job",
      data: picturePayload,
      attemptsMade: 1
    } as Job<PictureGenerationPayload>;
    const lifecycle = createLifecycle();
    const process = vi.fn().mockResolvedValue(undefined);
    const processor = { process };

    await processPictureGenerationJob(job, processor, lifecycle.port);

    expect(process).toHaveBeenCalledWith(picturePayload);
    expect(lifecycle.completed).toHaveBeenCalledWith(
      expect.objectContaining({ attemptsMade: 2 })
    );
  });
});
