import { describe, expect, it } from "vitest";
import { parseBookGenerationConfig } from "./book-config";

const validConfig = {
  userId: "user-1",
  bookId: "book-1",
  childName: "Mia",
  ageGroup: "5-6",
  pronouns: "she/her",
  storyType: "educational",
  educationalSubtype: "science-discovery",
  setting: "forest",
  illustrationStyle: "watercolor",
  pageCount: 8,
  correlationId: "corr-1"
};

describe("book generation config", () => {
  it("accepts supported educational configs", () => {
    expect(parseBookGenerationConfig(validConfig)).toMatchObject(validConfig);
  });

  it("rejects missing educational subtype", () => {
    expect(() =>
      parseBookGenerationConfig({
        ...validConfig,
        educationalSubtype: undefined
      })
    ).toThrow();
  });

  it("rejects story types outside the age matrix", () => {
    expect(() =>
      parseBookGenerationConfig({
        ...validConfig,
        ageGroup: "3-4",
        storyType: "mystery",
        educationalSubtype: undefined
      })
    ).toThrow();
  });
});
