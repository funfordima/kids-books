import { describe, expect, it } from "vitest";
import { loadOpenAiProviderConfig } from "./provider.config";

describe("OpenAI provider configuration", () => {
  it("loads server-only defaults from environment", () => {
    expect(loadOpenAiProviderConfig({ OPENAI_API_KEY: "key" })).toEqual({
      apiKey: "key",
      textModel: "gpt-5.6-terra",
      imageModel: "gpt-image-2",
      moderationModel: "omni-moderation-latest",
      timeoutMs: 30000
    });
  });

  it("accepts explicit model and timeout overrides", () => {
    expect(
      loadOpenAiProviderConfig({
        OPENAI_API_KEY: "key",
        OPENAI_TEXT_MODEL: "text-model",
        OPENAI_IMAGE_MODEL: "image-model",
        OPENAI_MODERATION_MODEL: "moderation-model",
        OPENAI_TIMEOUT_MS: "45000"
      })
    ).toMatchObject({
      textModel: "text-model",
      imageModel: "image-model",
      moderationModel: "moderation-model",
      timeoutMs: 45000
    });
  });

  it("fails closed without an API key", () => {
    expect(() => loadOpenAiProviderConfig({})).toThrow(
      "OpenAI provider configuration is invalid."
    );
  });
});
