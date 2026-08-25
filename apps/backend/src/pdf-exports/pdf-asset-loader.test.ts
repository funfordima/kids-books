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
  maxImageWidth: 128,
  maxImageHeight: 128,
  maxImagePixels: 16_384,
  maxPdfBytes: 4096,
  maxConcurrentRenders: 2,
  pendingExportStaleMs: 15 * 60 * 1000,
  renderTimeoutMs: 1000,
  signedUrlTtlSeconds: 300
};

const makePng = (width: number, height: number): Buffer => {
  const bytes = Buffer.alloc(24);
  bytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0);
  bytes.write("IHDR", 12, "ascii");
  bytes.writeUInt32BE(width, 16);
  bytes.writeUInt32BE(height, 20);
  return bytes;
};

const makeJpeg = (width: number, height: number): Buffer => {
  const bytes = Buffer.alloc(21);
  bytes.set([0xff, 0xd8, 0xff, 0xc0], 0);
  bytes.writeUInt16BE(17, 4);
  bytes[6] = 8;
  bytes.writeUInt16BE(height, 7);
  bytes.writeUInt16BE(width, 9);
  return bytes;
};

const makeWebp = (width: number, height: number): Buffer => {
  const bytes = Buffer.alloc(30);
  bytes.write("RIFF", 0, "ascii");
  bytes.write("WEBP", 8, "ascii");
  bytes.write("VP8X", 12, "ascii");
  const encodedWidth = width - 1;
  const encodedHeight = height - 1;
  bytes[24] = encodedWidth & 0xff;
  bytes[25] = (encodedWidth >> 8) & 0xff;
  bytes[26] = (encodedWidth >> 16) & 0xff;
  bytes[27] = encodedHeight & 0xff;
  bytes[28] = (encodedHeight >> 8) & 0xff;
  bytes[29] = (encodedHeight >> 16) & 0xff;
  return bytes;
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
      makePng(64, 64)
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
        bytes: makePng(64, 64),
        altText: "A child looking at the moon"
      });
    });
  });

  it.each([
    ["jpeg", "1.jpg", makeJpeg(48, 32), "image/jpeg"],
    ["webp", "1.webp", makeWebp(48, 32), "image/webp"]
  ])(
    "loads bounded %s image dimensions from the private object root",
    async (_label, filename, bytes, mimeType) => {
      const root = await mkdtemp(join(tmpdir(), "pdf-assets-"));
      const key = `users/u/books/b/pages/${filename}`;
      const dir = join(
        root,
        "kids-books-private",
        "users",
        "u",
        "books",
        "b",
        "pages"
      );
      await mkdir(dir, { recursive: true });
      await writeFile(join(dir, filename), bytes);

      await withEnv("PDF_EXPORT_LOCAL_STORAGE_DIR", root, async () => {
        const loader = new DeferredPdfAssetLoader(new PdfExportConfigService());

        await expect(
          loader.loadImage(
            {
              bucket: "kids-books-private",
              key,
              altText: "bounded",
              status: "READY"
            },
            limits
          )
        ).resolves.toEqual({
          mimeType,
          bytes,
          altText: "bounded"
        });
      });
    }
  );

  it("falls back for unknown image signatures", async () => {
    const root = await mkdtemp(join(tmpdir(), "pdf-assets-"));
    const key = "users/u/books/b/pages/1.gif";
    const dir = join(root, "kids-books-private", "users", "u", "books", "b", "pages");
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, "1.gif"), Buffer.from("GIF89a", "ascii"));

    await withEnv("PDF_EXPORT_LOCAL_STORAGE_DIR", root, async () => {
      const loader = new DeferredPdfAssetLoader(new PdfExportConfigService());

      await expect(
        loader.loadImage(
          {
            bucket: "kids-books-private",
            key,
            altText: "unknown",
            status: "READY"
          },
          limits
        )
      ).resolves.toBe("fallback");
    });
  });

  it("rejects malformed allowlisted images without dimensions", async () => {
    const root = await mkdtemp(join(tmpdir(), "pdf-assets-"));
    const key = "users/u/books/b/pages/bad.png";
    const dir = join(root, "kids-books-private", "users", "u", "books", "b", "pages");
    await mkdir(dir, { recursive: true });
    await writeFile(
      join(dir, "bad.png"),
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
    );

    await withEnv("PDF_EXPORT_LOCAL_STORAGE_DIR", root, async () => {
      const loader = new DeferredPdfAssetLoader(new PdfExportConfigService());

      await expect(
        loader.loadImage(
          {
            bucket: "kids-books-private",
            key,
            altText: "malformed",
            status: "READY"
          },
          limits
        )
      ).rejects.toThrow(ServiceUnavailableException);
    });
  });

  it("rejects images with unsafe dimensions before rendering", async () => {
    const root = await mkdtemp(join(tmpdir(), "pdf-assets-"));
    const key = "users/u/books/b/pages/huge.png";
    const dir = join(root, "kids-books-private", "users", "u", "books", "b", "pages");
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, "huge.png"), makePng(4096, 4096));

    await withEnv("PDF_EXPORT_LOCAL_STORAGE_DIR", root, async () => {
      const loader = new DeferredPdfAssetLoader(new PdfExportConfigService());

      await expect(
        loader.loadImage(
          {
            bucket: "kids-books-private",
            key,
            altText: "too large",
            status: "READY"
          },
          limits
        )
      ).rejects.toThrow(ServiceUnavailableException);
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
