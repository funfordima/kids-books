import { Controller, Get, Inject } from "@nestjs/common";
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

  @Get("me")
  public getCurrentUser(): CurrentUserProfile {
    return this.usersService.getCurrentUser();
  }
}
