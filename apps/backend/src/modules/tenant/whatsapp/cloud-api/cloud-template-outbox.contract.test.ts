import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("./cloud-template-outbox.repository.ts", import.meta.url), "utf8");

describe("Cloud template outbox policy boundary", () => {
  test("requires the current Store Cloud policy to select the queued sender", () => {
    expect(source).toContain("INNER JOIN whatsapp_store_policies policy");
    expect(source).toContain("policy.mode = 'organization_cloud'");
    expect(source).toContain("policy.whatsapp_account_id = account.id");
    expect(source).toContain("policy.effective_to IS NULL");
  });

  test("rejects a policy revision change after bill admission", () => {
    expect(source).toContain("policy.revision = ${params.snapshot.policyVersion ?? null}");
    expect(source).toContain("FOR UPDATE OF account, binding, asset, policy");
  });
});
