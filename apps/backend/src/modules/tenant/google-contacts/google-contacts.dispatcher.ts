import type { GoogleContactsCredentialVault } from "./google-contacts.credentials";
import type { GoogleOAuthProvider } from "./google-contacts.oauth";
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
  now?: () => number;
};

export const dispatchGoogleContactsOutboxJob = async (
  claim: GoogleContactsOutboxClaim,
  dependencies: GoogleContactsDispatcherDependencies,
): Promise<GoogleContactsSyncOutcome> => {
  let people: GooglePeopleClient;
  try {
    const credentials = await dependencies.vault.resolve(claim.credential);
    const now = dependencies.now?.() ?? Date.now();
    const fresh =
      credentials.expiresAt - TOKEN_REFRESH_SKEW_MS <= now
        ? await dependencies.oauth.refreshAccessToken(credentials.refreshToken)
        : credentials;
    people = dependencies.createPeople(fresh.accessToken);
  } catch {
    const outcome: GoogleContactsSyncOutcome = {
      status: "retryable",
      code: "google_credential_unavailable",
      message: "Google Contacts authorization could not be used",
    };
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
