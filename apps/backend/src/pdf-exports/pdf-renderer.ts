import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import type { PdfRenderInput, PdfRenderer } from "./pdf-export.interfaces";

@Injectable()
export class HardenedPuppeteerPdfRenderer implements PdfRenderer {
  public async render(input: PdfRenderInput): Promise<Buffer> {
    void input;
    throw new ServiceUnavailableException(
      "PDF renderer is not configured in this runtime."
    );
  }
}
