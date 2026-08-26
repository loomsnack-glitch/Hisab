import { processNextGoogleContactsOutbox } from "./api-client.js";
import { googleContactsWorkerConfig } from "./config.js";

const wait = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds));

let stopping = false;

process.on("SIGINT", () => {
    stopping = true;
});
process.on("SIGTERM", () => {
    stopping = true;
});

console.log(`Google Contacts worker ${googleContactsWorkerConfig.workerId} started`);

while (!stopping) {
    try {
        const processed = await processNextGoogleContactsOutbox();
        if (!processed) await wait(googleContactsWorkerConfig.pollIntervalMs);
    } catch (error) {
        console.warn(
            "[google-contacts-worker] process-next failed",
            error instanceof Error ? error.message : "unknown error",
        );
        await wait(googleContactsWorkerConfig.pollIntervalMs);
    }
}
