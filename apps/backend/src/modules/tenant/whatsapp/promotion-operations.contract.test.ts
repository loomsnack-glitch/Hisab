import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("./promotion.ts", import.meta.url), "utf8");

describe("Organization Cloud promotion operations boundary", () => {
    test("keeps retry and resend tied to the current policy-selected sender", () => {
        expect(source).toContain("target.whatsapp_account_id");
        expect(source).toContain("policy.whatsappAccountId");
        expect(source).toContain("cannot be retried from the current Store policy");
        expect(source).toContain("cannot be resent from the current Store policy");
    });
});
