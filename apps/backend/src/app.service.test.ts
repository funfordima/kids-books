import { describe, expect, it } from "vitest";
import { AppController } from "./app.controller";
import { AppModule } from "./app.module";
import { AppService } from "./app.service";

describe("AppService", () => {
  it("returns the backend and shared package identity", () => {
    expect(new AppService().getServiceInfo()).toEqual({
      name: "kids-books-backend",
      sharedPackageVersion: "0.1.0"
    });
  });

  it("exposes the service contract through the root controller", () => {
    const service = new AppService();

    expect(new AppController(service).getServiceInfo()).toEqual(
      service.getServiceInfo()
    );
    expect(AppModule).toBeDefined();
  });
});
