import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
  UnprocessableEntityException
} from "@nestjs/common";
import { createHash } from "node:crypto";
import type { AuthenticatedParentContext } from "../auth/authenticated-parent";
import { BillingService } from "../billing/billing.service";
import { validateNonEmptyIdentifier } from "../common/validation";
import { DeferredPdfAssetLoader } from "./pdf-asset-loader";
import { PdfExportConfigService } from "./pdf-export.config";
import {
  PDF_LAYOUT_VERSION,
  type PdfDownloadServiceResponse,
  type PdfExportBookSnapshot,
  type PdfExportLimits,
  type PdfExportPageSnapshot,
  type PdfExportRecord,
  type PdfExportResponse,
  type PdfLoadedImage
} from "./pdf-export.interfaces";
import { PrismaPdfExportRepository } from "./pdf-export.repository";
import { buildPdfHtml, sanitizePdfFilename } from "./pdf-layout";
import { HardenedPuppeteerPdfRenderer } from "./pdf-renderer";
import { DeferredPrivatePdfStorage } from "./pdf-storage";

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const hashPattern = /^[a-f0-9]{64}$/u;
const inFlightExports = new Map<string, Promise<PdfExportRecord>>();
const renderWaiters: Array<() => void> = [];
let activeRenders = 0;

@Injectable()
export class PdfExportService {
  public constructor(
    @Inject(PdfExportConfigService)
    private readonly config: PdfExportConfigService,
    @Inject(PrismaPdfExportRepository)
    private readonly repository: PrismaPdfExportRepository,
    @Inject(BillingService)
    private readonly billingService: BillingService,
    @Inject(DeferredPdfAssetLoader)
    private readonly assetLoader: DeferredPdfAssetLoader,
    @Inject(HardenedPuppeteerPdfRenderer)
    private readonly renderer: HardenedPuppeteerPdfRenderer,
    @Inject(DeferredPrivatePdfStorage)
    private readonly storage: DeferredPrivatePdfStorage
  ) {}

  public async createExport(
    parent: AuthenticatedParentContext,
    bookIdInput: string
  ): Promise<PdfExportResponse> {
    const bookId = this.validateUuid(bookIdInput, "bookId");
    await this.billingService.assertCanGenerate(parent);

    const snapshot = await this.repository.findReadyBookSnapshot(parent, bookId);
    if (snapshot === "not_found") {
      throw new NotFoundException("Book not found.");
    }

    if (snapshot === "not_ready") {
      throw new ConflictException("Book is not ready for export.");
    }

    this.validateSnapshot(snapshot);
    const contentVersion = this.computeContentVersion(snapshot);
    const layoutVersion = PDF_LAYOUT_VERSION;
    const reusable = await this.repository.findReusableExport(
      bookId,
      contentVersion,
      layoutVersion
    );

    if (this.isReadyReusable(reusable)) {
      return this.toResponse(reusable);
    }

    const inFlightKey = `${bookId}:${contentVersion}:${layoutVersion}`;
    const pending =
      inFlightExports.get(inFlightKey) ??
      this.renderAndStore(snapshot, contentVersion, layoutVersion);
    inFlightExports.set(inFlightKey, pending);

    try {
      return this.toResponse(await pending);
    } finally {
      inFlightExports.delete(inFlightKey);
    }
  }

  public async createDownload(
    parent: AuthenticatedParentContext,
    bookIdInput: string,
    exportIdInput: string
  ): Promise<PdfDownloadServiceResponse> {
    const bookId = this.validateUuid(bookIdInput, "bookId");
    const exportId = this.validateUuid(exportIdInput, "exportId");
    await this.billingService.assertCanGenerate(parent);

    const record = await this.repository.findAuthorizedExport(
      parent,
      bookId,
      exportId
    );
    if (record === "not_found" || !this.isReadyReusable(record)) {
      throw new NotFoundException("PDF export not found.");
    }

    const download = await this.storage.createSignedDownload({
      bucket: record.storageBucket,
      key: record.storageKey,
      contentDisposition: record.contentDisposition,
      expiresInSeconds: this.config.getLimits().signedUrlTtlSeconds
    });

    return {
      exportId: record.id,
      url: download.url,
      expiresInSeconds: download.expiresInSeconds,
      contentDisposition: download.contentDisposition
    };
  }

