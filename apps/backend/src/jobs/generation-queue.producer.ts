import { Injectable } from "@nestjs/common";
import type { OnApplicationShutdown } from "@nestjs/common";
import type { Queue } from "bullmq";
import { createGenerationJobOptions } from "./queue.config";
import {
  createBookGenerationJobId,
  createPictureGenerationJobId
} from "./queue.idempotency";
import type { GenerationQueueLifecyclePort } from "./queue.lifecycle";
import {
  parseBookGenerationPayload,
  parsePictureGenerationPayload,
  type BookGenerationPayload,
  type PictureGenerationPayload
} from "./queue.payloads";

export interface EnqueuedGenerationJob {
  id: string;
  queueName: string;
}

@Injectable()
export class GenerationQueueProducer implements OnApplicationShutdown {
  public constructor(
    private readonly bookQueue?: Queue<BookGenerationPayload>,
    private readonly pictureQueue?: Queue<PictureGenerationPayload>,
    private readonly lifecycle?: GenerationQueueLifecyclePort
  ) {}

  public async enqueueBook(
    payload: BookGenerationPayload
  ): Promise<EnqueuedGenerationJob> {
    const validatedPayload = parseBookGenerationPayload(payload);
    const jobId = createBookGenerationJobId(validatedPayload);
    const queue = this.requireBookQueue();
    const job = await queue.add(
      validatedPayload.kind,
      validatedPayload,
      createGenerationJobOptions(jobId)
    );

    await this.lifecycle?.queued({
      jobId,
      payload: validatedPayload,
      attemptsMade: job.attemptsMade
    });

    return { id: jobId, queueName: queue.name };
  }

  public async enqueuePicture(
    payload: PictureGenerationPayload
  ): Promise<EnqueuedGenerationJob> {
    const validatedPayload = parsePictureGenerationPayload(payload);
    const jobId = createPictureGenerationJobId(validatedPayload);
    const queue = this.requirePictureQueue();
    const job = await queue.add(
      validatedPayload.kind,
      validatedPayload,
      createGenerationJobOptions(jobId)
    );

    await this.lifecycle?.queued({
      jobId,
      payload: validatedPayload,
      attemptsMade: job.attemptsMade
    });

    return { id: jobId, queueName: queue.name };
  }

  public async onApplicationShutdown(): Promise<void> {
    await Promise.all([this.bookQueue?.close(), this.pictureQueue?.close()]);
  }

  private requireBookQueue(): Queue<BookGenerationPayload> {
    if (!this.bookQueue) {
      throw new Error("Book generation queue is not configured.");
    }

    return this.bookQueue;
  }

  private requirePictureQueue(): Queue<PictureGenerationPayload> {
    if (!this.pictureQueue) {
      throw new Error("Picture generation queue is not configured.");
    }

    return this.pictureQueue;
  }
}
