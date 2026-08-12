import { describe, expect, test } from "bun:test";
import { WAMessageStatus } from "baileys";
import { normalizeMessageStatus } from "./message-status.js";

describe("WhatsApp provider message status normalization", () => {
    test("maps delivery acknowledgement to delivered", () => {
        expect(normalizeMessageStatus(WAMessageStatus.DELIVERY_ACK)).toBe("delivered");
    });

    test("maps read and played receipts to read", () => {
        expect(normalizeMessageStatus(WAMessageStatus.READ)).toBe("read");
        expect(normalizeMessageStatus(WAMessageStatus.PLAYED)).toBe("read");
    });

    test("ignores unsupported and missing statuses", () => {
        expect(normalizeMessageStatus(WAMessageStatus.SERVER_ACK)).toBeNull();
        expect(normalizeMessageStatus(null)).toBeNull();
    });
});
