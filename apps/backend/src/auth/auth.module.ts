import { Module } from "@nestjs/common";
import { AuthenticatedParentGuard } from "./authenticated-parent.guard";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";

@Module({
  controllers: [AuthController],
  providers: [AuthService, AuthenticatedParentGuard],
  exports: [AuthService, AuthenticatedParentGuard]
})
export class AuthModule {}
