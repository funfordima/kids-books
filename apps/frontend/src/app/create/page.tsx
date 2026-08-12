import { BookWizard } from "../../components/book-wizard";
import { requireParentSession } from "../../lib/auth";

export const dynamic = "force-dynamic";

export default async function CreatePage() {
  await requireParentSession("/create");

  return (
    <main className="page-shell">
      <h1>Create</h1>
      <BookWizard />
    </main>
  );
}
