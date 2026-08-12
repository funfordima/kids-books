import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Post,
  Req,
  UseGuards
} from "@nestjs/common";
import type { AuthenticatedRequest } from "../auth/authenticated-parent";
import { AuthenticatedParentGuard } from "../auth/authenticated-parent.guard";
import { BillingService } from "../billing/billing.service";
import { validateNonEmptyIdentifier } from "../common/validation";
import type { BookSummary, BooksModuleStatus } from "./books.interfaces";
import { BooksService } from "./books.service";

@Controller("books")
export class BooksController {
  public constructor(
    @Inject(BooksService) private readonly booksService: BooksService,
    @Inject(BillingService) private readonly billingService: BillingService
  ) {}

  @Get("status")
  public getStatus(): BooksModuleStatus {
    return this.booksService.getStatus();
  }

  @UseGuards(AuthenticatedParentGuard)
  @Get()
  public listBooks(@Req() request: AuthenticatedRequest): readonly BookSummary[] {
    if (!request.parent) {
      throw new Error("Authenticated parent context missing after guard.");
    }

    return this.booksService.listBooks(request.parent);
  }

  @UseGuards(AuthenticatedParentGuard)
  @Get(":bookId")
  public getBook(
    @Req() request: AuthenticatedRequest,
    @Param("bookId") bookId: string
  ): BookSummary {
    if (!request.parent) {
      throw new Error("Authenticated parent context missing after guard.");
    }

    return this.booksService.getBook(
      request.parent,
      validateNonEmptyIdentifier(bookId, "bookId")
    );
  }

  @UseGuards(AuthenticatedParentGuard)
  @Post()
  public async createBook(
    @Req() request: AuthenticatedRequest,
    @Body() body: unknown
  ): Promise<BookSummary> {
    if (!request.parent) {
      throw new Error("Authenticated parent context missing after guard.");
    }

    await this.billingService.assertCanGenerate(request.parent);

    return this.booksService.createBook(request.parent, body);
  }
}
