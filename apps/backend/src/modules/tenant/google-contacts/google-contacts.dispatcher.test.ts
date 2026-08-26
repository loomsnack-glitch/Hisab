import { describe, expect, mock, test } from "bun:test";
import { dispatchGoogleContactsOutboxJob } from "./google-contacts.dispatcher";
import type { GoogleContactsOutboxClaim } from "./google-contacts.outbox";
import { GoogleContactsCredentialError } from "./google-contacts.credentials";
import { GOOGLE_CONTACTS_WRITE_SCOPE, GoogleContactsOAuthError } from "./google-contacts.oauth";
import { GooglePeopleApiError } from "./google-contacts.people-client";

const claim: GoogleContactsOutboxClaim = {
  leaseOwner: "google-contacts-worker-test",
  attemptCount: 1,
  credential: {
    reference: "db-secret:11111111-1111-4111-8111-111111111111",
    keyVersion: "v1",
  },
  job: {
    outboxId: "55555555-5555-4555-8555-555555555555",
    organizationId: "22222222-2222-4222-8222-222222222222",
    connectionId: "33333333-3333-4333-8333-333333333333",
    customerId: "44444444-4444-4444-8444-444444444444",
    connectionStatus: "connected",
    customerName: "Dev Jariwala",
    customerPhone: "+919876543210",
    customerUpdatedAt: "2026-08-26T12:00:00.000Z",
    linkedGoogleResourceName: null,
    matchedPhone: null,
  },
};

const credentials = {
  accessToken: "access-token-must-not-escape",
  refreshToken: "refresh-token-must-not-escape",
  expiresAt: Date.UTC(2026, 7, 26, 8, 0, 0),
  tokenType: "Bearer",
  scope: GOOGLE_CONTACTS_WRITE_SCOPE,
};

const connectionIsUsable = async () => true;

