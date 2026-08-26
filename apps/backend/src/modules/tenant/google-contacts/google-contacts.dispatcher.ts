import {
  GoogleContactsCredentialError,
  type GoogleContactsCredentialBinding,
  type GoogleContactsCredentialVault,
} from "./google-contacts.credentials";
import { GoogleContactsOAuthError, type GoogleOAuthProvider } from "./google-contacts.oauth";
import {
  GoogleContactsConnectionInactiveError,
  type GoogleContactPerson,
  type GooglePeopleClient,
} from "./google-contacts.people";
import { completeGoogleContactsOutbox, type GoogleContactsOutboxClaim } from "./google-contacts.outbox";
import { processGoogleContactsSyncJob, type GoogleContactsSyncOutcome } from "./google-contacts.worker";

const TOKEN_REFRESH_SKEW_MS = 60_000;

export type GoogleContactsDispatcherDependencies = {
  vault: GoogleContactsCredentialVault;
  oauth: Pick<GoogleOAuthProvider, "refreshAccessToken">;
  createPeople: (accessToken: string) => GooglePeopleClient;
  complete: typeof completeGoogleContactsOutbox;
  isConnectionUsable: (
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

const guardGooglePeopleWrites = (
  people: GooglePeopleClient,
  connectionIsUsable: () => Promise<boolean>,
): GooglePeopleClient => ({
  searchContacts: people.searchContacts,
  getContact: people.getContact,
  createContact: async (input) => {
    if (!(await connectionIsUsable())) {
      throw new GoogleContactsConnectionInactiveError();
    }
    return people.createContact(input);
  },
  updateContact: async (person: GoogleContactPerson) => {
    if (!(await connectionIsUsable())) {
      throw new GoogleContactsConnectionInactiveError();
    }
    return people.updateContact(person);
  },
});

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

  let credentials;
  try {
    credentials = await dependencies.vault.resolve(claim.credential);
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

  try {
    const connectionIsUsable = () =>
      dependencies.isConnectionUsable(claim.job.connectionId, claim.credential);
    if (!(await connectionIsUsable())) return skipInactive();

    const now = dependencies.now?.() ?? Date.now();
    const fresh =
      credentials.expiresAt - TOKEN_REFRESH_SKEW_MS <= now
        ? await dependencies.oauth.refreshAccessToken(credentials.refreshToken)
        : credentials;
    const people = guardGooglePeopleWrites(
      dependencies.createPeople(fresh.accessToken),
      connectionIsUsable,
    );
    const outcome = await processGoogleContactsSyncJob(claim.job, people);
    await dependencies.complete({
      outboxId: claim.job.outboxId,
      leaseOwner: claim.leaseOwner,
      attemptCount: claim.attemptCount,
      claimedCustomerUpdatedAt: claim.job.customerUpdatedAt,
      outcome,
    });
    return outcome;
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
};
