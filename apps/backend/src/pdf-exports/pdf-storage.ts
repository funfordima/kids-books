import { Inject, Injectable, ServiceUnavailableException } from "@nestjs/common";
import { createHash, createHmac } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join, normalize, resolve, sep } from "node:path";
import { PdfExportConfigService } from "./pdf-export.config";
import type {
  PdfDownloadInput,
  PdfDownloadResponse,
  PdfStorage,
  PdfUploadInput
} from "./pdf-export.interfaces";

@Injectable()
export class DeferredPrivatePdfStorage implements PdfStorage {
  public constructor(
    @Inject(PdfExportConfigService)
    private readonly config: PdfExportConfigService
  ) {}

  public async uploadPrivatePdf(input: PdfUploadInput): Promise<void> {
    const root = this.requireRoot();
    const filePath = this.resolvePrivateObjectPath(root, input.bucket, input.key);
    const actualSha256 = createHash("sha256").update(input.bytes).digest("hex");
    if (actualSha256 !== input.sha256) {
      throw new ServiceUnavailableException("PDF checksum validation failed.");
    }

    await mkdir(dirname(filePath), { recursive: true });
    await writeFile(filePath, input.bytes, { flag: "wx" }).catch(async (error) => {
      if (this.isAlreadyExistsError(error)) {
        const existing = await readFile(filePath);
        const existingSha256 = createHash("sha256")
          .update(existing)
          .digest("hex");
        if (existingSha256 !== input.sha256) {
          throw new ServiceUnavailableException("PDF object collision detected.");
        }

        return;
      }

      throw error;
    });
  }

  public async createSignedDownload(
    input: PdfDownloadInput
  ): Promise<PdfDownloadResponse> {
    const root = this.requireRoot();
    const filePath = this.resolvePrivateObjectPath(root, input.bucket, input.key);
    const bytes = await readFile(filePath).catch(() => null);
    if (!bytes || bytes.length === 0) {
      throw new ServiceUnavailableException("PDF storage is not configured.");
    }

    const expiresAt = Math.floor(Date.now() / 1000) + input.expiresInSeconds;
    const signature = this.signDownload(input.bucket, input.key, expiresAt);
    const baseUrl = this.config.getDownloadBaseUrl();
    const encodedBucket = encodeURIComponent(input.bucket);
    const encodedKey = encodeURIComponent(input.key);
    const url = baseUrl
      ? `${baseUrl.replace(
          /\/+$/u,
          ""
        )}/pdf-exports/${encodedBucket}/${encodedKey}?expires=${expiresAt}&signature=${signature}`
      : `private-pdf://${encodedBucket}/${encodedKey}?expires=${expiresAt}&signature=${signature}`;

    return {
      url,
      expiresInSeconds: input.expiresInSeconds,
      contentDisposition: input.contentDisposition
    };
  }

  public async deleteObject(bucket: string, key: string): Promise<void> {
    const root = this.config.getLocalStorageRoot();
    if (!root) {
      return;
    }

    const filePath = this.resolvePrivateObjectPath(root, bucket, key);
    await rm(filePath, { force: true });
  }

  private requireRoot(): string {
    const root = this.config.getLocalStorageRoot();
    if (!root) {
      throw new ServiceUnavailableException("PDF storage is not configured.");
    }

    return root;
  }

  private resolvePrivateObjectPath(
    root: string,
    bucket: string,
    key: string
  ): string {
    const safeBucket = this.validateSegment(bucket, "bucket");
    const safeKey = this.validateObjectKey(key);
    const resolvedRoot = resolve(root);
    const candidate = resolve(join(resolvedRoot, safeBucket, safeKey));

    if (
      candidate !== resolvedRoot &&
      !candidate.startsWith(`${resolvedRoot}${sep}`)
    ) {
      throw new ServiceUnavailableException("PDF storage path validation failed.");
    }

    return candidate;
  }

  private validateSegment(value: string, label: string): string {
    if (!/^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/u.test(value)) {
      throw new ServiceUnavailableException(`PDF ${label} validation failed.`);
    }

    return value;
  }

  private validateObjectKey(value: string): string {
    const normalized = normalize(value).replaceAll("\\", "/");
    if (
      normalized.startsWith("/") ||
      normalized.includes("../") ||
      normalized === ".." ||
      !/^[A-Za-z0-9._/-]+$/u.test(normalized)
    ) {
      throw new ServiceUnavailableException("PDF object key validation failed.");
    }

    return normalized;
  }

  private isAlreadyExistsError(error: unknown): boolean {
    return (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "EEXIST"
    );
  }

  private signDownload(bucket: string, key: string, expiresAt: number): string {
    const secret = this.config.getDownloadSigningSecret();
    if (!secret) {
      throw new ServiceUnavailableException(
        "PDF download signing is not configured."
      );
    }

    return createHmac("sha256", secret)
      .update(`${bucket}\n${key}\n${expiresAt}`)
      .digest("hex");
  }
}
