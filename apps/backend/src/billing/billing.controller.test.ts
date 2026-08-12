/* eslint-disable @typescript-eslint/unbound-method */
import { describe, expect, it, vi } from "vitest";
import type { AuthenticatedRequest } from "../auth/authenticated-parent";
import { BillingController } from "./billing.controller";
import type { BillingService } from "./billing.service";

const parent = {
  parentId: "11111111-1111-1111-1111-111111111111",
  email: "parent@example.com",
  role: "guardian" as const
};

const makeController = () => {
  const service = {
    createCheckoutSession: vi.fn().mockResolvedValue({
      sessionId: "cs_123",
      url: "https://checkout.stripe.test/session"
    }),
    verifyCheckoutSession: vi.fn().mockResolvedValue({
      sessionId: "cs_123",
      ownedByAuthenticatedParent: true,
      paymentStatus: "paid",
      subscriptionStatus: "active",
      entitlementAllowed: true
    }),
    getEntitlement: vi.fn().mockResolvedValue({
      allowed: true,
      status: "active"
    }),
    handleWebhook: vi.fn().mockResolvedValue({
      received: true,
      status: "processed"
    })
  } as unknown as BillingService;

  return { controller: new BillingController(service), service };
};

describe("BillingController", () => {
  it("delegates authenticated checkout, verification, and entitlement requests", async () => {
    const { controller, service } = makeController();
    const request: AuthenticatedRequest = { parent };

    await expect(controller.createCheckoutSession(request)).resolves.toEqual({
      sessionId: "cs_123",
      url: "https://checkout.stripe.test/session"
    });
    await expect(
      controller.verifyCheckoutSession(request, "cs_123")
    ).resolves.toEqual(
      expect.objectContaining({ entitlementAllowed: true })
    );
    await expect(controller.getEntitlement(request)).resolves.toEqual({
      allowed: true,
      status: "active"
    });

    expect(service.createCheckoutSession).toHaveBeenCalledWith(parent);
    expect(service.verifyCheckoutSession).toHaveBeenCalledWith(parent, "cs_123");
    expect(service.getEntitlement).toHaveBeenCalledWith(parent);
  });

  it("passes the exact raw body and Stripe signature to webhook handling", async () => {
    const { controller, service } = makeController();
    const rawBody = Buffer.from("{\"id\":\"evt_123\"}");

    await expect(
      controller.handleWebhook({ rawBody }, "sig_123")
    ).resolves.toEqual({
      received: true,
      status: "processed"
    });

    expect(service.handleWebhook).toHaveBeenCalledWith(rawBody, "sig_123");
  });
});
