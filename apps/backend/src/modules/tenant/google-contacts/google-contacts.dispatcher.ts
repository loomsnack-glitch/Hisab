import {
  GoogleContactsCredentialError,
  type GoogleContactsCredentialBinding,
  type GoogleContactsCredentialVault,
} from "./google-contacts.credentials";
import {
  GoogleContactsOAuthError,
  type GoogleOAuthProvider,
} from "./google-contacts.oauth";
import type { GooglePeopleClient } from "./google-contacts.people";
import {
  completeGoogleContactsOutbox,
  type GoogleContactsOutboxClaim,
} from "./google-contacts.outbox";
import { processGoogleContactsSyncJob, type GoogleContactsSyncOutcome } from "./google-contacts.worker";

const TOKEN_REFRESH_SKEW_MS = 60_000;

export type GoogleContactsDispatcherDependencies = {
  vault: GoogleContactsCredentialVault;
  oauth: Pick<GoogleOAuthProvider, "refreshAccessToken">;
  createPeople: (accessToken: string) => GooglePeopleClient;
  complete: typeof completeGoogleContactsOutbox;
  isConnectionUsable?: (
    connectionId: string,
    credential: GoogleContactsCredentialBinding,
  ) => Promise<boolean>;
  now?: () => number;
};

const authorizationFailureOutcome = (error: unknown): GoogleContactsSyncOutcome => {
  if (
    (error instanceof GoogleContactsOAuthError && error.code === "authorization_revoked") ||
    (error instanceof GoogleContactsCredentialError && error.code === "credential_not_found")
  ) {
    return {
      status: "reconnect_required",
      code: "google_reconnect_required",
      message: "Google Contacts authorization is no longer valid",
    };
  }
  return {
    status: "retryable",
    code: "google_credential_unavailable",
    message: "Google Contacts authorization could not be used",
  };
};

export const dispatchGoogleContactsOutboxJob = async (
  claim: GoogleContactsOutboxClaim,
  dependencies: GoogleContactsDispatcherDependencies,
): Promise<GoogleContactsSyncOutcome> => {
  const skipInactive = async (): Promise<GoogleContactsSyncOutcome> => {
    const outcome: GoogleContactsSyncOutcome = {
      status: "skipped",
      reason: "connection_inactive",
    };
    await dependencies.complete({
      outboxId: claim.job.outboxId,
      leaseOwner: claim.leaseOwner,
      attemptCount: claim.attemptCount,
      claimedCustomerUpdatedAt: claim.job.customerUpdatedAt,
      outcome,
    });
    return outcome;
  };

  if (dependencies.isConnectionUsable) {
    const usable = await dependencies.isConnectionUsable(
      claim.job.connectionId,
      claim.credential,
    );
    if (!usable) return skipInactive();
  }

  let people: GooglePeopleClient;
  try {
    const credentials = await dependencies.vault.resolve(claim.credential);
    const now = dependencies.now?.() ?? Date.now();
    const fresh =
      credentials.expiresAt - TOKEN_REFRESH_SKEW_MS <= now
        ? await dependencies.oauth.refreshAccessToken(credentials.refreshToken)
        : credentials;
    if (dependencies.isConnectionUsable) {
      const usable = await dependencies.isConnectionUsable(
        claim.job.connectionId,
        claim.credential,
      );
      if (!usable) return skipInactive();
    }
    people = dependencies.createPeople(fresh.accessToken);
  } catch (error) {
    const outcome = authorizationFailureOutcome(error);
    await dependencies.complete({
      outboxId: claim.job.outboxId,
      leaseOwner: claim.leaseOwner,
      attemptCount: claim.attemptCount,
      claimedCustomerUpdatedAt: claim.job.customerUpdatedAt,
      outcome,
    });
    return outcome;
  }

  const outcome = await processGoogleContactsSyncJob(claim.job, people);
  await dependencies.complete({
    outboxId: claim.job.outboxId,
    leaseOwner: claim.leaseOwner,
    attemptCount: claim.attemptCount,
    claimedCustomerUpdatedAt: claim.job.customerUpdatedAt,
    outcome,
  });
  return outcome;
};
