import Link from "next/link";
import { normalizeReturnPath } from "../../../lib/backend-client";

interface AuthCallbackPageProps {
  readonly searchParams?: Promise<{
    readonly returnTo?: string;
    readonly error?: string;
  }>;
}

export default async function AuthCallbackPage({
  searchParams
}: AuthCallbackPageProps) {
  const params = await searchParams;
  const returnTo = normalizeReturnPath(params?.returnTo ?? "/dashboard");

  return (
    <main className="page-shell narrow">
      <h1>Sign-in status</h1>
      {params?.error ? (
        <section className="status-panel" role="alert">
          <h2>Authentication failed</h2>
          <p>Please return to sign in. No token data is stored on this page.</p>
          <Link
            className="button"
            href={`/login?returnTo=${encodeURIComponent(returnTo)}`}
          >
            Try again
          </Link>
        </section>
      ) : (
        <section className="status-panel" role="status" aria-live="polite">
          <h2>Authentication is being verified</h2>
          <p>
            The backend owns session exchange. Continue only after the backend
            session endpoint confirms access.
          </p>
          <Link className="button" href={returnTo}>
            Continue
          </Link>
        </section>
      )}
    </main>
  );
}
