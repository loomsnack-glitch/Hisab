import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("./conversation.ts", import.meta.url), "utf8");

describe("Organization Cloud conversation policy boundary", () => {
  test("requires organization_cloud before resolving conversation scope", () => {
    expect(source).toContain("policy?.mode !== \"organization_cloud\"");
    expect(source).toContain("Organization Cloud conversations are not enabled for this Store");
  });

  test("resolves the exact policy-selected account and Store assignment", () => {
    expect(source).toContain("repository.getAccountById(policy.whatsappAccountId)");
    expect(source).toContain("account.assignedStoreIds.includes(storeId)");
    expect(source).not.toContain("repository.getAccount(organizationId, storeId)");
  });
});
