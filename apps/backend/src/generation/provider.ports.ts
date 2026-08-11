import type { BookGenerationConfig } from "./book-config";
import type { GeneratedStory } from "./story.schema";

export interface ModerationResult {
  flagged: boolean;
}

export interface ModerationPort {
  moderateText(input: string): Promise<ModerationResult>;
}

export interface StoryTextGenerationPort {
  generateStory(config: BookGenerationConfig, prompt: string): Promise<unknown>;
}

export interface ImageGenerationResult {
  bytes: Uint8Array;
  contentType: string;
}

export interface ImageGenerationPort {
  generateImage(prompt: string): Promise<ImageGenerationResult>;
}

export interface ApprovedStoryPersistencePort {
  saveApprovedStory(input: {
    userId: string;
    bookId: string;
    config: BookGenerationConfig;
    story: GeneratedStory;
  }): Promise<readonly SavedStoryPage[]>;
}

export interface SavedStoryPage {
  pageId: string;
  pictureId: string;
  pageNumber: number;
}

export interface ApprovedPageContent {
  userId: string;
  bookId: string;
  pageId: string;
  pictureId: string;
  illustrationDescription: string;
  illustrationStyle: BookGenerationConfig["illustrationStyle"];
}

export interface ApprovedPageContentPort {
  loadApprovedPageForImage(input: {
    bookId: string;
    pageId: string;
    pictureId: string;
  }): Promise<ApprovedPageContent>;
}
