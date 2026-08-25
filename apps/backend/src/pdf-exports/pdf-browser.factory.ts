import { Injectable } from "@nestjs/common";
import puppeteer from "puppeteer";
import type {
  Browser,
  BrowserContext,
  HTTPRequest,
  LaunchOptions,
  Page
} from "puppeteer";
import type {
  PdfBrowserFactory,
  PdfBrowserPage,
  PdfBrowserPdfOptions,
  PdfBrowserRequest,
  PdfBrowserSession,
  PdfBrowserSetContentOptions
} from "./pdf-export.interfaces";

@Injectable()
export class PuppeteerPdfBrowserFactory implements PdfBrowserFactory {
  public async createSession(): Promise<PdfBrowserSession> {
    const browser = await puppeteer.launch(this.getLaunchOptions());

    try {
      const context = await browser.createBrowserContext();
      return new PuppeteerPdfBrowserSession(browser, context);
    } catch (error) {
      await browser.close();
      throw error;
    }
  }

  private getLaunchOptions(): LaunchOptions {
    const args = ["--disable-dev-shm-usage", "--disable-gpu"];
    const executablePath =
      process.env.PDF_EXPORT_CHROMIUM_EXECUTABLE_PATH?.trim();

    if (process.env.PDF_EXPORT_CHROMIUM_NO_SANDBOX === "true") {
      args.push("--no-sandbox", "--disable-setuid-sandbox");
    }

    return {
      headless: true,
      args,
      ...(executablePath ? { executablePath } : {})
    };
  }
}

class PuppeteerPdfBrowserSession implements PdfBrowserSession {
  public constructor(
    private readonly browser: Browser,
    private readonly context: BrowserContext
  ) {}

  public async newPage(): Promise<PdfBrowserPage> {
    return new PuppeteerPdfBrowserPage(await this.context.newPage());
  }

  public async close(): Promise<void> {
    await this.context.close();
    await this.browser.close();
  }
}

class PuppeteerPdfBrowserPage implements PdfBrowserPage {
  public constructor(private readonly page: Page) {}

  public async setJavaScriptEnabled(enabled: boolean): Promise<void> {
    await this.page.setJavaScriptEnabled(enabled);
  }

  public async setRequestInterception(enabled: boolean): Promise<void> {
    await this.page.setRequestInterception(enabled);
  }

  public on(
    event: "request",
    handler: (request: PdfBrowserRequest) => void
  ): void {
    this.page.on(event, (request: HTTPRequest) => {
      handler({
        abort: async () => {
          await request.abort();
        }
      });
    });
  }

  public async setContent(
    html: string,
    options: PdfBrowserSetContentOptions
  ): Promise<void> {
    await this.page.setContent(html, options);
  }

  public async pdf(options: PdfBrowserPdfOptions): Promise<Uint8Array> {
    return this.page.pdf(options);
  }

  public async close(): Promise<void> {
    await this.page.close();
  }
}
