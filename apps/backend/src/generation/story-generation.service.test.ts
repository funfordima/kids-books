import { describe, expect, it, vi } from "vitest";
import type { GenerationQueueProducer } from "../jobs/generation-queue.producer";
import { StoryGenerationService } from "./story-generation.service";

const config = {
  userId: "user-1",
  bookId: "book-1",
  childName: "Mia",
  ageGroup: "5-6",
  pronouns: "she/her",
  storyType: "educational",
  educationalSubtype: "science-discovery",
  setting: "forest",
  illustrationStyle: "watercolor",
  pageCount: 8,
  correlationId: "corr-1"
};

const story = {
  title: "Mia and the Bright Leaf",
  pages: Array.from({ length: 8 }, (_value, index) => ({
    pageNumber: index + 1,
    text: `Page ${index + 1}`,
    illustrationDescription: `Illustration ${index + 1}`
  }))
};

const createService = (overrides?: {
  moderationFlagged?: boolean;
  generatedStory?: unknown;
}) => {
  const textProvider = {
    generateStory: vi.fn().mockResolvedValue(overrides?.generatedStory ?? story)
  };
  const moderation = {
    moderateText: vi
      .fn()
      .mockResolvedValue({ flagged: overrides?.moderationFlagged ?? false })
  };
  const persistence = {
    saveApprovedStory: vi.fn().mockResolvedValue(
      story.pages.map((page) => ({
        pageId: `page-${page.pageNumber}`,
        pictureId: `picture-${page.pageNumber}`,
        pageNumber: page.pageNumber
      }))
    )
  };
  const enqueuePicture = vi
    .fn()
    .mockImplementation((payload: { pictureId: string }) =>
      Promise.resolve({
        id: payload.pictureId,
        queueName: "generation.picture"
      })
    );
  const queue = {
    enqueuePicture
  } as unknown as GenerationQueueProducer;

  return {
    service: new StoryGenerationService(
      textProvider,
      moderation,
      persistence,
      queue
    ),
    textProvider,
    moderation,
    persistence,
    enqueuePicture
  };
};

describe("story generation orchestration", () => {
  it("moderates input and output before persistence and picture enqueue", async () => {
    const { service, textProvider, moderation, persistence, enqueuePicture } =
      createService();

    await expect(service.generate(config)).resolves.toEqual({
      bookId: "book-1",
      pictureJobs: story.pages.map((page) => `picture-${page.pageNumber}`)
    });

    expect(moderation.moderateText).toHaveBeenCalledTimes(2);
    expect(textProvider.generateStory).toHaveBeenCalledOnce();
    expect(persistence.saveApprovedStory).toHaveBeenCalledOnce();
    expect(enqueuePicture).toHaveBeenCalledTimes(8);
  });

  it("fails closed before provider calls when input moderation flags content", async () => {
    const { service, textProvider, persistence, enqueuePicture } = createService({
      moderationFlagged: true
    });

    await expect(service.generate(config)).rejects.toMatchObject({
      code: "GENERATION_INPUT_FLAGGED",
      retryable: false
    });
    expect(textProvider.generateStory).not.toHaveBeenCalled();
    expect(persistence.saveApprovedStory).not.toHaveBeenCalled();
    expect(enqueuePicture).not.toHaveBeenCalled();
  });

  it("rejects malformed structured output before persistence", async () => {
    const { service, persistence, enqueuePicture } = createService({
      generatedStory: { title: "Too short", pages: [] }
    });

    await expect(service.generate(config)).rejects.toMatchObject({
      code: "GENERATION_SCHEMA_INVALID",
      retryable: false
    });
    expect(persistence.saveApprovedStory).not.toHaveBeenCalled();
    expect(enqueuePicture).not.toHaveBeenCalled();
  });
});
