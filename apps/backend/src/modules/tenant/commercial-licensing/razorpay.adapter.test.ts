import { createHmac } from "node:crypto";
import { describe, expect, test } from "bun:test";
import {
    createRazorpayPaymentProvider,
    extractRazorpayWebhook,
    RazorpayAdapterError,
    verifyRazorpayWebhookSignature,
} from "./razorpay.adapter";

const WEBHOOK_SECRET = "webhook_secret_test";

describe("Razorpay payment-provider adapter", () => {
    test("creates a Razorpay Order for the Quote's exact paise amount", async () => {
        const fetchImpl: (url: string, init?: RequestInit) => Promise<Response> = async (_url, init) => {
            const body = JSON.parse(String(init?.body));
            expect(body).toEqual({
                amount: 299900,
                currency: "INR",
                receipt: "quote-1",
                notes: { quote_id: "quote-1" },
            });
            const headers = new Headers(init?.headers);
            expect(headers.get("Authorization")).toMatch(/^Basic /);
            return new Response(JSON.stringify({
                id: "order_abc",
                amount: 299900,
                currency: "INR",
                receipt: "quote-1",
                status: "created",
            }), { status: 200 });
        };
        const provider = createRazorpayPaymentProvider({
            keyId: "rzp_test_key",
            keySecret: "rzp_test_secret",
            fetchImpl,
        });

        const order = await provider.createOrder({
            amountPaise: 299900,
            currency: "INR",
            receipt: "quote-1",
            notes: { quote_id: "quote-1" },
        });

        expect(order.id).toBe("order_abc");
        expect(provider.getPublicKeyId()).toBe("rzp_test_key");
    });

    test("verifies the untouched raw body and extracts order.paid fields", () => {
        const payload = JSON.stringify({
            event: "order.paid",
            payload: {
                payment: {
                    entity: {
                        id: "pay_1",
                        order_id: "order_abc",
                        amount: 299900,
                        currency: "INR",
                        created_at: 1756998000,
                    },
                },
                order: {
                    entity: {
                        id: "order_abc",
                        amount: 299900,
                        currency: "INR",
                        status: "paid",
                    },
                },
            },
        });
        const signature = createHmac("sha256", WEBHOOK_SECRET).update(payload).digest("hex");
        const tampered = createHmac("sha256", WEBHOOK_SECRET).update(`${payload} `).digest("hex");

        expect(verifyRazorpayWebhookSignature(payload, signature, WEBHOOK_SECRET)).toBe(true);
        expect(verifyRazorpayWebhookSignature(payload, tampered, WEBHOOK_SECRET)).toBe(false);
        expect(extractRazorpayWebhook(JSON.parse(payload))).toEqual(expect.objectContaining({
            eventType: "order.paid",
            orderId: "order_abc",
            paymentId: "pay_1",
            amountPaise: 299900,
            currency: "INR",
        }));
    });

    test("does not create an Order when credentials are missing", () => {
        const provider = createRazorpayPaymentProvider({ keyId: "", keySecret: "" });
        expect(() => provider.getPublicKeyId()).toThrow(RazorpayAdapterError);
    });

    test("creates a Razorpay Refund for an approved payment amount", async () => {
        const fetchImpl: (url: string, init?: RequestInit) => Promise<Response> = async (url, init) => {
            expect(url).toBe("https://api.razorpay.com/v1/payments/pay_abc/refund");
            expect(JSON.parse(String(init?.body))).toEqual({ amount: 150000 });
            return new Response(JSON.stringify({
                id: "rfnd_abc",
                amount: 150000,
                currency: "INR",
                status: "processed",
            }), { status: 200 });
        };
        const provider = createRazorpayPaymentProvider({
            keyId: "rzp_test_key",
            keySecret: "rzp_test_secret",
            fetchImpl,
        });

        const refund = await provider.createRefund({
            paymentId: "pay_abc",
            amountPaise: 150000,
        });

        expect(refund.id).toBe("rfnd_abc");
        expect(refund.paymentId).toBe("pay_abc");
    });

    test("does not create a Refund when credentials are missing", async () => {
        const provider = createRazorpayPaymentProvider({ keyId: "", keySecret: "" });
        await expect(provider.createRefund({ paymentId: "pay_abc", amountPaise: 100 }))
            .rejects
            .toThrow(RazorpayAdapterError);
    });
});
