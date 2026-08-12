import { afterEach, describe, expect, it, vi } from "vitest";
import {
  mapStatusToError,
  normalizeReturnPath,
  startLogin,
  submitBookRequest
} from "./backend-client";

const validWizardInput = {
  childName: "Mia",
  ageGroup: "5-6",
  pronouns: "she/her",
  storyType: "educational",
  educationalSubtype: "science-discovery",
  setting: "forest",
  illustrationStyle: "watercolor",
  pageCount: 8
} as const;

describe("frontend backend client", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("normalizes same-origin return paths and maps safe auth entry URLs", () => {
    vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "https://api.example.test/");

    expect(normalizeReturnPath("/create")).toBe("/create");
    expect(normalizeReturnPath("https://evil.test")).toBe("/");
    expect(startLogin("/dashboard")).toBe(
      "https://api.example.test/auth/google/start?returnTo=%2Fdashboard"
    );
  });

  it("maps backend failure states without provider details", () => {
    expect(mapStatusToError(401).code).toBe("unauthorized");
    expect(mapStatusToError(403).code).toBe("forbidden");
    expect(mapStatusToError(429).code).toBe("rate_limited");
    expect(mapStatusToError(500).code).toBe("unavailable");
  });

  it("validates and submits one typed book request with credentials", async () => {
    const fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ bookId: "book-1", status: "queued" })
    });
    vi.stubGlobal("fetch", fetch);

    await expect(submitBookRequest(validWizardInput)).resolves.toEqual({
      ok: true,
      data: { bookId: "book-1", status: "queued" }
    });
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledWith(
      "/generation/books",
      expect.objectContaining({
        credentials: "include",
        method: "POST"
      })
    );
  });
});
