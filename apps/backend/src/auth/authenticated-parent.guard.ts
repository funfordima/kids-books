import type { CanActivate, ExecutionContext } from "@nestjs/common";
import { Injectable, UnauthorizedException } from "@nestjs/common";
import type { AuthenticatedRequest } from "./authenticated-parent";

@Injectable()
export class AuthenticatedParentGuard implements CanActivate {
  public canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    if (request.parent) {
      return true;
    }

    throw new UnauthorizedException("Authenticated parent context required.");
  }
}
