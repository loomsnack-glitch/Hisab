import { describe, expect, test } from "bun:test";
import { isWhatsAppOptOutKeyword } from "./opt-out";

describe("WhatsApp opt-out keywords", () => {
  test("recognizes common exact opt-out commands", () => {
    expect(isWhatsAppOptOutKeyword(" stop! ")).toBe(true);
    expect(isWhatsAppOptOutKeyword("unsubscribe")).toBe(true);
  });

  test("does not suppress messages that only contain a keyword", () => {
    expect(isWhatsAppOptOutKeyword("Please stop sending invoices")).toBe(false);
    expect(isWhatsAppOptOutKeyword("STOP NOW")).toBe(false);
  });
});
