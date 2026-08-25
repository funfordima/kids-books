/* eslint-disable @typescript-eslint/unbound-method */
import { describe, expect, it, vi } from "vitest";
import { PdfExportController } from "./pdf-export.controller";
import type { PdfExportService } from "./pdf-export.service";

const parent = {
  parentId: "11111111-1111-4111-8111-111111111111",
  email: "parent@example.com",
  role: "guardian" as const
};

describe("PdfExportController", () => {
  it("creates exports through authenticated parent context", async () => {
    const service = {
      createExport: vi.fn().mockResolvedValue({
        exportId: "33333333-3333-4333-8333-333333333333",
        status: "ready",
        contentVersion: "a".repeat(64),
        layoutVersion: "pdf-layout-v1"
      })
    } as unknown as PdfExportService;
    const controller = new PdfExportController(service);

    await controller.createExport({ parent }, "book-1");

    expect(service.createExport).toHaveBeenCalledWith(parent, "book-1");
  });

  it("creates downloads through authenticated parent context", async () => {
    const service = {
      createDownload: vi.fn().mockResolvedValue({
        exportId: "33333333-3333-4333-8333-333333333333",
        url: "https://signed.example/download",
        expiresInSeconds: 300,
        contentDisposition: 'attachment; filename="book.pdf"'
      })
    } as unknown as PdfExportService;
    const controller = new PdfExportController(service);

    await controller.createDownload({ parent }, "book-1", "export-1");

    expect(service.createDownload).toHaveBeenCalledWith(
      parent,
      "book-1",
      "export-1"
    );
  });
});
