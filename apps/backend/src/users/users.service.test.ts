import { describe, expect, it } from "vitest";
import { ServiceUnavailableException } from "@nestjs/common";
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
    expect(() => controller.getCurrentUser({ parent })).toThrow(
      ServiceUnavailableException
    );
    expect(UsersModule).toBeDefined();
  });

  it("returns explicit deferred errors instead of user profile data", () => {
    expect(() => new UsersService().getCurrentUser(parent)).toThrow(
      ServiceUnavailableException
    );
  });
});
