import { describe, expect, test } from "bun:test";

import { cloudSafetyErrorMessage } from "./whatsapp-cloud-safety-card";

describe("Cloud sending controls error copy", () => {
    test("explains an entitlement-denied safety request", () => {
        expect(cloudSafetyErrorMessage({
            status: "error",
            message: "WhatsApp is not available for any Store in this Organization.",
            code: 403,
        })).toBe("Cloud sending controls require WhatsApp access on at least one Store in this Organization. Purchase a plan or add the WhatsApp module to continue.");
    });
});
