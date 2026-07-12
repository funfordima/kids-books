import { SHARED_PACKAGE_VERSION } from "@kids-books/shared";

export default function HomePage(): JSX.Element {
  return (
    <main>
      <h1>Kids Books</h1>
      <p>Application foundation is ready.</p>
      <small>Shared contract {SHARED_PACKAGE_VERSION}</small>
    </main>
  );
}
