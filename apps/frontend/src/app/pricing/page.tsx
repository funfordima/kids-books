import Link from "next/link";

export default function PricingPage() {
  return (
    <main className="page-shell narrow">
      <h1>Pricing</h1>
      <section className="plan" aria-labelledby="monthly-plan">
        <h2 id="monthly-plan">$9.99 per month</h2>
        <p>Includes a seven-day trial once billing is implemented in Step 8.</p>
        <p className="muted">
          Checkout is not available in this Step 7 foundation. Billing access
          must come from verified backend entitlement state, never this page.
        </p>
        <Link className="button" href="/login?returnTo=%2Fcreate">
          Sign in to create
        </Link>
      </section>
    </main>
  );
}
