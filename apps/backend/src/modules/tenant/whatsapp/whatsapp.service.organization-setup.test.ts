import { describe, expect, mock, test } from "bun:test";

const organizationId = "11111111-1111-4111-8111-111111111111";
const userId = "22222222-2222-4222-8222-222222222222";
const storeId = "33333333-3333-4333-8333-333333333333";

const getOrganizationByIdForUser = mock(async () => ({ id: organizationId }));
const getStoresByOrganizationId = mock(async () => [{ id: storeId, organizationId, name: "Adajan" }]);
const getAccountsForOrganization = mock(async () => []);

mock.module("@/modules/tenant/organization/organization.repository", () => ({
    getOrganizationByIdForUser,
    getStoresByOrganizationId,
}));
const whatsappRepository = await import("./whatsapp.repository");
mock.module("./whatsapp.repository", () => ({ ...whatsappRepository, getAccountsForOrganization }));

const { ensureFeatureEntitlementMock, resolveFeatureEntitlement } = await import(
    "@/modules/tenant/commercial-licensing/feature-entitlement.test-harness",
);
await ensureFeatureEntitlementMock();
const { listAccounts } = await import("./whatsapp.service");

describe("Organization WhatsApp account setup", () => {
    test("lists connected accounts without an active WhatsApp entitlement", async () => {
        resolveFeatureEntitlement.mockImplementation(async (_storeId, featureKey) => ({
            entitled: false,
            featureKey,
            evidence: [],
        }));

        const response = await listAccounts(userId, organizationId);

        expect(response).toMatchObject({
            status: "success",
            code: 200,
            data: { accounts: [] },
        });
    });
});
