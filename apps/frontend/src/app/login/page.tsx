import { normalizeReturnPath, startLogin } from "../../lib/backend-client";

interface LoginPageProps {
  readonly searchParams?: Promise<{
    readonly returnTo?: string;
    readonly error?: string;
  }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const returnTo = normalizeReturnPath(params?.returnTo ?? "/dashboard");

  return (
    <main className="page-shell narrow">
      <h1>Sign in</h1>
      {params?.error ? (
        <p className="error-summary" role="alert">
          Sign-in could not be completed. Please try again.
        </p>
      ) : null}
      <p>
        Google sign-in is delegated to backend-owned auth endpoints. Tokens are
        not stored in this browser UI.
      </p>
      <a className="button" href={startLogin(returnTo)}>
        Continue with Google
      </a>
    </main>
  );
}
