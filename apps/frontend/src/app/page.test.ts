import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("frontend scaffold", () => {
  it("uses the Next.js App Router entry point", () => {
    const page = readFileSync(new URL("./page.tsx", import.meta.url), "utf8");

    expect(page).toMatch(/export default function HomePage/);
    expect(page).toMatch(/SHARED_PACKAGE_VERSION/);
  });
});
