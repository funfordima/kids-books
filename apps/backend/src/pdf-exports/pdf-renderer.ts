import {
  Inject,
  Injectable,
  Optional,
  ServiceUnavailableException
} from "@nestjs/common";
import type {
  PdfBrowserFactory,
  PdfBrowserPage,
  PdfBrowserSession,
  PdfRenderInput,
  PdfRenderer
} from "./pdf-export.interfaces";

export const PDF_BROWSER_FACTORY = Symbol("PDF_BROWSER_FACTORY");

@Injectable()
export class HardenedPuppeteerPdfRenderer implements PdfRenderer {
  public constructor(
    @Optional()
    @Inject(PDF_BROWSER_FACTORY)
    private readonly browserFactory?: PdfBrowserFactory | null
  ) {}

  public async render(input: PdfRenderInput): Promise<Buffer> {
    if (!this.browserFactory) {
      throw new ServiceUnavailableException(
        "PDF renderer is not configured in this runtime."
      );
    }

    let session: PdfBrowserSession | undefined;
    let page: PdfBrowserPage | undefined;

    try {
      session = await this.browserFactory.createSession();
      page = await session.newPage();

      await page.setJavaScriptEnabled(false);
      await page.setRequestInterception(true);
      page.on("request", (request) => {
        void request.abort();
      });

      await this.withTimeout(
        page.setContent(input.html, {
          waitUntil: "load",
          timeout: input.limits.renderTimeoutMs
        }),
        input.limits.renderTimeoutMs
      );

      const bytes = await this.withTimeout(
        page.pdf({
          format: "Letter",
          printBackground: true,
          preferCSSPageSize: true,
          timeout: input.limits.renderTimeoutMs
        }),
        input.limits.renderTimeoutMs
      );

      return Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes);
    } catch (error) {
      throw new ServiceUnavailableException("PDF renderer failed.", {
        cause: error
      });
    } finally {
      await this.closeQuietly(page);
      await this.closeQuietly(session);
    }
  }

  private async withTimeout<T>(work: Promise<T>, timeoutMs: number): Promise<T> {
    let timer: NodeJS.Timeout | undefined;
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        reject(new Error("PDF render timed out."));
      }, timeoutMs);
    });

    try {
      return await Promise.race([work, timeout]);
    } finally {
      if (timer) {
        clearTimeout(timer);
      }
    }
  }

  private async closeQuietly(
    resource: { close(): Promise<void> } | undefined
  ): Promise<void> {
    if (!resource) {
      return;
    }

    try {
      await resource.close();
    } catch {
      // Cleanup failures should not replace the sanitized render error.
    }
  }
}
