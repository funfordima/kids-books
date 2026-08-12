import { beforeEach, describe, expect, it, vi } from "vitest";

const openAiMocks = vi.hoisted(() => ({
  moderationsCreate: vi.fn(),
  responsesCreate: vi.fn(),
  imagesGenerate: vi.fn()
}));

vi.mock("openai", () => ({
  default: vi.fn(
    class {
      public readonly moderations = { create: openAiMocks.moderationsCreate };
      public readonly responses = { create: openAiMocks.responsesCreate };
      public readonly images = { generate: openAiMocks.imagesGenerate };
    }
  )
}));

import {
  OpenAiImageAdapter,
  OpenAiModerationAdapter,
  OpenAiStoryTextAdapter
} from "./openai.adapters";

const config = {
  apiKey: "key",
  textModel: "text-model",
  imageModel: "image-model",
  moderationModel: "moderation-model",
  timeoutMs: 1000
};

describe("OpenAI adapters", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("maps moderation responses to a flagged boolean", async () => {
    openAiMocks.moderationsCreate.mockResolvedValue({
      results: [{ flagged: false }, { flagged: true }]
    });

    await expect(new OpenAiModerationAdapter(config).moderateText("text"))
      .resolves.toEqual({ flagged: true });
    expect(openAiMocks.moderationsCreate).toHaveBeenCalledWith({
      model: "moderation-model",
      input: "text"
    });
  });

  it("requests structured story output through Responses", async () => {
    openAiMocks.responsesCreate.mockResolvedValue({
      output_text: JSON.stringify({ title: "Story", pages: [] })
    });

    await expect(
      new OpenAiStoryTextAdapter(config).generateStory(
        {} as never,
        "prompt"
      )
    ).resolves.toEqual({ title: "Story", pages: [] });
    expect(openAiMocks.responsesCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "text-model",
        input: "prompt"
      })
    );
  });

  it("classifies malformed structured story output as non-retryable", async () => {
    openAiMocks.responsesCreate.mockResolvedValue({
      output_text: "not-json"
    });

    await expect(
      new OpenAiStoryTextAdapter(config).generateStory(
        {} as never,
        "prompt"
      )
    ).rejects.toMatchObject({
      code: "GENERATION_SCHEMA_INVALID",
      retryable: false
    });
  });

  it("decodes generated image bytes and rejects empty provider output", async () => {
    openAiMocks.imagesGenerate.mockResolvedValueOnce({
      data: [{ b64_json: Buffer.from("image").toString("base64") }]
    });
    openAiMocks.imagesGenerate.mockResolvedValueOnce({ data: [] });
    const adapter = new OpenAiImageAdapter(config);

    await expect(adapter.generateImage("prompt")).resolves.toMatchObject({
      contentType: "image/png"
    });
    await expect(adapter.generateImage("prompt")).rejects.toMatchObject({
      code: "GENERATION_PROVIDER_REJECTED",
      retryable: false
    });
  });

  it("maps provider timeout, rate limit, and 4xx failures to stable errors", async () => {
    openAiMocks.moderationsCreate.mockRejectedValueOnce({
      code: "ETIMEDOUT"
    });
    openAiMocks.responsesCreate.mockRejectedValueOnce({ status: 429 });
    openAiMocks.imagesGenerate.mockRejectedValueOnce({ status: 400 });

    await expect(
      new OpenAiModerationAdapter(config).moderateText("text")
    ).rejects.toMatchObject({
      code: "GENERATION_PROVIDER_TIMEOUT",
      retryable: true
    });
    await expect(
      new OpenAiStoryTextAdapter(config).generateStory({} as never, "prompt")
    ).rejects.toMatchObject({
      code: "GENERATION_PROVIDER_RATE_LIMIT",
      retryable: true
    });
    await expect(
      new OpenAiImageAdapter(config).generateImage("prompt")
    ).rejects.toMatchObject({
      code: "GENERATION_PROVIDER_REJECTED",
      retryable: false
    });
  });
});
