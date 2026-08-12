/* eslint-disable @typescript-eslint/no-unnecessary-type-assertion, @typescript-eslint/unbound-method */
import {
  BadRequestException,
  ForbiddenException,
  ServiceUnavailableException
} from "@nestjs/common";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type Stripe from "stripe";
import { BillingConfigService } from "./billing.config";
import type {
  BillingRepository,
  BillingUserRecord,
  StripeBillingClient
} from "./billing.interfaces";
import { BillingService } from "./billing.service";

const parent = {
  parentId: "11111111-1111-1111-1111-111111111111",
  email: "parent@example.com",
  role: "guardian" as const
};

const user: BillingUserRecord = {
  id: parent.parentId,
  email: parent.email,
  stripeCustomerId: "cus_existing",
  subscriptionStatus: "INACTIVE"
};

const price = {
  id: "price_monthly",
  active: true,
  currency: "usd",
  unit_amount: 999,
  recurring: { interval: "month" }
} as Stripe.Price;

const subscription = {
  id: "sub_123",
  customer: "cus_existing",
  status: "trialing",
  current_period_start: 1_800_000_000,
  current_period_end: 1_802_592_000,
  trial_start: 1_800_000_000,
  trial_end: 1_800_604_800,
  cancel_at: null,
  canceled_at: null,
  cancel_at_period_end: false,
  items: {
    data: [{ price: { id: "price_monthly" } }]
  }
} as unknown as Stripe.Subscription;

const makeRepository = (): BillingRepository => ({
  findUser: vi.fn().mockResolvedValue(user),
  setStripeCustomerId: vi.fn().mockResolvedValue(undefined),
  findBlockingSubscription: vi.fn().mockResolvedValue(null),
  hasUsedTrial: vi.fn().mockResolvedValue(false),
  findUserByStripeCustomerId: vi.fn().mockResolvedValue(user),
  findSubscriptionByStripeId: vi.fn().mockResolvedValue(null),
  syncSubscription: vi.fn().mockResolvedValue(undefined),
  createWebhookReceipt: vi.fn().mockResolvedValue("created"),
  markWebhookProcessed: vi.fn().mockResolvedValue(undefined),
  markWebhookFailed: vi.fn().mockResolvedValue(undefined),
  getEntitlement: vi.fn().mockResolvedValue(null)
});

const makeStripe = (): StripeBillingClient => ({
  retrievePrice: vi.fn().mockResolvedValue(price),
  createCustomer: vi.fn().mockResolvedValue({ id: "cus_new" } as Stripe.Customer),
  createCheckoutSession: vi.fn().mockResolvedValue({
    id: "cs_123",
    url: "https://checkout.stripe.test/session"
  } as Stripe.Checkout.Session),
  constructWebhookEvent: vi.fn(),
  retrieveCheckoutSession: vi.fn().mockResolvedValue({
    id: "cs_123",
    client_reference_id: parent.parentId,
    payment_status: "paid"
  } as Stripe.Checkout.Session),
  retrieveSubscription: vi.fn().mockResolvedValue(subscription)
});

