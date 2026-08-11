import { z } from "zod";
import { GenerationPipelineError } from "./generation.errors";

const providerConfigSchema = z
  .object({
    OPENAI_API_KEY: z.string().trim().min(1),
    OPENAI_TEXT_MODEL: z.string().trim().min(1).default("gpt-5.6-terra"),
    OPENAI_IMAGE_MODEL: z.string().trim().min(1).default("gpt-image-2"),
    OPENAI_MODERATION_MODEL: z
      .string()
      .trim()
      .min(1)
      .default("omni-moderation-latest"),
    OPENAI_TIMEOUT_MS: z.coerce.number().int().min(1_000).max(120_000).default(30_000)
  })
  .passthrough();

export interface OpenAiProviderConfig {
  apiKey: string;
  textModel: string;
  imageModel: string;
  moderationModel: string;
  timeoutMs: number;
}

export const loadOpenAiProviderConfig = (
  env: NodeJS.ProcessEnv = process.env
): OpenAiProviderConfig => {
  const result = providerConfigSchema.safeParse(env);

  if (!result.success) {
    throw new GenerationPipelineError(
      "GENERATION_CONFIG_INVALID",
      "OpenAI provider configuration is invalid.",
      false
    );
  }

  return {
    apiKey: result.data.OPENAI_API_KEY,
    textModel: result.data.OPENAI_TEXT_MODEL,
    imageModel: result.data.OPENAI_IMAGE_MODEL,
    moderationModel: result.data.OPENAI_MODERATION_MODEL,
    timeoutMs: result.data.OPENAI_TIMEOUT_MS
  };
};
