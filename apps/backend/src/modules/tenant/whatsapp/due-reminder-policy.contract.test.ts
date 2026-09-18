import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("./whatsapp.service.ts", import.meta.url), "utf8");
const dueSection = source.slice(
  source.indexOf("const queueDueReminderForStore"),
  source.indexOf("export const queueDueReminder ="),
);

describe("due-reminder policy boundary", () => {
  test("uses the Cloud account selected by the current Store policy", () => {
    expect(dueSection).toContain("repository.getAccountById(policy.whatsappAccountId)");
    expect(dueSection).not.toContain("repository.getAccount(organizationId, storeId)");
  });

  test("passes the admitted policy revision to both Cloud device and user queue paths", () => {
    expect(dueSection).toContain("intent: \"due_reminder\", policyVersion: policy.revision");
    expect(dueSection.match(/intent: \"due_reminder\", policyVersion: policy\.revision/g)?.length).toBe(2);
    expect(dueSection.match(/policyVersion: policy\.revision/g)?.length).toBe(3);
  });

  test("reads due Sales through the Store-scoped completed-sale repository boundary", () => {
    expect(dueSection).toContain("billingRepository.getDueSalesByCustomerStore(organizationId, storeId, customerId)");
  });
});
