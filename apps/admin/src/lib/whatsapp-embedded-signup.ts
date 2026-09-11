type EmbeddedSignupPayload = {
    type?: string;
    event?: string;
    data?: { phone_number_id?: string; waba_id?: string };
};

export type EmbeddedSignupSession =
    | { kind: "finish"; wabaId: string; phoneNumberId: string }
    | { kind: "finish_incomplete"; wabaId: string; phoneNumberId: string }
    | { kind: "cancel" }
    | { kind: "error"; message: string };

const FACEBOOK_ORIGIN = /^https:\/\/([a-z0-9-]+\.)*facebook\.com$/i;
const FINISH_EVENTS = new Set<string>([
    "FINISH",
    "FINISH_ONLY_WABA",
    "FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING",
]);

export const embeddedSignupLoginOptions = (configId: string) => ({
    config_id: configId,
    response_type: "code" as const,
    override_default_response_type: true,
    extras: {
        setup: {},
        sessionInfoVersion: "3",
    },
});

export const readEmbeddedSignupSession = (origin: string, data: unknown): EmbeddedSignupSession | null => {
    if (!FACEBOOK_ORIGIN.test(origin)) return null;
    const payload = parsePayload(data);
    if (payload?.type !== "WA_EMBEDDED_SIGNUP") return null;
    if (payload.event === "CANCEL") return { kind: "cancel" };
    if (payload.event === "ERROR") {
        return { kind: "error", message: "Meta Embedded Signup reported an error" };
    }
    if (!FINISH_EVENTS.has(payload.event ?? "")) return null;
    const wabaId = payload.data?.waba_id?.trim() ?? "";
    const phoneNumberId = payload.data?.phone_number_id?.trim() ?? "";
    if (wabaId && phoneNumberId) return { kind: "finish", wabaId, phoneNumberId };
    return { kind: "finish_incomplete", wabaId, phoneNumberId };
};

const parsePayload = (data: unknown): EmbeddedSignupPayload | null => {
    if (typeof data === "string") {
        try {
            return parsePayload(JSON.parse(data) as unknown);
        } catch {
            return null;
        }
    }
    if (!data || typeof data !== "object") return null;
    return data as EmbeddedSignupPayload;
};
