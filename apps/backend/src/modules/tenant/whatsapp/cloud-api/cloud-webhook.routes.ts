import { Hono } from "hono";
import {
  parseWhatsAppCloudWebhook,
  verifyWhatsAppCloudChallenge,
  verifyWhatsAppCloudSignature,
  WhatsAppCloudWebhookError,
  WHATSAPP_CLOUD_WEBHOOK_MAX_BODY_BYTES,
} from "./cloud-api.webhook";
import {
  persistCloudWebhookEvent,
  type PersistCloudWebhookEventResult,
} from "./cloud-webhook.repository";

type CloudWebhookEventSink = (
  event: ReturnType<typeof parseWhatsAppCloudWebhook>,
) => Promise<PersistCloudWebhookEventResult>;

const configurationError = (error: unknown): boolean =>
  error instanceof WhatsAppCloudWebhookError &&
  error.code === "missing_configuration";

const readLimitedBody = async (request: Request): Promise<Uint8Array> => {
  if (!request.body) return new Uint8Array();
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;

  try {
    while (true) {
      const next = await reader.read();
      if (next.done) break;
      total += next.value.byteLength;
      if (total > WHATSAPP_CLOUD_WEBHOOK_MAX_BODY_BYTES) {
        await reader.cancel();
        throw new WhatsAppCloudWebhookError(
          "payload_too_large",
          "WhatsApp webhook payload is too large",
        );
      }
      chunks.push(next.value);
    }
  } finally {
    reader.releaseLock();
  }

  const body = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return body;
};

export const createWhatsAppCloudWebhookRoutes = (
  persist: CloudWebhookEventSink = persistCloudWebhookEvent,
) => {
  const router = new Hono();

  router.get("/", (c) => {
    try {
      const challenge = verifyWhatsAppCloudChallenge(
        c.req.query("hub.mode"),
        c.req.query("hub.verify_token"),
        c.req.query("hub.challenge"),
        process.env.WHATSAPP_CLOUD_WEBHOOK_VERIFY_TOKEN,
      );
      if (challenge === null) {
        return c.text("Forbidden", 403);
      }
      return c.text(challenge, 200);
    } catch (error) {
      if (configurationError(error)) {
        return c.text("Webhook is not configured", 503);
      }
      return c.text("Webhook verification failed", 400);
    }
  });

  router.post("/", async (c) => {
    const contentLength = Number(c.req.header("content-length") ?? 0);
    if (
      Number.isFinite(contentLength) &&
      contentLength > WHATSAPP_CLOUD_WEBHOOK_MAX_BODY_BYTES
    ) {
      return c.json(
        { status: "error", message: "Webhook payload is too large" },
        413,
      );
    }

    let rawBody: Uint8Array;
    try {
      rawBody = await readLimitedBody(c.req.raw);
    } catch (error) {
      if (
        error instanceof WhatsAppCloudWebhookError &&
        error.code === "payload_too_large"
      ) {
        return c.json({ status: "error", message: error.message }, 413);
      }
      return c.json(
        { status: "error", message: "Webhook body could not be read" },
        400,
      );
    }

    try {
      const validSignature = verifyWhatsAppCloudSignature(
        rawBody,
        c.req.header("x-hub-signature-256"),
        process.env.WHATSAPP_CLOUD_APP_SECRET,
      );
      if (!validSignature) {
        return c.json(
          { status: "error", message: "Invalid webhook signature" },
          401,
        );
      }

      const receipt = parseWhatsAppCloudWebhook(rawBody);
      const stored = await persist(receipt);
      return c.json(
        {
          status: "accepted",
          duplicate: stored.duplicate,
          eventId: stored.eventId,
        },
        200,
      );
    } catch (error) {
      if (configurationError(error)) {
        return c.json(
          { status: "error", message: "Webhook is not configured" },
          503,
        );
      }
      if (error instanceof WhatsAppCloudWebhookError) {
        const status = error.code === "payload_too_large" ? 413 : 400;
        return c.json({ status: "error", message: error.message }, status);
      }
      console.error(
        "[whatsapp] Cloud webhook receipt failed",
        error instanceof Error ? error.message : String(error),
      );
      return c.json(
        { status: "error", message: "Webhook receipt failed" },
        500,
      );
    }
  });

  return router;
};

export const whatsappCloudWebhookRoutes = createWhatsAppCloudWebhookRoutes();
