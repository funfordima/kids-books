"use client";

import { useState } from "react";
import { startCheckout } from "../billing-client";

export function CheckoutButton() {
  const [status, setStatus] = useState<"idle" | "pending" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  const start = async () => {
    if (status === "pending") {
      return;
    }

    setStatus("pending");
    setMessage(null);
    const result = await startCheckout();

    if (!result.ok) {
      setStatus("error");
      setMessage(result.error.message);
      return;
    }

    window.location.assign(result.data.url);
  };

  return (
    <div>
      <button type="button" onClick={start} disabled={status === "pending"}>
        {status === "pending" ? "Starting trial..." : "Start seven-day trial"}
      </button>
      {message ? <p role="alert">{message}</p> : null}
    </div>
  );
}
