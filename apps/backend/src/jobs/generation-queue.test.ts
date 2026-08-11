import type { Queue } from "bullmq";
import { describe, expect, it, vi } from "vitest";
import { GenerationQueueProducer } from "./generation-queue.producer";
import {
  createGenerationJobOptions,
  createQueueOptions,
  createWorkerOptions,
  loadRedisQueueConfig
} from "./queue.config";
import {
  QUEUE_ATTEMPTS,
  QUEUE_BACKOFF_MS,
  QUEUE_RETENTION_SECONDS
} from "./queue.constants";
import {
  createBookGenerationJobId,
  createPictureGenerationJobId
} from "./queue.idempotency";
import {
  parseBookGenerationPayload,
  parsePictureGenerationPayload,
  type BookGenerationPayload,
  type PictureGenerationPayload
} from "./queue.payloads";

const bookPayload: BookGenerationPayload = {
  kind: "book-generation",
  version: 1,
  operationVersion: "v1",
  userId: "user-1",
  bookId: "book-1",
  correlationId: "corr-1"
};

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

const createFakeQueue = <Payload>(name: string): Queue<Payload> =>
  ({
    name,
    add: vi.fn().mockResolvedValue({ attemptsMade: 0 }),
    close: vi.fn().mockResolvedValue(undefined)
  }) as unknown as Queue<Payload>;

describe("generation queue contracts", () => {
  it("rejects malformed payloads before enqueue", () => {
    expect(() =>
      parseBookGenerationPayload({
        ...bookPayload,
        userId: "contains spaces"
      })
    ).toThrow();
    expect(() =>
      parsePictureGenerationPayload({
        ...picturePayload,
        unexpected: "field"
      })
    ).toThrow();
  });

  it("builds deterministic BullMQ-compatible job ids", () => {
    expect(createBookGenerationJobId(bookPayload)).toBe("book-1-v1-book-1");
    expect(createPictureGenerationJobId(picturePayload)).toBe(
      "picture-1-v1-picture-1"
    );
    expect(createBookGenerationJobId(bookPayload)).not.toContain(":");
  });

  it("centralizes retry and terminal retention policy", () => {
    const options = createGenerationJobOptions("job-1");

    expect(options).toMatchObject({
      attempts: QUEUE_ATTEMPTS,
      backoff: { type: "exponential", delay: QUEUE_BACKOFF_MS },
      removeOnComplete: { age: QUEUE_RETENTION_SECONDS },
      removeOnFail: { age: QUEUE_RETENTION_SECONDS }
    });
  });

  it("loads Redis configuration without leaking credentials in errors", () => {
    const config = loadRedisQueueConfig({
      REDIS_URL: "redis://default:secret@localhost:6379/2"
    });

    expect(config).toMatchObject({
      host: "localhost",
      port: 6379,
      username: "default",
      password: "secret",
      db: 2
    });
    expect(createQueueOptions(config).connection).toMatchObject({
      host: "localhost",
      port: 6379
    });
    expect(createWorkerOptions(config, 3)).toMatchObject({
      concurrency: 3
    });
    expect(() => loadRedisQueueConfig({ REDIS_URL: "https://example.com" }))
      .toThrow("Redis queue configuration is invalid.");
  });

  it("enqueues book and picture work to separate queues", async () => {
    const bookQueue = createFakeQueue<BookGenerationPayload>("generation.book");
    const pictureQueue = createFakeQueue<PictureGenerationPayload>(
      "generation.picture"
    );
    const producer = new GenerationQueueProducer(bookQueue, pictureQueue);

    await expect(producer.enqueueBook(bookPayload)).resolves.toEqual({
      id: "book-1-v1-book-1",
      queueName: "generation.book"
    });
    await expect(producer.enqueuePicture(picturePayload)).resolves.toEqual({
      id: "picture-1-v1-picture-1",
      queueName: "generation.picture"
    });
  });
});
