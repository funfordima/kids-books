import { Injectable } from "@nestjs/common";
import type { PdfExportLimits } from "./pdf-export.interfaces";

const readPositiveInt = (
  value: string | undefined,
  fallback: number,
  maximum: number
): number => {
  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isSafeInteger(parsed) || parsed <= 0 || parsed > maximum) {
    return fallback;
  }

  return parsed;
};

@Injectable()
export class PdfExportConfigService {
  public getStorageBucket(): string {
    return process.env.PDF_EXPORT_BUCKET ?? "kids-books-private";
  }

  public getLimits(): PdfExportLimits {
    return {
      maxPages: readPositiveInt(process.env.PDF_EXPORT_MAX_PAGES, 16, 16),
      maxImageBytes: readPositiveInt(
        process.env.PDF_EXPORT_MAX_IMAGE_BYTES,
        10 * 1024 * 1024,
        10 * 1024 * 1024
      ),
      maxTotalImageBytes: readPositiveInt(
        process.env.PDF_EXPORT_MAX_TOTAL_IMAGE_BYTES,
        100 * 1024 * 1024,
        100 * 1024 * 1024
      ),
      maxPdfBytes: readPositiveInt(
        process.env.PDF_EXPORT_MAX_PDF_BYTES,
        50 * 1024 * 1024,
        50 * 1024 * 1024
      ),
      renderTimeoutMs: readPositiveInt(
        process.env.PDF_EXPORT_RENDER_TIMEOUT_MS,
        60_000,
        60_000
      ),
      signedUrlTtlSeconds: readPositiveInt(
        process.env.PDF_EXPORT_SIGNED_URL_TTL_SECONDS,
        300,
        900
      )
    };
  }
}
