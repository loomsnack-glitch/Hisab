import { describe, expect, test } from "bun:test";
import { mapGoogleContactsSyncStatus } from "./google-contacts.repository";

const uuid = "11111111-1111-4111-8111-111111111111";

describe("Google Contacts connection persistence boundary", () => {
  test("maps a missing row as disconnected", () => {
    expect(mapGoogleContactsSyncStatus(null)).toEqual({
      connectionStatus: "disconnected",
      googleAccountEmail: null,
      connectedAt: null,
      initialSyncStatus: "not_started",
      lastSuccessfulSyncAt: null,
      pendingCount: 0,
      retryingCount: 0,
      errorCount: 0,
      conflictCount: 0,
      contactNamePrefix: "",
      contactNamePostfix: "",
    });
  });

  test("maps safe connection metadata without exposing credential material", () => {
    const snapshot = mapGoogleContactsSyncStatus({
      organization_id: uuid,
      status: "connected",
      google_account_email: "owner@example.com",
      connected_at: "2026-08-26T06:00:00.000Z",
      google_account_subject: "google-subject-1",
      credential_reference: "db-secret:must-not-escape",
      credential_key_version: "v1",
      refresh_token: "must-not-escape",
      access_token: "must-not-escape",
      encrypted_payload: "must-not-escape",
    });

    expect(snapshot).toEqual({
      connectionStatus: "connected",
      googleAccountEmail: "owner@example.com",
      connectedAt: "2026-08-26T06:00:00.000Z",
      initialSyncStatus: "not_started",
      lastSuccessfulSyncAt: null,
      pendingCount: 0,
      retryingCount: 0,
      errorCount: 0,
      conflictCount: 0,
      contactNamePrefix: "",
      contactNamePostfix: "",
    });
    expect("credentialReference" in snapshot).toBe(false);
    expect("credentialKeyVersion" in snapshot).toBe(false);
    expect("refreshToken" in snapshot).toBe(false);
    expect("accessToken" in snapshot).toBe(false);
    expect("googleAccountSubject" in snapshot).toBe(false);
  });

  test("maps connecting and reconnect-required states", () => {
    expect(
      mapGoogleContactsSyncStatus({
        status: "connecting",
        google_account_email: null,
        connected_at: null,
      }),
    ).toMatchObject({
      connectionStatus: "connecting",
      googleAccountEmail: null,
    });
    expect(
      mapGoogleContactsSyncStatus({
        status: "reconnect_required",
        google_account_email: "owner@example.com",
        connected_at: "2026-08-26T06:00:00.000Z",
      }),
    ).toMatchObject({
      connectionStatus: "reconnect_required",
      googleAccountEmail: "owner@example.com",
    });
  });

  test("maps pending, retrying, completed, and failed summaries without credential material", () => {
    const pending = mapGoogleContactsSyncStatus({
      status: "connected",
      google_account_email: "owner@example.com",
      connected_at: "2026-08-26T06:00:00.000Z",
      initial_sync_status: "pending",
      last_successful_sync_at: null,
      pending_count: "4",
      retrying_count: "2",
      error_count: "0",
      conflict_count: "0",
      credential_reference: "db-secret:must-not-escape",
    });
    expect(pending).toMatchObject({
      connectionStatus: "connected",
      initialSyncStatus: "pending",
      pendingCount: 4,
      retryingCount: 2,
      errorCount: 0,
      conflictCount: 0,
    });
    expect("credentialReference" in pending).toBe(false);

    const completed = mapGoogleContactsSyncStatus({
      status: "connected",
      google_account_email: "owner@example.com",
      connected_at: "2026-08-26T06:00:00.000Z",
      initial_sync_status: "completed",
      last_successful_sync_at: "2026-08-26T07:15:00.000Z",
      pending_count: 0,
      retrying_count: 0,
      error_count: 1,
      conflict_count: 2,
    });
    expect(completed).toMatchObject({
      initialSyncStatus: "completed",
      lastSuccessfulSyncAt: "2026-08-26T07:15:00.000Z",
      pendingCount: 0,
      retryingCount: 0,
      errorCount: 1,
      conflictCount: 2,
    });
  });

  test("maps a Google Contact Name Affix without exposing credential material", () => {
    const snapshot = mapGoogleContactsSyncStatus({
      status: "connected",
      google_account_email: "owner@example.com",
      connected_at: "2026-08-26T06:00:00.000Z",
      contact_name_prefix: "PH",
      contact_name_postfix: "@ph",
      credential_reference: "db-secret:must-not-escape",
    });

    expect(snapshot.contactNamePrefix).toBe("PH");
    expect(snapshot.contactNamePostfix).toBe("@ph");
    expect("credentialReference" in snapshot).toBe(false);
  });
});