  private async renderAndStore(
    snapshot: PdfExportBookSnapshot,
    contentVersion: string,
    layoutVersion: string
  ): Promise<PdfExportRecord> {
    const limits = this.config.getLimits();
    const claim = await this.repository.claimExport({
      userId: snapshot.userId,
      bookId: snapshot.bookId,
      contentVersion,
      layoutVersion,
      stalePendingBefore: new Date(Date.now() - limits.pendingExportStaleMs)
    });
    const claimedRecord = claim.record;

    if (this.isReadyReusable(claimedRecord)) {
      return claimedRecord;
    }

    if (!claim.shouldRender) {
      throw new ConflictException("PDF export is already in progress.");
    }

    const bucket = this.config.getStorageBucket();
    const key = this.buildStorageKey(
      snapshot.userId,
      snapshot.bookId,
      contentVersion
    );
    const contentDisposition = `attachment; filename="${sanitizePdfFilename(
      snapshot.title
    )}"`;

    try {
      const images = await this.loadImages(snapshot, limits);
      const html = buildPdfHtml(snapshot, images);
      const pdf = await this.renderWithConcurrency({ snapshot, html, limits });
      const sha256 = this.hashBuffer(pdf);

      if (pdf.length === 0 || pdf.length > limits.maxPdfBytes) {
        throw new ServiceUnavailableException("PDF output failed size validation.");
      }

      await this.storage.uploadPrivatePdf({
        bucket,
        key,
        bytes: pdf,
        sha256,
        contentType: "application/pdf",
        contentDisposition
      });

      return await this.repository.markExportReady({
        exportId: claimedRecord.id,
        storageBucket: bucket,
        storageKey: key,
        sha256,
        byteSize: pdf.length,
        contentType: "application/pdf",
        contentDisposition
      });
    } catch {
      await this.storage.deleteObject(bucket, key);
      await this.repository.markExportFailed(
        claimedRecord.id,
        "pdf_export_failed"
      );
      throw new ServiceUnavailableException("PDF export failed.");
    }
  }

  private async loadImages(
    snapshot: PdfExportBookSnapshot,
    limits: PdfExportLimits
  ): Promise<ReadonlyMap<string, PdfLoadedImage>> {
    const loaded = new Map<string, PdfLoadedImage>();
    let totalBytes = 0;

    for (const page of snapshot.pages) {
      if (!page.image || page.image.status !== "READY") {
        continue;
      }

      this.validateImageReference(snapshot, page.image.key);
      const image = await this.assetLoader.loadImage(page.image, limits);
      if (image === "fallback") {
        continue;
      }

      totalBytes += image.bytes.length;
      if (
        image.bytes.length > limits.maxImageBytes ||
        totalBytes > limits.maxTotalImageBytes
      ) {
        throw new ServiceUnavailableException("PDF image input exceeded limits.");
      }

      loaded.set(page.pageId, image);
    }

    return loaded;
  }

  private async renderWithConcurrency(input: {
    readonly snapshot: PdfExportBookSnapshot;
    readonly html: string;
    readonly limits: PdfExportLimits;
  }): Promise<Buffer> {
    const release = await this.acquireRenderSlot(input.limits);

    try {
      return await this.renderer.render(input);
    } finally {
      release();
    }
  }

  private async acquireRenderSlot(
    limits: PdfExportLimits
  ): Promise<() => void> {
    const maxConcurrentRenders = Math.max(1, limits.maxConcurrentRenders);

    if (activeRenders < maxConcurrentRenders) {
      activeRenders += 1;
    } else {
      await new Promise<void>((resolve) => {
        renderWaiters.push(resolve);
      });
    }

    let released = false;

    return () => {
      if (released) {
        return;
      }

      released = true;
      const next = renderWaiters.shift();
      if (next) {
        next();
        return;
      }

      activeRenders -= 1;
    };
  }

