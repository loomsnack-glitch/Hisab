import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("./whatsapp.service.ts", import.meta.url), "utf8");

describe("WhatsApp notification log safety", () => {
  test("does not log OTPs, recipient PII, invitation content, or provider payloads", () => {
    expect(source).not.toContain("Sending WhatsApp OTP to");
    expect(source).not.toContain("send WhatsApp OTP");
    expect(source).not.toContain("JSON.stringify(response.data");
    expect(source).not.toContain("console.log");
    expect(source).not.toContain("console.error(\"WhatsApp error response:");
    expect(source).toContain("console.error(\"WhatsApp OTP delivery failed\");");
    expect(source).toContain("console.error(\"WhatsApp organization invitation delivery failed\");");
  });
});
