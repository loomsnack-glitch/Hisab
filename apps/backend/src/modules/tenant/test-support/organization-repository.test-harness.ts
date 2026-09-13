import { mock } from "bun:test";

export const sharedOrganizationId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
export const sharedStoreId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";

export const sharedOrganization = { id: sharedOrganizationId, name: "Demo Org" };
export const sharedStore = {
    id: sharedStoreId,
    organizationId: sharedOrganizationId,
    name: "Adajan",
    kotSystemEnabled: false,
    tableManagementEnabled: false,
    moneyAccountTrackingEnabled: false,
};

export const getOrganizationByIdForUser = mock(
    async (): Promise<{ id: string; name: string } | null> => sharedOrganization,
);
export const getStoreById = mock(
    async (): Promise<typeof sharedStore | null> => sharedStore,
);
export const getStoresByOrganizationId = mock(
    async (): Promise<Array<{ id: string; organizationId: string; name: string }>> => [
        sharedStore,
    ],
);
export const storeNameExistsInOrganization = mock(async () => false);
export const updateStore = mock(async (data: Record<string, unknown>) => ({
    ...sharedStore,
    ...data,
}));

mock.module("@/modules/tenant/organization/organization.repository", () => ({
    getOrganizationByIdForUser,
    getStoreById,
    getStoresByOrganizationId,
    storeNameExistsInOrganization,
    updateStore,
}));
