import Link from "next/link";

export default function HomePage() {
  return (
    <main className="page-shell">
      <section className="hero">
        <p className="eyebrow">Personalized stories for families</p>
        <h1>Kids Books</h1>
        <p>
          Create age-appropriate educational book requests with protected
          access, clear pricing, and honest generation status.
        </p>
        <div className="button-row">
          <Link className="button" href="/create">
            Create a book
          </Link>
          <Link className="button secondary" href="/templates">
            Browse templates
          </Link>
        </div>
      </section>
      <section className="grid three" aria-label="Product safeguards">
        <article>
          <h2>Guided setup</h2>
          <p>Five focused steps validate age, lesson, style, and length.</p>
        </article>
        <article>
          <h2>Protected library</h2>
          <p>Dashboard and book routes fail closed until the backend session is valid.</p>
        </article>
        <article>
          <h2>Honest states</h2>
          <p>Unavailable features show clear next actions instead of made-up content.</p>
        </article>
      </section>
    </main>
  );
}
