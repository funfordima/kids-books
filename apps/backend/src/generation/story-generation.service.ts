import { Injectable } from "@nestjs/common";
import { ZodError } from "zod";
import { GENERATION_QUEUE_VERSION } from "../jobs/queue.constants";
import type { GenerationQueueProducer } from "../jobs/generation-queue.producer";
import {
  parseBookGenerationConfig,
  type BookGenerationConfig
} from "./book-config";
import {
  createNonRetryableGenerationError,
  createRetryableGenerationError,
  GenerationPipelineError
} from "./generation.errors";
import {
  buildStoryPrompt
} from "./prompt-builder";
import type {
  ApprovedStoryPersistencePort,
  ModerationPort,
  StoryTextGenerationPort
} from "./provider.ports";
import { parseGeneratedStory } from "./story.schema";

@Injectable()
export class StoryGenerationService {
  public constructor(
    private readonly textProvider: StoryTextGenerationPort,
    private readonly moderation: ModerationPort,
    private readonly persistence: ApprovedStoryPersistencePort,
    private readonly queue: GenerationQueueProducer
  ) {}

  public async generate(configInput: unknown): Promise<{
    bookId: string;
    pictureJobs: readonly string[];
  }> {
    const config = this.parseConfig(configInput);
    await this.assertUnflagged(this.inputModerationText(config), true);

    const prompt = buildStoryPrompt(config);
    const rawStory = await this.textProvider.generateStory(config, prompt);
    const story = this.parseStory(rawStory, config.pageCount);

    await this.assertUnflagged(this.storyModerationText(story), false);

    let savedPages: Awaited<
      ReturnType<ApprovedStoryPersistencePort["saveApprovedStory"]>
    >;

    try {
      savedPages = await this.persistence.saveApprovedStory({
        userId: config.userId,
        bookId: config.bookId,
        config,
        story
      });
    } catch {
      throw createRetryableGenerationError(
        "GENERATION_PERSISTENCE_FAILED",
        "Approved story could not be persisted."
      );
    }

    const pictureJobs = await Promise.all(
      savedPages.map((page) =>
        this.queue
          .enqueuePicture({
            kind: "picture-generation",
            version: GENERATION_QUEUE_VERSION,
            operationVersion: "v1",
            userId: config.userId,
            bookId: config.bookId,
            pageId: page.pageId,
            pictureId: page.pictureId,
            correlationId: config.correlationId
          })
          .then((job) => job.id)
      )
    ).catch(() => {
      throw createRetryableGenerationError(
        "GENERATION_QUEUE_FAILED",
        "Picture jobs could not be enqueued."
      );
    });

    return { bookId: config.bookId, pictureJobs };
  }

  private parseConfig(configInput: unknown): BookGenerationConfig {
    try {
      return parseBookGenerationConfig(configInput);
    } catch (error) {
      if (error instanceof ZodError) {
        throw createNonRetryableGenerationError(
          "GENERATION_CONFIG_INVALID",
          "Book generation configuration is invalid."
        );
      }

      throw error;
    }
  }

  private parseStory(rawStory: unknown, pageCount: number) {
    try {
      return parseGeneratedStory(rawStory, pageCount);
    } catch {
      throw createNonRetryableGenerationError(
        "GENERATION_SCHEMA_INVALID",
        "Generated story did not match the required schema."
      );
    }
  }

  private async assertUnflagged(input: string, inputStage: boolean): Promise<void> {
    let result;

    try {
      result = await this.moderation.moderateText(input);
    } catch {
      throw createRetryableGenerationError(
        "GENERATION_PROVIDER_UNAVAILABLE",
        "Moderation could not be completed."
      );
    }

    if (result.flagged) {
      throw new GenerationPipelineError(
        inputStage ? "GENERATION_INPUT_FLAGGED" : "GENERATION_OUTPUT_FLAGGED",
        inputStage
          ? "Book generation request failed content safety checks."
          : "Generated book content failed content safety checks.",
        false
      );
    }
  }

  private inputModerationText(config: BookGenerationConfig): string {
    return [
      config.childName,
      config.friendName,
      config.petName,
      config.petType,
      config.siblingName,
      config.storyDescription
    ]
      .filter((value): value is string => typeof value === "string")
      .join("\n");
  }

  private storyModerationText(story: {
    title: string;
    pages: readonly { text: string; illustrationDescription: string }[];
  }): string {
    return [
      story.title,
      ...story.pages.flatMap((page) => [
        page.text,
        page.illustrationDescription
      ])
    ].join("\n");
  }
}
