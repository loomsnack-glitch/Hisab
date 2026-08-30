import { describe, expect, test } from "bun:test";
import {
  buildGoogleContactsAuthorizationUrl,
  GOOGLE_CONTACTS_WRITE_SCOPE,
  GOOGLE_REVOKE_ENDPOINT,
  GOOGLE_USERINFO_EMAIL_SCOPE,
  GoogleContactsOAuthError,
  parseGoogleAccountIdentityForTest,
  parseGoogleContactsTokenResponseForTest,
} from "./google-contacts.oauth";

describe("Google Contacts OAuth provider", () => {
  test("builds an authorization URL with Contacts write scope and offline access", () => {
    const url = new URL(
      buildGoogleContactsAuthorizationUrl("signed-state", {
        clientId: "google-client-id",
        redirectUri: "http://localhost:5173/google-contacts/oauth/callback",
      }),
    );

    expect(url.origin + url.pathname).toBe(
      "https://accounts.google.com/o/oauth2/v2/auth",
    );
    expect(url.searchParams.get("client_id")).toBe("google-client-id");
    expect(url.searchParams.get("redirect_uri")).toBe(
      "http://localhost:5173/google-contacts/oauth/callback",
    );
    expect(url.searchParams.get("response_type")).toBe("code");
    expect(url.searchParams.get("access_type")).toBe("offline");
    expect(url.searchParams.get("prompt")).toBe("consent");
    expect(url.searchParams.get("state")).toBe("signed-state");
    expect(url.searchParams.get("scope")).toContain(GOOGLE_CONTACTS_WRITE_SCOPE);
    expect(url.searchParams.get("scope")).toContain(GOOGLE_USERINFO_EMAIL_SCOPE);
    expect(url.search).not.toContain("client_secret");
    expect(url.search).not.toContain("refresh_token");
  });

  test("asks Google for account selection during replacement without changing the Contacts write scope", () => {
    const url = new URL(
      buildGoogleContactsAuthorizationUrl(
        "signed-state",
        {
          clientId: "google-client-id",
          redirectUri: "https://admin.ganatri.in/google-contacts/oauth/callback",
        },
        { prompt: "select_account consent" },
      ),
    );

    expect(url.searchParams.get("prompt")).toBe("select_account consent");
    expect(url.searchParams.get("redirect_uri")).toBe(
      "https://admin.ganatri.in/google-contacts/oauth/callback",
    );
    expect(url.searchParams.get("scope")).toContain(GOOGLE_CONTACTS_WRITE_SCOPE);
    expect(url.search).not.toContain("client_secret");
  });

  test("revokes Google authorization at the token endpoint rather than deleting Contacts", () => {
    expect(GOOGLE_REVOKE_ENDPOINT).toBe("https://oauth2.googleapis.com/revoke");
    expect(GOOGLE_REVOKE_ENDPOINT).not.toContain("people");
    expect(GOOGLE_REVOKE_ENDPOINT).not.toContain("deleteContact");
  });

  test("parses a token response without exposing it through thrown errors", () => {
    const payload = parseGoogleContactsTokenResponseForTest(
      {
        access_token: "  access-token  ",
        refresh_token: "refresh-token",
        expires_in: 3600,
        token_type: "Bearer",
        scope: GOOGLE_CONTACTS_WRITE_SCOPE,
      },
      Date.UTC(2026, 7, 26, 6, 0, 0),
    );

    expect(payload).toEqual({
      accessToken: "access-token",
      refreshToken: "refresh-token",
      expiresAt: Date.UTC(2026, 7, 26, 7, 0, 0),
      tokenType: "Bearer",
      scope: GOOGLE_CONTACTS_WRITE_SCOPE,
    });
    expect(() =>
      parseGoogleContactsTokenResponseForTest({ access_token: "only-access" }, 0),
    ).toThrow(GoogleContactsOAuthError);
  });

  test("requires a verified Google account email for display identity", () => {
    expect(
      parseGoogleAccountIdentityForTest({
        sub: "google-subject-1",
        email: "Owner@Example.com",
      }),
    ).toEqual({
      subject: "google-subject-1",
      email: "owner@example.com",
    });
    expect(() =>
      parseGoogleAccountIdentityForTest({ sub: "google-subject-1" }),
    ).toThrow("identity is unavailable");
  });
});
