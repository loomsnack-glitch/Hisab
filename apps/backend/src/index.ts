import app from "./app";
import { redis } from "./config/redis";
import { handleShutdown } from "./helpers/server.helper";

const port = Number(process.env.PORT) || 8000;
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