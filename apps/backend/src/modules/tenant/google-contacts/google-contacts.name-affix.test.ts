import { beforeEach, describe, expect, mock, test } from "bun:test";
import { GOOGLE_CONTACTS_WRITE_SCOPE } from "./google-contacts.oauth";
import {
  updateGoogleContactsNameAffixForOrganization,
  type GoogleContactsServiceDependencies,
} from "./google-contacts.service";

const ORGANIZATION_ID = "aac5e7a9-7b0d-4842-ab6c-ab2f4e21b865";
const OTHER_ORGANIZATION_ID = "651d3470-af47-47c6-9153-8f00ac45b12f";
const USER_ID = "17268fe9-9f75-4ebe-9997-9d73b2a3e996";

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
  initialSyncStatus: "completed" as const,
  lastSuccessfulSyncAt: "2026-08-26T07:15:00.000Z",
  pendingCount: 0,
  retryingCount: 0,
  errorCount: 0,
  conflictCount: 0,
  contactNamePrefix: "",
  contactNamePostfix: "",
};

const saved = {
  ...connected,
  contactNamePostfix: "@ph",
  pendingCount: 4,
};

const createDeps = (overrides: Partial<GoogleContactsServiceDependencies> = {}): GoogleContactsServiceDependencies => ({
  getOrganizationByIdForUser: mock(async () => ({ id: ORGANIZATION_ID })),
  createOAuthStateRecord: mock(async () => {}),
  replayStore: { consume: mock(async () => true) },
  getStatus: mock(async () => connected),
  getLifecycle: mock(async () => ({
    connectionId: "33333333-3333-4333-8333-333333333333",
    status: "connected",
    googleAccountSubject: "google-subject-1",
    credential: null,
    oauthAttemptIntent: null,
  })),
  beginAttempt: mock(async () => ({
    started: true,
    status: disconnected,
  })),
  completeConnection: mock(async () => connected),
  revertConnecting: mock(async () => disconnected),
  disconnectConnection: mock(async () => ({
    disconnected: false,
    credential: null,
  })),
  scheduleInitialCatchUp: mock(async () => connected),
  updateNameAffix: mock(async () => ({ status: saved, changed: true })),
  scheduleDisplayNameRefresh: mock(async () => saved),
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
      throw new Error("must not exchange tokens while saving a name affix");
    }),
    refreshAccessToken: mock(async () => {
      throw new Error("must not refresh tokens while saving a name affix");
    }),
    getAccountIdentity: mock(async () => {
      throw new Error("must not read Google identity while saving a name affix");
    }),
    revokeAuthorization: mock(async () => {
      throw new Error("must not revoke Google authorization while saving a name affix");
    }),
  },
  ...overrides,
});

describe("Google Contact Name Affix", () => {
  beforeEach(() => {
    process.env.GOOGLE_CONTACTS_OAUTH_STATE_SECRET = "local-test-secret-that-is-long-enough-32";
  });

  test("saves a postfix and refreshes already synchronized Contacts", async () => {
    const deps = createDeps();
    const response = await updateGoogleContactsNameAffixForOrganization(
      USER_ID,
      ORGANIZATION_ID,
      { contactNamePrefix: "", contactNamePostfix: "@ph" },
      deps,
    );

    expect(response).toMatchObject({
      status: "success",
      code: 200,
      data: saved,
    });
    expect(deps.updateNameAffix).toHaveBeenCalledWith({
      organizationId: ORGANIZATION_ID,
      contactNamePrefix: "",
      contactNamePostfix: "@ph",
    });
    expect(deps.scheduleDisplayNameRefresh).toHaveBeenCalledWith(ORGANIZATION_ID);
    expect(JSON.stringify(response)).not.toContain("access-token");
    expect(JSON.stringify(response)).not.toContain("refresh-token");
  });

  test("does not reschedule work when the affix is unchanged", async () => {
    const deps = createDeps({
      updateNameAffix: mock(async () => ({ status: connected, changed: false })),
    });

    const response = await updateGoogleContactsNameAffixForOrganization(
      USER_ID,
      ORGANIZATION_ID,
      { contactNamePrefix: "", contactNamePostfix: "" },
      deps,
    );

    expect(response).toMatchObject({
      status: "success",
      data: connected,
    });
    expect(deps.scheduleDisplayNameRefresh).not.toHaveBeenCalled();
  });

  test("does not save an affix when Google Contacts is disconnected", async () => {
    const deps = createDeps({
      getStatus: mock(async () => disconnected),
    });

    const response = await updateGoogleContactsNameAffixForOrganization(
      USER_ID,
      ORGANIZATION_ID,
      { contactNamePrefix: "", contactNamePostfix: "@ph" },
      deps,
    );

    expect(response).toMatchObject({ status: "error", code: 409 });
    expect(deps.updateNameAffix).not.toHaveBeenCalled();
    expect(deps.scheduleDisplayNameRefresh).not.toHaveBeenCalled();
  });

  test("does not expose the affix for an Organization the user cannot access", async () => {
    const deps = createDeps({
      getOrganizationByIdForUser: mock(async () => null),
    });

    const response = await updateGoogleContactsNameAffixForOrganization(
      USER_ID,
      OTHER_ORGANIZATION_ID,
      { contactNamePrefix: "", contactNamePostfix: "@ph" },
      deps,
    );

    expect(response).toMatchObject({ status: "error", code: 404, data: null });
    expect(deps.updateNameAffix).not.toHaveBeenCalled();
  });
});
