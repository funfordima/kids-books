import { Injectable } from "@nestjs/common";
import type {
  PdfAssetLoader,
  PdfExportImageReference,
  PdfExportLimits,
  PdfLoadedImage
} from "./pdf-export.interfaces";

@Injectable()
export class DeferredPdfAssetLoader implements PdfAssetLoader {
  public async loadImage(
    image: PdfExportImageReference,
    limits: PdfExportLimits
  ): Promise<PdfLoadedImage | "fallback"> {
    void image;
    void limits;
    return "fallback";
  }
}
