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

export class OpenAiModerationAdapter implements ModerationPort {
  private readonly client: OpenAI;

  public constructor(private readonly config: OpenAiProviderConfig) {
    this.client = new OpenAI({
      apiKey: config.apiKey,
      timeout: config.timeoutMs
    });
  }

  public async moderateText(input: string): Promise<ModerationResult> {
    const response = await this.client.moderations.create({
      model: this.config.moderationModel,
      input
    });

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
    const response = await this.client.responses.create({
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

    const output = response.output_text;
    return JSON.parse(output);
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
    const response = await this.client.images.generate({
      model: this.config.imageModel,
      prompt
    });
    const image = response.data?.[0]?.b64_json;

    if (!image) {
      return { bytes: new Uint8Array(), contentType: "image/png" };
    }

    return {
      bytes: Buffer.from(image, "base64"),
      contentType: "image/png"
    };
  }
}
