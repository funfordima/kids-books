import { describe, expect, it } from "vitest";
import { parseGeneratedStory } from "./story.schema";

const story = {
  title: "A Safe Story",
  pages: [
    {
      pageNumber: 1,
      text: "One",
      illustrationDescription: "First picture"
    },
    {
      pageNumber: 2,
      text: "Two",
      illustrationDescription: "Second picture"
    }
  ]
};

describe("generated story schema", () => {
  it("accepts exact consecutive pages", () => {
    expect(parseGeneratedStory(story, 2)).toEqual(story);
  });

  it("rejects incorrect page counts", () => {
    expect(() => parseGeneratedStory(story, 3)).toThrow(
      "Generated story page count does not match request."
    );
  });

  it("rejects unordered pages", () => {
    expect(() =>
      parseGeneratedStory(
        {
          ...story,
          pages: [{ ...story.pages[1], pageNumber: 2 }, story.pages[0]]
        },
        2
      )
    ).toThrow("Generated story pages must be ordered and consecutive.");
  });
});
