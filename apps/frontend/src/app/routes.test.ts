import { describe, expect, it, vi } from "vitest";
import AuthCallbackPage from "./auth/callback/page";
import CreatePage from "./create/page";
import DashboardPage from "./dashboard/page";
import LibraryPage from "./library/page";
import LoginPage from "./login/page";
import TemplatesPage from "./templates/page";

vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    throw new Error(`redirect:${path}`);
  }
}));

const collectText = (value: unknown): string => {
  if (typeof value === "string" || typeof value === "number") {
    return String(value);
  }

  if (Array.isArray(value)) {
    return value.map(collectText).join(" ");
  }

  if (typeof value === "object" && value !== null && "props" in value) {
    const props = value.props as {
      action?: unknown;
      children?: unknown;
      href?: unknown;
      title?: unknown;
    };
    return [
      typeof props.href === "string" ? props.href : "",
      typeof props.title === "string" ? props.title : "",
      collectText(props.children),
      collectText(props.action)
    ].join(" ");
  }

  return "";
};

const okResponse = (data: unknown) => ({
  ok: true,
  json: () => Promise.resolve(data)
});

describe("Step 7 route states", () => {
  it("renders template empty and error states from the typed client", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(okResponse([])));
    expect(collectText(await TemplatesPage())).toContain("No public templates yet");

    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce({ ok: false, status: 500 }));
    expect(collectText(await TemplatesPage())).toContain("Templates are unavailable");
  });

  it("renders login and callback boundaries without client token storage", async () => {
    const login = await LoginPage({
      searchParams: Promise.resolve({ returnTo: "/create" })
    });
    const callback = await AuthCallbackPage({
      searchParams: Promise.resolve({ error: "access_denied" })
    });

    expect(collectText(login)).toContain("/auth/google/start?returnTo=%2Fcreate");
    expect(collectText(callback)).toContain("No token data is stored");
  });

  it("renders protected dashboard, library, and create routes after session", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(
          okResponse({ userId: "user-1", displayName: "Mia Parent" })
        )
        .mockResolvedValueOnce(
          okResponse({ userId: "user-1", displayName: "Mia Parent" })
        )
        .mockResolvedValueOnce(okResponse([]))
        .mockResolvedValueOnce(
          okResponse({ userId: "user-1", displayName: "Mia Parent" })
        )
    );

    expect(collectText(await DashboardPage())).toContain("Mia Parent");
    expect(collectText(await LibraryPage())).toContain("No books yet");
    expect(collectText(await CreatePage())).toContain("Create");
  });
});
