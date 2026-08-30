import { mock } from "bun:test";
import type { UnitDTO, VendorDTO, VendorItemDTO } from "@repo/types";

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
export const now = new Date("2026-08-31T12:00:00.000Z");

export const organization = { id: organizationId, name: "Demo Org" };

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

export const getOrganizationByIdForUser = mock(async () => organization);
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

mock.module("@/modules/tenant/organization/organization.repository", () => ({
    getOrganizationByIdForUser,
}));

mock.module("@/modules/tenant/units/units.repository", () => ({
    getUnitById,
}));

mock.module("./vendors.repository", () => ({
    getVendorsByOrganizationId,
    getVendorById,
    createVendor: createVendorRepo,
    updateVendor: updateVendorRepo,
    getVendorItemsByOrganizationId,
    getVendorItemById,
    createVendorItem: createVendorItemRepo,
    updateVendorItem: updateVendorItemRepo,
}));

export const vendorsService = await import("./vendors.service");
