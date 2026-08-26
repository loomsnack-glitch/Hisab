import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("Google Contacts Customer write routes", () => {
  test("Admin and POS Customer writes go through billing service and never call Google inline", () => {
    const dir = import.meta.dir;
    const billingRoutes = readFileSync(join(dir, "..", "billing", "billing.routes.ts"), "utf8");
    const billingService = readFileSync(join(dir, "..", "billing", "billing.service.ts"), "utf8");
    const posRoutes = readFileSync(join(dir, "..", "..", "pos", "pos.routes.ts"), "utf8");

    expect(billingRoutes).toContain("billingService.createCustomer(");
    expect(billingRoutes).toContain("billingService.updateCustomer(");
    expect(posRoutes).toContain("billingService.createCustomerForDevice(");
    expect(posRoutes).toContain("billingService.updateCustomerForDevice(");

    expect(billingService).toContain("scheduleGoogleContactsCustomerChange");
    expect(billingService).toContain("createCustomerForDevice");
    expect(billingService).toContain("updateCustomerForDevice");

    expect(billingRoutes.toLowerCase()).not.toContain("creategooglepeopleclient");
    expect(posRoutes.toLowerCase()).not.toContain("creategooglepeopleclient");
    expect(billingService.toLowerCase()).not.toContain("creategooglepeopleclient");
    expect(billingService).not.toContain("people.deleteContact");
  });
});
