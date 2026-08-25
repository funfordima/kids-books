import { ServiceUnavailableException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import type {
  PdfBrowserFactory,
  PdfBrowserRequest,
  PdfExportBookSnapshot,
  PdfExportLimits
} from "./pdf-export.interfaces";
import { HardenedPuppeteerPdfRenderer } from "./pdf-renderer";

const limits: PdfExportLimits = {
  maxPages: 16,
  maxImageBytes: 10 * 1024 * 1024,
  maxTotalImageBytes: 100 * 1024 * 1024,
  maxImageWidth: 4096,
  maxImageHeight: 4096,
  maxImagePixels: 16_000_000,
  maxPdfBytes: 50 * 1024 * 1024,
  maxConcurrentRenders: 2,
  pendingExportStaleMs: 15 * 60 * 1000,
  renderTimeoutMs: 50,
  signedUrlTtlSeconds: 300
};

const snapshot: PdfExportBookSnapshot = {
  bookId: "22222222-2222-4222-8222-222222222222",
  userId: "11111111-1111-4111-8111-111111111111",
  title: "Mia Saves The Moon",
  config: {},
  updatedAtIso: "2026-08-24T00:00:00.000Z",
  pages: []
};

const makeBrowserFactory = () => {
  let requestHandler: ((request: PdfBrowserRequest) => void) | undefined;
  const page = {
    setJavaScriptEnabled: vi.fn().mockResolvedValue(undefined),
    setRequestInterception: vi.fn().mockResolvedValue(undefined),
    on: vi.fn().mockImplementation(
      (event: "request", handler: (request: PdfBrowserRequest) => void) => {
        expect(event).toBe("request");
        requestHandler = handler;
      }
    ),
    setContent: vi.fn().mockResolvedValue(undefined),
    pdf: vi.fn().mockResolvedValue(new Uint8Array(Buffer.from("%PDF-1.7\nok"))),
    close: vi.fn().mockResolvedValue(undefined)
  };
  const session = {
    newPage: vi.fn().mockResolvedValue(page),
    close: vi.fn().mockResolvedValue(undefined)
  };
  const factory = {
    createSession: vi.fn().mockResolvedValue(session)
  } satisfies PdfBrowserFactory;

  return { factory, session, page, getRequestHandler: () => requestHandler };
};

describe("HardenedPuppeteerPdfRenderer", () => {
  it("fails closed when no browser factory is configured", async () => {
    await expect(
      new HardenedPuppeteerPdfRenderer().render({
        snapshot,
        html: "<html></html>",
        limits
      })
    ).rejects.toThrow(ServiceUnavailableException);
  });

  it("renders in a locked-down browser session", async () => {
    const { factory, session, page, getRequestHandler } = makeBrowserFactory();

    await expect(
      new HardenedPuppeteerPdfRenderer(factory).render({
        snapshot,
        html: "<html><body>ready</body></html>",
        limits
      })
    ).resolves.toEqual(Buffer.from("%PDF-1.7\nok"));

    expect(factory.createSession).toHaveBeenCalledOnce();
    expect(session.newPage).toHaveBeenCalledOnce();
    expect(page.setJavaScriptEnabled).toHaveBeenCalledWith(false);
    expect(page.setRequestInterception).toHaveBeenCalledWith(true);
    expect(page.setContent).toHaveBeenCalledWith(
      "<html><body>ready</body></html>",
      { waitUntil: "load", timeout: 50 }
    );
    expect(page.pdf).toHaveBeenCalledWith({
      format: "Letter",
      printBackground: true,
      preferCSSPageSize: true,
      timeout: 50
    });
    expect(page.close).toHaveBeenCalledOnce();
    expect(session.close).toHaveBeenCalledOnce();

    const request = { abort: vi.fn().mockResolvedValue(undefined) };
    getRequestHandler()?.(request);
    expect(request.abort).toHaveBeenCalledOnce();
  });

  it("closes browser resources when rendering fails", async () => {
    const { factory, session, page } = makeBrowserFactory();
    page.pdf.mockRejectedValueOnce(new Error("browser crash"));

    await expect(
      new HardenedPuppeteerPdfRenderer(factory).render({
        snapshot,
        html: "<html></html>",
        limits
      })
    ).rejects.toThrow(ServiceUnavailableException);

    expect(page.close).toHaveBeenCalledOnce();
    expect(session.close).toHaveBeenCalledOnce();
  });
});
