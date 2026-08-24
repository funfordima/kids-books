import { Controller, Get, Inject, Param, Post, Req, UseGuards } from "@nestjs/common";
import type { AuthenticatedRequest } from "../auth/authenticated-parent";
import { AuthenticatedParentGuard } from "../auth/authenticated-parent.guard";
import type {
  PdfDownloadServiceResponse,
  PdfExportResponse
} from "./pdf-export.interfaces";
import { PdfExportService } from "./pdf-export.service";

@UseGuards(AuthenticatedParentGuard)
@Controller("books/:bookId/pdf-exports")
export class PdfExportController {
  public constructor(
    @Inject(PdfExportService) private readonly pdfExportService: PdfExportService
  ) {}

  @Post()
  public createExport(
    @Req() request: AuthenticatedRequest,
    @Param("bookId") bookId: string
  ): Promise<PdfExportResponse> {
    if (!request.parent) {
      throw new Error("Authenticated parent context missing after guard.");
    }

    return this.pdfExportService.createExport(request.parent, bookId);
  }

  @Get(":exportId/download")
  public createDownload(
    @Req() request: AuthenticatedRequest,
    @Param("bookId") bookId: string,
    @Param("exportId") exportId: string
  ): Promise<PdfDownloadServiceResponse> {
    if (!request.parent) {
      throw new Error("Authenticated parent context missing after guard.");
    }

    return this.pdfExportService.createDownload(
      request.parent,
      bookId,
      exportId
    );
  }
}
