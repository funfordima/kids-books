import { z } from "zod";

export const generatedStoryPageSchema = z
  .object({
    pageNumber: z.number().int().positive(),
    text: z.string().trim().min(1).max(1_200),
    illustrationDescription: z.string().trim().min(1).max(1_000)
  })
  .strict();

export const generatedStorySchema = z
  .object({
    title: z.string().trim().min(1).max(160),
    pages: z.array(generatedStoryPageSchema)
  })
  .strict();

export type GeneratedStoryPage = z.infer<typeof generatedStoryPageSchema>;
export type GeneratedStory = z.infer<typeof generatedStorySchema>;

export const parseGeneratedStory = (
  value: unknown,
  expectedPageCount: number
): GeneratedStory => {
  const story = generatedStorySchema.parse(value);

  if (story.pages.length !== expectedPageCount) {
    throw new Error("Generated story page count does not match request.");
  }

  const orderedPages = story.pages.map((page) => page.pageNumber);
  const expectedPages = Array.from(
    { length: expectedPageCount },
    (_value, index) => index + 1
  );

  if (orderedPages.some((page, index) => page !== expectedPages[index])) {
    throw new Error("Generated story pages must be ordered and consecutive.");
  }

  return story;
};
