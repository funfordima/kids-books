import { describe, expect, it } from "vitest";
import type {
  PdfExportBookSnapshot,
  PdfExportLimits
} from "./pdf-export.interfaces";
import { buildPdfHtml } from "./pdf-layout";
import { HardenedPuppeteerPdfRenderer } from "./pdf-renderer";
import { PuppeteerPdfBrowserFactory } from "./pdf-browser.factory";

const describeRealPdf =
  process.env.PDF_EXPORT_ENABLE_PUPPETEER_TESTS === "true"
    ? describe
    : describe.skip;

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
  renderTimeoutMs: 60_000,
  signedUrlTtlSeconds: 300
};

type PdfTextResult = {
  readonly text?: string;
  readonly total?: number;
  readonly numpages?: number;
  readonly pages?: readonly unknown[];
};

type PdfParseInstance = {
  getText(): Promise<PdfTextResult>;
  destroy(): Promise<void>;
};

type PdfParseModule = {
  readonly PDFParse: new (input: { readonly data: Buffer }) => PdfParseInstance;
};

const makeSnapshot = (pageCount: number): PdfExportBookSnapshot => ({
  bookId: "22222222-2222-4222-8222-222222222222",
  userId: "11111111-1111-4111-8111-111111111111",
  title: `Puppeteer Inspection ${pageCount}`,
  config: { pageCount },
  updatedAtIso: "2026-08-24T00:00:00.000Z",
  pages: Array.from({ length: pageCount }, (_, index) => {
    const pageNumber = index + 1;
    return {
      pageId: `page-${pageNumber}`,
      pageNumber,
      textContent: `Printable story text for inspected page ${pageNumber}.`,
      illustrationDescription: `Friendly full-page illustration ${pageNumber}.`,
      image: null
    };
  })
});

const inspectPdf = async (
  pdf: Buffer
): Promise<{ readonly pageCount: number; readonly text: string }> => {
  const module = (await import("pdf-parse")) as unknown as PdfParseModule;
  const parser = new module.PDFParse({ data: pdf });

  try {
    const result = await parser.getText();
    const pageCount =
      result.total ?? result.numpages ?? result.pages?.length ?? 0;

    return { pageCount, text: result.text ?? "" };
  } finally {
    await parser.destroy();
  }
};

describeRealPdf("Puppeteer PDF export integration", () => {
  it.each([8, 12, 16])(
    "renders and inspects a %i-page book PDF",
    async (pageCount) => {
      const snapshot = makeSnapshot(pageCount);
      const html = buildPdfHtml(snapshot, new Map());
      const renderer = new HardenedPuppeteerPdfRenderer(
        new PuppeteerPdfBrowserFactory()
      );

      const pdf = await renderer.render({ snapshot, html, limits });
      const inspection = await inspectPdf(pdf);

      expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
      expect(pdf.length).toBeGreaterThan(10_000);
      expect(pdf.length).toBeLessThan(limits.maxPdfBytes);
      expect(inspection.pageCount).toBe(pageCount + 1);
      expect(inspection.text).toContain(snapshot.title);
      expect(inspection.text).toContain(
        `Printable story text for inspected page ${pageCount}.`
      );
    },
    120_000
  );
});