describe("BillingService", () => {
  let repository: BillingRepository;
  let stripe: StripeBillingClient;
  let service: BillingService;

  beforeEach(() => {
    repository = makeRepository();
    stripe = makeStripe();
    service = new BillingService(
      new BillingConfigService({
        STRIPE_SECRET_KEY: "sk_test_123",
        STRIPE_WEBHOOK_SECRET: "whsec_123",
        STRIPE_MONTHLY_PRICE_ID: "price_monthly",
        APP_ORIGIN: "https://kids.example"
      }),
      repository,
      stripe
    );
  });

  it("creates server-owned subscription checkout with verified monthly price and trial", async () => {
    const result = await service.createCheckoutSession(parent);

    expect(result).toEqual({
      sessionId: "cs_123",
      url: "https://checkout.stripe.test/session"
    });
    expect(stripe.retrievePrice).toHaveBeenCalledWith("price_monthly");
    expect(stripe.createCustomer).not.toHaveBeenCalled();
    expect(stripe.createCheckoutSession).toHaveBeenCalledWith(
      expect.objectContaining({
        customerId: "cus_existing",
        includeTrial: true,
        priceId: "price_monthly",
        successUrl:
          "https://kids.example/billing/success?session_id={CHECKOUT_SESSION_ID}",
        cancelUrl: "https://kids.example/billing/cancel"
      }),
      "checkout:11111111-1111-1111-1111-111111111111:price_monthly:trial"
    );
  });

  it("rejects invalid price configuration and active duplicate subscriptions", async () => {
    vi.mocked(stripe.retrievePrice).mockResolvedValueOnce({
      ...price,
      unit_amount: 1099
    } as Stripe.Price);

    await expect(service.createCheckoutSession(parent)).rejects.toThrow(
      ServiceUnavailableException
    );

    vi.mocked(stripe.retrievePrice).mockResolvedValueOnce(price);
    vi.mocked(repository.findBlockingSubscription).mockResolvedValueOnce({
      id: "sub-local",
      userId: parent.parentId,
      stripeSubscriptionId: "sub_123",
      stripeCustomerId: "cus_existing",
      status: "ACTIVE",
      currentPeriodEnd: null,
      trialEndsAt: null,
      latestEventCreatedAt: null
    });

    await expect(service.createCheckoutSession(parent)).rejects.toThrow(
      ForbiddenException
    );
  });

  it("creates and stores one customer when no mapping exists and suppresses repeat trial after history", async () => {
    vi.mocked(repository.findUser).mockResolvedValueOnce({
      ...user,
      stripeCustomerId: null
    });
    vi.mocked(repository.hasUsedTrial).mockResolvedValueOnce(true);

    await service.createCheckoutSession(parent);

    expect(stripe.createCustomer).toHaveBeenCalledWith(
      user.email,
      user.id,
      `customer:${user.id}`
    );
    expect(repository.setStripeCustomerId).toHaveBeenCalledWith(
      user.id,
      "cus_new"
    );
    expect(stripe.createCheckoutSession).toHaveBeenCalledWith(
      expect.objectContaining({
        customerId: "cus_new",
        includeTrial: false
      }),
      `checkout:${user.id}:price_monthly:paid`
    );
  });

  it("verifies checkout ownership while deriving access from backend entitlement", async () => {
    vi.mocked(repository.getEntitlement).mockResolvedValueOnce({
      id: "local-sub",
      userId: parent.parentId,
      stripeSubscriptionId: "sub_123",
      stripeCustomerId: "cus_existing",
      status: "ACTIVE",
      currentPeriodEnd: new Date("2030-01-01T00:00:00.000Z"),
      trialEndsAt: null,
      latestEventCreatedAt: new Date()
    });

    await expect(service.verifyCheckoutSession(parent, "cs_123")).resolves.toEqual(
      {
        sessionId: "cs_123",
        ownedByAuthenticatedParent: true,
        paymentStatus: "paid",
        subscriptionStatus: "active",
        entitlementAllowed: true
      }
    );
  });

  it("fails closed for missing, expired, or non-active entitlement states", async () => {
    await expect(service.getEntitlement(parent)).resolves.toEqual({
      allowed: false,
      status: "inactive",
      reason: "subscription_required"
    });

    vi.mocked(repository.getEntitlement).mockResolvedValueOnce({
      id: "local-sub",
      userId: parent.parentId,
      stripeSubscriptionId: "sub_123",
      stripeCustomerId: "cus_existing",
      status: "TRIALING",
      currentPeriodEnd: null,
      trialEndsAt: new Date("2026-01-01T00:00:00.000Z"),
      latestEventCreatedAt: null
    });

    await expect(
      service.getEntitlement(parent, new Date("2026-08-12T00:00:00.000Z"))
    ).resolves.toEqual({
      allowed: false,
      status: "trialing",
      reason: "subscription_expired"
    });
  });

  it("verifies raw webhook signatures, records receipts, and reconciles provider subscription", async () => {
    vi.mocked(stripe.constructWebhookEvent).mockReturnValue({
      id: "evt_123",
      type: "customer.subscription.updated",
      created: 1_800_000_001,
      data: { object: { id: "sub_123" } }
    } as Stripe.Event);

    await expect(
      service.handleWebhook(Buffer.from("{}"), "sig")
    ).resolves.toEqual({
      received: true,
      status: "processed"
    });

    expect(stripe.constructWebhookEvent).toHaveBeenCalledWith(
      Buffer.from("{}"),
      "sig",
      "whsec_123"
    );
    expect(repository.createWebhookReceipt).toHaveBeenCalledWith(
      expect.objectContaining({
        stripeEventId: "evt_123",
        type: "customer.subscription.updated",
        providerObjectId: "sub_123"
      })
    );
    expect(repository.syncSubscription).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: parent.parentId,
        stripeSubscriptionId: "sub_123",
        status: "TRIALING"
      })
    );
  });

  it("records but ignores stale subscription events when a newer local event already exists", async () => {
    vi.mocked(stripe.constructWebhookEvent).mockReturnValue({
      id: "evt_stale",
      type: "customer.subscription.updated",
      created: 1_800_000_001,
      data: { object: { id: "sub_123" } }
    } as Stripe.Event);
    vi.mocked(repository.findSubscriptionByStripeId).mockResolvedValueOnce({
      id: "local-sub",
      userId: parent.parentId,
      stripeSubscriptionId: "sub_123",
      stripeCustomerId: "cus_existing",
      status: "ACTIVE",
      currentPeriodEnd: new Date("2030-01-01T00:00:00.000Z"),
      trialEndsAt: null,
      latestEventCreatedAt: new Date("2027-01-16T00:00:00.000Z")
    });

    await expect(
      service.handleWebhook(Buffer.from("{}"), "sig")
    ).resolves.toEqual({
      received: true,
      status: "ignored"
    });

    expect(repository.syncSubscription).not.toHaveBeenCalled();
    expect(repository.markWebhookProcessed).toHaveBeenCalledWith(
      "evt_stale",
      "IGNORED",
      expect.objectContaining({
        reason: "stale_event",
        subscriptionId: "sub_123"
      }),
      parent.parentId
    );
  });

  it("acknowledges completed duplicates and unknown verified events without duplicate side effects", async () => {
    vi.mocked(stripe.constructWebhookEvent).mockReturnValue({
      id: "evt_duplicate",
      type: "customer.subscription.updated",
      created: 1_800_000_001,
      data: { object: { id: "sub_123" } }
    } as Stripe.Event);
    vi.mocked(repository.createWebhookReceipt).mockResolvedValueOnce(
      "completed_duplicate"
    );

    await expect(
      service.handleWebhook(Buffer.from("{}"), "sig")
    ).resolves.toEqual({
      received: true,
      status: "duplicate"
    });
    expect(repository.syncSubscription).not.toHaveBeenCalled();

    vi.mocked(stripe.constructWebhookEvent).mockReturnValueOnce({
      id: "evt_unknown",
      type: "customer.created",
      created: 1_800_000_001,
      data: { object: { id: "cus_existing" } }
    } as Stripe.Event);
    vi.mocked(repository.createWebhookReceipt).mockResolvedValueOnce("created");

    await expect(
      service.handleWebhook(Buffer.from("{}"), "sig")
    ).resolves.toEqual({
      received: true,
      status: "ignored"
    });
  });

  it("returns retryable non-success for failed duplicate receipts", async () => {
    vi.mocked(stripe.constructWebhookEvent).mockReturnValue({
      id: "evt_failed_retry",
      type: "customer.subscription.updated",
      created: 1_800_000_001,
      data: { object: { id: "sub_123" } }
    } as Stripe.Event);
    vi.mocked(repository.createWebhookReceipt).mockResolvedValueOnce(
      "retryable_duplicate"
    );

    await expect(service.handleWebhook(Buffer.from("{}"), "sig")).rejects.toThrow(
      ServiceUnavailableException
    );
    expect(repository.syncSubscription).not.toHaveBeenCalled();
  });

  it("rejects missing or invalid webhook signatures before side effects", async () => {
    await expect(service.handleWebhook(Buffer.from("{}"), undefined)).rejects.toThrow(
      BadRequestException
    );

    vi.mocked(stripe.constructWebhookEvent).mockImplementationOnce(() => {
      throw new Error("bad signature");
    });

    await expect(service.handleWebhook(Buffer.from("{}"), "bad")).rejects.toThrow(
      BadRequestException
    );
    expect(repository.createWebhookReceipt).not.toHaveBeenCalled();
  });
});
