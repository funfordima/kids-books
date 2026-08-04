export type BookLifecycleState = "draft" | "generating" | "ready" | "archived";

export type BookAgeGroup = "3-4" | "5-6" | "7-9";
export type BookLength = 8 | 12 | 16;

export interface CreateBookRequest {
  childName: string;
  ageGroup: BookAgeGroup;
  storyType: string;
  pageCount: BookLength;
}

export interface BookSummary {
  id: string;
  status: "draft" | "pending";
  title: string;
  config: CreateBookRequest;
}

export interface BooksModuleStatus {
  resource: "books";
  persistence: "not-configured";
  lifecycle: readonly BookLifecycleState[];
  ownership: "guardian";
}
