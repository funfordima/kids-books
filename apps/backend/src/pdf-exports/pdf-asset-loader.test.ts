import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ServiceUnavailableException } from "@nestjs/common";
import { describe, expect, it } from "vitest";
import type { PdfExportLimits } from "./pdf-export.interfaces";
import { DeferredPdfAssetLoader } from "./pdf-asset-loader";
import { PdfExportConfigService } from "./pdf-export.config";

const limits: PdfExportLimits = {
  maxPages: 16,
  maxImageBytes: 1024,
  maxTotalImageBytes: 2048,
  maxPdfBytes: 4096,
  renderTimeoutMs: 1000,
  signedUrlTtlSeconds: 300
};

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

describe("DeferredPdfAssetLoader", () => {
  it("falls back when local storage is not configured", async () => {
    await withEnv("PDF_EXPORT_LOCAL_STORAGE_DIR", undefined, async () => {
      const loader = new DeferredPdfAssetLoader(new PdfExportConfigService());

      await expect(
        loader.loadImage(
          {
            bucket: "kids-books-private",
            key: "users/u/books/b/pages/1.png",
            altText: "alt",
            status: "READY"
          },
          limits
        )
      ).resolves.toBe("fallback");
    });
  });

  it("loads allowlisted image bytes from the private object root", async () => {
    const root = await mkdtemp(join(tmpdir(), "pdf-assets-"));
    const key = "users/u/books/b/pages/1.png";
    const dir = join(root, "kids-books-private", "users", "u", "books", "b", "pages");
    await mkdir(dir, { recursive: true });
    await writeFile(
      join(dir, "1.png"),
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
    );

    await withEnv("PDF_EXPORT_LOCAL_STORAGE_DIR", root, async () => {
      const loader = new DeferredPdfAssetLoader(new PdfExportConfigService());

      await expect(
        loader.loadImage(
          {
            bucket: "kids-books-private",
            key,
            altText: "A child looking at the moon",
            status: "READY"
          },
          limits
        )
      ).resolves.toEqual({
        mimeType: "image/png",
        bytes: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
        altText: "A child looking at the moon"
      });
    });
  });

  it("rejects traversal attempts and oversized private images", async () => {
    const root = await mkdtemp(join(tmpdir(), "pdf-assets-"));
    const loader = new DeferredPdfAssetLoader(new PdfExportConfigService());

    await withEnv("PDF_EXPORT_LOCAL_STORAGE_DIR", root, async () => {
      await expect(
        loader.loadImage(
          {
            bucket: "kids-books-private",
            key: "../secret.png",
            altText: "bad",
            status: "READY"
          },
          limits
        )
      ).rejects.toThrow(ServiceUnavailableException);
    });
  });
});
