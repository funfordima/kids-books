import {
  Controller,
  Get,
  Headers,
  HttpCode,
  Inject,
  Param,
  Post,
  Req,
  UseGuards
} from "@nestjs/common";
import type { AuthenticatedRequest } from "../auth/authenticated-parent";
import { AuthenticatedParentGuard } from "../auth/authenticated-parent.guard";
import type {
  BillingCheckoutVerificationResponse,
  BillingCheckoutResponse,
  BillingEntitlementResponse,
  BillingWebhookResponse
} from "./billing.interfaces";
import { BillingService } from "./billing.service";

interface RawBodyRequest {
  readonly rawBody?: Buffer;
}

@Controller("billing")
export class BillingController {
  public constructor(
    @Inject(BillingService) private readonly billingService: BillingService
  ) {}

  @UseGuards(AuthenticatedParentGuard)
  @Post("checkout")
  public createCheckoutSession(
    @Req() request: AuthenticatedRequest
  ): Promise<BillingCheckoutResponse> {
    if (!request.parent) {
      throw new Error("Authenticated parent context missing after guard.");
    }

    return this.billingService.createCheckoutSession(request.parent);
  }

  @UseGuards(AuthenticatedParentGuard)
  @Get("checkout/:sessionId")
  public verifyCheckoutSession(
    @Req() request: AuthenticatedRequest,
    @Param("sessionId") sessionId: string
  ): Promise<BillingCheckoutVerificationResponse> {
    if (!request.parent) {
      throw new Error("Authenticated parent context missing after guard.");
    }

    return this.billingService.verifyCheckoutSession(request.parent, sessionId);
  }

  @UseGuards(AuthenticatedParentGuard)
  @Get("entitlement")
  public getEntitlement(
    @Req() request: AuthenticatedRequest
  ): Promise<BillingEntitlementResponse> {
    if (!request.parent) {
      throw new Error("Authenticated parent context missing after guard.");
    }

    return this.billingService.getEntitlement(request.parent);
  }

  @Post("webhook")
  @HttpCode(200)
  public handleWebhook(
    @Req() request: RawBodyRequest,
    @Headers("stripe-signature") signature?: string
  ): Promise<BillingWebhookResponse> {
    return this.billingService.handleWebhook(request.rawBody, signature);
  }
}
