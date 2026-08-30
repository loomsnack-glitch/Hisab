import { beforeEach, describe, expect, mock, test } from "bun:test";
import { GOOGLE_CONTACTS_WRITE_SCOPE } from "./google-contacts.oauth";
import {
  completeGoogleContactsOAuth,
  startGoogleContactsOAuth,
  getGoogleContactsSyncStatusForOrganization,
  type GoogleContactsServiceDependencies,
} from "./google-contacts.service";
import { createGoogleContactsOAuthState } from "./google-contacts.oauth-state";

const ORGANIZATION_ID = "aac5e7a9-7b0d-4842-ab6c-ab2f4e21b865";
const OTHER_ORGANIZATION_ID = "651d3470-af47-47c6-9153-8f00ac45b12f";
const USER_ID = "17268fe9-9f75-4ebe-9997-9d73b2a3e996";
const SECRET = "local-test-secret-that-is-long-enough-32";

const disconnected = {
  connectionStatus: "disconnected" as const,
  googleAccountEmail: null,
  connectedAt: null,
  initialSyncStatus: "not_started" as const,
  lastSuccessfulSyncAt: null,
  pendingCount: 0,
  retryingCount: 0,
  errorCount: 0,
  conflictCount: 0,
  contactNamePrefix: "",
  contactNamePostfix: "",
};

const connected = {
  connectionStatus: "connected" as const,
  googleAccountEmail: "owner@example.com",
  connectedAt: "2026-08-26T06:00:00.000Z",
  initialSyncStatus: "not_started" as const,
  lastSuccessfulSyncAt: null,
  pendingCount: 0,
  retryingCount: 0,
  errorCount: 0,
  conflictCount: 0,
  contactNamePrefix: "",
  contactNamePostfix: "",
};

const reconnectRequired = {
  connectionStatus: "reconnect_required" as const,
  googleAccountEmail: "owner@example.com",
  connectedAt: "2026-08-26T06:00:00.000Z",
  initialSyncStatus: "not_started" as const,
  lastSuccessfulSyncAt: null,
  pendingCount: 0,
  retryingCount: 0,
  errorCount: 0,
  conflictCount: 0,
  contactNamePrefix: "",
  contactNamePostfix: "",
};

const connecting = {
  connectionStatus: "connecting" as const,
  googleAccountEmail: null,
  connectedAt: null,
  initialSyncStatus: "not_started" as const,
  lastSuccessfulSyncAt: null,
  pendingCount: 0,
  retryingCount: 0,
  errorCount: 0,
  conflictCount: 0,
  contactNamePrefix: "",
  contactNamePostfix: "",
};

const credentials = {
  accessToken: "access-token-must-not-escape",
  refreshToken: "refresh-token-must-not-escape",
  expiresAt: Date.UTC(2026, 7, 26, 7, 0, 0),
  tokenType: "Bearer",
  scope: GOOGLE_CONTACTS_WRITE_SCOPE,
};

