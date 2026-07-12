import { describe, expect, it } from "vitest";
import { AppService } from "./app.service";

describe("AppService", () => {
  it("returns the backend and shared package identity", () => {
    expect(new AppService().getServiceInfo()).toEqual({
      name: "kids-books-backend",
      sharedPackageVersion: "0.1.0"
    });
  });
});
