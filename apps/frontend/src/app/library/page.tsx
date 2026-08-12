import Link from "next/link";
import { StatusPanel } from "../../components/status";
import { getLibrary } from "../../lib/backend-client";
import { requireParentSession } from "../../lib/auth";

export const dynamic = "force-dynamic";

export default async function LibraryPage() {
  await requireParentSession("/library");
  const library = await getLibrary();

  return (
    <main className="page-shell">
      <h1>Library</h1>
      {!library.ok ? (
        <StatusPanel title="Library is unavailable">
          <p>{library.error.message}</p>
        </StatusPanel>
      ) : library.data.length === 0 ? (
        <StatusPanel title="No books yet">
          <p>Create a book request to see backend-verified status here.</p>
          <Link className="button" href="/create">
            Create
          </Link>
        </StatusPanel>
      ) : (
        <section className="grid three" aria-label="Your books">
          {library.data.map((book) => (
            <article key={book.id}>
              <h2>{book.title}</h2>
              <p>Status: {book.status}</p>
            </article>
          ))}
        </section>
      )}
    </main>
  );
}
