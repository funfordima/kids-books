import {
  bookWizardSchema,
  safeReturnPathSchema,
  type BookWizardConfig,
  type BookWizardInput
} from "@kids-books/shared";

export type ClientErrorCode =
  | "unauthorized"
  | "forbidden"
  | "rate_limited"
  | "validation_error"
  | "unavailable";

export interface ClientError {
  code: ClientErrorCode;
  message: string;
}

export type ClientResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: ClientError };

export interface ParentSession {
  userId: string;
  displayName: string;
}

export interface PublicTemplate {
  id: string;
  title: string;
  ageGroup: string;
  storyType: string;
}

export interface LibraryBook {
  id: string;
  title: string;
  status: "queued" | "generating" | "completed" | "failed";
}

export interface SubmittedBook {
  bookId: string;
  status: "queued";
}

export const getApiBaseUrl = (): string =>
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/u, "") ?? "";

export const normalizeReturnPath = (value: string | null): string =>
  safeReturnPathSchema.parse(value ?? "/");

export const mapStatusToError = (status: number): ClientError => {
  if (status === 401) {
    return { code: "unauthorized", message: "Please sign in to continue." };
  }

  if (status === 403) {
    return { code: "forbidden", message: "This content is not available." };
  }

  if (status === 429) {
    return { code: "rate_limited", message: "Please wait and try again." };
  }

  if (status === 400 || status === 422) {
    return {
      code: "validation_error",
      message: "Please review the highlighted fields."
    };
  }

  return {
    code: "unavailable",
    message: "The service is temporarily unavailable."
  };
};

export async function apiFetch<T>(
  path: string,
  init?: RequestInit
): Promise<ClientResult<T>> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8_000);

  try {
    const response = await fetch(`${getApiBaseUrl()}${path}`, {
      ...init,
      credentials: "include",
      signal: controller.signal,
      headers: {
        "content-type": "application/json",
        ...init?.headers
      }
    });

    if (!response.ok) {
      return { ok: false, error: mapStatusToError(response.status) };
    }

    return { ok: true, data: (await response.json()) as T };
  } catch {
    return {
      ok: false,
      error: {
        code: "unavailable",
        message: "The service is temporarily unavailable."
      }
    };
  } finally {
    clearTimeout(timeout);
  }
}

export const getSession = (): Promise<ClientResult<ParentSession>> =>
  apiFetch<ParentSession>("/auth/session", { cache: "no-store" });

export const getPublicTemplates = (): Promise<ClientResult<PublicTemplate[]>> =>
  apiFetch<PublicTemplate[]>("/templates/public", { cache: "no-store" });

export const getLibrary = (): Promise<ClientResult<LibraryBook[]>> =>
  apiFetch<LibraryBook[]>("/books", { cache: "no-store" });

export const startLogin = (returnTo: string): string =>
  `${getApiBaseUrl()}/auth/google/start?returnTo=${encodeURIComponent(
    normalizeReturnPath(returnTo)
  )}`;

export const submitBookRequest = (
  input: BookWizardInput
): Promise<ClientResult<SubmittedBook>> => {
  const parsed = bookWizardSchema.safeParse(input);

  if (!parsed.success) {
    return Promise.resolve({
      ok: false,
      error: {
        code: "validation_error",
        message: "Please review the highlighted fields."
      }
    });
  }

  return apiFetch<SubmittedBook>("/generation/books", {
    method: "POST",
    body: JSON.stringify(parsed.data satisfies BookWizardConfig)
  });
};
