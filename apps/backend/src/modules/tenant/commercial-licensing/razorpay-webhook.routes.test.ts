import { createHmac } from "node:crypto";
import { describe, expect, test } from "bun:test";
import { Hono } from "hono";

import { createMemoryCommercialLicensing, organizationId, storeId, userId } from "./commercial-licensing.test-harness";
import { createRazorpayWebhookRoutes } from "./razorpay-webhook.routes";

const WEBHOOK_SECRET = "webhook_secret_test";

const sign = (body: string) => createHmac("sha256", WEBHOOK_SECRET).update(body).digest("hex");

const orderPaidBody = (orderId: string, amount = 299900) => JSON.stringify({
    event: "order.paid",
    payload: {
        payment: {
            entity: {
                id: "pay_1",
                order_id: orderId,
                amount,
                currency: "INR",
                created_at: 1756998000,
            },
        },
        order: {
            entity: {
                id: orderId,
                amount,
                currency: "INR",
                status: "paid",
            },
        },
    },
});

const createApp = () => {
    const memory = createMemoryCommercialLicensing();
    const app = new Hono();
    app.route("/webhooks/razorpay", createRazorpayWebhookRoutes(memory.service, () => WEBHOOK_SECRET));
    return { app, memory };
};

describe("Razorpay commercial webhook route", () => {
    test("rejects an invalid signature without creating access", async () => {
        const { app, memory } = createApp();
        await memory.service.createPaidPlanCheckout(userId, organizationId, storeId, { planKey: "core" });
        const body = orderPaidBody("order_test_001");

        const response = await app.request("http://localhost/webhooks/razorpay", {
            method: "POST",
            headers: {
                "content-type": "application/json",
                "x-razorpay-signature": sign(`${body}tampered`),
                "x-razorpay-event-id": "evt_invalid",
            },
            body,
        });
        const status = await memory.service.getStoreCommercialStatus(userId, organizationId, storeId);

        expect(response.status).toBe(400);
        expect(status.data?.commercialStatus.baseAccess).toBeNull();
        expect(memory.state.paymentEvents).toHaveLength(0);
    });

    test("accepts a signed order.paid raw body and fulfils the matching Quote once", async () => {
        const { app, memory } = createApp();
        await memory.service.createPaidPlanCheckout(userId, organizationId, storeId, { planKey: "core" });
        const body = orderPaidBody("order_test_001");
        const headers = {
            "content-type": "application/json",
            "x-razorpay-signature": sign(body),
            "x-razorpay-event-id": "evt_paid_1",
        };

        const first = await app.request("http://localhost/webhooks/razorpay", { method: "POST", headers, body });
        const replay = await app.request("http://localhost/webhooks/razorpay", { method: "POST", headers, body });
        const capturedBody = JSON.stringify({ event: "payment.captured", payload: JSON.parse(body).payload });
        const captured = await app.request("http://localhost/webhooks/razorpay", {
            method: "POST",
            headers: {
                "content-type": "application/json",
                "x-razorpay-signature": sign(capturedBody),
                "x-razorpay-event-id": "evt_captured_1",
            },
            body: capturedBody,
        });
        const status = await memory.service.getStoreCommercialStatus(userId, organizationId, storeId);

        expect(first.status).toBe(200);
        expect(replay.status).toBe(200);
        expect(captured.status).toBe(200);
        expect(await first.json()).toEqual({ status: "ok", fulfillmentStatus: "fulfilled" });
        expect(await captured.json()).toEqual({ status: "ok", fulfillmentStatus: "ignored" });
        expect(status.data?.commercialStatus.baseAccess?.planKey).toBe("core");
        expect(memory.state.licenses.filter((license) => license.sourceKind === "paid")).toHaveLength(1);
    });
});
