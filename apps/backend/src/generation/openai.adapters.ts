import OpenAI from "openai";
import type {
  ImageGenerationPort,
  ImageGenerationResult,
  ModerationPort,
  ModerationResult,
  StoryTextGenerationPort
} from "./provider.ports";
import type { BookGenerationConfig } from "./book-config";
import type { OpenAiProviderConfig } from "./provider.config";
import {
  createNonRetryableGenerationError,
  createRetryableGenerationError,
  GenerationPipelineError
} from "./generation.errors";

const mapOpenAiError = (error: unknown): GenerationPipelineError => {
  if (error instanceof GenerationPipelineError) {
    return error;
  }

  const status =
    typeof error === "object" && error !== null && "status" in error
      ? Number(error.status)
      : undefined;
  const code =
    typeof error === "object" && error !== null && "code" in error
      ? String(error.code)
      : undefined;

  if (code === "ETIMEDOUT" || code === "ECONNABORTED") {
    return createRetryableGenerationError(
      "GENERATION_PROVIDER_TIMEOUT",
      "Provider request timed out."
    );
  }

  if (status === 429) {
    return createRetryableGenerationError(
      "GENERATION_PROVIDER_RATE_LIMIT",
      "Provider rate limit was reached."
    );
  }

  if (status !== undefined && status >= 400 && status < 500) {
    return createNonRetryableGenerationError(
      "GENERATION_PROVIDER_REJECTED",
      "Provider rejected the request."
    );
  }

  return createRetryableGenerationError(
    "GENERATION_PROVIDER_UNAVAILABLE",
    "Provider could not complete the request."
  );
};

export class OpenAiModerationAdapter implements ModerationPort {
  private readonly client: OpenAI;

  public constructor(private readonly config: OpenAiProviderConfig) {
    this.client = new OpenAI({
      apiKey: config.apiKey,
      timeout: config.timeoutMs
    });
  }

  public async moderateText(input: string): Promise<ModerationResult> {
    let response;

    try {
      response = await this.client.moderations.create({
        model: this.config.moderationModel,
        input
      });
    } catch (error) {
      throw mapOpenAiError(error);
    }

    return { flagged: response.results.some((result) => result.flagged) };
  }
}

export class OpenAiStoryTextAdapter implements StoryTextGenerationPort {
  private readonly client: OpenAI;

  public constructor(private readonly config: OpenAiProviderConfig) {
    this.client = new OpenAI({
      apiKey: config.apiKey,
      timeout: config.timeoutMs
    });
  }

  public async generateStory(
    _config: BookGenerationConfig,
    prompt: string
  ): Promise<unknown> {
    void _config;
    let response;

    try {
      response = await this.client.responses.create({
        model: this.config.textModel,
        input: prompt,
        text: {
          format: {
            type: "json_schema",
            name: "children_book_story",
            strict: true,
            schema: {
              type: "object",
              additionalProperties: false,
              required: ["title", "pages"],
              properties: {
                title: { type: "string" },
                pages: {
                  type: "array",
                  items: {
                    type: "object",
                    additionalProperties: false,
                    required: [
                      "pageNumber",
                      "text",
                      "illustrationDescription"
                    ],
                    properties: {
                      pageNumber: { type: "number" },
                      text: { type: "string" },
                      illustrationDescription: { type: "string" }
                    }
                  }
                }
              }
            }
          }
        }
      });
    } catch (error) {
      throw mapOpenAiError(error);
    }

    const output = response.output_text;

    try {
      return JSON.parse(output);
    } catch {
      throw createNonRetryableGenerationError(
        "GENERATION_SCHEMA_INVALID",
        "Provider story output was not valid structured JSON."
      );
    }
  }
}

export class OpenAiImageAdapter implements ImageGenerationPort {
  private readonly client: OpenAI;

  public constructor(private readonly config: OpenAiProviderConfig) {
    this.client = new OpenAI({
      apiKey: config.apiKey,
      timeout: config.timeoutMs
    });
  }

  public async generateImage(prompt: string): Promise<ImageGenerationResult> {
    let response;

    try {
      response = await this.client.images.generate({
        model: this.config.imageModel,
        prompt
      });
    } catch (error) {
      throw mapOpenAiError(error);
    }

    const image = response.data?.[0]?.b64_json;

    if (!image) {
      throw createNonRetryableGenerationError(
        "GENERATION_PROVIDER_REJECTED",
        "Provider image output was empty."
      );
    }

    return {
      bytes: Buffer.from(image, "base64"),
      contentType: "image/png"
    };
  }
}
