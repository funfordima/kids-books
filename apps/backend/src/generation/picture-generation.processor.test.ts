import { describe, expect, it, vi } from "vitest";
import { createNonRetryableGenerationError } from "./generation.errors";
import type { PictureGenerationPayload } from "../jobs/queue.payloads";
import { PictureGenerationProcessor } from "./picture-generation.processor";
import type { GenerationProcessorContext } from "../jobs/queue.lifecycle";

const payload: PictureGenerationPayload = {
  kind: "picture-generation",
  version: 1,
  operationVersion: "v1",
  userId: "user-1",
  bookId: "book-1",
  pageId: "page-1",
  pictureId: "picture-1",
  correlationId: "corr-1"
};

const createContext = (): {
  context: GenerationProcessorContext;
  reportProgress: ReturnType<typeof vi.fn>;
} => {
  const reportProgress = vi.fn().mockResolvedValue(undefined);

  return {
    context: { reportProgress },
    reportProgress
  };
};

describe("picture generation processor", () => {
  it("loads approved page content and calls the image provider with safe prompt", async () => {
    const pages = {
      loadApprovedPageForImage: vi.fn().mockResolvedValue({
        userId: "user-1",
        bookId: "book-1",
        pageId: "page-1",
        pictureId: "picture-1",
        illustrationDescription: "Mia studies a glowing leaf",
        illustrationStyle: "watercolor"
      })
    };
    const moderation = {
      moderateText: vi.fn().mockResolvedValue({ flagged: false })
    };
    const images = {
      generateImage: vi
        .fn()
        .mockResolvedValue({ bytes: new Uint8Array(), contentType: "image/png" })
    };
    const processor = new PictureGenerationProcessor(pages, moderation, images);
    const { context, reportProgress } = createContext();

    await processor.process(payload, context);

    expect(images.generateImage).toHaveBeenCalledWith(
      expect.stringContaining("no text, no words, no letters, no numbers")
    );
    expect(reportProgress).toHaveBeenCalledWith({
      stage: "illustration",
      percent: 100
    });
  });

  it("does not call image provider when moderation flags the prompt", async () => {
    const images = { generateImage: vi.fn() };
    const processor = new PictureGenerationProcessor(
      {
        loadApprovedPageForImage: vi.fn().mockResolvedValue({
          userId: "user-1",
          bookId: "book-1",
          pageId: "page-1",
          pictureId: "picture-1",
          illustrationDescription: "unsafe",
          illustrationStyle: "cartoon"
        })
      },
      { moderateText: vi.fn().mockResolvedValue({ flagged: true }) },
      images
    );

    await expect(
      processor.process(payload, createContext().context)
    ).rejects.toMatchObject({
      code: "QUEUE_PROCESSOR_NON_RETRYABLE",
      retryable: false
    });
    expect(images.generateImage).not.toHaveBeenCalled();
  });

  it("preserves non-retryable provider classification", async () => {
    const processor = new PictureGenerationProcessor(
      {
        loadApprovedPageForImage: vi.fn().mockResolvedValue({
          userId: "user-1",
          bookId: "book-1",
          pageId: "page-1",
          pictureId: "picture-1",
          illustrationDescription: "safe",
          illustrationStyle: "pastel"
        })
      },
      { moderateText: vi.fn().mockResolvedValue({ flagged: false }) },
      {
        generateImage: vi
          .fn()
          .mockRejectedValue(
            createNonRetryableGenerationError(
              "GENERATION_PROVIDER_REJECTED",
              "Provider rejected image prompt."
            )
          )
      }
    );

    await expect(
      processor.process(payload, createContext().context)
    ).rejects.toMatchObject({
      code: "QUEUE_PROCESSOR_NON_RETRYABLE",
      retryable: false
    });
  });
});
