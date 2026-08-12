import { describe, expect, test } from "bun:test";
import { classifyMessageEvent } from "./message-event.js";

describe("WhatsApp message event classification", () => {
    test("classifies customer realtime messages as inbound", () => {
        expect(classifyMessageEvent(false, "realtime")).toEqual({ direction: "inbound", source: "realtime" });
    });

    test("classifies linked-phone history messages as outbound without notification semantics", () => {
        expect(classifyMessageEvent(true, "history")).toEqual({ direction: "outbound", source: "history" });
    });
});
