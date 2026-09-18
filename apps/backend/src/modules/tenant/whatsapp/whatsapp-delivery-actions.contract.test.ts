import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

const invoiceSource = readFileSync(new URL("./invoice.ts", import.meta.url), "utf8");
const serviceSource = readFileSync(new URL("./whatsapp.service.ts", import.meta.url), "utf8");
const repositorySource = readFileSync(new URL("./whatsapp.repository.ts", import.meta.url), "utf8");
const routeSource = readFileSync(new URL("./whatsapp.routes.ts", import.meta.url), "utf8");

describe("WhatsApp delivery action boundary", () => {
  test("keeps invoice status and retry on the current policy-selected account", () => {
    expect(invoiceSource).toContain("const account = policy?.whatsappAccountId");
    expect(invoiceSource).toContain("repository.getAccountById(policy.whatsappAccountId)");
    expect(invoiceSource).not.toContain("repository.getAccount(organizationId, storeId)");
  });

  test("supports due status, retry, and resend for both platform and Cloud paths", () => {
    expect(serviceSource).toContain("getPlatformDueReminderOutbox");
    expect(serviceSource).toContain("retryPlatformDueReminderOutbox");
    expect(serviceSource).toContain("retryCustomerReminderOutbox");
    expect(serviceSource).toContain("resendDueReminderForDevice");
    expect(repositorySource).toContain("m.idempotency_key LIKE 'due-reminder:%'");
  });

  test("exposes explicit due retry and resend routes", () => {
    expect(routeSource).toContain("/whatsapp/due-reminder/:saleId/retry");
    expect(routeSource).toContain("/whatsapp/due-reminder/:saleId/resend");
  });

  test("uses a distinct resend idempotency identity", () => {
    expect(serviceSource).toContain(":resend:${requestId}");
    expect(invoiceSource).toContain("invoice:${saleId}:resend:${requestId}");
  });
});
