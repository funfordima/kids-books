import { UnrecoverableError, type Job } from "bullmq";
import { describe, expect, it, vi, type Mock } from "vitest";
import { processBookGenerationJob } from "./generation-worker.factory";
import { processPictureGenerationJob } from "./generation-worker.factory";
import {
  createNonRetryableQueueError,
  createRetryableQueueError
} from "./queue.errors";
import type {
  GenerationProcessorContext,
  GenerationQueueLifecyclePort,
  QueueFailureEvent,
  QueueProgressEvent,
  QueueTerminalEvent
} from "./queue.lifecycle";
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
  active: Mock<(event: QueueTerminalEvent) => Promise<void>>;
  progress: Mock<(event: QueueProgressEvent) => Promise<void>>;
  completed: Mock<(event: QueueTerminalEvent) => Promise<void>>;
  failed: Mock<(event: QueueFailureEvent) => Promise<void>>;
}

const createLifecycle = (): MockLifecycle => {
  const active = vi
    .fn<(event: QueueTerminalEvent) => Promise<void>>()
    .mockResolvedValue(undefined);
  const progress = vi
    .fn<(event: QueueProgressEvent) => Promise<void>>()
    .mockResolvedValue(undefined);
  const completed = vi
    .fn<(event: QueueTerminalEvent) => Promise<void>>()
    .mockResolvedValue(undefined);
  const failed = vi
    .fn<(event: QueueFailureEvent) => Promise<void>>()
    .mockResolvedValue(undefined);

  return {
    port: {
      queued: vi.fn(),
      active,
      progress,
      completed,
      failed
    },
    active,
    progress,
    completed,
    failed
  };
};

type BookProcessMock = (
  payload: BookGenerationPayload,
  context: GenerationProcessorContext
) => Promise<void>;

type PictureProcessMock = (
  payload: PictureGenerationPayload,
  context: GenerationProcessorContext
) => Promise<void>;

describe("generation worker processing", () => {
  it("dispatches valid jobs to the injected processor", async () => {
    const lifecycle = createLifecycle();
    let receivedContext: GenerationProcessorContext | undefined;
    const process = vi.fn<BookProcessMock>().mockImplementation(
      (_payload, context) => {
        receivedContext = context;
        return Promise.resolve();
      }
    );
    const processor = { process };

    await processBookGenerationJob(createJob(), processor, lifecycle.port);

    expect(process).toHaveBeenCalledOnce();
    expect(receivedContext).toBeDefined();
    expect(typeof receivedContext?.reportProgress).toBe("function");
    expect(lifecycle.active).toHaveBeenCalledOnce();
    expect(lifecycle.completed).toHaveBeenCalledOnce();
  });

  it("lets processors emit typed progress through the lifecycle boundary", async () => {
    const lifecycle = createLifecycle();
    const processor = {
      process: vi.fn<BookProcessMock>().mockImplementation(
        async (
          _payload: BookGenerationPayload,
          context: GenerationProcessorContext
        ) => {
          await context.reportProgress({ stage: "story", percent: 50 });
        }
      )
    };

    await processBookGenerationJob(createJob(), processor, lifecycle.port);

    expect(lifecycle.progress).toHaveBeenCalledWith({
      jobId: "job-1",
      payload,
      stage: "story",
      attempt: 1,
      percent: 50
    });
  });

  it("fails explicitly when processor progress percent is invalid", async () => {
    const lifecycle = createLifecycle();
    const processor = {
      process: vi.fn<BookProcessMock>().mockImplementation(
        async (
          _payload: BookGenerationPayload,
          context: GenerationProcessorContext
        ) => {
          await context.reportProgress({ stage: "story", percent: 101 });
        }
      )
    };

    await expect(
      processBookGenerationJob(createJob(), processor, lifecycle.port)
    ).rejects.toThrow("Queue progress percent must be an integer from 0 to 100.");
    const failureEvent = lifecycle.failed.mock.calls.at(0)?.[0];
    expect(failureEvent?.error.code).toBe("QUEUE_PAYLOAD_INVALID");
    expect(failureEvent?.error.retryable).toBe(false);
  });

  it("lets retryable processor failures retry under BullMQ policy", async () => {
    const lifecycle = createLifecycle();
    const error = createRetryableQueueError();
    const process = vi.fn<BookProcessMock>().mockRejectedValue(error);
    const processor = { process };

    await expect(
      processBookGenerationJob(createJob(), processor, lifecycle.port)
    ).rejects.toBe(error);
    expect(lifecycle.failed).toHaveBeenCalledOnce();
  });

  it("marks non-retryable processor failures unrecoverable", async () => {
    const lifecycle = createLifecycle();
    const processor = {
      process: vi
        .fn<BookProcessMock>()
        .mockRejectedValue(createNonRetryableQueueError())
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
    let receivedContext: GenerationProcessorContext | undefined;
    const process = vi.fn<PictureProcessMock>().mockImplementation(
      (_payload, context) => {
        receivedContext = context;
        return Promise.resolve();
      }
    );
    const processor = { process };

    await processPictureGenerationJob(job, processor, lifecycle.port);

    expect(process).toHaveBeenCalledWith(picturePayload, receivedContext);
    expect(typeof receivedContext?.reportProgress).toBe("function");
    expect(lifecycle.completed).toHaveBeenCalledWith(
      expect.objectContaining({ attemptsMade: 2 })
    );
  });
});
