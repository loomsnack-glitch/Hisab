import { mock } from "bun:test";
import { resolveFeatureEntitlement, ensureFeatureEntitlementMock } from "@/modules/tenant/commercial-licensing/feature-entitlement.test-harness";
import {
    getOrganizationByIdForUser,
    getStoreById,
    getStoresByOrganizationId,
} from "@/modules/tenant/test-support/organization-repository.test-harness";
import type {
    StoreVendorAvailabilityDTO,
    StoreVendorItemOfferingDTO,
    UnitDTO,
    VendorDTO,
    VendorItemDTO,
} from "@repo/types";

export const organizationId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
export const otherOrganizationId = "99999999-9999-4999-8999-999999999999";
export const userId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
export const vendorId = "11111111-1111-4111-8111-111111111111";
export const inactiveVendorId = "22222222-2222-4222-8222-222222222222";
export const unitId = "33333333-3333-4333-8333-333333333333";
export const inactiveUnitId = "55555555-5555-4555-8555-555555555555";
export const vendorItemId = "44444444-4444-4444-8444-444444444444";
export const millersTomatoItemId = "66666666-6666-4666-8666-666666666666";
export const onionItemId = "77777777-7777-4777-8777-777777777777";
export const storeId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
export const vesuStoreId = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
export const availabilityId = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";
export const vesuAvailabilityId = "bbbbbbbb-cccc-4ddd-8eee-ffffffffffff";
export const offeringId = "eeeeeeee-ffff-4aaa-8bbb-cccccccccccc";
export const vesuOfferingId = "ffffffff-aaaa-4bbb-8ccc-dddddddddddd";
export const now = new Date("2026-08-31T12:00:00.000Z");

export const organization = { id: organizationId, name: "Demo Org" };
export const store = { id: storeId, organizationId, name: "Adajan" };
export const vesuStore = { id: vesuStoreId, organizationId, name: "Vesu" };

export const kilogramUnit: UnitDTO = {
    id: unitId,
    organizationId,
    name: "kilogram",
    label: "kg",
    kind: "predefined",
    predefinedKey: "kilogram",
    status: "active",
    createdBy: userId,
    updatedBy: null,
    createdAt: now,
    updatedAt: now,
};

export const inactiveCrateUnit: UnitDTO = {
    id: inactiveUnitId,
    organizationId,
    name: "Crate",
    label: "crt",
    kind: "custom",
    predefinedKey: null,
    status: "inactive",
    createdBy: userId,
    updatedBy: null,
    createdAt: now,
    updatedAt: now,
};

export const freshFarmsVendor: VendorDTO = {
    id: vendorId,
    organizationId,
    name: "Fresh Farms",
    description: "Daily produce supplier",
    status: "active",
    createdBy: userId,
    updatedBy: null,
    createdAt: now,
    updatedAt: now,
};

export const millersVendor: VendorDTO = {
    id: inactiveVendorId,
    organizationId,
    name: "Miller Spices",
    description: null,
    status: "inactive",
    createdBy: userId,
    updatedBy: null,
    createdAt: now,
    updatedAt: now,
};

export const tomatoItem: VendorItemDTO = {
    id: vendorItemId,
    organizationId,
    vendorId,
    name: "Tomato",
    unitId,
    defaultPurchasePrice: 40.5,
    status: "active",
    createdBy: userId,
    updatedBy: null,
    createdAt: now,
    updatedAt: now,
};

export const millersTomatoItem: VendorItemDTO = {
    id: millersTomatoItemId,
    organizationId,
    vendorId: inactiveVendorId,
    name: "Tomato",
    unitId,
    defaultPurchasePrice: 55,
    status: "active",
    createdBy: userId,
    updatedBy: null,
    createdAt: now,
    updatedAt: now,
};

export const onionItem: VendorItemDTO = {
    id: onionItemId,
    organizationId,
    vendorId,
    name: "Onion",
    unitId,
    defaultPurchasePrice: 20,
    status: "inactive",
    createdBy: userId,
    updatedBy: null,
    createdAt: now,
    updatedAt: now,
};

export const storeVendorAvailability: StoreVendorAvailabilityDTO = {
    id: availabilityId,
    organizationId,
    storeId,
    vendorId,
    status: "active",
    createdBy: userId,
    updatedBy: null,
    createdAt: now,
    updatedAt: now,
};

export const vesuStoreVendorAvailability: StoreVendorAvailabilityDTO = {
    id: vesuAvailabilityId,
    organizationId,
    storeId: vesuStoreId,
    vendorId,
    status: "active",
    createdBy: userId,
    updatedBy: null,
    createdAt: now,
    updatedAt: now,
};

export const tomatoOffering: StoreVendorItemOfferingDTO = {
    id: offeringId,
    organizationId,
    storeId,
    vendorId,
    vendorItemId,
    defaultPurchasePrice: 40.5,
    createdBy: userId,
    updatedBy: null,
    createdAt: now,
    updatedAt: now,
};

export const vesuTomatoOffering: StoreVendorItemOfferingDTO = {
    id: vesuOfferingId,
    organizationId,
    storeId: vesuStoreId,
    vendorId,
    vendorItemId,
    defaultPurchasePrice: 38,
    createdBy: userId,
    updatedBy: null,
    createdAt: now,
    updatedAt: now,
};

export { getOrganizationByIdForUser, getStoresByOrganizationId, getStoreById, resolveFeatureEntitlement };

