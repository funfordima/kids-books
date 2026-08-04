export interface GoogleOAuthReadiness {
  provider: "google";
  protocol: "oauth2";
  callbackPath: "/auth/google/callback";
  requiredConfiguration: readonly [
    "GOOGLE_CLIENT_ID",
    "GOOGLE_CLIENT_SECRET",
    "GOOGLE_CALLBACK_URL"
  ];
  configured: false;
  implementationStatus: "packages-not-installed";
}

export interface GoogleOAuthStartResponse {
  provider: "google";
  status: "configuration-required";
  callbackPath: "/auth/google/callback";
  missingConfiguration: readonly [
    "GOOGLE_CLIENT_ID",
    "GOOGLE_CLIENT_SECRET",
    "GOOGLE_CALLBACK_URL"
  ];
}

export interface GoogleOAuthCallbackResponse {
  provider: "google";
  status: "session-exchange-not-implemented";
  authorizationCodeReceived: boolean;
}
