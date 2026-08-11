export type GenerationErrorCode =
  | "GENERATION_CONFIG_INVALID"
  | "GENERATION_INPUT_FLAGGED"
  | "GENERATION_OUTPUT_FLAGGED"
  | "GENERATION_SCHEMA_INVALID"
  | "GENERATION_PROVIDER_TIMEOUT"
  | "GENERATION_PROVIDER_RATE_LIMIT"
  | "GENERATION_PROVIDER_UNAVAILABLE"
  | "GENERATION_PROVIDER_REJECTED"
  | "GENERATION_PERSISTENCE_FAILED"
  | "GENERATION_QUEUE_FAILED";

export class GenerationPipelineError extends Error {
  public constructor(
    public readonly code: GenerationErrorCode,
    message: string,
    public readonly retryable: boolean
  ) {
    super(message);
    this.name = "GenerationPipelineError";
  }
}

export const createNonRetryableGenerationError = (
  code: GenerationErrorCode,
  message: string
): GenerationPipelineError => new GenerationPipelineError(code, message, false);

export const createRetryableGenerationError = (
  code: GenerationErrorCode,
  message: string
): GenerationPipelineError => new GenerationPipelineError(code, message, true);
