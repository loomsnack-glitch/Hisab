import { describe, expect, test } from "bun:test";
import { listCustomerConsentEvents, recordCustomerConsent, setCustomerSuppression } from "./customer-consent.service";

const organizationId = "11111111-1111-4111-8111-111111111111";
const userId = "22222222-2222-4222-8222-222222222222";
const customerId = "33333333-3333-4333-8333-333333333333";
const event = {
  id: "44444444-4444-4444-8444-444444444444",
  organizationId,
  customerId,
  kind: "marketing" as const,
  state: "opted_in" as const,
  source: "admin" as const,
  wordingVersion: null,
  evidenceReference: null,
  reason: null,
  createdBy: userId,
  createdAt: "2026-08-22T10:00:00.000Z",
};

describe("WhatsApp customer consent service", () => {
  test("records explicit consent only for an authorized organization", async () => {
    const response = await recordCustomerConsent(userId, organizationId, customerId, {
      kind: "marketing",
      state: "opted_in",
      source: "admin",
    }, {
      organizationAccess: async () => true,
      recordCustomerConsent: async () => event,
    });
    expect(response.status).toBe("success");
    expect(response.data?.state).toBe("opted_in");
  });

  test("makes suppression an auditable blocking command", async () => {
    const response = await setCustomerSuppression(userId, organizationId, customerId, {
      suppressed: true,
      source: "admin",
      reason: "Customer requested no WhatsApp messages",
    }, {
      organizationAccess: async () => true,
      setCustomerSuppression: async () => ({ ...event, kind: "suppression" as const, state: "suppressed" as const }),
    });
    expect(response.status).toBe("success");
    expect(response.data?.kind).toBe("suppression");
    expect(response.data?.state).toBe("suppressed");
  });

  test("does not reveal customer history across an unauthorized organization", async () => {
    const response = await listCustomerConsentEvents(userId, organizationId, customerId, {
      organizationAccess: async () => false,
    });
    expect(response.status).toBe("error");
    expect(response.code).toBe(404);
  });
});
