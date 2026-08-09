import { Controller, Get, Inject, Query } from "@nestjs/common";
import type {
  GoogleOAuthCallbackResponse,
  GoogleOAuthReadiness,
  GoogleOAuthStartResponse
} from "./auth.interfaces";
import { AuthService } from "./auth.service";

@Controller("auth")
export class AuthController {
  public constructor(
    @Inject(AuthService) private readonly authService: AuthService
  ) {}

  @Get("google/readiness")
  public getGoogleOAuthReadiness(): GoogleOAuthReadiness {
    return this.authService.getGoogleOAuthReadiness();
  }

  @Get("google")
  public startGoogleOAuth(): GoogleOAuthStartResponse {
    return this.authService.startGoogleOAuth();
  }

  @Get("google/callback")
  public handleGoogleCallback(
    @Query("code") code?: string
  ): GoogleOAuthCallbackResponse {
    return this.authService.handleGoogleCallback(code);
  }
}
