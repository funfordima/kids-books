import { Injectable } from "@nestjs/common";
import type {
  CurrentUserProfile,
  UsersModuleStatus
} from "./users.interfaces";

@Injectable()
export class UsersService {
  public getStatus(): UsersModuleStatus {
    return {
      resource: "users",
      persistence: "not-configured",
      supportedRoles: ["guardian", "admin"],
      plannedCapabilities: ["profile", "guardian-ownership", "admin-review"]
    };
  }

  public getCurrentUser(): CurrentUserProfile {
    return {
      id: "local-parent-preview",
      email: "parent@example.local",
      role: "guardian",
      subscriptionStatus: "inactive"
    };
  }
}
