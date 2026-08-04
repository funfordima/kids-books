export type GoogleOAuthConfigKey =
  | "GOOGLE_CLIENT_ID"
  | "GOOGLE_CLIENT_SECRET"
  | "GOOGLE_CALLBACK_URL";

export interface GoogleOAuthConfigSource {
  getValue(key: GoogleOAuthConfigKey): string | undefined;
}

export interface GoogleOAuthReadiness {
  provider: "google";
  protocol: "oauth2";
  callbackPath: "/auth/google/callback";
  requiredConfiguration: readonly GoogleOAuthConfigKey[];
  missingConfiguration: readonly GoogleOAuthConfigKey[];
  configured: boolean;
  implementationStatus: "ready-for-provider" | "configuration-required";
}

export interface GoogleOAuthStartResponse {
  provider: "google";
  status: "provider-integration-deferred" | "configuration-required";
  callbackPath: "/auth/google/callback";
  missingConfiguration: readonly GoogleOAuthConfigKey[];
}

export interface GoogleOAuthCallbackResponse {
  provider: "google";
  status: "session-exchange-not-implemented";
  authorizationCodeReceived: boolean;
}
