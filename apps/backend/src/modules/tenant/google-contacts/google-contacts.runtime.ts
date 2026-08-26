import { claimNextGoogleContactsOutbox, completeGoogleContactsOutbox } from "./google-contacts.outbox";
import { dispatchGoogleContactsOutboxJob } from "./google-contacts.dispatcher";
import { databaseGoogleContactsCredentialVault } from "./google-contacts.database-credentials";
import { createGoogleOAuthProvider } from "./google-contacts.oauth";
import { createGooglePeopleClient } from "./google-contacts.people-client";
import { isGoogleContactsConnectionUsable } from "./google-contacts.repository";

const googleContactsOutboxEnabled = (): boolean =>
  process.env.GOOGLE_CONTACTS_OUTBOX_ENABLED?.trim().toLowerCase() === "true";

const workerId = (): string =>
  process.env.GOOGLE_CONTACTS_WORKER_ID?.trim() || "google-contacts-worker";

let googleContactsOutboxDispatchInFlight = false;

const dispatchNextGoogleContactsOutbox = async (): Promise<boolean> => {
  if (!googleContactsOutboxEnabled() || googleContactsOutboxDispatchInFlight) return false;
  googleContactsOutboxDispatchInFlight = true;
  try {
    const claim = await claimNextGoogleContactsOutbox(120, workerId());
    if (!claim) return false;
    await dispatchGoogleContactsOutboxJob(claim, {
      vault: databaseGoogleContactsCredentialVault,
      oauth: createGoogleOAuthProvider(),
      createPeople: (accessToken) => createGooglePeopleClient(accessToken),
      complete: completeGoogleContactsOutbox,
      isConnectionUsable: isGoogleContactsConnectionUsable,
    });
    return true;
  } finally {
    googleContactsOutboxDispatchInFlight = false;
  }
};

export const dispatchGoogleContactsOutbox = dispatchNextGoogleContactsOutbox;

export const processNextGoogleContactsOutboxForWorker = async (
  requestedWorkerId: string,
): Promise<{ processed: boolean }> => {
  const claim = await claimNextGoogleContactsOutbox(120, requestedWorkerId);
  if (!claim) return { processed: false };
  await dispatchGoogleContactsOutboxJob(claim, {
    vault: databaseGoogleContactsCredentialVault,
    oauth: createGoogleOAuthProvider(),
    createPeople: (accessToken) => createGooglePeopleClient(accessToken),
    complete: completeGoogleContactsOutbox,
    isConnectionUsable: isGoogleContactsConnectionUsable,
  });
  return { processed: true };
};
