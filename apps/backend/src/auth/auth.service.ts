import { Injectable } from "@nestjs/common";
import type {
  GoogleOAuthCallbackResponse,
  GoogleOAuthConfigKey,
  GoogleOAuthReadiness,
  GoogleOAuthStartResponse
} from "./auth.interfaces";

type OAuthConfigSource = {
  getValue: (key: GoogleOAuthConfigKey) => string | undefined;
};

export class EnvironmentGoogleOAuthConfigSource
  implements OAuthConfigSource
{
  public getValue(key: GoogleOAuthConfigKey): string | undefined {
    switch (key) {
      case "GOOGLE_CLIENT_ID":
        return process.env.GOOGLE_CLIENT_ID;
      case "GOOGLE_CLIENT_SECRET":
        return process.env.GOOGLE_CLIENT_SECRET;
      case "GOOGLE_CALLBACK_URL":
        return process.env.GOOGLE_CALLBACK_URL;
    }
  }
}

@Injectable()
export class AuthService {
  private readonly requiredConfiguration = [
    "GOOGLE_CLIENT_ID",
    "GOOGLE_CLIENT_SECRET",
    "GOOGLE_CALLBACK_URL"
  ] as const;

  public constructor(
    private readonly configSource: OAuthConfigSource = new EnvironmentGoogleOAuthConfigSource()
  ) {}

  public getGoogleOAuthReadiness(): GoogleOAuthReadiness {
    const missingConfiguration = this.requiredConfiguration.filter(
      (key) => !this.configSource.getValue(key)
    );

    return {
      provider: "google",
      protocol: "oauth2",
      callbackPath: "/auth/google/callback",
      requiredConfiguration: this.requiredConfiguration,
      missingConfiguration,
      configured: missingConfiguration.length === 0,
      implementationStatus:
        missingConfiguration.length === 0
          ? "ready-for-provider"
          : "configuration-required"
    };
  }

  public startGoogleOAuth(): GoogleOAuthStartResponse {
    const readiness = this.getGoogleOAuthReadiness();
    const missingConfiguration = readiness.missingConfiguration;

    return {
      provider: "google",
      status: readiness.configured
        ? "provider-integration-deferred"
        : "configuration-required",
      callbackPath: "/auth/google/callback",
      missingConfiguration
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
