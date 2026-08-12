import { describe, expect, it, vi } from "vitest";
import { act, create } from "react-test-renderer";
import BillingCancelPage from "./billing/cancel/page";
import BillingSuccessPage from "./billing/success/page";
import PricingPage from "./pricing/page";
import { CheckoutButton } from "./pricing/checkout-button";

const collectText = (node: unknown): string => {
  if (node === null || node === undefined || typeof node === "boolean") {
    return "";
  }

  if (typeof node === "string" || typeof node === "number") {
    return String(node);
  }

  if (Array.isArray(node)) {
    return node.map(collectText).join(" ");
  }

  if (typeof node === "object" && "props" in node) {
    const element = node as {
      props: { children?: unknown; href?: unknown };
      children?: unknown;
    };
    return [element.props.href, element.props.children, element.children]
      .map(collectText)
      .join(" ");
  }

  return "";
};

describe("billing frontend boundaries", () => {
  it("renders hosted checkout pricing without client Stripe secrets", () => {
    const text = collectText(PricingPage());

    expect(text).toContain("$9.99 per month");
    expect(text).toContain("Stripe");
    expect(text).not.toContain("sk_");
    expect(text).not.toContain("pk_");
  });

  it("shows cancel as no-op for access", () => {
    const text = collectText(BillingCancelPage());

    expect(text).toContain("No subscription or book-generation access changed.");
    expect(text).toContain("/pricing");
  });

  it("shows verified active success only from backend response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          sessionId: "cs_123",
          ownedByAuthenticatedParent: true,
          paymentStatus: "paid",
          subscriptionStatus: "active",
          entitlementAllowed: true
        })
      })
    );

    const page = await BillingSuccessPage({
      searchParams: Promise.resolve({ session_id: "cs_123" })
    });

    expect(collectText(page)).toContain(
      "Your subscription is active for book generation."
    );
    expect(globalThis.fetch).toHaveBeenCalledWith(
      "/billing/checkout/cs_123",
      expect.objectContaining({ credentials: "include" })
    );
  });

  it("does not grant access from missing or unverified redirect state", async () => {
    const page = await BillingSuccessPage({
      searchParams: Promise.resolve({})
    });

    expect(collectText(page)).toContain(
      "Access is not granted from this redirect alone."
    );
  });

  it("starts hosted checkout through the backend and redirects to Stripe", async () => {
    const assign = vi.fn();
    vi.stubGlobal("window", {
      location: {
        assign
      }
    });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          sessionId: "cs_123",
          url: "https://checkout.stripe.test/session"
        })
      })
    );

    let renderer!: ReturnType<typeof create>;

    await act(async () => {
      renderer = create(<CheckoutButton />);
    });

    const button = renderer.root.findByType("button");

    await act(async () => {
      await button.props.onClick();
    });

    expect(globalThis.fetch).toHaveBeenCalledWith(
      "/billing/checkout",
      expect.objectContaining({
        method: "POST",
        credentials: "include"
      })
    );
    expect(assign).toHaveBeenCalledWith("https://checkout.stripe.test/session");
  });

  it("shows checkout errors without redirecting", async () => {
    const assign = vi.fn();
    vi.stubGlobal("window", {
      location: {
        assign
      }
    });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 403
      })
    );

    let renderer!: ReturnType<typeof create>;

    await act(async () => {
      renderer = create(<CheckoutButton />);
    });

    const button = renderer.root.findByType("button");

    await act(async () => {
      await button.props.onClick();
    });

    expect(assign).not.toHaveBeenCalled();
    expect(collectText(renderer.toJSON())).toContain(
      "Subscription access is not available."
    );
  });
});
