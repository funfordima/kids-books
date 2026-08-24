import { createHash } from "node:crypto";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ServiceUnavailableException } from "@nestjs/common";
import { describe, expect, it } from "vitest";
import { PdfExportConfigService } from "./pdf-export.config";
import { DeferredPrivatePdfStorage } from "./pdf-storage";

const withEnv = async <T>(
  values: Readonly<Record<string, string | undefined>>,
  work: () => Promise<T>
): Promise<T> => {
  const previous = new Map<string, string | undefined>();
  Object.entries(values).forEach(([key, value]) => {
    previous.set(key, process.env[key]);
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  });

  try {
    return await work();
  } finally {
    previous.forEach((value, key) => {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    });
  }
};

describe("DeferredPrivatePdfStorage", () => {
  it("fails closed until an explicit local storage root is configured", async () => {
    await withEnv({ PDF_EXPORT_LOCAL_STORAGE_DIR: undefined }, async () => {
      const storage = new DeferredPrivatePdfStorage(new PdfExportConfigService());

      await expect(
        storage.uploadPrivatePdf({
          bucket: "kids-books-private",
          key: "users/u/books/b/pdf/file.pdf",
          bytes: Buffer.from("%PDF-1.7"),
          sha256: "bad",
          contentType: "application/pdf",
          contentDisposition: 'attachment; filename="book.pdf"'
        })
      ).rejects.toThrow(ServiceUnavailableException);
    });
  });

  it("stores private PDFs by bucket/key and returns a short-lived private URL", async () => {
    const root = await mkdtemp(join(tmpdir(), "pdf-storage-"));
    const bytes = Buffer.from("%PDF-1.7\nok");
    const sha256 = createHash("sha256").update(bytes).digest("hex");

    await withEnv(
      {
        PDF_EXPORT_LOCAL_STORAGE_DIR: root,
        PDF_EXPORT_DOWNLOAD_BASE_URL: "https://download.example/private",
        PDF_EXPORT_DOWNLOAD_SIGNING_SECRET: "local-test-signing-secret"
      },
      async () => {
        const storage = new DeferredPrivatePdfStorage(
          new PdfExportConfigService()
        );
        const bucket = "kids-books-private";
        const key = "users/u/books/b/pdf/file.pdf";

        await storage.uploadPrivatePdf({
          bucket,
          key,
          bytes,
          sha256,
          contentType: "application/pdf",
          contentDisposition: 'attachment; filename="book.pdf"'
        });

        await expect(
          readFile(
            join(root, bucket, "users", "u", "books", "b", "pdf", "file.pdf")
          )
        ).resolves.toEqual(bytes);
        await expect(
          storage.createSignedDownload({
            bucket,
            key,
            contentDisposition: 'attachment; filename="book.pdf"',
            expiresInSeconds: 300
          })
        ).resolves.toEqual(
          expect.objectContaining({
            url: expect.stringMatching(
              /^https:\/\/download\.example\/private\/pdf-exports\/kids-books-private\/users%2Fu%2Fbooks%2Fb%2Fpdf%2Ffile\.pdf\?expires=\d+&signature=[a-f0-9]{64}$/u
            ),
            expiresInSeconds: 300,
            contentDisposition: 'attachment; filename="book.pdf"'
          })
        );

        await storage.deleteObject(bucket, key);
        await expect(
          storage.createSignedDownload({
            bucket,
            key,
            contentDisposition: 'attachment; filename="book.pdf"',
            expiresInSeconds: 300
          })
        ).rejects.toThrow(ServiceUnavailableException);
      }
    );
  });

  it("rejects checksum mismatches and path traversal", async () => {
    const root = await mkdtemp(join(tmpdir(), "pdf-storage-"));

    await withEnv(
      {
        PDF_EXPORT_LOCAL_STORAGE_DIR: root,
        PDF_EXPORT_DOWNLOAD_SIGNING_SECRET: "local-test-signing-secret"
      },
      async () => {
        const storage = new DeferredPrivatePdfStorage(
          new PdfExportConfigService()
        );

        await expect(
          storage.uploadPrivatePdf({
            bucket: "kids-books-private",
            key: "users/u/books/b/pdf/file.pdf",
            bytes: Buffer.from("%PDF-1.7"),
            sha256: "0".repeat(64),
            contentType: "application/pdf",
            contentDisposition: 'attachment; filename="book.pdf"'
          })
        ).rejects.toThrow(ServiceUnavailableException);

        await expect(
          storage.createSignedDownload({
            bucket: "kids-books-private",
            key: "../file.pdf",
            contentDisposition: 'attachment; filename="book.pdf"',
            expiresInSeconds: 300
          })
        ).rejects.toThrow(ServiceUnavailableException);
      }
    );
  });
});
