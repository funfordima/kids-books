import type {
  BookGenerationPayload,
  GenerationJobPayload,
  PictureGenerationPayload
} from "./queue.payloads";
import type { SanitizedQueueError } from "./queue.errors";

export type QueueLifecycleStage =
  | "queued"
  | "active"
  | "story"
  | "illustration"
  | "completed"
  | "failed";

export interface QueueProgressEvent {
  jobId: string;
  payload: GenerationJobPayload;
  stage: QueueLifecycleStage;
  attempt: number;
  percent?: number;
}

export interface QueueTerminalEvent {
  jobId: string;
  payload: GenerationJobPayload;
  attemptsMade: number;
}

export interface QueueFailureEvent extends QueueTerminalEvent {
  error: SanitizedQueueError;
}

export interface GenerationQueueLifecyclePort {
  queued(event: QueueTerminalEvent): Promise<void>;
  active(event: QueueTerminalEvent): Promise<void>;
  progress(event: QueueProgressEvent): Promise<void>;
  completed(event: QueueTerminalEvent): Promise<void>;
  failed(event: QueueFailureEvent): Promise<void>;
}

export interface BookGenerationProcessorPort {
  process(payload: BookGenerationPayload): Promise<void>;
}

export interface PictureGenerationProcessorPort {
  process(payload: PictureGenerationPayload): Promise<void>;
}

export class NoopGenerationQueueLifecycle implements GenerationQueueLifecyclePort {
  public queued(_event: QueueTerminalEvent): Promise<void> {
    void _event;
    return Promise.resolve();
  }

  public active(_event: QueueTerminalEvent): Promise<void> {
    void _event;
    return Promise.resolve();
  }

  public progress(_event: QueueProgressEvent): Promise<void> {
    void _event;
    return Promise.resolve();
  }

  public completed(_event: QueueTerminalEvent): Promise<void> {
    void _event;
    return Promise.resolve();
  }

  public failed(_event: QueueFailureEvent): Promise<void> {
    void _event;
    return Promise.resolve();
  }
}
