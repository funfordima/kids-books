import { Injectable } from "@nestjs/common";
import { createNonRetryableQueueError } from "../jobs/queue.errors";
import type { PictureGenerationProcessorPort } from "../jobs/queue.lifecycle";
import type { PictureGenerationPayload } from "../jobs/queue.payloads";
import {
  createRetryableGenerationError,
  GenerationPipelineError
} from "./generation.errors";
import { buildImagePrompt } from "./prompt-builder";
import type {
  ApprovedPageContentPort,
  ImageGenerationPort,
  ModerationPort
} from "./provider.ports";

@Injectable()
export class PictureGenerationProcessor implements PictureGenerationProcessorPort {
  public constructor(
    private readonly pages: ApprovedPageContentPort,
    private readonly moderation: ModerationPort,
    private readonly images: ImageGenerationPort
  ) {}

  public async process(payload: PictureGenerationPayload): Promise<void> {
    const page = await this.pages.loadApprovedPageForImage({
      bookId: payload.bookId,
      pageId: payload.pageId,
      pictureId: payload.pictureId
    });

    const prompt = buildImagePrompt({
      illustrationDescription: page.illustrationDescription,
      illustrationStyle: page.illustrationStyle
    });

    const moderationResult = await this.moderation.moderateText(prompt);

    if (moderationResult.flagged) {
      throw createNonRetryableQueueError(
        "Image prompt failed content safety checks."
      );
    }

    try {
      await this.images.generateImage(prompt);
    } catch (error) {
      if (error instanceof GenerationPipelineError && !error.retryable) {
        throw createNonRetryableQueueError(error.message);
      }

      throw createRetryableGenerationError(
        "GENERATION_PROVIDER_UNAVAILABLE",
        "Image provider could not complete the request."
      );
    }
  }
}
