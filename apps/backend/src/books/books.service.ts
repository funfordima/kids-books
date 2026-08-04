import { Injectable } from "@nestjs/common";
import type {
  BookSummary,
  BooksModuleStatus,
  CreateBookRequest
} from "./books.interfaces";

@Injectable()
export class BooksService {
  private readonly previewBook: BookSummary = {
    id: "book-local-preview",
    status: "draft",
    title: "Preview Book Foundation",
    config: {
      childName: "Reader",
      ageGroup: "5-6",
      storyType: "educational",
      pageCount: 8
    }
  };

  public getStatus(): BooksModuleStatus {
    return {
      resource: "books",
      persistence: "not-configured",
      lifecycle: ["draft", "generating", "ready", "archived"],
      ownership: "guardian"
    };
  }

  public listBooks(): readonly BookSummary[] {
    return [this.previewBook];
  }

  public getBook(bookId: string): BookSummary | undefined {
    return bookId === this.previewBook.id ? this.previewBook : undefined;
  }

  public createBook(request: CreateBookRequest): BookSummary {
    return {
      id: "book-pending-foundation",
      status: "pending",
      title: `A story for ${request.childName}`,
      config: request
    };
  }
}
