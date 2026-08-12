import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException
} from "@nestjs/common";
import type Stripe from "stripe";
import type { AuthenticatedParentContext } from "../auth/authenticated-parent";
import type { BillingConfigService } from "./billing.config";
import type {
  BillingCheckoutVerificationResponse,
  BillingCheckoutResponse,
  BillingEntitlementResponse,
  BillingRepository,
  BillingStatus,
  BillingWebhookResponse,
  StripeBillingClient,
  SyncSubscriptionInput
} from "./billing.interfaces";

const allowedStatuses = new Set(["trialing", "active"]);
const handledEventTypes = new Set([
  "checkout.session.completed",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "customer.subscription.paused",
  "customer.subscription.resumed",
  "customer.subscription.trial_will_end",
  "invoice.paid",
  "invoice.payment_failed"
]);

@Injectable()
export class BillingService {
  public constructor(
    private readonly config: BillingConfigService,
    private readonly repository: BillingRepository,
    private readonly stripe: StripeBillingClient
  ) {}

  public async createCheckoutSession(
    parent: AuthenticatedParentContext
  ): Promise<BillingCheckoutResponse> {
    const user = await this.repository.findUser(parent);

    if (!user) {
      throw new UnauthorizedException("Authenticated parent not found.");
    }

    const priceId = this.config.getMonthlyPriceId();
    await this.assertMonthlyPrice(priceId);

    const blockingSubscription =
      await this.repository.findBlockingSubscription(user.id);
    if (blockingSubscription) {
      throw new ForbiddenException("Subscription already active.");
    }

    const customerId =
      user.stripeCustomerId ?? (await this.createAndStoreCustomer(user.id, user.email));
    const includeTrial = !(await this.repository.hasUsedTrial(user.id));
    const session = await this.stripe.createCheckoutSession(
      {
        customerId,
        userId: user.id,
        priceId,
        successUrl: this.config.getSuccessUrl(),
        cancelUrl: this.config.getCancelUrl(),
        includeTrial
      },
      `checkout:${user.id}:${priceId}:${includeTrial ? "trial" : "paid"}`
    );

    if (!session.url) {
      throw new ServiceUnavailableException("Checkout session unavailable.");
    }

    return {
      sessionId: session.id,
      url: session.url
    };
  }

  public async getEntitlement(
    parent: AuthenticatedParentContext,
    now = new Date()
  ): Promise<BillingEntitlementResponse> {
    const subscription = await this.repository.getEntitlement(parent.parentId);
    const status = this.normalizeStoredStatus(subscription?.status ?? "INACTIVE");

    if (!subscription || !allowedStatuses.has(status)) {
      return {
        allowed: false,
        status,
        reason: "subscription_required"
      };
    }

    const validUntil = subscription.trialEndsAt ?? subscription.currentPeriodEnd;
    if (validUntil && validUntil.getTime() < now.getTime()) {
      return {
        allowed: false,
        status,
        reason: "subscription_expired"
      };
    }

    return { allowed: true, status };
  }

  public async verifyCheckoutSession(
    parent: AuthenticatedParentContext,
    sessionId: string
  ): Promise<BillingCheckoutVerificationResponse> {
    if (!sessionId.trim()) {
      throw new BadRequestException("Checkout session is required.");
    }

    const session = await this.stripe.retrieveCheckoutSession(sessionId);
    const ownedByAuthenticatedParent = session.client_reference_id === parent.parentId;
    const entitlement = await this.getEntitlement(parent);

    return {
      sessionId: session.id,
      ownedByAuthenticatedParent,
      paymentStatus: session.payment_status ?? null,
      subscriptionStatus: entitlement.status,
      entitlementAllowed: ownedByAuthenticatedParent && entitlement.allowed
    };
  }

  public async assertCanGenerate(
    parent: AuthenticatedParentContext
  ): Promise<void> {
    const entitlement = await this.getEntitlement(parent);

    if (!entitlement.allowed) {
      throw new ForbiddenException("Active subscription required.");
    }
  }

