/* eslint-disable @typescript-eslint/unbound-method */
import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
  ServiceUnavailableException,
  UnprocessableEntityException
} from "@nestjs/common";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { BillingService } from "../billing/billing.service";
import type { DeferredPdfAssetLoader } from "./pdf-asset-loader";
import { PdfExportConfigService } from "./pdf-export.config";
import type {
  MarkPdfExportReadyInput,
  PdfExportBookSnapshot,
  PdfExportRecord,
  PdfLoadedImage
} from "./pdf-export.interfaces";
import { PDF_LAYOUT_VERSION } from "./pdf-export.interfaces";
import type { PrismaPdfExportRepository } from "./pdf-export.repository";
import { PdfExportService } from "./pdf-export.service";
import type { HardenedPuppeteerPdfRenderer } from "./pdf-renderer";
import type { DeferredPrivatePdfStorage } from "./pdf-storage";

const parent = {
  parentId: "11111111-1111-4111-8111-111111111111",
  email: "parent@example.com",
  role: "guardian" as const
};
const bookId = "22222222-2222-4222-8222-222222222222";
const exportId = "33333333-3333-4333-8333-333333333333";
const secondBookId = "44444444-4444-4444-8444-444444444444";

const makeSnapshot = (
  overrides: Partial<PdfExportBookSnapshot> = {}
): PdfExportBookSnapshot => ({
  bookId: overrides.bookId ?? bookId,
  userId: parent.parentId,
  title: "Mia <Saves> The Moon",
  config: { ageGroup: "5-6", pageCount: 2 },
  updatedAtIso: "2026-08-24T00:00:00.000Z",
  pages: [
    {
      pageId: "page-1",
      pageNumber: 1,
      textContent: "Mia looked up & smiled.",
      illustrationDescription: "A child looking at the moon",
      image: {
        bucket: "private",
        key: `users/${parent.parentId}/books/${overrides.bookId ?? bookId}/pages/1.png`,
        altText: "A child looking at the moon",
        status: "READY"
      }
    },
    {
      pageId: "page-2",
      pageNumber: 2,
      textContent: "The moon glowed softly.",
      illustrationDescription: "The moon above a friendly hill",
      image: null
    }
  ],
  ...overrides
});

const makeFirstPage = (): PdfExportBookSnapshot["pages"][number] => {
  const firstPage = makeSnapshot().pages[0];
  if (!firstPage) {
    throw new Error("Expected test snapshot to include a first page.");
  }

  return firstPage;
};

const makeRecord = (
  overrides: Partial<PdfExportRecord> = {}
): PdfExportRecord => ({
  id: exportId,
  userId: parent.parentId,
  bookId,
  contentVersion: "a".repeat(64),
  layoutVersion: PDF_LAYOUT_VERSION,
  status: "READY",
  storageBucket: "kids-books-private",
  storageKey: `users/${parent.parentId}/books/${bookId}/pdf/${"a".repeat(
    64
  )}-${PDF_LAYOUT_VERSION}.pdf`,
  sha256: "b".repeat(64),
  byteSize: 32,
  contentType: "application/pdf",
  contentDisposition: 'attachment; filename="mia-saves-the-moon.pdf"',
  ...overrides
});

const makeRepository = () =>
  ({
    findReadyBookSnapshot: vi.fn().mockResolvedValue(makeSnapshot()),
    findReusableExport: vi.fn().mockResolvedValue(null),
    claimExport: vi.fn().mockResolvedValue({
      record: makeRecord({ status: "PENDING" }),
      shouldRender: true
    }),
    markExportReady: vi.fn().mockImplementation((input: MarkPdfExportReadyInput) =>
      Promise.resolve(
        makeRecord({
          storageBucket: input.storageBucket,
          storageKey: input.storageKey,
          sha256: input.sha256,
          byteSize: input.byteSize,
          contentDisposition: input.contentDisposition
        })
      )
    ),
    markExportFailed: vi.fn().mockResolvedValue(undefined),
    findAuthorizedExport: vi.fn().mockResolvedValue(makeRecord())
  }) as unknown as PrismaPdfExportRepository;

const withEnv = async <T>(
  key: string,
  value: string | undefined,
  work: () => Promise<T>
): Promise<T> => {
  const previous = process.env[key];
  if (value === undefined) {
    delete process.env[key];
  } else {
    process.env[key] = value;
  }

  try {
    return await work();
  } finally {
    if (previous === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = previous;
    }
  }
};