const createDeps = (overrides: Partial<GoogleContactsServiceDependencies> = {}): GoogleContactsServiceDependencies => ({
  getOrganizationByIdForUser: mock(async () => ({ id: ORGANIZATION_ID })),
  createOAuthStateRecord: mock(async () => {}),
  replayStore: { consume: mock(async () => true) },
  getStatus: mock(async () => disconnected),
  getLifecycle: mock(async () => null),
  beginAttempt: mock(async () => ({
    started: true,
    status: connecting,
  })),
  completeConnection: mock(async () => connected),
  revertConnecting: mock(async () => disconnected),
  disconnectConnection: mock(async () => ({
    disconnected: false,
    credential: null,
  })),
  scheduleInitialCatchUp: mock(async () => connected),
  updateNameAffix: mock(async () => ({ status: connected, changed: false })),
  scheduleDisplayNameRefresh: mock(async () => connected),
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
    buildAuthorizationUrl: (state) =>
      `https://accounts.google.com/o/oauth2/v2/auth?state=${encodeURIComponent(state)}&client_id=public-id`,
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

describe("Google Contacts connection service", () => {
  beforeEach(() => {
    process.env.GOOGLE_CONTACTS_OAUTH_STATE_SECRET = SECRET;
    process.env.GOOGLE_CONTACTS_CLIENT_ID = "google-client-id";
    process.env.GOOGLE_CONTACTS_CLIENT_SECRET = "google-client-secret";
    process.env.GOOGLE_CONTACTS_OAUTH_REDIRECT_URI = "http://localhost:5173/google-contacts/oauth/callback";
  });

  test("returns disconnected status for an authorized Organization", async () => {
    const deps = createDeps();
    const response = await getGoogleContactsSyncStatusForOrganization(USER_ID, ORGANIZATION_ID, deps);

    expect(response).toMatchObject({
      status: "success",
      code: 200,
      data: disconnected,
    });
    expect(JSON.stringify(response)).not.toContain("refresh-token");
    expect(JSON.stringify(response)).not.toContain("access-token");
  });

  test("does not expose status for an Organization the user cannot access", async () => {
    const deps = createDeps({
      getOrganizationByIdForUser: mock(async () => null),
    });

    const response = await getGoogleContactsSyncStatusForOrganization(USER_ID, OTHER_ORGANIZATION_ID, deps);

    expect(response).toMatchObject({ status: "error", code: 404, data: null });
    expect(deps.getStatus).not.toHaveBeenCalled();
  });

  test("starts OAuth for a disconnected Organization and returns only the authorization URL", async () => {
    const deps = createDeps();
    const response = await startGoogleContactsOAuth(USER_ID, ORGANIZATION_ID, deps);

    expect(response).toMatchObject({
      status: "success",
      code: 201,
    });
    expect(response.data?.authorizationUrl).toContain("accounts.google.com");
    expect(response.data?.authorizationUrl).not.toContain("google-client-secret");
    expect(JSON.stringify(response)).not.toContain("google-client-secret");
    expect(deps.createOAuthStateRecord).toHaveBeenCalled();
    expect(deps.beginAttempt).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: ORGANIZATION_ID,
        createdBy: USER_ID,
        oauthAttemptNonceHash: expect.stringMatching(/^[0-9a-f]{64}$/),
      }),
    );
  });

  test("rejects OAuth start when Google Contacts is already connected", async () => {
    const deps = createDeps({
      getStatus: mock(async () => connected),
    });

    const response = await startGoogleContactsOAuth(USER_ID, ORGANIZATION_ID, deps);

    expect(response).toMatchObject({
      status: "error",
      code: 409,
      message: "Google Contacts is already connected",
      data: null,
    });
    expect(deps.createOAuthStateRecord).not.toHaveBeenCalled();
  });

  test("supersedes a stale connecting OAuth attempt", async () => {
    const deps = createDeps({
      getStatus: mock(async () => connecting),
    });

    const response = await startGoogleContactsOAuth(USER_ID, ORGANIZATION_ID, deps);

    expect(response).toMatchObject({
      status: "success",
      code: 201,
    });
    expect(deps.beginAttempt).toHaveBeenCalled();
    expect(deps.createOAuthStateRecord).toHaveBeenCalled();
  });

  test("allows OAuth start from reconnect-required without replacing a connected account", async () => {
    const deps = createDeps({
      getStatus: mock(async () => reconnectRequired),
    });

    const response = await startGoogleContactsOAuth(USER_ID, ORGANIZATION_ID, deps);

    expect(response.status).toBe("success");
    expect(deps.beginAttempt).toHaveBeenCalled();
  });

  test("completes OAuth without returning Google credentials", async () => {
    const state = createGoogleContactsOAuthState({
      organizationId: ORGANIZATION_ID,
      userId: USER_ID,
      secret: SECRET,
      nonce: () => "a".repeat(32),
    });
    const deps = createDeps({ getStatus: mock(async () => connecting) });
    const response = await completeGoogleContactsOAuth(
      USER_ID,
      ORGANIZATION_ID,
      { state: state.token, code: "authorization-code" },
      deps,
    );

    expect(response).toMatchObject({
      status: "success",
      code: 200,
      data: connected,
    });
    expect(deps.vault.store).toHaveBeenCalled();
    expect(deps.completeConnection).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: ORGANIZATION_ID,
        googleAccountEmail: "owner@example.com",
        oauthAttemptNonceHash: expect.stringMatching(/^[0-9a-f]{64}$/),
        credential: {
          reference: "db-secret:11111111-1111-4111-8111-111111111111",
          keyVersion: "v1",
        },
      }),
    );
    const serialized = JSON.stringify(response);
    expect(serialized).not.toContain("refresh-token-must-not-escape");
    expect(serialized).not.toContain("access-token-must-not-escape");
    expect(serialized).not.toContain("db-secret:");
    expect(serialized).not.toContain("google-subject-1");
  });

  test("does not persist a connection when Google token exchange fails", async () => {
    const state = createGoogleContactsOAuthState({
      organizationId: ORGANIZATION_ID,
      userId: USER_ID,
      secret: SECRET,
      nonce: () => "a".repeat(32),
    });
    const deps = createDeps({
      getStatus: mock(async () => connecting),
      oauth: {
        buildAuthorizationUrl: () => "https://accounts.google.com/o/oauth2/v2/auth",
        exchangeAuthorizationCode: mock(async () => {
          throw new Error("refresh-token-must-not-escape");
        }),
        refreshAccessToken: mock(async () => {
          throw new Error("must not refresh during failed exchange");
        }),
        getAccountIdentity: mock(async () => ({
          subject: "google-subject-1",
          email: "owner@example.com",
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
      status: "error",
      code: 400,
      data: null,
    });
    expect(JSON.stringify(response)).not.toContain("refresh-token-must-not-escape");
    expect(deps.vault.store).not.toHaveBeenCalled();
    expect(deps.completeConnection).not.toHaveBeenCalled();
  });

  test("returns cancelled status when Google consent is denied", async () => {
    const state = createGoogleContactsOAuthState({
      organizationId: ORGANIZATION_ID,
      userId: USER_ID,
      secret: SECRET,
      nonce: () => "a".repeat(32),
    });
    const deps = createDeps({ getStatus: mock(async () => connecting) });

    const response = await completeGoogleContactsOAuth(
      USER_ID,
      ORGANIZATION_ID,
      { state: state.token, error: "access_denied" },
      deps,
    );

    expect(response).toMatchObject({
      status: "success",
      code: 200,
      data: disconnected,
    });
    expect(deps.oauth.exchangeAuthorizationCode).not.toHaveBeenCalled();
    expect(deps.revertConnecting).toHaveBeenCalledWith({
      organizationId: ORGANIZATION_ID,
      oauthAttemptNonceHash: expect.stringMatching(/^[0-9a-f]{64}$/),
    });
  });

  test("rejects a callback bound to a different Organization", async () => {
    const state = createGoogleContactsOAuthState({
      organizationId: ORGANIZATION_ID,
      userId: USER_ID,
      secret: SECRET,
      nonce: () => "a".repeat(32),
    });
    const deps = createDeps({
      getStatus: mock(async () => connecting),
      getOrganizationByIdForUser: mock(async () => ({
        id: OTHER_ORGANIZATION_ID,
      })),
    });

    const response = await completeGoogleContactsOAuth(
      USER_ID,
      OTHER_ORGANIZATION_ID,
      { state: state.token, code: "authorization-code" },
      deps,
    );

    expect(response).toMatchObject({ status: "error", code: 400, data: null });
    expect(deps.oauth.exchangeAuthorizationCode).not.toHaveBeenCalled();
  });

  test("does not connect when a stale callback no longer owns the attempt", async () => {
    const state = createGoogleContactsOAuthState({
      organizationId: ORGANIZATION_ID,
      userId: USER_ID,
      secret: SECRET,
      nonce: () => "a".repeat(32),
    });
    const deps = createDeps({
      getStatus: mock(async () => connecting),
      completeConnection: mock(async () => null),
    });

    const response = await completeGoogleContactsOAuth(
      USER_ID,
      ORGANIZATION_ID,
      { state: state.token, code: "authorization-code" },
      deps,
    );

    expect(response).toMatchObject({
      status: "error",
      code: 409,
      message: "Google Contacts authorization is no longer active",
      data: null,
    });
    expect(deps.vault.revoke).toHaveBeenCalled();
  });

  test("leaves the active credential intact when a stale reconnect callback loses its attempt", async () => {
    const state = createGoogleContactsOAuthState({
      organizationId: ORGANIZATION_ID,
      userId: USER_ID,
      secret: SECRET,
      nonce: () => "a".repeat(32),
    });
    const activeBinding = {
      reference: "db-secret:22222222-2222-4222-8222-222222222222",
      keyVersion: "v1",
    };
    const candidateBinding = {
      reference: "db-secret:33333333-3333-4333-8333-333333333333",
      keyVersion: "v1",
    };
    const deps = createDeps({
      getStatus: mock(async () => connecting),
      getLifecycle: mock(async () => ({
        connectionId: "33333333-3333-4333-8333-333333333333",
        status: "connecting",
        googleAccountSubject: "google-subject-1",
        credential: activeBinding,
        oauthAttemptIntent: "reconnect" as const,
      })),
      completeConnection: mock(async () => null),
      vault: {
        store: mock(async () => candidateBinding),
        resolve: mock(async () => credentials),
        rotate: mock(async () => {
          throw new Error("must not rotate the active credential");
        }),
        revoke: mock(async () => {}),
      },
    });

    const response = await completeGoogleContactsOAuth(
      USER_ID,
      ORGANIZATION_ID,
      { state: state.token, code: "authorization-code" },
      deps,
    );

    expect(response).toMatchObject({ status: "error", code: 409, data: null });
    expect(deps.vault.rotate).not.toHaveBeenCalled();
    expect(deps.vault.revoke).toHaveBeenCalledWith(candidateBinding);
    expect(deps.vault.revoke).not.toHaveBeenCalledWith(activeBinding);
  });

  test("reports missing OAuth configuration without exposing internals", async () => {
    delete process.env.GOOGLE_CONTACTS_OAUTH_STATE_SECRET;
    const deps = createDeps();

    const response = await startGoogleContactsOAuth(USER_ID, ORGANIZATION_ID, deps);

    expect(response).toMatchObject({
      status: "error",
      code: 503,
      message: "Google Contacts Synchronization is not configured",
      data: null,
    });
    expect(deps.createOAuthStateRecord).not.toHaveBeenCalled();
  });
});
