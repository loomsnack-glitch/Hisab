import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("./invoice.ts", import.meta.url), "utf8");

describe("bill delivery policy boundary", () => {
  test("uses the account selected by the current Store policy", () => {
    expect(source).toContain("repository.getAccountById(policy.whatsappAccountId)");
  });

  test("passes the admitted policy revision to Cloud bill queueing", () => {
    expect(source).toContain("intent: \"bill\", policyVersion");
    expect(source).toContain("componentParameters");
    expect(source).toContain("account.id,\n      policy.revision,");
  });
});
