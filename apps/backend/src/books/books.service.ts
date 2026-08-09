import { BadRequestException, Injectable } from "@nestjs/common";
import type { AuthenticatedParentContext } from "../auth/authenticated-parent";
import { createDeferredImplementationError } from "../common/not-implemented";
import type {
  BookAgeGroup,
  BookLength,
  BookSummary,
  BooksModuleStatus,
  CreateBookRequest
} from "./books.interfaces";

@Injectable()
export class BooksService {
  public getStatus(): BooksModuleStatus {
    return {
      resource: "books",
      persistence: "not-configured",
      lifecycle: ["draft", "generating", "ready", "archived"],
      ownership: "guardian"
    };
  }

  public listBooks(_parent: AuthenticatedParentContext): readonly BookSummary[] {
    void _parent;
    return createDeferredImplementationError("Book listing");
  }

  public getBook(
    _parent: AuthenticatedParentContext,
    _bookId: string
  ): BookSummary {
    void _parent;
    void _bookId;
    return createDeferredImplementationError("Book lookup");
  }

  public createBook(
    parent: AuthenticatedParentContext,
    request: unknown
  ): BookSummary {
    this.validateCreateBookRequest(request);
    return createDeferredImplementationError(
      `Book creation for parent ${parent.parentId}`
    );
  }

  public validateCreateBookRequest(request: unknown): CreateBookRequest {
    if (!this.isCreateBookRequest(request)) {
      throw new BadRequestException("Invalid book creation request.");
    }

    return request;
  }

  private isCreateBookRequest(request: unknown): request is CreateBookRequest {
    if (!request || typeof request !== "object") {
      return false;
    }

    const candidate = request as Partial<CreateBookRequest>;
    const validAgeGroups: readonly BookAgeGroup[] = ["3-4", "5-6", "7-9"];
    const validPageCounts: readonly BookLength[] = [8, 12, 16];

    return (
      typeof candidate.childName === "string" &&
      candidate.childName.trim().length > 0 &&
      typeof candidate.storyType === "string" &&
      candidate.storyType.trim().length > 0 &&
      validAgeGroups.includes(candidate.ageGroup as BookAgeGroup) &&
      validPageCounts.includes(candidate.pageCount as BookLength)
    );
  }
}
