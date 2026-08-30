import { Hono } from "hono";
import type { Context, MiddlewareHandler } from "hono";
import { STATUS_CODES } from "@repo/types";
import { googleContactsWorkerMiddleware } from "@/middlewares/google-contacts-worker.middleware";
import { processNextGoogleContactsOutboxForWorker } from "./google-contacts.runtime";

const workerIdPattern = /^[a-zA-Z0-9._-]{1,100}$/;

const unexpectedInternalError = (context: Context, error: unknown) => {
  console.error(
    "[google-contacts] internal worker error",
    error instanceof Error ? error.message : "unknown error",
  );
  return context.json(
    {
      status: "error",
      message: "Google Contacts worker operation failed",
      code: STATUS_CODES.INTERNAL_SERVER_ERROR,
    },
    STATUS_CODES.INTERNAL_SERVER_ERROR,
  );
};

export const createGoogleContactsInternalRoutes = (
  processNext: typeof processNextGoogleContactsOutboxForWorker = processNextGoogleContactsOutboxForWorker,
  authenticate: MiddlewareHandler = googleContactsWorkerMiddleware,
) => {
  const router = new Hono();
  router.use("*", authenticate);

  router.post("/outbox/process-next", async (c) => {
    try {
      const workerId = c.req.header("x-google-contacts-worker-id")?.trim() || "google-contacts-worker";
      if (!workerIdPattern.test(workerId)) {
        return c.json(
          { status: "error", message: "Invalid worker id", code: STATUS_CODES.BAD_REQUEST },
          STATUS_CODES.BAD_REQUEST,
        );
      }
      const result = await processNext(workerId);
      return c.json({
        status: "success",
        processed: result.processed,
      });
    } catch (error) {
      return unexpectedInternalError(c, error);
    }
  });

  return router;
};

const googleContactsInternalRoutes = createGoogleContactsInternalRoutes();

export default googleContactsInternalRoutes;
