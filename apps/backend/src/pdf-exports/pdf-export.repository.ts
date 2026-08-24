import { Injectable } from "@nestjs/common";
import type { PdfExportStatus } from "../generated/prisma/enums";
import type { AuthenticatedParentContext } from "../auth/authenticated-parent";
import type { PrismaService } from "../database/prisma.service";
import type {
  ClaimPdfExportInput,
  MarkPdfExportReadyInput,
  PdfExportBookSnapshot,
  PdfExportRecord,
  PdfExportRepository
} from "./pdf-export.interfaces";

@Injectable()
export class PrismaPdfExportRepository implements PdfExportRepository {
  public constructor(private readonly prisma: PrismaService) {}

  public async findReadyBookSnapshot(
    parent: AuthenticatedParentContext,
    bookId: string
  ): Promise<PdfExportBookSnapshot | "not_found" | "not_ready"> {
    const book = await this.prisma.book.findFirst({
      where: {
        id: bookId,
        userId: parent.parentId
      },
      select: {
        id: true,
        userId: true,
        title: true,
        status: true,
        config: true,
        updatedAt: true,
        pages: {
          orderBy: { pageNumber: "asc" },
          select: {
            id: true,
            pageNumber: true,
            textContent: true,
            illustrationDescription: true,
            picture: {
              select: {
                status: true,
                storageBucket: true,
                storageKey: true
              }
            }
          }
        }
      }
    });

    if (!book) {
      return "not_found";
    }

    if (book.status !== "READY") {
      return "not_ready";
    }

    return {
      bookId: book.id,
      userId: book.userId,
      title: book.title ?? "Untitled Book",
      config: book.config,
      updatedAtIso: book.updatedAt.toISOString(),
      pages: book.pages.map((page) => ({
        pageId: page.id,
        pageNumber: page.pageNumber,
        textContent: page.textContent,
        illustrationDescription: page.illustrationDescription,
        image:
          page.picture?.storageBucket && page.picture.storageKey
            ? {
                bucket: page.picture.storageBucket,
                key: page.picture.storageKey,
                altText: page.illustrationDescription,
                status: this.toImageStatus(page.picture.status)
              }
            : null
      }))
    };
  }

  public async findReusableExport(
    bookId: string,
    contentVersion: string,
    layoutVersion: string
  ): Promise<PdfExportRecord | null> {
    const record = await this.prisma.pdfExport.findUnique({
      where: {
        bookId_contentVersion_layoutVersion: {
          bookId,
          contentVersion,
          layoutVersion
        }
      }
    });

    return record ? this.toRecord(record) : null;
  }

  public async claimExport(input: ClaimPdfExportInput): Promise<PdfExportRecord> {
    const record = await this.prisma.pdfExport.upsert({
      where: {
        bookId_contentVersion_layoutVersion: {
          bookId: input.bookId,
          contentVersion: input.contentVersion,
          layoutVersion: input.layoutVersion
        }
      },
      create: {
        userId: input.userId,
        bookId: input.bookId,
        contentVersion: input.contentVersion,
        layoutVersion: input.layoutVersion,
        status: "PENDING"
      },
      update: {}
    });

    return this.toRecord(record);
  }

  public async markExportReady(
    input: MarkPdfExportReadyInput
  ): Promise<PdfExportRecord> {
    const record = await this.prisma.pdfExport.update({
      where: { id: input.exportId },
      data: {
        status: "READY",
        storageBucket: input.storageBucket,
        storageKey: input.storageKey,
        sha256: input.sha256,
        byteSize: input.byteSize,
        contentType: input.contentType,
        contentDisposition: input.contentDisposition,
        errorCode: null,
        completedAt: new Date()
      }
    });

    return this.toRecord(record);
  }

  public async markExportFailed(exportId: string, errorCode: string): Promise<void> {
    await this.prisma.pdfExport.update({
      where: { id: exportId },
      data: {
        status: "FAILED",
        errorCode
      }
    });
  }

  public async findAuthorizedExport(
    parent: AuthenticatedParentContext,
    bookId: string,
    exportId: string
  ): Promise<PdfExportRecord | "not_found"> {
    const record = await this.prisma.pdfExport.findFirst({
      where: {
        id: exportId,
        bookId,
        userId: parent.parentId
      }
    });

    return record ? this.toRecord(record) : "not_found";
  }

  private toRecord(record: {
    readonly id: string;
    readonly userId: string;
    readonly bookId: string;
    readonly contentVersion: string;
    readonly layoutVersion: string;
    readonly status: PdfExportStatus;
    readonly storageBucket: string | null;
    readonly storageKey: string | null;
    readonly sha256: string | null;
    readonly byteSize: number | null;
    readonly contentType: string | null;
    readonly contentDisposition: string | null;
  }): PdfExportRecord {
    return record;
  }

  private toImageStatus(status: string): "READY" | "MISSING" | "FAILED" {
    if (status === "READY") {
      return "READY";
    }

    if (status === "FAILED") {
      return "FAILED";
    }

    return "MISSING";
  }
}
