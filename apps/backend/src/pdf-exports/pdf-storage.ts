import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import type {
  PdfDownloadInput,
  PdfDownloadResponse,
  PdfStorage,
  PdfUploadInput
} from "./pdf-export.interfaces";

@Injectable()
export class DeferredPrivatePdfStorage implements PdfStorage {
  public async uploadPrivatePdf(input: PdfUploadInput): Promise<void> {
    void input;
    throw new ServiceUnavailableException("PDF storage is not configured.");
  }

  public async createSignedDownload(
    input: PdfDownloadInput
  ): Promise<PdfDownloadResponse> {
    void input;
    throw new ServiceUnavailableException("PDF storage is not configured.");
  }

  public async deleteObject(bucket: string, key: string): Promise<void> {
    void bucket;
    void key;
  }
}
