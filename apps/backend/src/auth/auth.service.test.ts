import { describe, expect, it } from "vitest";
import { AuthController } from "./auth.controller";
import { AuthModule } from "./auth.module";
import { AuthService } from "./auth.service";
import type {
  GoogleOAuthConfigKey,
  GoogleOAuthConfigSource
} from "./auth.interfaces";

class StubGoogleOAuthConfigSource implements GoogleOAuthConfigSource {
  public constructor(
    private readonly values: Partial<Record<GoogleOAuthConfigKey, string>>
  ) {}

  public getValue(key: GoogleOAuthConfigKey): string | undefined {
    switch (key) {
      case "GOOGLE_CLIENT_ID":
        return this.values.GOOGLE_CLIENT_ID;
      case "GOOGLE_CLIENT_SECRET":
        return this.values.GOOGLE_CLIENT_SECRET;
      case "GOOGLE_CALLBACK_URL":
        return this.values.GOOGLE_CALLBACK_URL;
    }
  }
}

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
      missingConfiguration: [
        "GOOGLE_CLIENT_ID",
        "GOOGLE_CLIENT_SECRET",
        "GOOGLE_CALLBACK_URL"
      ],
      configured: false,
      implementationStatus: "configuration-required"
    });
  });

  it("reports provider readiness from a replaceable config source", () => {
    const service = new AuthService(
      new StubGoogleOAuthConfigSource({
        GOOGLE_CLIENT_ID: "client-id",
        GOOGLE_CLIENT_SECRET: "client-secret",
        GOOGLE_CALLBACK_URL: "https://example.test/auth/google/callback"
      })
    );

    expect(service.getGoogleOAuthReadiness()).toMatchObject({
      configured: true,
      missingConfiguration: [],
      implementationStatus: "ready-for-provider"
    });
    expect(service.startGoogleOAuth()).toEqual({
      provider: "google",
      status: "provider-integration-deferred",
      callbackPath: "/auth/google/callback",
      missingConfiguration: []
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
