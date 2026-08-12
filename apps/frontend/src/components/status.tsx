import type { ReactNode } from "react";

interface StatusPanelProps {
  readonly title: string;
  readonly children: ReactNode;
  readonly action?: ReactNode;
}

export function StatusPanel({ title, children, action }: StatusPanelProps) {
  return (
    <section className="status-panel" aria-labelledby="status-title">
      <h2 id="status-title">{title}</h2>
      <div>{children}</div>
      {action ? <div className="status-action">{action}</div> : null}
    </section>
  );
}

export function ErrorSummary({
  title,
  messages
}: {
  readonly title: string;
  readonly messages: readonly string[];
}) {
  if (messages.length === 0) {
    return null;
  }

  return (
    <div className="error-summary" role="alert" aria-labelledby="error-title">
      <h2 id="error-title">{title}</h2>
      <ul>
        {messages.map((message) => (
          <li key={message}>{message}</li>
        ))}
      </ul>
    </div>
  );
}

export function LoadingState({ label }: { readonly label: string }) {
  return (
    <p className="muted" role="status" aria-live="polite">
      {label}
    </p>
  );
}