  public async handleWebhook(
    rawBody: Buffer | undefined,
    signature: string | undefined
  ): Promise<BillingWebhookResponse> {
    if (!rawBody || !signature) {
      throw new BadRequestException("Invalid Stripe webhook.");
    }

    const event = this.constructEvent(rawBody, signature);
    const receiptStatus = await this.repository.createWebhookReceipt({
      stripeEventId: event.id,
      type: event.type,
      providerObjectId: this.getProviderObjectId(event),
      providerCreatedAt: this.fromUnixSeconds(event.created)
    });

    if (receiptStatus === "completed_duplicate") {
      return { received: true, status: "duplicate" };
    }

    if (receiptStatus === "retryable_duplicate") {
      throw new ServiceUnavailableException("Stripe webhook retry required.");
    }

    if (!handledEventTypes.has(event.type)) {
      await this.repository.markWebhookProcessed(event.id, "IGNORED", {
        reason: "unhandled_event_type",
        eventType: event.type
      });
      return { received: true, status: "ignored" };
    }

    try {
      const subscription = await this.resolveEventSubscription(event);

      if (!subscription) {
        await this.repository.markWebhookProcessed(event.id, "IGNORED", {
          reason: "no_subscription_reference",
          eventType: event.type
        });
        return { received: true, status: "ignored" };
      }

      const customerId = this.extractCustomerId(subscription.customer);
      const user = await this.repository.findUserByStripeCustomerId(customerId);

      if (!user) {
        throw new ServiceUnavailableException("Stripe customer mapping missing.");
      }

      const eventCreatedAt = this.fromUnixSeconds(event.created);
      const existingSubscription =
        await this.repository.findSubscriptionByStripeId(subscription.id);
      if (
        existingSubscription?.latestEventCreatedAt &&
        existingSubscription.latestEventCreatedAt.getTime() > eventCreatedAt.getTime()
      ) {
        await this.repository.markWebhookProcessed(
          event.id,
          "IGNORED",
          {
            eventType: event.type,
            subscriptionId: subscription.id,
            reason: "stale_event",
            status: subscription.status
          },
          user.id
        );

        return { received: true, status: "ignored" };
      }

      await this.repository.syncSubscription(
        this.toSyncInput(user.id, customerId, subscription, event.created)
      );
      await this.repository.markWebhookProcessed(
        event.id,
        "PROCESSED",
        {
          eventType: event.type,
          subscriptionId: subscription.id,
          status: subscription.status
        },
        user.id
      );

      return { received: true, status: "processed" };
    } catch (error) {
      await this.repository.markWebhookFailed(event.id, "reconciliation_failed");
      throw error;
    }
  }

  private constructEvent(rawBody: Buffer, signature: string): Stripe.Event {
    try {
      return this.stripe.constructWebhookEvent(
        rawBody,
        signature,
        this.config.getWebhookSecret()
      );
    } catch {
      throw new BadRequestException("Invalid Stripe webhook.");
    }
  }

  private async assertMonthlyPrice(priceId: string): Promise<void> {
    const price = await this.stripe.retrievePrice(priceId);

    if (
      !price.active ||
      price.currency !== "usd" ||
      price.unit_amount !== 999 ||
      price.recurring?.interval !== "month"
    ) {
      throw new ServiceUnavailableException("Billing price is not configured.");
    }
  }

  private async createAndStoreCustomer(
    userId: string,
    email: string
  ): Promise<string> {
    const customer = await this.stripe.createCustomer(
      email,
      userId,
      `customer:${userId}`
    );
    await this.repository.setStripeCustomerId(userId, customer.id);

    return customer.id;
  }

