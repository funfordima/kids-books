import type Stripe from "stripe";
import type { AuthenticatedParentContext } from "../auth/authenticated-parent";

export type BillingStatus =
  | "inactive"
  | "incomplete"
  | "incomplete_expired"
  | "trialing"
  | "active"
  | "past_due"
  | "unpaid"
  | "paused"
  | "canceled";

export interface BillingCheckoutResponse {
  readonly sessionId: string;
  readonly url: string;
}

export interface BillingEntitlementResponse {
  readonly allowed: boolean;
  readonly status: BillingStatus;
  readonly reason?: "subscription_required" | "subscription_expired";
}

export interface BillingCheckoutVerificationResponse {
  readonly sessionId: string;
  readonly ownedByAuthenticatedParent: boolean;
  readonly paymentStatus: string | null;
  readonly subscriptionStatus: BillingStatus;
  readonly entitlementAllowed: boolean;
}

export interface BillingWebhookResponse {
  readonly received: true;
  readonly status: "processed" | "ignored" | "duplicate";
}

export interface BillingUserRecord {
  readonly id: string;
  readonly email: string;
  readonly stripeCustomerId: string | null;
  readonly subscriptionStatus: string;
}

export interface BillingSubscriptionRecord {
  readonly id: string;
  readonly userId: string;
  readonly stripeSubscriptionId: string | null;
  readonly stripeCustomerId: string | null;
  readonly status: string;
  readonly currentPeriodEnd: Date | null;
  readonly trialEndsAt: Date | null;
  readonly latestEventCreatedAt: Date | null;
}

export interface BillingRepository {
  findUser(parent: AuthenticatedParentContext): Promise<BillingUserRecord | null>;
  setStripeCustomerId(userId: string, customerId: string): Promise<void>;
  findBlockingSubscription(userId: string): Promise<BillingSubscriptionRecord | null>;
  hasUsedTrial(userId: string): Promise<boolean>;
  findUserByStripeCustomerId(customerId: string): Promise<BillingUserRecord | null>;
  findSubscriptionByStripeId(
    stripeSubscriptionId: string
  ): Promise<BillingSubscriptionRecord | null>;
  syncSubscription(input: SyncSubscriptionInput): Promise<void>;
  createWebhookReceipt(
    input: CreateWebhookReceiptInput
  ): Promise<"created" | "completed_duplicate" | "retryable_duplicate">;
  markWebhookProcessed(
    stripeEventId: string,
    status: "PROCESSED" | "IGNORED",
    result: Record<string, string | boolean | null>,
    userId?: string
  ): Promise<void>;
  markWebhookFailed(stripeEventId: string, errorCode: string): Promise<void>;
  getEntitlement(userId: string): Promise<BillingSubscriptionRecord | null>;
}

export interface SyncSubscriptionInput {
  readonly userId: string;
  readonly stripeCustomerId: string;
  readonly stripeSubscriptionId: string;
  readonly stripePriceId: string | null;
  readonly providerStatus: string;
  readonly status: string;
  readonly currentPeriodStart: Date | null;
  readonly currentPeriodEnd: Date | null;
  readonly trialStartedAt: Date | null;
  readonly trialEndsAt: Date | null;
  readonly cancelAt: Date | null;
  readonly canceledAt: Date | null;
  readonly cancelAtPeriodEnd: boolean;
  readonly latestEventCreatedAt: Date;
}

export interface CreateWebhookReceiptInput {
  readonly stripeEventId: string;
  readonly type: string;
  readonly providerObjectId: string | null;
  readonly providerCreatedAt: Date;
}

export interface StripeBillingClient {
  retrievePrice(priceId: string): Promise<Stripe.Price>;
  createCustomer(
    email: string,
    userId: string,
    idempotencyKey: string
  ): Promise<Stripe.Customer>;
  createCheckoutSession(
    input: CreateCheckoutSessionInput,
    idempotencyKey: string
  ): Promise<Stripe.Checkout.Session>;
  constructWebhookEvent(rawBody: Buffer, signature: string, secret: string): Stripe.Event;
  retrieveCheckoutSession(sessionId: string): Promise<Stripe.Checkout.Session>;
  retrieveSubscription(subscriptionId: string): Promise<Stripe.Subscription>;
}

export interface CreateCheckoutSessionInput {
  readonly customerId: string;
  readonly userId: string;
  readonly priceId: string;
  readonly successUrl: string;
  readonly cancelUrl: string;
  readonly includeTrial: boolean;
}
