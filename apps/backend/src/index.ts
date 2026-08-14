import app from "./app";
import { redis } from "./config/redis";
import { handleShutdown } from "./helpers/server.helper";
import { replayPendingMessageEvents } from "./modules/tenant/whatsapp/whatsapp.service";

const port = Number(process.env.PORT) || 8001;
const hostname = process.env.NODE_ENV === "production" ? "127.0.0.1" : "0.0.0.0";

Bun.serve({
  hostname,
  port,
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
