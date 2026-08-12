import Link from "next/link";
import { StatusPanel } from "../../components/status";
import { requireParentSession } from "../../lib/auth";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await requireParentSession("/dashboard");

  return (
    <main className="page-shell">
      <h1>Dashboard</h1>
      <p className="muted">Signed in as {session.displayName}</p>
      <section className="grid two" aria-label="Dashboard actions">
        <article>
          <h2>Create a book</h2>
          <p>Start a validated request for age-appropriate story generation.</p>
          <Link className="button" href="/create">
            Create
          </Link>
        </article>
        <article>
          <h2>Library</h2>
          <p>Review backend-verified book status without fabricated content.</p>
          <Link className="button secondary" href="/library">
            Library
          </Link>
        </article>
      </section>
      <StatusPanel title="Billing pending">
        <p>Stripe subscription access is implemented in Step 8, not here.</p>
      </StatusPanel>
    </main>
  );
}
