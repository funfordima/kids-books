import { Module } from "@nestjs/common";
import { BillingModule } from "../billing/billing.module";
import { DatabaseModule } from "../database/database.module";
import { DeferredPdfAssetLoader } from "./pdf-asset-loader";
import { PdfExportConfigService } from "./pdf-export.config";
import { PdfExportController } from "./pdf-export.controller";
import { PrismaPdfExportRepository } from "./pdf-export.repository";
import { PdfExportService } from "./pdf-export.service";
import { HardenedPuppeteerPdfRenderer } from "./pdf-renderer";
import { DeferredPrivatePdfStorage } from "./pdf-storage";

@Module({
  imports: [BillingModule, DatabaseModule],
  controllers: [PdfExportController],
  providers: [
    PdfExportConfigService,
    PrismaPdfExportRepository,
    DeferredPdfAssetLoader,
    HardenedPuppeteerPdfRenderer,
    DeferredPrivatePdfStorage,
    PdfExportService
  ],
  exports: [PdfExportService]
})
export class PdfExportModule {}
