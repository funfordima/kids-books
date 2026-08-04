import { Injectable } from "@nestjs/common";
import type { AuthenticatedParentContext } from "../auth/authenticated-parent";
import { createDeferredImplementationError } from "../common/not-implemented";
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
    void parent;
    return createDeferredImplementationError("User profile lookup");
  }
}
