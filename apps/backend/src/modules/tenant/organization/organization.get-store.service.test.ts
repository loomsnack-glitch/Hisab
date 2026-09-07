import { beforeEach, describe, expect, test } from "bun:test";
import { STATUS_CODES } from "@repo/types";

import {
    getOrganizationByIdForUser,
    getStoreById,
    sharedOrganization,
    sharedOrganizationId,
    sharedStore,
    sharedStoreId,
} from "@/modules/tenant/test-support/organization-repository.test-harness";

const otherOrganizationId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const otherStoreId = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const userId = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";

const organizationService = await import("./organization.service");

describe("getStore", () => {
    beforeEach(() => {
        getOrganizationByIdForUser.mockClear();
        getStoreById.mockClear();
        getOrganizationByIdForUser.mockImplementation((async (organizationId: string) =>
            organizationId === sharedOrganizationId ? sharedOrganization : null) as () => ReturnType<
            typeof getOrganizationByIdForUser
        >);
        getStoreById.mockImplementation((async (organizationId: string, storeId: string) =>
            organizationId === sharedOrganizationId && storeId === sharedStoreId
                ? sharedStore
                : null) as () => ReturnType<typeof getStoreById>);
    });

    test("returns the Store for an Organization administrator", async () => {
        const response = await organizationService.getStore(userId, sharedOrganizationId, sharedStoreId);

        expect(response.status).toBe("success");
        expect(response.code).toBe(STATUS_CODES.SUCCESS);
        expect(response.data?.store.id).toBe(sharedStoreId);
        expect(response.data?.store.name).toBe("Adajan");
        expect(getStoreById).toHaveBeenCalledWith(sharedOrganizationId, sharedStoreId);
    });

    test("does not name a Store that belongs to another Organization", async () => {
        const missing = await organizationService.getStore(userId, sharedOrganizationId, otherStoreId);
        const otherOrg = await organizationService.getStore(userId, otherOrganizationId, sharedStoreId);

        expect(missing.status).toBe("error");
        expect(missing.message).toBe("Store not found");
        expect(missing.data).toBeNull();
        expect(otherOrg.status).toBe("error");
        expect(otherOrg.message).toBe("Organization not found");
        expect(otherOrg.data).toBeNull();
        expect(getStoreById).not.toHaveBeenCalledWith(otherOrganizationId, sharedStoreId);
    });
});
