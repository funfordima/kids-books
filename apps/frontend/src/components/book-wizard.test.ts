import { createElement, type ReactNode } from "react";
import { act, create } from "react-test-renderer";
import { describe, expect, it, vi } from "vitest";
import { BookWizard, buildWizardValidationMessages } from "./book-wizard";

const submitBookRequest = vi.hoisted(() =>
  vi
    .fn()
    .mockResolvedValue({ ok: true, data: { bookId: "book-1", status: "queued" } })
);

vi.mock("next/link", () => ({
  default: ({ children }: { href: string; children: ReactNode }) => children
}));

vi.mock("../lib/backend-client", () => ({
  submitBookRequest
}));

const baseInput = {
  childName: "Mia",
  ageGroup: "5-6",
  pronouns: "she/her",
  storyType: "educational",
  educationalSubtype: "science-discovery",
  setting: "forest",
  illustrationStyle: "watercolor",
  pageCount: 8
} as const;

describe("book wizard", () => {
  it("validates matrix and required educational subtype through shared schema", () => {
    expect(buildWizardValidationMessages(baseInput)).toEqual([]);
    expect(
      buildWizardValidationMessages({
        ...baseInput,
        ageGroup: "3-4",
        storyType: "mystery"
      })
    ).toContain("Story type is not supported for the selected age group.");
    expect(
      buildWizardValidationMessages({
        ...baseInput,
        educationalSubtype: undefined
      })
    ).toContain("Educational subtype is required for educational stories.");
  });

  it("keeps values in memory, validates fields, and submits once", async () => {
    submitBookRequest.mockClear();
    let tree: ReturnType<typeof create>;

    await act(() => {
      tree = create(createElement(BookWizard));
    });

    const root = tree!.root;
    const clickButton = async (name: string) => {
      const button = root
        .findAllByType("button")
        .find((candidate) => candidate.props.children === name);

      if (!button) {
        throw new Error(`Missing button: ${name}`);
      }

      await act(() => button.props.onClick());
    };

    const changeFirst = async (type: string, value: string) => {
      const input = root.findAll((node) => node.type === type)[0];

      if (!input) {
        throw new Error(`Missing control: ${type}`);
      }

      await act(() => input.props.onChange({ target: { value } }));
    };

    expect(JSON.stringify(tree!.toJSON())).toContain(
      "Personalization stays in memory"
    );
    await changeFirst("input", "Mia");
    await clickButton("Next");
    await changeFirst("input", "Leo");
    await clickButton("Next");
    await changeFirst("textarea", "A gentle forest science adventure.");
    await clickButton("Next");
    await clickButton("Next");
    await clickButton("Submit request");

    expect(submitBookRequest).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(tree!.toJSON())).toContain("Request queued");
    expect(JSON.stringify(tree!.toJSON())).not.toContain("localStorage");
  });
});
