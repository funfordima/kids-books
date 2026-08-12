import { getPublicTemplates } from "../../lib/backend-client";
import { StatusPanel } from "../../components/status";

export const dynamic = "force-dynamic";

export default async function TemplatesPage() {
  const templates = await getPublicTemplates();

  return (
    <main className="page-shell">
      <h1>Templates</h1>
      {!templates.ok ? (
        <StatusPanel title="Templates are unavailable">
          <p>{templates.error.message}</p>
        </StatusPanel>
      ) : templates.data.length === 0 ? (
        <StatusPanel title="No public templates yet">
          <p>Public templates will appear here after backend publication work.</p>
        </StatusPanel>
      ) : (
        <section className="grid three" aria-label="Public templates">
          {templates.data.map((template) => (
            <article key={template.id}>
              <h2>{template.title}</h2>
              <p>
                {template.ageGroup} · {template.storyType}
              </p>
            </article>
          ))}
        </section>
      )}
    </main>
  );
}
