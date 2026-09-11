import { describe, expect, test } from "bun:test";

import {
    embeddedSignupLoginOptions,
    readEmbeddedSignupSession,
} from "./whatsapp-embedded-signup";

const finishPayload = {
    type: "WA_EMBEDDED_SIGNUP",
    event: "FINISH",
    data: {
        waba_id: "123456789012345",
        phone_number_id: "987654321098765",
    },
};

describe("WhatsApp Embedded Signup session intake", () => {
    test("reads a JSON-string FINISH payload from a Facebook origin", () => {
        expect(readEmbeddedSignupSession("https://www.facebook.com", JSON.stringify(finishPayload))).toEqual({
            kind: "finish",
            wabaId: "123456789012345",
            phoneNumberId: "987654321098765",
        });
    });

    test("reads an object FINISH payload from business.facebook.com", () => {
        expect(readEmbeddedSignupSession("https://business.facebook.com", finishPayload)).toEqual({
            kind: "finish",
            wabaId: "123456789012345",
            phoneNumberId: "987654321098765",
        });
    });

    test("treats coexistence finish as a completed session", () => {
        expect(readEmbeddedSignupSession("https://web.facebook.com", {
            ...finishPayload,
            event: "FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING",
        })).toEqual({
            kind: "finish",
            wabaId: "123456789012345",
            phoneNumberId: "987654321098765",
        });
    });

    test("treats CANCEL as an abandoned session", () => {
        expect(readEmbeddedSignupSession("https://www.facebook.com", {
            type: "WA_EMBEDDED_SIGNUP",
            event: "CANCEL",
        })).toEqual({ kind: "cancel" });
    });

    test("ignores non-Facebook origins and non-session messages", () => {
        expect(readEmbeddedSignupSession("https://admin.ganatri.in", JSON.stringify(finishPayload))).toBeNull();
        expect(readEmbeddedSignupSession("https://www.facebook.com", { type: "OTHER" })).toBeNull();
        expect(readEmbeddedSignupSession("https://www.facebook.com", "not-json")).toBeNull();
    });

    test("launches Cloud API signup with session logging and without the legacy feature override", () => {
        expect(embeddedSignupLoginOptions("1576624827344427")).toEqual({
            config_id: "1576624827344427",
            response_type: "code",
            override_default_response_type: true,
            extras: {
                setup: {},
                sessionInfoVersion: "3",
            },
        });
    });
});
