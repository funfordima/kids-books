import { Inject, Injectable } from "@nestjs/common";
import { Prisma } from "../generated/prisma/client";
import type { AuthenticatedParentContext } from "../auth/authenticated-parent";
import { PrismaService } from "../database/prisma.service";
import type {
  ClaimPdfExportInput,
  ClaimPdfExportResult,
  MarkPdfExportReadyInput,
  MarkPdfExportFailedInput,
  PdfExportBookSnapshot,
  PdfExportStatus,
  PdfExportRecord,
  PdfExportRepository
} from "./pdf-export.interfaces";

interface PdfExportPrismaRecord {
  readonly id: string;
  readonly userId: string;
  readonly bookId: string;
  readonly contentVersion: string;
  readonly layoutVersion: string;
  readonly status: PdfExportStatus;
  readonly renderLease: string | null;
  readonly storageBucket: string | null;
  readonly storageKey: string | null;
  readonly sha256: string | null;
  readonly byteSize: number | null;
  readonly contentType: string | null;
  readonly contentDisposition: string | null;
  readonly updatedAt: Date;
}

interface PdfExportDelegate {
  findUnique(input: unknown): Promise<PdfExportPrismaRecord | null>;
  findUniqueOrThrow(input: unknown): Promise<PdfExportPrismaRecord>;
  create(input: unknown): Promise<PdfExportPrismaRecord>;
  update(input: unknown): Promise<PdfExportPrismaRecord>;
  updateMany(input: unknown): Promise<{ readonly count: number }>;
  findFirst(input: unknown): Promise<PdfExportPrismaRecord | null>;
}

interface PdfExportClient {
  readonly pdfExport: PdfExportDelegate;
}

@Injectable()
export class PrismaPdfExportRepository implements PdfExportRepository {
  public constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService
  ) {}

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
    const record = await this.pdfExport.findUnique({
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

  public async claimExport(
    input: ClaimPdfExportInput
  ): Promise<ClaimPdfExportResult> {
    try {
      const record = await this.pdfExport.create({
        data: {
          userId: input.userId,
          bookId: input.bookId,
          contentVersion: input.contentVersion,
          layoutVersion: input.layoutVersion,
          renderLease: input.renderLease,
          status: "PENDING"
        }
      });

      return { record: this.toRecord(record), shouldRender: true };
    } catch (error) {
      if (!this.isUniqueConstraintError(error)) {
        throw error;
      }
    }

    const existing = await this.pdfExport.findUniqueOrThrow({
      where: {
        bookId_contentVersion_layoutVersion: {
          bookId: input.bookId,
          contentVersion: input.contentVersion,
          layoutVersion: input.layoutVersion
        }
      }
    });

    if (existing.status === "FAILED") {
      const result = await this.pdfExport.updateMany({
        where: {
          id: existing.id,
          status: "FAILED"
        },
        data: {
          status: "PENDING",
          renderLease: input.renderLease,
          errorCode: null,
          storageBucket: null,
          storageKey: null,
          sha256: null,
          byteSize: null,
          contentType: null,
          contentDisposition: null,
          completedAt: null
        }
      });

      if (result.count > 0) {
        const retry = await this.pdfExport.findUniqueOrThrow({
          where: { id: existing.id }
        });

        return { record: this.toRecord(retry), shouldRender: true };
      }

      return { record: this.toRecord(existing), shouldRender: false };
    }

    if (
      existing.status === "PENDING" &&
      existing.updatedAt <= input.stalePendingBefore
    ) {
      const result = await this.pdfExport.updateMany({
        where: {
          id: existing.id,
          status: "PENDING",
          updatedAt: { lte: input.stalePendingBefore }
        },
        data: {
          status: "PENDING",
          renderLease: input.renderLease,
          errorCode: null,
          storageBucket: null,
          storageKey: null,
          sha256: null,
          byteSize: null,
          contentType: null,
          contentDisposition: null,
          completedAt: null
        }
      });

      if (result.count > 0) {
        const retry = await this.pdfExport.findUniqueOrThrow({
          where: { id: existing.id }
        });

        return { record: this.toRecord(retry), shouldRender: true };
      }
    }

    return {
      record: this.toRecord(existing),
      shouldRender: false
    };
  }

  private isUniqueConstraintError(
    error: unknown
  ): error is Prisma.PrismaClientKnownRequestError {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    );
  }

  public async markExportReady(
    input: MarkPdfExportReadyInput
  ): Promise<PdfExportRecord | null> {
    const result = await this.pdfExport.updateMany({
      where: {
        id: input.exportId,
        status: "PENDING",
        renderLease: input.renderLease
      },
      data: {
        status: "READY",
        renderLease: null,
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

    if (result.count === 0) {
      return null;
    }

    const record = await this.pdfExport.findUniqueOrThrow({
      where: { id: input.exportId }
    });

    return this.toRecord(record);
  }

  public async markExportFailed(
    input: MarkPdfExportFailedInput
  ): Promise<boolean> {
    const result = await this.pdfExport.updateMany({
      where: {
        id: input.exportId,
        status: "PENDING",
        renderLease: input.renderLease
      },
      data: {
        status: "FAILED",
        renderLease: null,
        errorCode: input.errorCode
      }
    });

    return result.count > 0;
  }

  public async findAuthorizedExport(
    parent: AuthenticatedParentContext,
    bookId: string,
    exportId: string
  ): Promise<PdfExportRecord | "not_found"> {
    const record = await this.pdfExport.findFirst({
      where: {
        id: exportId,
        bookId,
        userId: parent.parentId
      }
    });

    return record ? this.toRecord(record) : "not_found";
  }

  private toRecord(record: PdfExportPrismaRecord): PdfExportRecord {
    return record;
  }

  private get pdfExport(): PdfExportDelegate {
    return (this.prisma as unknown as PdfExportClient).pdfExport;
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
