import { BadRequestException } from "@nestjs/common";
import { describe, expect, it } from "vitest";
import { validateNonEmptyIdentifier } from "./validation";

describe("validateNonEmptyIdentifier", () => {
  it("returns non-empty identifiers", () => {
    expect(validateNonEmptyIdentifier("book-123", "bookId")).toBe("book-123");
  });

  it("rejects blank identifiers deterministically", () => {
    expect(() => validateNonEmptyIdentifier("   ", "bookId")).toThrow(
      BadRequestException
    );
  });
});
