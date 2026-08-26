import { beforeEach, describe, expect, mock, test } from "bun:test";
import { GOOGLE_CONTACTS_WRITE_SCOPE } from "./google-contacts.oauth";
import { createGoogleContactsOAuthState } from "./google-contacts.oauth-state";
import {
  completeGoogleContactsOAuth,
  disconnectGoogleContactsForOrganization,
  startGoogleContactsAccountReplacement,
  startGoogleContactsOAuth,
  type GoogleContactsServiceDependencies,
} from "./google-contacts.service";

const ORGANIZATION_ID = "aac5e7a9-7b0d-4842-ab6c-ab2f4e21b865";
const USER_ID = "17268fe9-9f75-4ebe-9997-9d73b2a3e996";
const SECRET = "local-test-secret-that-is-long-enough-32";

const disconnected = {
  connectionStatus: "disconnected" as const,
  googleAccountEmail: null,
  connectedAt: null,
  initialSyncStatus: "not_started" as const,
  lastSuccessfulSyncAt: null,
  pendingCount: 0,
  errorCount: 0,
  conflictCount: 0,
};

const connected = {
  connectionStatus: "connected" as const,
  googleAccountEmail: "owner@example.com",
  connectedAt: "2026-08-26T06:00:00.000Z",
  initialSyncStatus: "completed" as const,
  lastSuccessfulSyncAt: "2026-08-26T07:15:00.000Z",
  pendingCount: 2,
  errorCount: 0,
  conflictCount: 0,
};

const reconnectRequired = {
  ...connected,
  connectionStatus: "reconnect_required" as const,
};

const connecting = {
  connectionStatus: "connecting" as const,
  googleAccountEmail: "owner@example.com",
  connectedAt: "2026-08-26T06:00:00.000Z",
  initialSyncStatus: "completed" as const,
  lastSuccessfulSyncAt: "2026-08-26T07:15:00.000Z",
  pendingCount: 2,
  errorCount: 0,
  conflictCount: 0,
};

const replacementConnected = {
  connectionStatus: "connected" as const,
  googleAccountEmail: "shared@example.com",
  connectedAt: "2026-08-26T08:00:00.000Z",
  initialSyncStatus: "not_started" as const,
  lastSuccessfulSyncAt: null,
  pendingCount: 0,
  errorCount: 0,
  conflictCount: 0,
};

const credentials = {
  accessToken: "access-token-must-not-escape",
  refreshToken: "refresh-token-must-not-escape",
  expiresAt: Date.UTC(2026, 7, 26, 7, 0, 0),
  tokenType: "Bearer",
  scope: GOOGLE_CONTACTS_WRITE_SCOPE,
};

const activeBinding = {
  reference: "db-secret:22222222-2222-4222-8222-222222222222",
  keyVersion: "v1",
};

const createDeps = (
  overrides: Partial<GoogleContactsServiceDependencies> = {},
): GoogleContactsServiceDependencies => ({
  getOrganizationByIdForUser: mock(async () => ({ id: ORGANIZATION_ID })),
  createOAuthStateRecord: mock(async () => {}),
  replayStore: { consume: mock(async () => true) },
  getStatus: mock(async () => connected),
  getLifecycle: mock(async () => ({
    connectionId: "33333333-3333-4333-8333-333333333333",
    status: "connected",
    googleAccountSubject: "google-subject-1",
    credential: activeBinding,
    oauthAttemptIntent: null,
  })),
  beginAttempt: mock(async () => ({
    started: true,
    status: connecting,
  })),
  completeConnection: mock(async () => connected),
  revertConnecting: mock(async () => connected),
  disconnectConnection: mock(async () => ({
    disconnected: true,
    credential: activeBinding,
  })),
  scheduleInitialCatchUp: mock(async () => connected),
  vault: {
    store: mock(async () => ({
      reference: "db-secret:11111111-1111-4111-8111-111111111111",
      keyVersion: "v1",
    })),
    resolve: mock(async () => credentials),
    rotate: mock(async () => ({
      reference: "db-secret:11111111-1111-4111-8111-111111111111",
      keyVersion: "v1",
    })),
    revoke: mock(async () => {}),
  },
  oauth: {
    buildAuthorizationUrl: (state, options) => {
      const prompt = options?.prompt ? `&prompt=${encodeURIComponent(options.prompt)}` : "";
      return `https://accounts.google.com/o/oauth2/v2/auth?state=${encodeURIComponent(state)}${prompt}&client_id=public-id`;
    },
    exchangeAuthorizationCode: mock(async () => credentials),
    refreshAccessToken: mock(async () => credentials),
    getAccountIdentity: mock(async () => ({
      subject: "google-subject-1",
      email: "owner@example.com",
    })),
    revokeAuthorization: mock(async () => {}),
  },
  ...overrides,
});

