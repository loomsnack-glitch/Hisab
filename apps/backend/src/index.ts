import app from "./app";
import { redis } from "./config/redis";
import { handleShutdown } from "./helpers/server.helper";
import { replayPendingMessageEvents } from "./modules/tenant/whatsapp/whatsapp.service";
import {
  dispatchCloudOutbox,
  replayPendingCloudWebhookEvents,
  reconcileStaleCloudOutbox,
} from "./modules/tenant/whatsapp/cloud-api/cloud-runtime";
import { dispatchGoogleContactsOutbox } from "./modules/tenant/google-contacts/google-contacts.runtime";

const port = Number(process.env.PORT) || 8001;
const hostname = process.env.NODE_ENV === "production" ? "127.0.0.1" : "0.0.0.0";
const idleTimeout = Number(process.env.SERVER_IDLE_TIMEOUT_SECONDS) || 30;

Bun.serve({
  hostname,
  port,
  idleTimeout,
  fetch: app.fetch,
});

process.on("SIGINT", handleShutdown);   // Ctrl+C
process.on("SIGTERM", handleShutdown);  // kill, Docker, K8s
process.on("SIGQUIT", handleShutdown);

console.log(`🚀 Server running at http://localhost:${port}/api`);
await redis.connect();

const providerEventReplay = setInterval(() => {
  void replayPendingMessageEvents().catch(() => {
    console.warn("[whatsapp] provider event replay failed");
  });
}, 5_000);
providerEventReplay.unref();
const stopProviderEventReplay = () => clearInterval(providerEventReplay);
process.once("SIGINT", stopProviderEventReplay);
process.once("SIGTERM", stopProviderEventReplay);
process.once("SIGQUIT", stopProviderEventReplay);

const cloudWebhookReplay = setInterval(() => {
  void replayPendingCloudWebhookEvents().catch((error) => {
    console.warn(
      "[whatsapp-cloud] webhook replay failed",
      error instanceof Error ? error.message : "unknown error",
    );
  });
}, 5_000);
cloudWebhookReplay.unref();
const stopCloudWebhookReplay = () => clearInterval(cloudWebhookReplay);
process.once("SIGINT", stopCloudWebhookReplay);
process.once("SIGTERM", stopCloudWebhookReplay);
process.once("SIGQUIT", stopCloudWebhookReplay);

const cloudOutboxDispatch = setInterval(() => {
  void dispatchCloudOutbox().catch((error) => {
    console.warn(
      "[whatsapp-cloud] outbox dispatch failed",
      error instanceof Error ? error.message : "unknown error",
    );
  });
}, 5_000);
cloudOutboxDispatch.unref();
const stopCloudOutboxDispatch = () => clearInterval(cloudOutboxDispatch);
process.once("SIGINT", stopCloudOutboxDispatch);
process.once("SIGTERM", stopCloudOutboxDispatch);
process.once("SIGQUIT", stopCloudOutboxDispatch);

const cloudOutboxReconciliation = setInterval(() => {
  void reconcileStaleCloudOutbox().catch((error) => {
    console.warn(
      "[whatsapp-cloud] stale outbox reconciliation failed",
      error instanceof Error ? error.message : "unknown error",
    );
  });
}, 60_000);
cloudOutboxReconciliation.unref();
const stopCloudOutboxReconciliation = () => clearInterval(cloudOutboxReconciliation);
process.once("SIGINT", stopCloudOutboxReconciliation);
process.once("SIGTERM", stopCloudOutboxReconciliation);
process.once("SIGQUIT", stopCloudOutboxReconciliation);

const googleContactsOutboxDispatch = setInterval(() => {
  void dispatchGoogleContactsOutbox().catch((error) => {
    console.warn(
      "[google-contacts] outbox dispatch failed",
      error instanceof Error ? error.message : "unknown error",
    );
  });
}, 5_000);
googleContactsOutboxDispatch.unref();
const stopGoogleContactsOutboxDispatch = () => clearInterval(googleContactsOutboxDispatch);
process.once("SIGINT", stopGoogleContactsOutboxDispatch);
process.once("SIGTERM", stopGoogleContactsOutboxDispatch);
process.once("SIGQUIT", stopGoogleContactsOutboxDispatch);
