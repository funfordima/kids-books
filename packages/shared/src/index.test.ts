import { describe, expect, it } from "vitest";
import {
  bookWizardSchema,
  safeReturnPathSchema,
  SHARED_PACKAGE_VERSION,
  wizardStoryTypesByAgeGroup
} from "./index";

describe("shared package", () => {
  it("exports the shared contract version", () => {
    expect(SHARED_PACKAGE_VERSION).toBe("0.1.0");
  });

  it("validates the Step 7 wizard age and story matrix", () => {
    expect(wizardStoryTypesByAgeGroup["3-4"]).not.toContain("mystery");
    expect(
      bookWizardSchema.safeParse({
        childName: "Mia",
        ageGroup: "3-4",
        pronouns: "she/her",
        storyType: "mystery",
        setting: "forest",
        illustrationStyle: "watercolor",
        pageCount: 8
      }).success
    ).toBe(false);
  });

  it("requires an educational subtype and keeps return paths same-origin", () => {
    expect(
      bookWizardSchema.safeParse({
        childName: "Mia",
        ageGroup: "5-6",
        pronouns: "she/her",
        storyType: "educational",
        setting: "forest",
        illustrationStyle: "watercolor",
        pageCount: 8
      }).success
    ).toBe(false);
    expect(safeReturnPathSchema.parse("/dashboard")).toBe("/dashboard");
    expect(safeReturnPathSchema.parse("https://example.com")).toBe("/");
    expect(safeReturnPathSchema.parse("//example.com")).toBe("/");
  });
});
