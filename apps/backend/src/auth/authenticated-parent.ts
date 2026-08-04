export type AuthenticatedParentRole = "guardian" | "admin";

export interface AuthenticatedParentContext {
  readonly parentId: string;
  readonly email: string;
  readonly role: AuthenticatedParentRole;
}

export interface AuthenticatedRequest {
  readonly parent?: AuthenticatedParentContext;
}
