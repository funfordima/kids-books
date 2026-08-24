import { Injectable, ServiceUnavailableException } from "@nestjs/common";
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
  public constructor(private readonly config: PdfExportConfigService) {}

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
