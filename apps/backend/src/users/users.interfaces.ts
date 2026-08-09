export type UserRole = "guardian" | "admin";

export interface CurrentUserProfile {
  id: string;
  email: string;
  role: UserRole;
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
