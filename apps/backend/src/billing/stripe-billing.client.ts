import { Injectable } from "@nestjs/common";
import Stripe from "stripe";
import type { BillingConfigService } from "./billing.config";
import type {
  CreateCheckoutSessionInput,
  StripeBillingClient
} from "./billing.interfaces";

@Injectable()
export class StripeSdkBillingClient implements StripeBillingClient {
  private readonly stripe: Stripe;

  public constructor(config: BillingConfigService) {
    this.stripe = new Stripe(config.getStripeSecretKey());
  }

  public retrievePrice(priceId: string): Promise<Stripe.Price> {
    return this.stripe.prices.retrieve(priceId);
  }

  public createCustomer(
    email: string,
    userId: string,
    idempotencyKey: string
  ): Promise<Stripe.Customer> {
    return this.stripe.customers.create(
      {
        email,
        metadata: {
          localUserId: userId
        }
      },
      { idempotencyKey }
    );
  }

  public createCheckoutSession(
    input: CreateCheckoutSessionInput,
    idempotencyKey: string
  ): Promise<Stripe.Checkout.Session> {
    const subscriptionData: Stripe.Checkout.SessionCreateParams.SubscriptionData =
      {
        metadata: {
          localUserId: input.userId
        },
        trial_settings: {
          end_behavior: {
            missing_payment_method: "cancel"
          }
        }
      };

    if (input.includeTrial) {
      subscriptionData.trial_period_days = 7;
    }

    return this.stripe.checkout.sessions.create(
      {
        mode: "subscription",
        customer: input.customerId,
        client_reference_id: input.userId,
        success_url: input.successUrl,
        cancel_url: input.cancelUrl,
        line_items: [
          {
            price: input.priceId,
            quantity: 1
          }
        ],
        subscription_data: subscriptionData
      },
      { idempotencyKey }
    );
  }

  public constructWebhookEvent(
    rawBody: Buffer,
    signature: string,
    secret: string
  ): Stripe.Event {
    return this.stripe.webhooks.constructEvent(rawBody, signature, secret);
  }

  public retrieveCheckoutSession(
    sessionId: string
  ): Promise<Stripe.Checkout.Session> {
    return this.stripe.checkout.sessions.retrieve(sessionId);
  }

  public retrieveSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
    return this.stripe.subscriptions.retrieve(subscriptionId);
  }
}
