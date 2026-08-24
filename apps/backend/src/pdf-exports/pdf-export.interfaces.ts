import type { AuthenticatedParentContext } from "../auth/authenticated-parent";

export const PDF_LAYOUT_VERSION = "pdf-layout-v1" as const;

export type PdfExportStatus = "PENDING" | "READY" | "FAILED";

export interface PdfExportPageSnapshot {
  readonly pageId: string;
  readonly pageNumber: number;
  readonly textContent: string;
  readonly illustrationDescription: string;
  readonly image: PdfExportImageReference | null;
}

export interface PdfExportImageReference {
  readonly bucket: string;
  readonly key: string;
  readonly altText: string;
  readonly status: "READY" | "MISSING" | "FAILED";
}

export interface PdfExportBookSnapshot {
  readonly bookId: string;
  readonly userId: string;
  readonly title: string;
  readonly config: unknown;
  readonly updatedAtIso: string;
  readonly pages: readonly PdfExportPageSnapshot[];
}

export interface PdfExportRecord {
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
}

export interface PdfExportRepository {
  findReadyBookSnapshot(
    parent: AuthenticatedParentContext,
    bookId: string
  ): Promise<PdfExportBookSnapshot | "not_found" | "not_ready">;
  findReusableExport(
    bookId: string,
    contentVersion: string,
    layoutVersion: string
  ): Promise<PdfExportRecord | null>;
  claimExport(input: ClaimPdfExportInput): Promise<ClaimPdfExportResult>;
  markExportReady(input: MarkPdfExportReadyInput): Promise<PdfExportRecord>;
  markExportFailed(exportId: string, errorCode: string): Promise<void>;
  findAuthorizedExport(
    parent: AuthenticatedParentContext,
    bookId: string,
    exportId: string
  ): Promise<PdfExportRecord | "not_found">;
}

export interface ClaimPdfExportInput {
  readonly userId: string;
  readonly bookId: string;
  readonly contentVersion: string;
  readonly layoutVersion: string;
}

export interface ClaimPdfExportResult {
  readonly record: PdfExportRecord;
  readonly shouldRender: boolean;
}

export interface MarkPdfExportReadyInput {
  readonly exportId: string;
  readonly storageBucket: string;
  readonly storageKey: string;
  readonly sha256: string;
  readonly byteSize: number;
  readonly contentType: "application/pdf";
  readonly contentDisposition: string;
}

export interface PdfAssetLoader {
  loadImage(
    image: PdfExportImageReference,
    limits: PdfExportLimits
  ): Promise<PdfLoadedImage | "fallback">;
}

export interface PdfLoadedImage {
  readonly mimeType: "image/png" | "image/jpeg" | "image/webp";
  readonly bytes: Buffer;
  readonly altText: string;
}

export interface PdfRenderer {
  render(input: PdfRenderInput): Promise<Buffer>;
}

export interface PdfRenderInput {
  readonly snapshot: PdfExportBookSnapshot;
  readonly html: string;
  readonly limits: PdfExportLimits;
}

export interface PdfBrowserFactory {
  createSession(): Promise<PdfBrowserSession>;
}

export interface PdfBrowserSession {
  newPage(): Promise<PdfBrowserPage>;
  close(): Promise<void>;
}

export interface PdfBrowserPage {
  setJavaScriptEnabled(enabled: boolean): Promise<void>;
  setRequestInterception(enabled: boolean): Promise<void>;
  on(event: "request", handler: (request: PdfBrowserRequest) => void): void;
  setContent(html: string, options: PdfBrowserSetContentOptions): Promise<void>;
  pdf(options: PdfBrowserPdfOptions): Promise<Buffer | Uint8Array>;
  close(): Promise<void>;
}

export interface PdfBrowserRequest {
  abort(): Promise<void>;
}

export interface PdfBrowserSetContentOptions {
  readonly waitUntil: "load";
  readonly timeout: number;
}

export interface PdfBrowserPdfOptions {
  readonly format: "Letter";
  readonly printBackground: true;
  readonly preferCSSPageSize: true;
  readonly timeout: number;
}

export interface PdfStorage {
  uploadPrivatePdf(input: PdfUploadInput): Promise<void>;
  createSignedDownload(input: PdfDownloadInput): Promise<PdfDownloadResponse>;
  deleteObject(bucket: string, key: string): Promise<void>;
}

export interface PdfUploadInput {
  readonly bucket: string;
  readonly key: string;
  readonly bytes: Buffer;
  readonly sha256: string;
  readonly contentType: "application/pdf";
  readonly contentDisposition: string;
}

export interface PdfDownloadInput {
  readonly bucket: string;
  readonly key: string;
  readonly contentDisposition: string;
  readonly expiresInSeconds: number;
}

export interface PdfDownloadResponse {
  readonly url: string;
  readonly expiresInSeconds: number;
  readonly contentDisposition: string;
}

export interface PdfExportResponse {
  readonly exportId: string;
  readonly status: "ready";
  readonly contentVersion: string;
  readonly layoutVersion: string;
}

export interface PdfDownloadServiceResponse {
  readonly exportId: string;
  readonly url: string;
  readonly expiresInSeconds: number;
  readonly contentDisposition: string;
}

export interface PdfExportLimits {
  readonly maxPages: number;
  readonly maxImageBytes: number;
  readonly maxTotalImageBytes: number;
  readonly maxPdfBytes: number;
  readonly renderTimeoutMs: number;
  readonly signedUrlTtlSeconds: number;
}
