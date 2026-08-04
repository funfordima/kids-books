import { describe, expect, it } from "vitest";
import { UsersController } from "./users.controller";
import { UsersModule } from "./users.module";
import { UsersService } from "./users.service";

describe("UsersService", () => {
  const parent = {
    parentId: "parent-123",
    email: "parent@example.local",
    role: "guardian" as const
  };

  it("reports the planned user module contract", () => {
    const service = new UsersService();

    expect(service.getStatus()).toEqual({
      resource: "users",
      persistence: "not-configured",
      supportedRoles: ["guardian", "admin"],
      plannedCapabilities: ["profile", "guardian-ownership", "admin-review"]
    });
  });

  it("exposes public status and protected profile contracts through its controller", () => {
    const service = new UsersService();
    const controller = new UsersController(service);

    expect(controller.getStatus()).toEqual(service.getStatus());
    expect(controller.getCurrentUser({ parent })).toEqual(
      service.getCurrentUser(parent)
    );
    expect(UsersModule).toBeDefined();
  });

  it("derives the current-user profile from authenticated context", () => {
    expect(new UsersService().getCurrentUser(parent)).toEqual({
      id: "parent-123",
      email: "parent@example.local",
      role: "guardian"
    });
  });
});
