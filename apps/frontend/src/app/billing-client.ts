export interface ClientError {
  readonly code: "unauthorized" | "forbidden" | "unavailable";
  readonly message: string;
}

export type ClientResult<T> =
  | { readonly ok: true; readonly data: T }
  | { readonly ok: false; readonly error: ClientError };

export interface CheckoutStartResponse {
  readonly sessionId: string;
  readonly url: string;
}

export interface CheckoutVerificationResponse {
  readonly sessionId: string;
  readonly ownedByAuthenticatedParent: boolean;
  readonly paymentStatus: string | null;
  readonly subscriptionStatus: string;
  readonly entitlementAllowed: boolean;
}

const getApiBaseUrl = (): string =>
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/u, "") ?? "";

const mapStatus = (status: number): ClientError => {
  if (status === 401) {
    return { code: "unauthorized", message: "Please sign in to continue." };
  }

  if (status === 403) {
    return { code: "forbidden", message: "Subscription access is not available." };
  }

  return {
    code: "unavailable",
    message: "Billing is temporarily unavailable."
  };
};

export async function apiFetch<T>(
  path: string,
  init?: RequestInit
): Promise<ClientResult<T>> {
  try {
    const response = await fetch(`${getApiBaseUrl()}${path}`, {
      ...init,
      credentials: "include",
      headers: {
        "content-type": "application/json",
        ...init?.headers
      }
    });

    if (!response.ok) {
      return { ok: false, error: mapStatus(response.status) };
    }

    return { ok: true, data: (await response.json()) as T };
  } catch {
    return { ok: false, error: mapStatus(503) };
  }
}

export const startCheckout = (): Promise<ClientResult<CheckoutStartResponse>> =>
  apiFetch<CheckoutStartResponse>("/billing/checkout", { method: "POST" });

export const verifyCheckoutSession = (
  sessionId: string
): Promise<ClientResult<CheckoutVerificationResponse>> =>
  apiFetch<CheckoutVerificationResponse>(
    `/billing/checkout/${encodeURIComponent(sessionId)}`,
    { cache: "no-store" }
  );
