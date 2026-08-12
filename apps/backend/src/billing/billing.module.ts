import { Module } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module";
import { BillingConfigService } from "./billing.config";
import { BillingController } from "./billing.controller";
import { PrismaBillingRepository } from "./billing.repository";
import { BillingService } from "./billing.service";
import { StripeSdkBillingClient } from "./stripe-billing.client";

@Module({
  imports: [DatabaseModule],
  controllers: [BillingController],
  providers: [
    BillingConfigService,
    PrismaBillingRepository,
    StripeSdkBillingClient,
    BillingService
  ],
  exports: [BillingService]
})
export class BillingModule {}