describe("PdfExportService", () => {
  let repository: PrismaPdfExportRepository;
  let billingService: BillingService;
  let assetLoader: DeferredPdfAssetLoader;
  let renderer: HardenedPuppeteerPdfRenderer;
  let storage: DeferredPrivatePdfStorage;
  let service: PdfExportService;

  beforeEach(() => {
    repository = makeRepository();
    billingService = {
      assertCanGenerate: vi.fn().mockResolvedValue(undefined)
    } as unknown as BillingService;
    assetLoader = {
      loadImage: vi.fn().mockResolvedValue("fallback")
    } as unknown as DeferredPdfAssetLoader;
    renderer = {
      render: vi.fn().mockResolvedValue(Buffer.from("%PDF-1.7\nok"))
    } as unknown as HardenedPuppeteerPdfRenderer;
    storage = {
      uploadPrivatePdf: vi.fn().mockResolvedValue(undefined),
      createSignedDownload: vi.fn().mockResolvedValue({
        url: "https://signed.example/download",
        expiresInSeconds: 300,
        contentDisposition: 'attachment; filename="mia-saves-the-moon.pdf"'
      }),
      deleteObject: vi.fn().mockResolvedValue(undefined)
    } as unknown as DeferredPrivatePdfStorage;
    service = new PdfExportService(
      new PdfExportConfigService(),
      repository,
      billingService,
      assetLoader,
      renderer,
      storage
    );
  });

  it("fails entitlement before loading book content or storage", async () => {
    vi.mocked(billingService.assertCanGenerate).mockRejectedValueOnce(
      new ForbiddenException("Active subscription required.")
    );

    await expect(service.createExport(parent, bookId)).rejects.toThrow(
      ForbiddenException
    );
    expect(repository.findReadyBookSnapshot).not.toHaveBeenCalled();
    expect(renderer.render).not.toHaveBeenCalled();
    expect(storage.uploadPrivatePdf).not.toHaveBeenCalled();
  });

  it("returns non-enumerating not found and not-ready conflicts without rendering", async () => {
    vi.mocked(repository.findReadyBookSnapshot).mockResolvedValueOnce("not_found");
    await expect(service.createExport(parent, bookId)).rejects.toThrow(
      NotFoundException
    );

    vi.mocked(repository.findReadyBookSnapshot).mockResolvedValueOnce("not_ready");
    await expect(service.createExport(parent, bookId)).rejects.toThrow(
      ConflictException
    );

    expect(renderer.render).not.toHaveBeenCalled();
    expect(storage.uploadPrivatePdf).not.toHaveBeenCalled();
  });

  it("reuses a complete cached export without renderer or storage side effects", async () => {
    vi.mocked(repository.findReusableExport).mockResolvedValueOnce(makeRecord());

    await expect(service.createExport(parent, bookId)).resolves.toEqual(
      expect.objectContaining({
        exportId,
        status: "ready",
        layoutVersion: PDF_LAYOUT_VERSION
      })
    );

    expect(repository.claimExport).not.toHaveBeenCalled();
    expect(renderer.render).not.toHaveBeenCalled();
    expect(storage.uploadPrivatePdf).not.toHaveBeenCalled();
  });

  it("does not duplicate render when another worker already claimed the export", async () => {
    vi.mocked(repository.claimExport).mockResolvedValueOnce({
      record: makeRecord({ status: "PENDING" }),
      shouldRender: false
    });

    await expect(service.createExport(parent, bookId)).rejects.toThrow(
      ConflictException
    );

    expect(renderer.render).not.toHaveBeenCalled();
    expect(storage.uploadPrivatePdf).not.toHaveBeenCalled();
  });

  it("passes a stale pending cutoff when claiming export work", async () => {
    await service.createExport(parent, bookId);

    const claimInput = vi.mocked(repository.claimExport).mock.calls[0]?.[0];
    expect(claimInput?.stalePendingBefore).toBeInstanceOf(Date);
  });

  it("serializes distinct Chromium renders by configured concurrency", async () => {
    await withEnv("PDF_EXPORT_MAX_CONCURRENT_RENDERS", "1", async () => {
      let releaseFirstRender: (() => void) | undefined;
      vi.mocked(repository.findReadyBookSnapshot)
        .mockResolvedValueOnce(makeSnapshot())
        .mockResolvedValueOnce(makeSnapshot({ bookId: secondBookId }));
      vi.mocked(renderer.render)
        .mockImplementationOnce(
          () =>
            new Promise<Buffer>((resolve) => {
              releaseFirstRender = () => resolve(Buffer.from("%PDF-1.7\none"));
            })
        )
        .mockResolvedValueOnce(Buffer.from("%PDF-1.7\ntwo"));

      const first = service.createExport(parent, bookId);
      await vi.waitFor(() => {
        expect(renderer.render).toHaveBeenCalledTimes(1);
      });

      const second = service.createExport(parent, secondBookId);
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(renderer.render).toHaveBeenCalledTimes(1);

      releaseFirstRender?.();
      await first;
      await vi.waitFor(() => {
        expect(renderer.render).toHaveBeenCalledTimes(2);
      });
      await second;
    });
  });

  it("retries a previously failed export claim", async () => {
    vi.mocked(repository.claimExport).mockResolvedValueOnce({
      record: makeRecord({ status: "PENDING", storageBucket: null }),
      shouldRender: true
    });

    await expect(service.createExport(parent, bookId)).resolves.toEqual(
      expect.objectContaining({
        exportId,
        status: "ready"
      })
    );

    expect(renderer.render).toHaveBeenCalledOnce();
    expect(storage.uploadPrivatePdf).toHaveBeenCalledOnce();
  });

  it("renders escaped deterministic HTML with fallback images and private metadata", async () => {
    await service.createExport(parent, bookId);

    expect(assetLoader.loadImage).toHaveBeenCalledOnce();
    const renderCall = vi.mocked(renderer.render).mock.calls[0];
    expect(renderCall).toBeDefined();
    const renderInput = renderCall?.[0];
    expect(renderInput?.html).toContain("&lt;Saves&gt;");
    expect(renderInput?.html).toContain("Illustration pending");

    const uploadCall = vi.mocked(storage.uploadPrivatePdf).mock.calls[0];
    expect(uploadCall).toBeDefined();
    const uploadInput = uploadCall?.[0];
    expect(uploadInput?.bucket).toBe("kids-books-private");
    expect(uploadInput?.key).toMatch(
      /^users\/11111111-1111-4111-8111-111111111111\/books\/22222222-2222-4222-8222-222222222222\/pdf\/[a-f0-9]{64}-pdf-layout-v1\.pdf$/u
    );
    expect(uploadInput?.contentType).toBe("application/pdf");
    expect(uploadInput?.contentDisposition).toBe(
      'attachment; filename="mia-saves-the-moon.pdf"'
    );
  });

  it("rejects inconsistent page ordering and incomplete page text", async () => {
    vi.mocked(repository.findReadyBookSnapshot).mockResolvedValueOnce({
      ...makeSnapshot(),
      pages: [{ ...makeFirstPage(), pageNumber: 2 }]
    });
    await expect(service.createExport(parent, bookId)).rejects.toThrow(
      UnprocessableEntityException
    );

    vi.mocked(repository.findReadyBookSnapshot).mockResolvedValueOnce({
      ...makeSnapshot(),
      pages: [{ ...makeFirstPage(), textContent: " " }]
    });
    await expect(service.createExport(parent, bookId)).rejects.toThrow(
      UnprocessableEntityException
    );
  });

  it("cleans partial objects and marks retryable failure on renderer errors", async () => {
    vi.mocked(renderer.render).mockRejectedValueOnce(
      new ServiceUnavailableException("renderer unavailable")
    );

    await expect(service.createExport(parent, bookId)).rejects.toThrow(
      ServiceUnavailableException
    );

    expect(storage.deleteObject).toHaveBeenCalledWith(
      "kids-books-private",
      expect.stringContaining(`/books/${bookId}/pdf/`)
    );
    expect(repository.markExportFailed).toHaveBeenCalledWith(
      exportId,
      "pdf_export_failed"
    );
  });

  it("reauthorizes downloads and returns short-lived signed URLs only for ready records", async () => {
    await expect(
      service.createDownload(parent, bookId, exportId)
    ).resolves.toEqual({
      exportId,
      url: "https://signed.example/download",
      expiresInSeconds: 300,
      contentDisposition: 'attachment; filename="mia-saves-the-moon.pdf"'
    });

    expect(billingService.assertCanGenerate).toHaveBeenCalledWith(parent);
    expect(storage.createSignedDownload).toHaveBeenCalledWith(
      expect.objectContaining({
        expiresInSeconds: 300,
        contentDisposition: 'attachment; filename="mia-saves-the-moon.pdf"'
      })
    );
  });

  it("denies missing or failed download records without issuing signed URLs", async () => {
    vi.mocked(repository.findAuthorizedExport).mockResolvedValueOnce("not_found");
    await expect(service.createDownload(parent, bookId, exportId)).rejects.toThrow(
      NotFoundException
    );

    vi.mocked(repository.findAuthorizedExport).mockResolvedValueOnce(
      makeRecord({ status: "FAILED" })
    );
    await expect(service.createDownload(parent, bookId, exportId)).rejects.toThrow(
      NotFoundException
    );

    expect(storage.createSignedDownload).not.toHaveBeenCalled();
  });

  it("embeds only bounded loaded images and aborts oversized assets", async () => {
    const image: PdfLoadedImage = {
      mimeType: "image/png",
      bytes: Buffer.alloc(11 * 1024 * 1024),
      altText: "large image"
    };
    vi.mocked(assetLoader.loadImage).mockResolvedValueOnce(image);

    await expect(service.createExport(parent, bookId)).rejects.toThrow(
      ServiceUnavailableException
    );
    expect(renderer.render).not.toHaveBeenCalled();
    expect(repository.markExportFailed).toHaveBeenCalledWith(
      exportId,
      "pdf_export_failed"
    );
  });

  it("rejects image references outside the owner and book storage prefix", async () => {
    vi.mocked(repository.findReadyBookSnapshot).mockResolvedValueOnce({
      ...makeSnapshot(),
      pages: [
        {
          ...makeFirstPage(),
          image: {
            bucket: "private",
            key: "users/other/books/other/pages/1.png",
            altText: "wrong owner",
            status: "READY"
          }
        }
      ]
    });

    await expect(service.createExport(parent, bookId)).rejects.toThrow(
      ServiceUnavailableException
    );

    expect(assetLoader.loadImage).not.toHaveBeenCalled();
    expect(renderer.render).not.toHaveBeenCalled();
    expect(repository.markExportFailed).toHaveBeenCalledWith(
      exportId,
      "pdf_export_failed"
    );
  });
});
