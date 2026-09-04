import { createHmac, timingSafeEqual } from "node:crypto";

export const RAZORPAY_WEBHOOK_MAX_BODY_BYTES = 1_000_000;
export const RAZORPAY_ORDERS_URL = "https://api.razorpay.com/v1/orders";

export type RazorpayOrder = {
    id: string;
    amount: number;
    currency: "INR";
    receipt: string;
    status: string;
};

export type CreateRazorpayOrderInput = {
    amountPaise: number;
    currency: "INR";
    receipt: string;
    notes: Record<string, string>;
};

export type RazorpayPaymentProvider = {
    createOrder: (input: CreateRazorpayOrderInput) => Promise<RazorpayOrder>;
    getPublicKeyId: () => string;
};

export type RazorpayWebhookExtraction = {
    eventType: string;
    orderId: string | null;
    paymentId: string | null;
    amountPaise: number | null;
    currency: string | null;
    paidAt: Date | null;
    payload: Record<string, unknown>;
};

export class RazorpayAdapterError extends Error {
    readonly code: "missing_configuration" | "order_failed";

    constructor(code: RazorpayAdapterError["code"], message: string) {
        super(message);
        this.name = "RazorpayAdapterError";
        this.code = code;
    }
}

type JsonRecord = Record<string, unknown>;

const isRecord = (value: unknown): value is JsonRecord =>
    typeof value === "object" && value !== null && Array.isArray(value) === false;

const nonEmptyString = (value: unknown): string | null => {
    if (typeof value !== "string") return null;
    const normalized = value.trim();
    return normalized || null;
};

const asInteger = (value: unknown): number | null => {
    if (typeof value === "number" && Number.isInteger(value)) return value;
    if (typeof value === "string" && /^-?\d+$/.test(value)) return Number(value);
    return null;
};

const asUnixDate = (value: unknown): Date | null => {
    const seconds = asInteger(value);
    if (seconds === null || seconds <= 0) return null;
    return new Date(seconds * 1000);
};

const requireSecret = (value: string | undefined, name: string): string => {
    const secret = value?.trim() ?? "";
    if (!secret) {
        throw new RazorpayAdapterError("missing_configuration", `${name} is not configured`);
    }
    return secret;
};

const bodyBytes = (body: string | Uint8Array): Uint8Array =>
    typeof body === "string" ? Buffer.from(body, "utf8") : body;

const safeEqual = (left: string, right: string): boolean => {
    const leftBytes = Buffer.from(left);
    const rightBytes = Buffer.from(right);
    return leftBytes.length === rightBytes.length && timingSafeEqual(leftBytes, rightBytes);
};

export const verifyRazorpayWebhookSignature = (
    rawBody: string | Uint8Array,
    signatureHeader: string | undefined,
    webhookSecret: string | undefined,
): boolean => {
    const secret = requireSecret(webhookSecret, "Razorpay webhook secret");
    const signature = signatureHeader?.trim() ?? "";
    if (!/^[a-f0-9]{64}$/i.test(signature)) {
        return false;
    }
    const expected = createHmac("sha256", secret).update(bodyBytes(rawBody)).digest("hex");
    return safeEqual(signature.toLowerCase(), expected);
};

const entity = (payload: JsonRecord, name: string): JsonRecord | null => {
    const wrapper = payload[name];
    if (!isRecord(wrapper)) return null;
    return isRecord(wrapper.entity) ? wrapper.entity : null;
};

export const extractRazorpayWebhook = (parsed: unknown): RazorpayWebhookExtraction => {
    const payloadRoot = isRecord(parsed) ? parsed : {};
    const payload = isRecord(payloadRoot.payload) ? payloadRoot.payload : {};
    const order = entity(payload, "order");
    const payment = entity(payload, "payment");
    const amountPaise = asInteger(order?.amount) ?? asInteger(payment?.amount);
    const currency = nonEmptyString(order?.currency) ?? nonEmptyString(payment?.currency);

    return {
        eventType: nonEmptyString(payloadRoot.event) ?? "unknown",
        orderId: nonEmptyString(order?.id) ?? nonEmptyString(payment?.order_id),
        paymentId: nonEmptyString(payment?.id),
        amountPaise,
        currency: currency ? currency.toUpperCase() : null,
        paidAt: asUnixDate(payment?.created_at) ?? asUnixDate(payloadRoot.created_at),
        payload: payloadRoot,
    };
};

const toOrder = (value: unknown): RazorpayOrder => {
    if (!isRecord(value)) {
        throw new RazorpayAdapterError("order_failed", "Razorpay did not return an Order");
    }
    const id = nonEmptyString(value.id);
    const amount = asInteger(value.amount);
    const currency = nonEmptyString(value.currency);
    const receipt = nonEmptyString(value.receipt);
    const status = nonEmptyString(value.status) ?? "created";
    if (!id || amount === null || currency !== "INR" || !receipt) {
        throw new RazorpayAdapterError("order_failed", "Razorpay Order is missing amount, currency, or receipt");
    }
    return { id, amount, currency, receipt, status };
};

export const createRazorpayPaymentProvider = (
    env: {
        keyId?: string;
        keySecret?: string;
    fetchImpl?: (url: string, init?: RequestInit) => Promise<Response>;
        ordersUrl?: string;
    } = {},
): RazorpayPaymentProvider => {
    const keyId = () => requireSecret(env.keyId ?? process.env.RAZORPAY_KEY_ID, "Razorpay key id");
    const keySecret = () => requireSecret(env.keySecret ?? process.env.RAZORPAY_KEY_SECRET, "Razorpay key secret");
    const fetchImpl = env.fetchImpl ?? fetch;
    const ordersUrl = env.ordersUrl ?? RAZORPAY_ORDERS_URL;

    return {
        getPublicKeyId: () => keyId(),
        createOrder: async (input) => {
            const authorization = Buffer.from(`${keyId()}:${keySecret()}`).toString("base64");
            const response = await fetchImpl(ordersUrl, {
                method: "POST",
                headers: {
                    Authorization: `Basic ${authorization}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    amount: input.amountPaise,
                    currency: input.currency,
                    receipt: input.receipt,
                    notes: input.notes,
                }),
            });
            const body = await response.json().catch(() => null);
            if (!response.ok) {
                throw new RazorpayAdapterError("order_failed", "Unable to create a Razorpay Order");
            }
            return toOrder(body);
        },
    };
};