  private validateImageReference(
    snapshot: PdfExportBookSnapshot,
    key: string
  ): void {
    const expectedPrefix = `users/${snapshot.userId}/books/${snapshot.bookId}/`;
    if (
      !key.startsWith(expectedPrefix) ||
      key.includes("../") ||
      key.includes("\\") ||
      !/^[A-Za-z0-9._/-]+$/u.test(key)
    ) {
      throw new ServiceUnavailableException(
        "PDF image reference validation failed."
      );
    }
  }

  private validateSnapshot(snapshot: PdfExportBookSnapshot): void {
    if (
      snapshot.pages.length === 0 ||
      snapshot.pages.length > this.config.getLimits().maxPages
    ) {
      throw new UnprocessableEntityException("Invalid export page count.");
    }

    snapshot.pages.forEach((page, index) => this.validatePage(page, index + 1));
  }

  private validatePage(page: PdfExportPageSnapshot, expectedPage: number): void {
    if (page.pageNumber !== expectedPage) {
      throw new UnprocessableEntityException("Book pages are not contiguous.");
    }

    if (!page.textContent.trim() || !page.illustrationDescription.trim()) {
      throw new UnprocessableEntityException("Book page content is incomplete.");
    }
  }

  private computeContentVersion(snapshot: PdfExportBookSnapshot): string {
    const canonical = JSON.stringify({
      layoutVersion: PDF_LAYOUT_VERSION,
      bookId: snapshot.bookId,
      title: snapshot.title,
      config: snapshot.config,
      updatedAtIso: snapshot.updatedAtIso,
      pages: snapshot.pages.map((page) => ({
        pageNumber: page.pageNumber,
        textContent: page.textContent,
        illustrationDescription: page.illustrationDescription,
        imageBucket: page.image?.bucket ?? null,
        imageKey: page.image?.key ?? null,
        imageStatus: page.image?.status ?? null
      }))
    });

    return createHash("sha256").update(canonical).digest("hex");
  }

  private buildStorageKey(
    userId: string,
    bookId: string,
    contentVersion: string
  ): string {
    if (
      !uuidPattern.test(userId) ||
      !uuidPattern.test(bookId) ||
      !hashPattern.test(contentVersion)
    ) {
      throw new ServiceUnavailableException("PDF export key validation failed.");
    }

    return `users/${userId}/books/${bookId}/pdf/${contentVersion}-${PDF_LAYOUT_VERSION}.pdf`;
  }

  private hashBuffer(buffer: Buffer): string {
    return createHash("sha256").update(buffer).digest("hex");
  }

  private isReadyReusable(
    record: PdfExportRecord | null
  ): record is PdfExportRecord & {
    readonly storageBucket: string;
    readonly storageKey: string;
    readonly sha256: string;
    readonly byteSize: number;
    readonly contentType: "application/pdf";
    readonly contentDisposition: string;
  } {
    return (
      record?.status === "READY" &&
      Boolean(record.storageBucket) &&
      Boolean(record.storageKey) &&
      Boolean(record.sha256) &&
      typeof record.byteSize === "number" &&
      record.byteSize > 0 &&
      record.contentType === "application/pdf" &&
      Boolean(record.contentDisposition)
    );
  }

  private toResponse(record: PdfExportRecord): PdfExportResponse {
    return {
      exportId: record.id,
      status: "ready",
      contentVersion: record.contentVersion,
      layoutVersion: record.layoutVersion
    };
  }

  private validateUuid(value: string, name: string): string {
    const normalized = validateNonEmptyIdentifier(value, name);
    if (!uuidPattern.test(normalized)) {
      throw new NotFoundException(`${name} not found.`);
    }

    return normalized.toLowerCase();
  }
}
