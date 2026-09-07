import { mock } from "bun:test";

export const sharedOrganizationId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
export const sharedStoreId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";

export const sharedOrganization = { id: sharedOrganizationId, name: "Demo Org" };
export const sharedStore = {
    id: sharedStoreId,
    organizationId: sharedOrganizationId,
    name: "Adajan",
};

export const getOrganizationByIdForUser = mock(
    async (): Promise<{ id: string; name: string } | null> => sharedOrganization,
);
export const getStoreById = mock(
    async (): Promise<{ id: string; organizationId: string; name: string } | null> => sharedStore,
);
export const getStoresByOrganizationId = mock(
    async (): Promise<Array<{ id: string; organizationId: string; name: string }>> => [
        sharedStore,
    ],
);

mock.module("@/modules/tenant/organization/organization.repository", () => ({
    getOrganizationByIdForUser,
    getStoreById,
    getStoresByOrganizationId,
}));
