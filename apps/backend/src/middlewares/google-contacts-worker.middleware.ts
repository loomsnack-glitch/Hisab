import { timingSafeEqual } from "node:crypto";
import type { Context, Next } from "hono";

const bearerToken = (value?: string) => value?.replace(/^Bearer\s+/i, "").trim() ?? "";

export const googleContactsWorkerMiddleware = async (c: Context, next: Next): Promise<Response | void> => {
  const configuredToken = process.env.GOOGLE_CONTACTS_WORKER_TOKEN?.trim() ?? "";
  const receivedToken = bearerToken(c.req.header("Authorization"));
  const expected = Buffer.from(configuredToken);
  const received = Buffer.from(receivedToken);

  if (!configuredToken || expected.length !== received.length || !timingSafeEqual(expected, received)) {
    return c.json({ status: "error", message: "Unauthorized" }, 401);
  }

  await next();
};
