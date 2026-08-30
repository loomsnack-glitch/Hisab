import { googleContactsWorkerConfig } from "./config.js";

export const processNextGoogleContactsOutbox = async (): Promise<boolean> => {
    const response = await fetch(
        `${googleContactsWorkerConfig.apiUrl}/internal/google-contacts/outbox/process-next`,
        {
            method: "POST",
            headers: {
                Authorization: `Bearer ${googleContactsWorkerConfig.token}`,
                "x-google-contacts-worker-id": googleContactsWorkerConfig.workerId,
            },
        },
    );
    if (!response.ok) {
        throw new Error("Google Contacts worker could not claim outbox work");
    }
    const body = (await response.json()) as { processed?: boolean };
    return body.processed === true;
};