export const getVendorsByOrganizationId = mock(async () => [freshFarmsVendor, millersVendor]);
export const getVendorById = mock(async () => freshFarmsVendor);
export const getUnitById = mock(async () => kilogramUnit);
export const getVendorItemsByOrganizationId = mock(async () => [tomatoItem, millersTomatoItem, onionItem]);
export const getVendorItemById = mock(async () => tomatoItem);

type CreateVendorRepoArg = {
    id: string;
    organizationId: string;
    name: string;
    description: string | null;
    status: VendorDTO["status"];
    createdBy: string;
    updatedBy?: string | null;
};

type UpdateVendorRepoArg = {
    id: string;
    organizationId: string;
    name: string;
    description: string | null;
    status: VendorDTO["status"];
    updatedBy: string;
};

type CreateVendorItemRepoArg = {
    id: string;
    organizationId: string;
    vendorId: string;
    name: string;
    unitId: string;
    defaultPurchasePrice: number;
    status: VendorItemDTO["status"];
    createdBy: string;
    updatedBy?: string | null;
};

type UpdateVendorItemRepoArg = {
    id: string;
    organizationId: string;
    name: string;
    unitId: string;
    defaultPurchasePrice: number;
    status: VendorItemDTO["status"];
    updatedBy: string;
};

export const createVendorRepo = mock(async (data: CreateVendorRepoArg) => ({
    ...freshFarmsVendor,
    ...data,
    createdAt: now,
    updatedAt: now,
    updatedBy: data.updatedBy ?? null,
}));

export const updateVendorRepo = mock(async (data: UpdateVendorRepoArg) => ({
    ...freshFarmsVendor,
    ...data,
    updatedAt: now,
}));

export const createVendorItemRepo = mock(async (data: CreateVendorItemRepoArg) => ({
    ...tomatoItem,
    ...data,
    createdAt: now,
    updatedAt: now,
    updatedBy: data.updatedBy ?? null,
}));

export const updateVendorItemRepo = mock(async (data: UpdateVendorItemRepoArg) => ({
    ...tomatoItem,
    ...data,
    vendorId: tomatoItem.vendorId,
    createdBy: tomatoItem.createdBy,
    createdAt: now,
    updatedAt: now,
}));

export const begin = mock(async <T>(callback: (tx: unknown) => Promise<T>): Promise<T> => callback({}));
export const lockStoreVendorAvailabilityTopology = mock(async () => undefined);
export const getVendorItemsByVendorId = mock(async () => [tomatoItem, onionItem]);
export const createStoreVendorAvailabilityRepo = mock(async (data: StoreVendorAvailabilityDTO) => ({
    ...storeVendorAvailability,
    ...data,
}));
export const getStoreVendorAvailabilitiesByStoreId = mock(async () => [storeVendorAvailability]);
export const getStoreVendorAvailabilitiesByVendorId = mock(async () => [storeVendorAvailability]);
export const getStoreVendorAvailabilityById = mock(async () => storeVendorAvailability);
export const getStoreVendorAvailabilityByStoreAndVendor = mock(async () => storeVendorAvailability);
export const updateStoreVendorAvailabilityRepo = mock(async (data: Pick<StoreVendorAvailabilityDTO, "id" | "status">) => ({
    ...storeVendorAvailability,
    ...data,
}));
export const createStoreVendorItemOfferingRepo = mock(async (data: StoreVendorItemOfferingDTO) => ({
    ...tomatoOffering,
    ...data,
}));
export const getStoreVendorItemOfferingsByStoreId = mock(async () => [tomatoOffering]);
export const getStoreVendorItemOfferingById = mock(async () => tomatoOffering);
export const getStoreVendorItemOfferingByStoreAndVendorItem = mock(async () => tomatoOffering);
export const updateStoreVendorItemOfferingRepo = mock(async (data: Pick<StoreVendorItemOfferingDTO, "id" | "defaultPurchasePrice">) => ({
    ...tomatoOffering,
    ...data,
}));

export const vendorsRepositoryModule = {
    getVendorsByOrganizationId,
    getVendorById,
    createVendor: createVendorRepo,
    updateVendor: updateVendorRepo,
    getVendorItemsByOrganizationId,
    getVendorItemById,
    getVendorItemsByVendorId,
    createVendorItem: createVendorItemRepo,
    updateVendorItem: updateVendorItemRepo,
    lockStoreVendorAvailabilityTopology,
    createStoreVendorAvailability: createStoreVendorAvailabilityRepo,
    getStoreVendorAvailabilitiesByStoreId,
    getStoreVendorAvailabilitiesByVendorId,
    getStoreVendorAvailabilityById,
    getStoreVendorAvailabilityByStoreAndVendor,
    updateStoreVendorAvailability: updateStoreVendorAvailabilityRepo,
    createStoreVendorItemOffering: createStoreVendorItemOfferingRepo,
    getStoreVendorItemOfferingsByStoreId,
    getStoreVendorItemOfferingById,
    getStoreVendorItemOfferingByStoreAndVendorItem,
    updateStoreVendorItemOffering: updateStoreVendorItemOfferingRepo,
};

mock.module("@/config/db", () => ({
    pg: { begin },
}));

mock.module("@/modules/tenant/units/units.repository", () => ({
    getUnitById,
}));

mock.module("@/modules/tenant/vendors/vendors.repository", () => vendorsRepositoryModule);

await ensureFeatureEntitlementMock();

export const vendorsService = await import("./vendors.service");
