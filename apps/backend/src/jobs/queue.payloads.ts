import { z } from "zod";
import { GENERATION_QUEUE_VERSION } from "./queue.constants";

const idSchema = z
  .string()
  .trim()
  .min(1)
  .max(128)
  .regex(/^[A-Za-z0-9_-]+$/u);

export const bookGenerationPayloadSchema = z
  .object({
    kind: z.literal("book-generation"),
    version: z.literal(GENERATION_QUEUE_VERSION),
    operationVersion: z.string().trim().min(1).max(32),
    userId: idSchema,
    bookId: idSchema,
    correlationId: idSchema
  })
  .strict();

export const pictureGenerationPayloadSchema = z
  .object({
    kind: z.literal("picture-generation"),
    version: z.literal(GENERATION_QUEUE_VERSION),
    operationVersion: z.string().trim().min(1).max(32),
    userId: idSchema,
    bookId: idSchema,
    pageId: idSchema,
    pictureId: idSchema,
    correlationId: idSchema
  })
  .strict();

export const generationJobPayloadSchema = z.discriminatedUnion("kind", [
  bookGenerationPayloadSchema,
  pictureGenerationPayloadSchema
]);

export type BookGenerationPayload = z.infer<typeof bookGenerationPayloadSchema>;
export type PictureGenerationPayload = z.infer<
  typeof pictureGenerationPayloadSchema
>;
export type GenerationJobPayload = z.infer<typeof generationJobPayloadSchema>;

export const parseBookGenerationPayload = (
  value: unknown
): BookGenerationPayload => bookGenerationPayloadSchema.parse(value);

export const parsePictureGenerationPayload = (
  value: unknown
): PictureGenerationPayload => pictureGenerationPayloadSchema.parse(value);
