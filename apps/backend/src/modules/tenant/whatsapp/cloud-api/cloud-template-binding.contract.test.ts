import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("./cloud-template.repository.ts", import.meta.url), "utf8");

describe("Cloud template binding boundary", () => {
  test("requires the current Organization Cloud Store policy and selected WABA account", () => {
    expect(source).toContain("INNER JOIN whatsapp_store_policies policies");
    expect(source).toContain("policies.mode = 'organization_cloud'");
    expect(source).toContain("policies.whatsapp_account_id = accounts.id");
    expect(source).toContain("policies.effective_to IS NULL");
  });

  test("keeps local and Cloud defaults synchronized on re-publish and rollback", () => {
    expect(source).toContain("UPDATE whatsapp_message_templates");
    expect(source).toContain("SET is_default = FALSE");
    expect(source).toContain("SET is_default = TRUE");
    expect(source).toContain("target.local_template_id");
    expect(source).toContain("Cloud template binding is not for the Store's current WhatsApp sender");
  });
});
