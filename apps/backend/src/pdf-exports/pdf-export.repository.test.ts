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
        stalePendingBefore: new Date("2026-08-24T00:15:00.000Z")
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
        stalePendingBefore: new Date("2026-08-24T00:00:00.000Z")
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
        stalePendingBefore: new Date("2026-08-24T00:15:00.000Z")
      })
    ).resolves.toEqual({
      record: stale,
      shouldRender: false
    });

    expect(pdfExport.update).not.toHaveBeenCalled();
  });
});
