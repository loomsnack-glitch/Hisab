import { describe, expect, mock, test } from "bun:test";
import { dispatchGoogleContactsOutboxJob } from "./google-contacts.dispatcher";
import type { GoogleContactsOutboxClaim } from "./google-contacts.outbox";
import { GOOGLE_CONTACTS_WRITE_SCOPE } from "./google-contacts.oauth";

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
    linkedGoogleResourceName: null,
  },
};

const credentials = {
  accessToken: "access-token-must-not-escape",
  refreshToken: "refresh-token-must-not-escape",
  expiresAt: Date.UTC(2026, 7, 26, 8, 0, 0),
  tokenType: "Bearer",
  scope: GOOGLE_CONTACTS_WRITE_SCOPE,
};

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
      complete: async (...args) => {
        completed.push(args[0]);
        return true;
      },
      now: () => Date.UTC(2026, 7, 26, 6, 0, 0),
    });

    expect(outcome).toEqual({ status: "created", googleResourceName: "people/created" });
    expect(completed).toEqual([
      {
        outboxId: claim.job.outboxId,
        leaseOwner: claim.leaseOwner,
        attemptCount: 1,
        outcome: { status: "created", googleResourceName: "people/created" },
      },
    ]);
    expect(JSON.stringify(outcome)).not.toContain("access-token");
    expect(JSON.stringify(outcome)).not.toContain("refresh-token");
  });
});
