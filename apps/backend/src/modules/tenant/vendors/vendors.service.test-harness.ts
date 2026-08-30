import { mock } from "bun:test";
import type { VendorDTO } from "@repo/types";

export const organizationId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
export const otherOrganizationId = "99999999-9999-4999-8999-999999999999";
export const userId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
export const vendorId = "11111111-1111-4111-8111-111111111111";
export const inactiveVendorId = "22222222-2222-4222-8222-222222222222";
export const now = new Date("2026-08-31T12:00:00.000Z");

export const organization = { id: organizationId, name: "Demo Org" };

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

export const getOrganizationByIdForUser = mock(async () => organization);
export const getVendorsByOrganizationId = mock(async () => [freshFarmsVendor, millersVendor]);
export const getVendorById = mock(async () => freshFarmsVendor);

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

mock.module("@/modules/tenant/organization/organization.repository", () => ({
    getOrganizationByIdForUser,
}));

mock.module("./vendors.repository", () => ({
    getVendorsByOrganizationId,
    getVendorById,
    createVendor: createVendorRepo,
    updateVendor: updateVendorRepo,
}));

export const vendorsService = await import("./vendors.service");