describe("Google Contacts connection lifecycle", () => {
  beforeEach(() => {
    process.env.GOOGLE_CONTACTS_OAUTH_STATE_SECRET = SECRET;
    process.env.GOOGLE_CONTACTS_CLIENT_ID = "google-client-id";
    process.env.GOOGLE_CONTACTS_CLIENT_SECRET = "google-client-secret";
    process.env.GOOGLE_CONTACTS_OAUTH_REDIRECT_URI =
      "http://localhost:5173/google-contacts/oauth/callback";
  });

  test("reconnects a reconnect-required connection without resetting the destination", async () => {
    const startDeps = createDeps({
      getStatus: mock(async () => reconnectRequired),
    });
    const started = await startGoogleContactsOAuth(USER_ID, ORGANIZATION_ID, startDeps);
    expect(started.status).toBe("success");
    expect(startDeps.beginAttempt).toHaveBeenCalledWith(
      expect.objectContaining({ intent: "reconnect" }),
    );

    const state = createGoogleContactsOAuthState({
      organizationId: ORGANIZATION_ID,
      userId: USER_ID,
      secret: SECRET,
      nonce: () => "a".repeat(32),
    });
    const deps = createDeps({
      getStatus: mock(async () => connecting),
      getLifecycle: mock(async () => ({
        connectionId: "33333333-3333-4333-8333-333333333333",
        status: "connecting",
        googleAccountSubject: "google-subject-1",
        credential: activeBinding,
        oauthAttemptIntent: "reconnect" as const,
      })),
    });

    const completed = await completeGoogleContactsOAuth(
      USER_ID,
      ORGANIZATION_ID,
      { state: state.token, code: "authorization-code" },
      deps,
    );

    expect(completed).toMatchObject({
      status: "success",
      code: 200,
      data: connected,
    });
    expect(deps.completeConnection).toHaveBeenCalledWith(
      expect.objectContaining({
        googleAccountSubject: "google-subject-1",
        resetDestination: false,
      }),
    );
    expect(JSON.stringify(completed)).not.toContain("refresh-token-must-not-escape");
  });

  test("disconnects immediately, revokes local authorization, and never deletes Google Contacts", async () => {
    const deps = createDeps({
      getStatus: mock(async () => disconnected),
    });

    const response = await disconnectGoogleContactsForOrganization(
      USER_ID,
      ORGANIZATION_ID,
      deps,
    );

    expect(response).toMatchObject({
      status: "success",
      code: 200,
      data: disconnected,
    });
    expect(deps.disconnectConnection).toHaveBeenCalledWith(ORGANIZATION_ID);
    expect(deps.vault.revoke).toHaveBeenCalledWith(activeBinding);
    expect(deps.oauth.revokeAuthorization).toHaveBeenCalledWith(
      "refresh-token-must-not-escape",
    );
    expect(deps.scheduleInitialCatchUp).not.toHaveBeenCalled();
    expect(JSON.stringify(response)).not.toContain("refresh-token-must-not-escape");
    expect(JSON.stringify(response)).not.toContain("access-token-must-not-escape");
  });

  test("does not disconnect an Organization the user cannot access", async () => {
    const deps = createDeps({
      getOrganizationByIdForUser: mock(async () => null),
    });

    const response = await disconnectGoogleContactsForOrganization(
      USER_ID,
      ORGANIZATION_ID,
      deps,
    );

    expect(response).toMatchObject({ status: "error", code: 404, data: null });
    expect(deps.disconnectConnection).not.toHaveBeenCalled();
    expect(deps.vault.revoke).not.toHaveBeenCalled();
  });

  test("starts replacement OAuth for a connected account and asks Google for account selection", async () => {
    const deps = createDeps();
    const response = await startGoogleContactsAccountReplacement(
      USER_ID,
      ORGANIZATION_ID,
      deps,
    );

    expect(response).toMatchObject({ status: "success", code: 201 });
    expect(response.data?.authorizationUrl).toContain("accounts.google.com");
    expect(response.data?.authorizationUrl).toContain("select_account");
    expect(deps.beginAttempt).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: ORGANIZATION_ID,
        intent: "replace",
        oauthAttemptNonceHash: expect.stringMatching(/^[0-9a-f]{64}$/),
      }),
    );
    expect(JSON.stringify(response)).not.toContain("google-client-secret");
  });

  test("rejects replacement when Google Contacts is disconnected", async () => {
    const deps = createDeps({
      getStatus: mock(async () => disconnected),
    });

    const response = await startGoogleContactsAccountReplacement(
      USER_ID,
      ORGANIZATION_ID,
      deps,
    );

    expect(response).toMatchObject({
      status: "error",
      code: 409,
      message: "Google Contacts is not connected",
      data: null,
    });
    expect(deps.beginAttempt).not.toHaveBeenCalled();
  });

  test("replacing with a different Google account resets local destination state and leaves the old account untouched", async () => {
    const state = createGoogleContactsOAuthState({
      organizationId: ORGANIZATION_ID,
      userId: USER_ID,
      secret: SECRET,
      nonce: () => "a".repeat(32),
    });
    const replacementBinding = {
      reference: "db-secret:44444444-4444-4444-8444-444444444444",
      keyVersion: "v1",
    };
    const deps = createDeps({
      getStatus: mock(async () => connecting),
      getLifecycle: mock(async () => ({
        connectionId: "33333333-3333-4333-8333-333333333333",
        status: "connecting",
        googleAccountSubject: "google-subject-1",
        credential: activeBinding,
        oauthAttemptIntent: "replace" as const,
      })),
      completeConnection: mock(async () => replacementConnected),
      vault: {
        store: mock(async () => replacementBinding),
        resolve: mock(async () => credentials),
        rotate: mock(async () => replacementBinding),
        revoke: mock(async () => {}),
      },
      oauth: {
        buildAuthorizationUrl: () => "https://accounts.google.com/o/oauth2/v2/auth",
        exchangeAuthorizationCode: mock(async () => credentials),
        refreshAccessToken: mock(async () => credentials),
        getAccountIdentity: mock(async () => ({
          subject: "google-subject-replacement",
          email: "shared@example.com",
        })),
        revokeAuthorization: mock(async () => {}),
      },
    });

    const response = await completeGoogleContactsOAuth(
      USER_ID,
      ORGANIZATION_ID,
      { state: state.token, code: "authorization-code" },
      deps,
    );

    expect(response).toMatchObject({
      status: "success",
      code: 200,
      data: replacementConnected,
    });
    expect(deps.completeConnection).toHaveBeenCalledWith(
      expect.objectContaining({
        googleAccountEmail: "shared@example.com",
        googleAccountSubject: "google-subject-replacement",
        resetDestination: true,
        credential: replacementBinding,
      }),
    );
    expect(deps.vault.revoke).toHaveBeenCalledWith(activeBinding);
    expect(deps.oauth.revokeAuthorization).toHaveBeenCalledWith(
      "refresh-token-must-not-escape",
    );
    expect(response.data?.initialSyncStatus).toBe("not_started");
    expect(JSON.stringify(response)).not.toContain("refresh-token-must-not-escape");
    expect(JSON.stringify(response)).not.toContain("google-subject-replacement");
  });

  test("cancelling replacement restores the still-authorized connected account", async () => {
    const state = createGoogleContactsOAuthState({
      organizationId: ORGANIZATION_ID,
      userId: USER_ID,
      secret: SECRET,
      nonce: () => "a".repeat(32),
    });
    const deps = createDeps({
      getStatus: mock(async () => connecting),
    });

    const response = await completeGoogleContactsOAuth(
      USER_ID,
      ORGANIZATION_ID,
      { state: state.token, error: "access_denied" },
      deps,
    );

    expect(response).toMatchObject({
      status: "success",
      code: 200,
      data: connected,
    });
    expect(deps.revertConnecting).toHaveBeenCalledWith({
      organizationId: ORGANIZATION_ID,
      oauthAttemptNonceHash: expect.stringMatching(/^[0-9a-f]{64}$/),
    });
    expect(deps.vault.revoke).not.toHaveBeenCalled();
    expect(deps.oauth.exchangeAuthorizationCode).not.toHaveBeenCalled();
  });
});
