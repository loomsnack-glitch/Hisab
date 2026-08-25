import { describe, expect, test } from "bun:test";
import { mapGoogleContactsSyncStatus } from "./google-contacts.repository";

const uuid = "11111111-1111-4111-8111-111111111111";

describe("Google Contacts connection persistence boundary", () => {
  test("maps a missing row as disconnected", () => {
    expect(mapGoogleContactsSyncStatus(null)).toEqual({
      connectionStatus: "disconnected",
      googleAccountEmail: null,
      connectedAt: null,
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
    ).toMatchObject({ connectionStatus: "connecting", googleAccountEmail: null });
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
});
