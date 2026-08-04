import { Controller, Get, Inject, Req, UseGuards } from "@nestjs/common";
import type { AuthenticatedRequest } from "../auth/authenticated-parent";
import { AuthenticatedParentGuard } from "../auth/authenticated-parent.guard";
import type {
  CurrentUserProfile,
  UsersModuleStatus
} from "./users.interfaces";
import { UsersService } from "./users.service";

@Controller("users")
export class UsersController {
  public constructor(
    @Inject(UsersService) private readonly usersService: UsersService
  ) {}

  @Get("status")
  public getStatus(): UsersModuleStatus {
    return this.usersService.getStatus();
  }

  @UseGuards(AuthenticatedParentGuard)
  @Get("me")
  public getCurrentUser(@Req() request: AuthenticatedRequest): CurrentUserProfile {
    if (!request.parent) {
      throw new Error("Authenticated parent context missing after guard.");
    }

    return this.usersService.getCurrentUser(request.parent);
  }
}
