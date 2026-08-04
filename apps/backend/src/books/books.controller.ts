import { Body, Controller, Get, Inject, Param, Post } from "@nestjs/common";
import type {
  BookSummary,
  BooksModuleStatus,
  CreateBookRequest
} from "./books.interfaces";
import { BooksService } from "./books.service";

@Controller("books")
export class BooksController {
  public constructor(
    @Inject(BooksService) private readonly booksService: BooksService
  ) {}

  @Get("status")
  public getStatus(): BooksModuleStatus {
    return this.booksService.getStatus();
  }

  @Get()
  public listBooks(): readonly BookSummary[] {
    return this.booksService.listBooks();
  }

  @Get(":bookId")
  public getBook(@Param("bookId") bookId: string): BookSummary | undefined {
    return this.booksService.getBook(bookId);
  }

  @Post()
  public createBook(@Body() request: CreateBookRequest): BookSummary {
    return this.booksService.createBook(request);
  }
}
