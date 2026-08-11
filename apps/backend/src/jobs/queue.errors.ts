export type QueueErrorCode =
  | "QUEUE_CONFIG_INVALID"
  | "QUEUE_PAYLOAD_INVALID"
  | "QUEUE_REDIS_UNAVAILABLE"
  | "QUEUE_PROCESSOR_RETRYABLE"
  | "QUEUE_PROCESSOR_NON_RETRYABLE"
  | "QUEUE_UNKNOWN";

export class QueuePipelineError extends Error {
  public constructor(
    public readonly code: QueueErrorCode,
    message: string,
    public readonly retryable: boolean
  ) {
    super(message);
    this.name = "QueuePipelineError";
  }
}

export const createRetryableQueueError = (
  message = "Generation work failed and can be retried."
): QueuePipelineError =>
  new QueuePipelineError("QUEUE_PROCESSOR_RETRYABLE", message, true);

export const createNonRetryableQueueError = (
  message = "Generation work failed and cannot be retried."
): QueuePipelineError =>
  new QueuePipelineError("QUEUE_PROCESSOR_NON_RETRYABLE", message, false);

export interface SanitizedQueueError {
  code: QueueErrorCode;
  message: string;
  retryable: boolean;
}

export const sanitizeQueueError = (error: unknown): SanitizedQueueError => {
  if (error instanceof QueuePipelineError) {
    return {
      code: error.code,
      message: error.message,
      retryable: error.retryable
    };
  }

  return {
    code: "QUEUE_UNKNOWN",
    message: "Generation work failed.",
    retryable: true
  };
};
