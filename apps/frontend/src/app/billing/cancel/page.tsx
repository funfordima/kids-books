import Link from "next/link";

export default function BillingCancelPage() {
  return (
    <main>
      <h1>Checkout Canceled</h1>
      <p>No subscription or book-generation access changed.</p>
      <Link href="/pricing">Return to pricing</Link>
    </main>
  );
}
