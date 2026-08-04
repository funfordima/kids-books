import { Injectable } from "@nestjs/common";
import type {
  GoogleOAuthCallbackResponse,
  GoogleOAuthReadiness,
  GoogleOAuthStartResponse
} from "./auth.interfaces";

@Injectable()
export class AuthService {
  private readonly requiredConfiguration = [
    "GOOGLE_CLIENT_ID",
    "GOOGLE_CLIENT_SECRET",
    "GOOGLE_CALLBACK_URL"
  ] as const;

  public getGoogleOAuthReadiness(): GoogleOAuthReadiness {
    return {
      provider: "google",
      protocol: "oauth2",
      callbackPath: "/auth/google/callback",
      requiredConfiguration: this.requiredConfiguration,
      configured: false,
      implementationStatus: "packages-not-installed"
    };
  }

  public startGoogleOAuth(): GoogleOAuthStartResponse {
    return {
      provider: "google",
      status: "configuration-required",
      callbackPath: "/auth/google/callback",
      missingConfiguration: this.requiredConfiguration
    };
  }

  public handleGoogleCallback(code?: string): GoogleOAuthCallbackResponse {
    return {
      provider: "google",
      status: "session-exchange-not-implemented",
      authorizationCodeReceived: typeof code === "string" && code.length > 0
    };
  }
}
