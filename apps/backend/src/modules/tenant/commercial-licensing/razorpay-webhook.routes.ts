import { Hono } from "hono";
import { STATUS_CODES } from "@repo/types";
import {
    extractRazorpayWebhook,
    RAZORPAY_WEBHOOK_MAX_BODY_BYTES,
    RazorpayAdapterError,
    verifyRazorpayWebhookSignature,
} from "./razorpay.adapter";
import {
    getCommercialLicensingService,
    type CommercialLicensingService,
    type IngestRazorpayWebhookInput,
} from "./commercial-licensing.service";

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
            if (total > RAZORPAY_WEBHOOK_MAX_BODY_BYTES) {
                await reader.cancel();
                throw new RazorpayAdapterError("order_failed", "Webhook payload is too large");
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

export const createRazorpayWebhookRoutes = (
    licensingService: CommercialLicensingService = getCommercialLicensingService(),
    webhookSecret = () => process.env.RAZORPAY_WEBHOOK_SECRET,
) => {
    const router = new Hono();

    router.post("/", async (c) => {
        const contentLength = Number(c.req.header("content-length") ?? 0);
        if (Number.isFinite(contentLength) && contentLength > RAZORPAY_WEBHOOK_MAX_BODY_BYTES) {
            return c.json({ status: "error", message: "Webhook payload is too large" }, 413);
        }

        let rawBody: Uint8Array;
        try {
            rawBody = await readLimitedBody(c.req.raw);
        } catch {
            return c.json({ status: "error", message: "Webhook body could not be read" }, 400);
        }

        try {
            const validSignature = verifyRazorpayWebhookSignature(
                rawBody,
                c.req.header("x-razorpay-signature"),
                webhookSecret(),
            );
            if (!validSignature) {
                return c.json({ status: "error", message: "Invalid webhook signature" }, 400);
            }
        } catch (error) {
            if (error instanceof RazorpayAdapterError && error.code === "missing_configuration") {
                return c.json({ status: "error", message: "Webhook is not configured" }, 503);
            }
            return c.json({ status: "error", message: "Invalid webhook signature" }, 400);
        }

        const eventId = c.req.header("x-razorpay-event-id")?.trim() ?? "";
        if (!eventId) {
            return c.json({ status: "error", message: "Missing Razorpay event id" }, 400);
        }

        let parsed: unknown;
        try {
            parsed = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(rawBody));
        } catch {
            return c.json({ status: "error", message: "Webhook payload must be valid JSON" }, 400);
        }

        const extracted = extractRazorpayWebhook(parsed);
        const ingestInput: IngestRazorpayWebhookInput = {
            razorpayEventId: eventId,
            eventType: extracted.eventType,
            payload: extracted.payload,
            orderId: extracted.orderId,
            paymentId: extracted.paymentId,
            amountPaise: extracted.amountPaise,
            currency: extracted.currency,
            paidAt: extracted.paidAt,
        };

        const result = await licensingService.ingestRazorpayWebhook(ingestInput);
        if (result.status === "error" && result.code === STATUS_CODES.INTERNAL_SERVER_ERROR) {
            return c.json({ status: "error", message: result.message }, 500);
        }
        return c.json({ status: "ok", fulfillmentStatus: result.data?.fulfillmentStatus }, 200);
    });

    return router;
};

export default createRazorpayWebhookRoutes();