describe("Google Contacts Sync Outbox dispatcher", () => {
  test("creates a Google Contact for a no-match Customer without issuing a delete", async () => {
    const completed: unknown[] = [];
    const deleteContact = mock(async () => {
      throw new Error("Google Contact deletion must never be issued");
    });
    const outcome = await dispatchGoogleContactsOutboxJob(claim, {
      vault: {
        store: async () => claim.credential,
        resolve: async () => credentials,
        rotate: async () => claim.credential,
        revoke: async () => {},
      },
      oauth: {
        refreshAccessToken: async () => {
          throw new Error("must not refresh a still-valid access token");
        },
      },
      createPeople: (accessToken) => {
        expect(accessToken).toBe("access-token-must-not-escape");
        return {
          searchContacts: mock(async () => []),
          getContact: mock(async () => {
            throw new Error("getContact should not be used without a linked Google Contact");
          }),
          createContact: mock(async () => ({
            resourceName: "people/created",
            etag: "etag",
            names: [{ unstructuredName: "Dev Jariwala" }],
            phoneNumbers: [{ value: "+919876543210" }],
          })),
          updateContact: mock(async (person) => person),
          deleteContact,
        };
      },
      isConnectionUsable: connectionIsUsable,
      complete: async (...args) => {
        completed.push(args[0]);
        return true;
      },
      now: () => Date.UTC(2026, 7, 26, 6, 0, 0),
    });

    expect(outcome).toEqual({
      status: "created",
      googleResourceName: "people/created",
    });
    expect(completed).toEqual([
      {
        outboxId: claim.job.outboxId,
        leaseOwner: claim.leaseOwner,
        attemptCount: 1,
        claimedCustomerUpdatedAt: claim.job.customerUpdatedAt,
        outcome: { status: "created", googleResourceName: "people/created" },
      },
    ]);
    expect(JSON.stringify(outcome)).not.toContain("access-token");
    expect(JSON.stringify(outcome)).not.toContain("refresh-token");
  });

  test("treats revoked Google authorization as reconnect-required without deleting Contacts", async () => {
    const completed: unknown[] = [];
    const outcome = await dispatchGoogleContactsOutboxJob(
      { ...claim, attemptCount: 2 },
      {
        vault: {
          store: async () => claim.credential,
          resolve: async () => ({
            ...credentials,
            expiresAt: Date.UTC(2026, 7, 26, 6, 0, 0),
          }),
          rotate: async () => claim.credential,
          revoke: async () => {},
        },
        oauth: {
          refreshAccessToken: async () => {
            throw new GoogleContactsOAuthError(
              "authorization_revoked",
              "Google Contacts authorization is no longer valid",
            );
          },
        },
        createPeople: () => {
          throw new Error("must not call Google People after authorization is revoked");
        },
        isConnectionUsable: connectionIsUsable,
        complete: async (...args) => {
          completed.push(args[0]);
          return true;
        },
        now: () => Date.UTC(2026, 7, 26, 7, 0, 0),
      },
    );

    expect(outcome).toEqual({
      status: "reconnect_required",
      code: "google_reconnect_required",
      message: "Google Contacts authorization is no longer valid",
    });
    expect(completed).toEqual([
      {
        outboxId: claim.job.outboxId,
        leaseOwner: claim.leaseOwner,
        attemptCount: 2,
        claimedCustomerUpdatedAt: claim.job.customerUpdatedAt,
        outcome,
      },
    ]);
    expect(JSON.stringify(outcome)).not.toContain("refresh-token");
  });

  test("retries transient credential failures and permanent People failures stay distinct", async () => {
    const retryable = await dispatchGoogleContactsOutboxJob(claim, {
      vault: {
        store: async () => claim.credential,
        resolve: async () => {
          throw new GoogleContactsCredentialError(
            "vault_unavailable",
            "Google Contacts credential vault is unavailable",
          );
        },
        rotate: async () => claim.credential,
        revoke: async () => {},
      },
      oauth: {
        refreshAccessToken: async () => {
          throw new Error("must not refresh when the vault is unavailable");
        },
      },
      createPeople: () => {
        throw new Error("must not call Google People when credentials are unavailable");
      },
      isConnectionUsable: connectionIsUsable,
      complete: async () => true,
      now: () => Date.UTC(2026, 7, 26, 6, 0, 0),
    });
    expect(retryable).toEqual({
      status: "retryable",
      code: "google_credential_unavailable",
      message: "Google Contacts authorization could not be used",
    });

    const completed: unknown[] = [];
    const permanent = await dispatchGoogleContactsOutboxJob(claim, {
      vault: {
        store: async () => claim.credential,
        resolve: async () => credentials,
        rotate: async () => claim.credential,
        revoke: async () => {},
      },
      oauth: {
        refreshAccessToken: async () => {
          throw new Error("must not refresh a still-valid access token");
        },
      },
      createPeople: () => ({
        searchContacts: mock(async () => {
          throw new GooglePeopleApiError(400, "Google Contacts could not be updated");
        }),
        getContact: mock(async () => {
          throw new Error("getContact should not be used without a linked Google Contact");
        }),
        createContact: mock(async () => {
          throw new Error("must not create after a permanent Google failure");
        }),
        updateContact: mock(async () => {
          throw new Error("must not update after a permanent Google failure");
        }),
      }),
      isConnectionUsable: connectionIsUsable,
      complete: async (...args) => {
        completed.push(args[0]);
        return true;
      },
      now: () => Date.UTC(2026, 7, 26, 6, 0, 0),
    });
    expect(permanent).toEqual({
      status: "failed",
      code: "google_write_failed",
      message: "Google Contacts could not be updated",
    });
    expect(completed).toHaveLength(1);
  });

  test("skips obsolete work for a disconnected or replaced connection without calling Google", async () => {
    const createPeople = mock(() => {
      throw new Error("must not call Google People after disconnect or replacement");
    });
    const completed: unknown[] = [];
    const outcome = await dispatchGoogleContactsOutboxJob(claim, {
      vault: {
        store: async () => claim.credential,
        resolve: async () => credentials,
        rotate: async () => claim.credential,
        revoke: async () => {},
      },
      oauth: {
        refreshAccessToken: async () => {
          throw new Error("must not refresh credentials for obsolete work");
        },
      },
      createPeople,
      isConnectionUsable: async () => false,
      complete: async (...args) => {
        completed.push(args[0]);
        return true;
      },
      now: () => Date.UTC(2026, 7, 26, 6, 0, 0),
    });

    expect(outcome).toEqual({
      status: "skipped",
      reason: "connection_inactive",
    });
    expect(createPeople).not.toHaveBeenCalled();
    expect(completed).toEqual([
      {
        outboxId: claim.job.outboxId,
        leaseOwner: claim.leaseOwner,
        attemptCount: 1,
        claimedCustomerUpdatedAt: claim.job.customerUpdatedAt,
        outcome: { status: "skipped", reason: "connection_inactive" },
      },
    ]);
  });

  test("does not write after a connection becomes obsolete before the People mutation", async () => {
    let usabilityChecks = 0;
    const createContact = mock(async () => {
      throw new Error("must not write after disconnect or replacement");
    });
    const createPeople = mock(() => ({
      searchContacts: mock(async () => []),
      getContact: mock(async () => {
        throw new Error("must not load an unlinked Contact");
      }),
      createContact,
      updateContact: mock(async (person) => person),
    }));
    const completed: unknown[] = [];

    const outcome = await dispatchGoogleContactsOutboxJob(claim, {
      vault: {
        store: async () => claim.credential,
        resolve: async () => credentials,
        rotate: async () => claim.credential,
        revoke: async () => {},
      },
      oauth: {
        refreshAccessToken: async () => {
          throw new Error("must not refresh a still-valid access token");
        },
      },
      createPeople,
      isConnectionUsable: async () => ++usabilityChecks === 1,
      complete: async (...args) => {
        completed.push(args[0]);
        return true;
      },
      now: () => Date.UTC(2026, 7, 26, 6, 0, 0),
    });

    expect(outcome).toEqual({
      status: "skipped",
      reason: "connection_inactive",
    });
    expect(createPeople).toHaveBeenCalledTimes(1);
    expect(createContact).not.toHaveBeenCalled();
    expect(completed).toHaveLength(1);
  });
});