  private async resolveEventSubscription(
    event: Stripe.Event
  ): Promise<Stripe.Subscription | null> {
    const object = event.data.object;

    if (event.type === "checkout.session.completed") {
      const session = object as Stripe.Checkout.Session;
      if (typeof session.subscription !== "string") {
        return null;
      }

      return this.stripe.retrieveSubscription(session.subscription);
    }

    if (event.type.startsWith("customer.subscription.")) {
      return this.stripe.retrieveSubscription((object as Stripe.Subscription).id);
    }

    if (event.type.startsWith("invoice.")) {
      const invoice = object as Stripe.Invoice;
      const subscriptionId = this.extractInvoiceSubscriptionId(invoice);

      if (!subscriptionId) {
        return null;
      }

      return this.stripe.retrieveSubscription(subscriptionId);
    }

    return null;
  }

  private extractInvoiceSubscriptionId(invoice: Stripe.Invoice): string | null {
    const subscription = (invoice as { subscription?: unknown }).subscription;

    if (typeof subscription === "string") {
      return subscription;
    }

    if (
      subscription &&
      typeof subscription === "object" &&
      "id" in subscription &&
      typeof subscription.id === "string"
    ) {
      return subscription.id;
    }

    return null;
  }

  private getProviderObjectId(event: Stripe.Event): string | null {
    const object = event.data.object as { id?: unknown };
    return typeof object.id === "string" ? object.id : null;
  }

  private toSyncInput(
    userId: string,
    customerId: string,
    subscription: Stripe.Subscription,
    eventCreated: number
  ): SyncSubscriptionInput {
    return {
      userId,
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscription.id,
      stripePriceId: this.extractPriceId(subscription),
      providerStatus: subscription.status,
      status: this.toStoredStatus(subscription.status),
      currentPeriodStart: this.fromNullableUnixSeconds(
        this.readUnixField(subscription, "current_period_start")
      ),
      currentPeriodEnd: this.fromNullableUnixSeconds(
        this.readUnixField(subscription, "current_period_end")
      ),
      trialStartedAt: this.fromNullableUnixSeconds(subscription.trial_start),
      trialEndsAt: this.fromNullableUnixSeconds(subscription.trial_end),
      cancelAt: this.fromNullableUnixSeconds(subscription.cancel_at),
      canceledAt: this.fromNullableUnixSeconds(subscription.canceled_at),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      latestEventCreatedAt: this.fromUnixSeconds(eventCreated)
    };
  }

  private extractPriceId(subscription: Stripe.Subscription): string | null {
    return subscription.items.data[0]?.price.id ?? null;
  }

  private extractCustomerId(customer: string | Stripe.Customer | Stripe.DeletedCustomer): string {
    if (typeof customer === "string") {
      return customer;
    }

    return customer.id;
  }

  private toStoredStatus(status: Stripe.Subscription.Status): string {
    switch (status) {
      case "active":
        return "ACTIVE";
      case "trialing":
        return "TRIALING";
      case "incomplete":
        return "INCOMPLETE";
      case "incomplete_expired":
        return "INCOMPLETE_EXPIRED";
      case "past_due":
        return "PAST_DUE";
      case "unpaid":
        return "UNPAID";
      case "paused":
        return "PAUSED";
      case "canceled":
        return "CANCELED";
      default:
        return "INACTIVE";
    }
  }

  private normalizeStoredStatus(status: string): BillingStatus {
    return status.toLowerCase() as BillingStatus;
  }

  private fromUnixSeconds(value: number): Date {
    return new Date(value * 1000);
  }

  private fromNullableUnixSeconds(value: number | null): Date | null {
    return value ? this.fromUnixSeconds(value) : null;
  }

  private readUnixField(subscription: Stripe.Subscription, key: string): number | null {
    const value = (subscription as unknown as Record<string, unknown>)[key];
    return typeof value === "number" ? value : null;
  }
}

export type BillingServiceDependencies = {
  readonly config: BillingConfigService;
  readonly repository: BillingRepository;
  readonly stripe: StripeBillingClient;
};
