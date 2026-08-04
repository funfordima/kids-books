export type UserRole = "guardian" | "admin";

export interface CurrentUserProfile {
  id: string;
  email: string;
  role: UserRole;
  subscriptionStatus: "inactive" | "trialing" | "active" | "canceled";
}

export interface UsersModuleStatus {
  resource: "users";
  persistence: "not-configured";
  supportedRoles: readonly UserRole[];
  plannedCapabilities: readonly [
    "profile",
    "guardian-ownership",
    "admin-review"
  ];
}
