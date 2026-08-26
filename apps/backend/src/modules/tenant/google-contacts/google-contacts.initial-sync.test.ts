import { beforeEach, describe, expect, mock, test } from "bun:test";
import { startGoogleContactsInitialSync } from "./google-contacts.service";
import type { GoogleContactsServiceDependencies } from "./google-contacts.service";
import { GOOGLE_CONTACTS_WRITE_SCOPE } from "./google-contacts.oauth";

const ORGANIZATION_ID = "aac5e7a9-7b0d-4842-ab6c-ab2f4e21b865";
const USER_ID = "17268fe9-9f75-4ebe-9997-9d73b2a3e996";

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
  initialSyncStatus: "not_started" as const,
  lastSuccessfulSyncAt: null,
  pendingCount: 0,
  errorCount: 0,
  conflictCount: 0,
};

const pending = {
  ...connected,
  initialSyncStatus: "pending" as const,
  pendingCount: 3,
};

const createDeps = (
  overrides: Partial<GoogleContactsServiceDependencies> = {},
): GoogleContactsServiceDependencies => ({
  getOrganizationByIdForUser: mock(async () => ({ id: ORGANIZATION_ID })),
  createOAuthStateRecord: mock(async () => {}),
  replayStore: { consume: mock(async () => true) },
  getStatus: mock(async () => connected),
  getBinding: mock(async () => null),
  beginAttempt: mock(async () => ({
    started: true,
    status: disconnected,
  })),
  completeConnection: mock(async () => connected),
  revertConnecting: mock(async () => disconnected),
  scheduleInitialCatchUp: mock(async () => pending),
  vault: {
    store: mock(async () => ({
      reference: "db-secret:11111111-1111-4111-8111-111111111111",
      keyVersion: "v1",
    })),
    resolve: mock(async () => ({
      accessToken: "access-token-must-not-escape",
      refreshToken: "refresh-token-must-not-escape",
      expiresAt: Date.UTC(2026, 7, 26, 7, 0, 0),
      tokenType: "Bearer",
      scope: GOOGLE_CONTACTS_WRITE_SCOPE,
    })),
    rotate: mock(async () => ({
      reference: "db-secret:11111111-1111-4111-8111-111111111111",
      keyVersion: "v1",
    })),
    revoke: mock(async () => {}),
  },
  oauth: {
    buildAuthorizationUrl: () => "https://accounts.google.com/o/oauth2/v2/auth",
    exchangeAuthorizationCode: mock(async () => {
      throw new Error("must not exchange tokens during initial sync");
    }),
    refreshAccessToken: mock(async () => {
      throw new Error("must not refresh tokens during initial sync");
    }),
    getAccountIdentity: mock(async () => {
      throw new Error("must not read Google identity during initial sync");
    }),
  },
  ...overrides,
});

describe("Google Contacts initial catch-up scheduling", () => {
  beforeEach(() => {
    process.env.GOOGLE_CONTACTS_OAUTH_STATE_SECRET = "local-test-secret-that-is-long-enough-32";
  });

  test("schedules eligible Customers for a connected Organization without calling Google", async () => {
    const deps = createDeps();
    const response = await startGoogleContactsInitialSync(USER_ID, ORGANIZATION_ID, deps);

    expect(response).toMatchObject({
      status: "success",
      code: 202,
      data: pending,
    });
    expect(deps.scheduleInitialCatchUp).toHaveBeenCalledWith(ORGANIZATION_ID);
    expect(deps.oauth.exchangeAuthorizationCode).not.toHaveBeenCalled();
    expect(deps.oauth.getAccountIdentity).not.toHaveBeenCalled();
    expect(JSON.stringify(response)).not.toContain("access-token");
    expect(JSON.stringify(response)).not.toContain("refresh-token");
  });

  test("does not schedule catch-up when Google Contacts is not connected", async () => {
    const deps = createDeps({
      getStatus: mock(async () => disconnected),
    });

    const response = await startGoogleContactsInitialSync(USER_ID, ORGANIZATION_ID, deps);

    expect(response).toMatchObject({
      status: "error",
      code: 409,
      message: "Google Contacts is not connected",
      data: disconnected,
    });
    expect(deps.scheduleInitialCatchUp).not.toHaveBeenCalled();
  });

  test("does not expose status or schedule work for an Organization the user cannot access", async () => {
    const deps = createDeps({
      getOrganizationByIdForUser: mock(async () => null),
    });

    const response = await startGoogleContactsInitialSync(USER_ID, ORGANIZATION_ID, deps);

    expect(response).toMatchObject({ status: "error", code: 404, data: null });
    expect(deps.getStatus).not.toHaveBeenCalled();
    expect(deps.scheduleInitialCatchUp).not.toHaveBeenCalled();
  });
});
