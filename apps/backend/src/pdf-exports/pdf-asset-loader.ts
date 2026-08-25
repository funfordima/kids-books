import { Inject, Injectable, ServiceUnavailableException } from "@nestjs/common";
import { readFile } from "node:fs/promises";
import { join, normalize, resolve, sep } from "node:path";
import { PdfExportConfigService } from "./pdf-export.config";
import type {
  PdfAssetLoader,
  PdfExportImageReference,
  PdfExportLimits,
  PdfLoadedImage
} from "./pdf-export.interfaces";

@Injectable()
export class DeferredPdfAssetLoader implements PdfAssetLoader {
  public constructor(
    @Inject(PdfExportConfigService)
    private readonly config: PdfExportConfigService
  ) {}

  public async loadImage(
    image: PdfExportImageReference,
    limits: PdfExportLimits
  ): Promise<PdfLoadedImage | "fallback"> {
    const root = this.config.getLocalStorageRoot();
    if (!root) {
      return "fallback";
    }

    const filePath = this.resolvePrivateObjectPath(root, image.bucket, image.key);
    const bytes = await readFile(filePath).catch(() => null);
    if (!bytes) {
      return "fallback";
    }

    if (bytes.length === 0 || bytes.length > limits.maxImageBytes) {
      throw new ServiceUnavailableException("PDF image input exceeded limits.");
    }

    const mimeType = this.detectImageMimeType(bytes);
    if (!mimeType) {
      return "fallback";
    }

    const dimensions = this.readImageDimensions(bytes, mimeType);
    if (
      !dimensions ||
      dimensions.width > limits.maxImageWidth ||
      dimensions.height > limits.maxImageHeight ||
      dimensions.width * dimensions.height > limits.maxImagePixels
    ) {
      throw new ServiceUnavailableException("PDF image dimensions exceeded limits.");
    }

    return {
      mimeType,
      bytes,
      altText: image.altText
    };
  }

  private detectImageMimeType(
    bytes: Buffer
  ): PdfLoadedImage["mimeType"] | null {
    if (
      bytes.length >= 8 &&
      bytes[0] === 0x89 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x4e &&
      bytes[3] === 0x47 &&
      bytes[4] === 0x0d &&
      bytes[5] === 0x0a &&
      bytes[6] === 0x1a &&
      bytes[7] === 0x0a
    ) {
      return "image/png";
    }

    if (
      bytes.length >= 3 &&
      bytes[0] === 0xff &&
      bytes[1] === 0xd8 &&
      bytes[2] === 0xff
    ) {
      return "image/jpeg";
    }

    if (
      bytes.length >= 12 &&
      bytes.subarray(0, 4).toString("ascii") === "RIFF" &&
      bytes.subarray(8, 12).toString("ascii") === "WEBP"
    ) {
      return "image/webp";
    }

    return null;
  }

  private readImageDimensions(
    bytes: Buffer,
    mimeType: PdfLoadedImage["mimeType"]
  ): { readonly width: number; readonly height: number } | null {
    if (mimeType === "image/png") {
      return this.readPngDimensions(bytes);
    }

    if (mimeType === "image/jpeg") {
      return this.readJpegDimensions(bytes);
    }

    return this.readWebpDimensions(bytes);
  }

  private readPngDimensions(
    bytes: Buffer
  ): { readonly width: number; readonly height: number } | null {
    if (
      bytes.length < 24 ||
      bytes.subarray(12, 16).toString("ascii") !== "IHDR"
    ) {
      return null;
    }

    const width = bytes.readUInt32BE(16);
    const height = bytes.readUInt32BE(20);
    return this.validDimensions(width, height) ? { width, height } : null;
  }

  private readJpegDimensions(
    bytes: Buffer
  ): { readonly width: number; readonly height: number } | null {
    let offset = 2;

    while (offset + 9 < bytes.length) {
      if (bytes[offset] !== 0xff) {
        return null;
      }

      const marker = bytes[offset + 1];
      const length = bytes.readUInt16BE(offset + 2);
      if (length < 2 || offset + 2 + length > bytes.length) {
        return null;
      }

      if (this.isJpegStartOfFrame(marker)) {
        const height = bytes.readUInt16BE(offset + 5);
        const width = bytes.readUInt16BE(offset + 7);
        return this.validDimensions(width, height) ? { width, height } : null;
      }

      offset += 2 + length;
    }

    return null;
  }

  private readWebpDimensions(
    bytes: Buffer
  ): { readonly width: number; readonly height: number } | null {
    const chunk = bytes.subarray(12, 16).toString("ascii");

    if (chunk === "VP8X" && bytes.length >= 30) {
      const b24 = bytes[24] ?? 0;
      const b25 = bytes[25] ?? 0;
      const b26 = bytes[26] ?? 0;
      const b27 = bytes[27] ?? 0;
      const b28 = bytes[28] ?? 0;
      const b29 = bytes[29] ?? 0;
      const width =
        1 +
        b24 +
        (b25 << 8) +
        (b26 << 16);
      const height =
        1 +
        b27 +
        (b28 << 8) +
        (b29 << 16);
      return this.validDimensions(width, height) ? { width, height } : null;
    }

    if (chunk === "VP8 " && bytes.length >= 30) {
      const width = bytes.readUInt16LE(26) & 0x3fff;
      const height = bytes.readUInt16LE(28) & 0x3fff;
      return this.validDimensions(width, height) ? { width, height } : null;
    }

    if (chunk === "VP8L" && bytes.length >= 25) {
      const b0 = bytes[21] ?? 0;
      const b1 = bytes[22] ?? 0;
      const b2 = bytes[23] ?? 0;
      const b3 = bytes[24] ?? 0;
      const width = 1 + (((b1 & 0x3f) << 8) | b0);
      const height = 1 + ((b3 << 6) | (b2 << 2) | ((b1 & 0xc0) >> 6));
      return this.validDimensions(width, height) ? { width, height } : null;
    }

    return null;
  }

  private isJpegStartOfFrame(marker: number | undefined): boolean {
    return (
      marker !== undefined &&
      marker >= 0xc0 &&
      marker <= 0xcf &&
      ![0xc4, 0xc8, 0xcc].includes(marker)
    );
  }

  private validDimensions(width: number, height: number): boolean {
    return width > 0 && height > 0;
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
      throw new ServiceUnavailableException("PDF asset path validation failed.");
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
}
