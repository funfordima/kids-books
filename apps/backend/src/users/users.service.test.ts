import { describe, expect, it } from "vitest";
import { UsersController } from "./users.controller";
import { UsersModule } from "./users.module";
import { UsersService } from "./users.service";

describe("UsersService", () => {
  it("reports the planned user module contract", () => {
    const service = new UsersService();

    expect(service.getStatus()).toEqual({
      resource: "users",
      persistence: "not-configured",
      supportedRoles: ["guardian", "admin"],
      plannedCapabilities: ["profile", "guardian-ownership", "admin-review"]
    });
  });

  it("exposes the status through its controller", () => {
    const service = new UsersService();

    expect(new UsersController(service).getStatus()).toEqual(
      service.getStatus()
    );
    expect(new UsersController(service).getCurrentUser()).toEqual(
      service.getCurrentUser()
    );
    expect(UsersModule).toBeDefined();
  });

  it("returns a local current-user profile contract", () => {
    expect(new UsersService().getCurrentUser()).toEqual({
      id: "local-parent-preview",
      email: "parent@example.local",
      role: "guardian",
      subscriptionStatus: "inactive"
    });
  });
});
