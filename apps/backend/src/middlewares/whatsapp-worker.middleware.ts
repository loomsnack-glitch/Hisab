import { timingSafeEqual } from "node:crypto";
import type { Context, Next } from "hono";

const bearerToken = (value?: string) => value?.replace(/^Bearer\s+/i, "").trim() ?? "";

export const whatsappWorkerMiddleware = async (c: Context, next: Next) => {
    const configuredToken = process.env.WHATSAPP_WORKER_TOKEN?.trim() ?? "";
    const receivedToken = bearerToken(c.req.header("Authorization"));
    const expected = Buffer.from(configuredToken);
    const received = Buffer.from(receivedToken);

    if (!configuredToken || expected.length !== received.length || !timingSafeEqual(expected, received)) {
        return c.json({ status: "error", message: "Unauthorized" }, 401);
    }

    await next();
};
