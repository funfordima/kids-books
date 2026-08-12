import { CheckoutButton } from "./checkout-button";

export default function PricingPage() {
  return (
    <main className="page-shell narrow">
      <h1>Pricing</h1>
      <section className="plan" aria-labelledby="monthly-plan">
        <h2 id="monthly-plan">$9.99 per month</h2>
        <p>Includes a seven-day trial for eligible parent accounts.</p>
        <p className="muted">
          Checkout is hosted by Stripe; this app never handles card details.
          Access follows verified backend entitlement state, never this page
          alone.
        </p>
        <CheckoutButton />
      </section>
    </main>
  );
}
