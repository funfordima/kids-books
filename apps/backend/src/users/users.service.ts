import { Injectable } from "@nestjs/common";
import type { AuthenticatedParentContext } from "../auth/authenticated-parent";
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

  public getCurrentUser(parent: AuthenticatedParentContext): CurrentUserProfile {
    return {
      id: parent.parentId,
      email: parent.email,
      role: parent.role
    };
  }
}
