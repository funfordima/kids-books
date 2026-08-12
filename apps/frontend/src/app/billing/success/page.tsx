import Link from "next/link";
import { verifyCheckoutSession } from "../../billing-client";

interface BillingSuccessPageProps {
  readonly searchParams: Promise<{
    readonly session_id?: string;
  }>;
}

export default async function BillingSuccessPage({
  searchParams
}: BillingSuccessPageProps) {
  const params = await searchParams;
  const sessionId = params.session_id ?? "";
  const result = sessionId
    ? await verifyCheckoutSession(sessionId)
    : {
        ok: false as const,
        error: {
          code: "unavailable" as const,
          message: "Checkout session is missing."
        }
      };

  return (
    <main>
      <h1>Subscription Status</h1>
      {result.ok && result.data.entitlementAllowed ? (
        <p>Your subscription is active for book generation.</p>
      ) : (
        <p>
          Checkout is being verified by the backend. Access is not granted from
          this redirect alone.
        </p>
      )}
      {result.ok ? (
        <p>
          Status: {result.data.subscriptionStatus}; payment:{" "}
          {result.data.paymentStatus ?? "pending"}.
        </p>
      ) : (
        <p role="alert">{result.error.message}</p>
      )}
      <Link href="/pricing">Return to pricing</Link>
    </main>
  );
}
