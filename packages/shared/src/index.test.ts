import { describe, expect, it } from "vitest";
import { SHARED_PACKAGE_VERSION } from "./index";

describe("shared package", () => {
  it("exports the shared contract version", () => {
    expect(SHARED_PACKAGE_VERSION).toBe("0.1.0");
  });
});
