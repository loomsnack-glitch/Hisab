import app from "./app";
import { redis } from "./config/redis";
import { handleShutdown } from "./helpers/server.helper";

const port = 8000;

Bun.serve({
  hostname: "0.0.0.0",
  port: port,
  fetch: app.fetch,
});

process.on("SIGINT", handleShutdown);   // Ctrl+C
process.on("SIGTERM", handleShutdown);  // kill, Docker, K8s
process.on("SIGQUIT", handleShutdown);

console.log(`🚀 Server running at http://localhost:${port}/api`);
await redis.connect();