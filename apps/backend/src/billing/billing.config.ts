import { Injectable } from "@nestjs/common";

export interface BillingEnvironment {
  readonly STRIPE_SECRET_KEY?: string;
  readonly STRIPE_WEBHOOK_SECRET?: string;
  readonly STRIPE_MONTHLY_PRICE_ID?: string;
  readonly APP_ORIGIN?: string;
}

@Injectable()
export class BillingConfigService {
  public constructor(private readonly env: BillingEnvironment = process.env) {}

  public getStripeSecretKey(): string {
    return this.requireValue("STRIPE_SECRET_KEY");
  }

  public getWebhookSecret(): string {
    return this.requireValue("STRIPE_WEBHOOK_SECRET");
  }

  public getMonthlyPriceId(): string {
    return this.requireValue("STRIPE_MONTHLY_PRICE_ID");
  }

  public getSuccessUrl(sessionPlaceholder = "{CHECKOUT_SESSION_ID}"): string {
    return this.buildAppUrl(`/billing/success?session_id=${sessionPlaceholder}`);
  }

  public getCancelUrl(): string {
    return this.buildAppUrl("/billing/cancel");
  }

  private buildAppUrl(path: string): string {
    const origin = this.requireValue("APP_ORIGIN").replace(/\/$/u, "");

    if (!origin.startsWith("https://") && !origin.startsWith("http://localhost")) {
      throw new Error("APP_ORIGIN must be https or localhost.");
    }

    return `${origin}${path}`;
  }

  private requireValue(key: keyof BillingEnvironment): string {
    const value = this.env[key]?.trim();

    if (!value) {
      throw new Error(`${key} is required for billing.`);
    }

    return value;
  }
}
