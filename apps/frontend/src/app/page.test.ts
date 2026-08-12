import { describe, expect, it } from "vitest";
import RootLayout from "./layout";
import HomePage from "./page";
import PricingPage from "./pricing/page";

const collectText = (value: unknown): string => {
  if (typeof value === "string" || typeof value === "number") {
    return String(value);
  }

  if (Array.isArray(value)) {
    return value.map(collectText).join(" ");
  }

  if (typeof value === "object" && value !== null && "props" in value) {
    const props = value.props as { children?: unknown; href?: unknown };
    return `${typeof props.href === "string" ? props.href : ""} ${collectText(
      props.children
    )}`;
  }

  return "";
};

describe("frontend product foundation", () => {
  it("renders semantic landing content and navigation shell", () => {
    const page = HomePage();
    const layout = RootLayout({ children: page });
    const pageContent = collectText(page);
    const layoutContent = collectText(layout);

    expect(page.type).toBe("main");
    expect(pageContent).toContain("Kids Books");
    expect(layout.type).toBe("html");
    expect(layout.props.lang).toBe("en");
    expect(layoutContent).toContain("/create");
  });

  it("keeps pricing honest through backend-owned Stripe execution", () => {
    const content = collectText(PricingPage());

    expect(content).toContain("$9.99 per month");
    expect(content).toContain("Checkout is hosted by Stripe");
    expect(content).toContain("verified backend entitlement state");
    expect(content).not.toContain("checkout.stripe.com");
  });
});
