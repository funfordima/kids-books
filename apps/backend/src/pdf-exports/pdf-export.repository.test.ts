import { Prisma } from "../generated/prisma/client";
import { describe, expect, it, vi } from "vitest";
import type { PrismaService } from "../database/prisma.service";
import { PrismaPdfExportRepository } from "./pdf-export.repository";

const makePrismaRecord = (overrides: Record<string, unknown> = {}) => ({
  id: "33333333-3333-4333-8333-333333333333",
  userId: "11111111-1111-4111-8111-111111111111",
  bookId: "22222222-2222-4222-8222-222222222222",
  contentVersion: "a".repeat(64),
  layoutVersion: "pdf-layout-v1",
  status: "PENDING",
  renderLease: "44444444-4444-4444-8444-444444444444",
  storageBucket: null,
  storageKey: null,
  sha256: null,
  byteSize: null,
  contentType: null,
  contentDisposition: null,
  updatedAt: new Date("2026-08-24T00:00:00.000Z"),
  ...overrides
});

const makeUniqueError = () =>
  new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
    code: "P2002",
    clientVersion: "test"
  });

describe("PrismaPdfExportRepository", () => {
  it("creates new pending export records with a render lease", async () => {
    const record = makePrismaRecord({
      renderLease: "55555555-5555-4555-8555-555555555555"
    });
    const pdfExport = {
      create: vi.fn().mockResolvedValue(record)
    };
    const repository = new PrismaPdfExportRepository({
      pdfExport
    } as unknown as PrismaService);

    await expect(
      repository.claimExport({
        userId: String(record.userId),
        bookId: String(record.bookId),
        contentVersion: String(record.contentVersion),
        layoutVersion: String(record.layoutVersion),
        stalePendingBefore: new Date("2026-08-24T00:15:00.000Z"),
        renderLease: "55555555-5555-4555-8555-555555555555"
      })
    ).resolves.toEqual({
      record,
      shouldRender: true
    });

    const createInput = pdfExport.create.mock.calls[0]?.[0] as
      | { readonly data?: { readonly renderLease?: unknown } }
      | undefined;
    expect(createInput?.data?.renderLease).toBe(
      "55555555-5555-4555-8555-555555555555"
    );
  });

  it("atomically reclaims failed export records for retry", async () => {
    const failed = makePrismaRecord({
      status: "FAILED",
      renderLease: null
    });
    const retry = makePrismaRecord({
      renderLease: "55555555-5555-4555-8555-555555555555"
    });
    const pdfExport = {
      create: vi.fn().mockRejectedValue(makeUniqueError()),
      findUniqueOrThrow: vi
        .fn()
        .mockResolvedValueOnce(failed)
        .mockResolvedValueOnce(retry),
      updateMany: vi.fn().mockResolvedValue({ count: 1 })
    };
    const repository = new PrismaPdfExportRepository({
      pdfExport
    } as unknown as PrismaService);

    await expect(
      repository.claimExport({
        userId: String(failed.userId),
        bookId: String(failed.bookId),
        contentVersion: String(failed.contentVersion),
        layoutVersion: String(failed.layoutVersion),
        stalePendingBefore: new Date("2026-08-24T00:15:00.000Z"),
        renderLease: "55555555-5555-4555-8555-555555555555"
      })
    ).resolves.toEqual({
      record: retry,
      shouldRender: true
    });

    const updateInput = pdfExport.updateMany.mock.calls[0]?.[0] as
      | {
          readonly where?: { readonly id?: unknown; readonly status?: unknown };
          readonly data?: {
            readonly status?: unknown;
            readonly renderLease?: unknown;
          };
        }
      | undefined;
    expect(updateInput?.where?.id).toBe(failed.id);
    expect(updateInput?.where?.status).toBe("FAILED");
    expect(updateInput?.data?.status).toBe("PENDING");
    expect(updateInput?.data?.renderLease).toBe(
      "55555555-5555-4555-8555-555555555555"
    );
  });

  it("does not duplicate failed export retry claims won by another worker", async () => {
    const failed = makePrismaRecord({
      status: "FAILED",
      renderLease: null
    });
    const pdfExport = {
      create: vi.fn().mockRejectedValue(makeUniqueError()),
      findUniqueOrThrow: vi.fn().mockResolvedValue(failed),
      updateMany: vi.fn().mockResolvedValue({ count: 0 })
    };
    const repository = new PrismaPdfExportRepository({
      pdfExport
    } as unknown as PrismaService);

    await expect(
      repository.claimExport({
        userId: String(failed.userId),
        bookId: String(failed.bookId),
        contentVersion: String(failed.contentVersion),
        layoutVersion: String(failed.layoutVersion),
        stalePendingBefore: new Date("2026-08-24T00:15:00.000Z"),
        renderLease: "55555555-5555-4555-8555-555555555555"
      })
    ).resolves.toEqual({
      record: failed,
      shouldRender: false
    });
  });

  it("reclaims stale pending export records for retry", async () => {
    const stale = makePrismaRecord();
    const retry = makePrismaRecord({
      updatedAt: new Date("2026-08-24T00:20:00.000Z")
    });
    const pdfExport = {
      create: vi.fn().mockRejectedValue(makeUniqueError()),
      findUniqueOrThrow: vi
        .fn()
        .mockResolvedValueOnce(stale)
        .mockResolvedValueOnce(retry),
      updateMany: vi.fn().mockResolvedValue({ count: 1 })
    };
    const repository = new PrismaPdfExportRepository({
      pdfExport
    } as unknown as PrismaService);

    await expect(
      repository.claimExport({
        userId: String(stale.userId),
        bookId: String(stale.bookId),
        contentVersion: String(stale.contentVersion),
        layoutVersion: String(stale.layoutVersion),
        stalePendingBefore: new Date("2026-08-24T00:15:00.000Z"),
        renderLease: "55555555-5555-4555-8555-555555555555"
      })
    ).resolves.toEqual({
      record: retry,
      shouldRender: true
    });

    const updateInput = pdfExport.updateMany.mock.calls[0]?.[0] as
      | {
          readonly where?: {
            readonly id?: unknown;
            readonly status?: unknown;
            readonly updatedAt?: { readonly lte?: unknown };
          };
          readonly data?: Record<string, unknown>;
        }
      | undefined;

    expect(updateInput?.where?.id).toBe(stale.id);
    expect(updateInput?.where?.status).toBe("PENDING");
    expect(updateInput?.where?.updatedAt?.lte).toEqual(
      new Date("2026-08-24T00:15:00.000Z")
    );
    expect(updateInput?.data).toMatchObject({
      status: "PENDING",
      renderLease: "55555555-5555-4555-8555-555555555555",
      storageBucket: null,
      storageKey: null,
      completedAt: null
    });
  });

  it("does not reclaim fresh pending export records", async () => {
    const fresh = makePrismaRecord({
      updatedAt: new Date("2026-08-24T00:14:59.000Z")
    });
    const pdfExport = {
      create: vi.fn().mockRejectedValue(makeUniqueError()),
      findUniqueOrThrow: vi.fn().mockResolvedValue(fresh),
      update: vi.fn(),
      updateMany: vi.fn()
    };
    const repository = new PrismaPdfExportRepository({
      pdfExport
    } as unknown as PrismaService);

    await expect(
      repository.claimExport({
        userId: String(fresh.userId),
        bookId: String(fresh.bookId),
        contentVersion: String(fresh.contentVersion),
        layoutVersion: String(fresh.layoutVersion),
        stalePendingBefore: new Date("2026-08-24T00:00:00.000Z"),
        renderLease: "55555555-5555-4555-8555-555555555555"
      })
    ).resolves.toEqual({
      record: fresh,
      shouldRender: false
    });

    expect(pdfExport.update).not.toHaveBeenCalled();
    expect(pdfExport.updateMany).not.toHaveBeenCalled();
  });

  it("does not reset stale pending export records that are claimed by another worker", async () => {
    const stale = makePrismaRecord();
    const pdfExport = {
      create: vi.fn().mockRejectedValue(makeUniqueError()),
      findUniqueOrThrow: vi.fn().mockResolvedValue(stale),
      update: vi.fn(),
      updateMany: vi.fn().mockResolvedValue({ count: 0 })
    };
    const repository = new PrismaPdfExportRepository({
      pdfExport
    } as unknown as PrismaService);

    await expect(
      repository.claimExport({
        userId: String(stale.userId),
        bookId: String(stale.bookId),
        contentVersion: String(stale.contentVersion),
        layoutVersion: String(stale.layoutVersion),
        stalePendingBefore: new Date("2026-08-24T00:15:00.000Z"),
        renderLease: "55555555-5555-4555-8555-555555555555"
      })
    ).resolves.toEqual({
      record: stale,
      shouldRender: false
    });

    expect(pdfExport.update).not.toHaveBeenCalled();
  });

  it("marks exports ready only when the render lease is still current", async () => {
    const ready = makePrismaRecord({
      status: "READY",
      renderLease: null,
      storageBucket: "private",
      storageKey: "users/u/books/b/pdf/file.pdf",
      sha256: "b".repeat(64),
      byteSize: 123,
      contentType: "application/pdf",
      contentDisposition: 'attachment; filename="book.pdf"'
    });
    const pdfExport = {
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      findUniqueOrThrow: vi.fn().mockResolvedValue(ready)
    };
    const repository = new PrismaPdfExportRepository({
      pdfExport
    } as unknown as PrismaService);

    await expect(
      repository.markExportReady({
        exportId: String(ready.id),
        renderLease: "55555555-5555-4555-8555-555555555555",
        storageBucket: "private",
        storageKey: "users/u/books/b/pdf/file.pdf",
        sha256: "b".repeat(64),
        byteSize: 123,
        contentType: "application/pdf",
        contentDisposition: 'attachment; filename="book.pdf"'
      })
    ).resolves.toEqual(ready);

    const updateInput = pdfExport.updateMany.mock.calls[0]?.[0] as
      | {
          readonly where?: {
            readonly id?: unknown;
            readonly status?: unknown;
            readonly renderLease?: unknown;
          };
          readonly data?: {
            readonly status?: unknown;
            readonly renderLease?: unknown;
          };
        }
      | undefined;
    expect(updateInput?.where).toEqual({
      id: ready.id,
      status: "PENDING",
      renderLease: "55555555-5555-4555-8555-555555555555"
    });
    expect(updateInput?.data?.status).toBe("READY");
    expect(updateInput?.data?.renderLease).toBeNull();
  });

  it("returns null when ready transition loses the render lease", async () => {
    const pdfExport = {
      updateMany: vi.fn().mockResolvedValue({ count: 0 }),
      findUniqueOrThrow: vi.fn()
    };
    const repository = new PrismaPdfExportRepository({
      pdfExport
    } as unknown as PrismaService);

    await expect(
      repository.markExportReady({
        exportId: "33333333-3333-4333-8333-333333333333",
        renderLease: "55555555-5555-4555-8555-555555555555",
        storageBucket: "private",
        storageKey: "users/u/books/b/pdf/file.pdf",
        sha256: "b".repeat(64),
        byteSize: 123,
        contentType: "application/pdf",
        contentDisposition: 'attachment; filename="book.pdf"'
      })
    ).resolves.toBeNull();

    expect(pdfExport.findUniqueOrThrow).not.toHaveBeenCalled();
  });

  it("marks exports failed only when the render lease is still current", async () => {
    const pdfExport = {
      updateMany: vi.fn().mockResolvedValue({ count: 1 })
    };
    const repository = new PrismaPdfExportRepository({
      pdfExport
    } as unknown as PrismaService);

    await expect(
      repository.markExportFailed({
        exportId: "33333333-3333-4333-8333-333333333333",
        renderLease: "55555555-5555-4555-8555-555555555555",
        errorCode: "pdf_export_failed"
      })
    ).resolves.toBe(true);

    const updateInput = pdfExport.updateMany.mock.calls[0]?.[0] as
      | {
          readonly where?: {
            readonly id?: unknown;
            readonly status?: unknown;
            readonly renderLease?: unknown;
          };
          readonly data?: {
            readonly status?: unknown;
            readonly renderLease?: unknown;
            readonly errorCode?: unknown;
          };
        }
      | undefined;
    expect(updateInput?.where).toEqual({
      id: "33333333-3333-4333-8333-333333333333",
      status: "PENDING",
      renderLease: "55555555-5555-4555-8555-555555555555"
    });
    expect(updateInput?.data).toMatchObject({
      status: "FAILED",
      renderLease: null,
      errorCode: "pdf_export_failed"
    });
  });
});
