import { claimNextGoogleContactsOutbox, completeGoogleContactsOutbox } from "./google-contacts.outbox";
import { dispatchGoogleContactsOutboxJob } from "./google-contacts.dispatcher";
import { databaseGoogleContactsCredentialVault } from "./google-contacts.database-credentials";
import { createGoogleOAuthProvider } from "./google-contacts.oauth";
import { createGooglePeopleClient } from "./google-contacts.people-client";
import { isGoogleContactsConnectionUsable } from "./google-contacts.repository";

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
