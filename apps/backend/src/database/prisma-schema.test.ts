import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const schema = readFileSync(
  join(__dirname, "../../prisma/schema.prisma"),
  "utf8"
);

describe("Step 4 Prisma schema", () => {
  it("models all core SDLC entities", () => {
    for (const model of [
      "User",
      "Subscription",
      "Template",
      "Book",
      "Character",
      "Picture",
      "Job",
      "Rating",
      "ReferralProgram"
    ]) {
      expect(schema).toContain(`model ${model} {`);
    }
  });

  it("captures privacy, queue, and public-template publication contracts", () => {
    expect(schema).toContain("model BookPage {");
    expect(schema).toContain("shareTokenHash");
    expect(schema).toContain("uniquenessFingerprint");
    expect(schema).toContain("publicationDecision");
    expect(schema).toContain("moderationResult");
    expect(schema).toContain("enum JobType");
    expect(schema).toContain("PICTURE_GENERATION");
  });
});
