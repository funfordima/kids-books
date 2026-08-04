import { describe, expect, it } from "vitest";
import { AuthController } from "./auth.controller";
import { AuthModule } from "./auth.module";
import { AuthService } from "./auth.service";

describe("AuthService", () => {
  it("reports Google OAuth readiness without requiring OAuth packages", () => {
    const service = new AuthService();

    expect(service.getGoogleOAuthReadiness()).toEqual({
      provider: "google",
      protocol: "oauth2",
      callbackPath: "/auth/google/callback",
      requiredConfiguration: [
        "GOOGLE_CLIENT_ID",
        "GOOGLE_CLIENT_SECRET",
        "GOOGLE_CALLBACK_URL"
      ],
      configured: false,
      implementationStatus: "packages-not-installed"
    });
  });

  it("exposes the readiness contract through its controller", () => {
    const service = new AuthService();
    const controller = new AuthController(service);

    expect(controller.getGoogleOAuthReadiness()).toEqual(
      service.getGoogleOAuthReadiness()
    );
    expect(controller.startGoogleOAuth()).toEqual(service.startGoogleOAuth());
    expect(controller.handleGoogleCallback("code-123")).toEqual(
      service.handleGoogleCallback("code-123")
    );
    expect(AuthModule).toBeDefined();
  });

  it("reports callback code presence without exchanging a session", () => {
    const service = new AuthService();

    expect(service.startGoogleOAuth()).toEqual({
      provider: "google",
      status: "configuration-required",
      callbackPath: "/auth/google/callback",
      missingConfiguration: [
        "GOOGLE_CLIENT_ID",
        "GOOGLE_CLIENT_SECRET",
        "GOOGLE_CALLBACK_URL"
      ]
    });
    expect(service.handleGoogleCallback("code-123")).toEqual({
      provider: "google",
      status: "session-exchange-not-implemented",
      authorizationCodeReceived: true
    });
    expect(service.handleGoogleCallback()).toEqual({
      provider: "google",
      status: "session-exchange-not-implemented",
      authorizationCodeReceived: false
    });
  });
});
