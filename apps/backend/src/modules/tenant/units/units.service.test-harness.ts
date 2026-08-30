import { mock } from "bun:test";
import { SEEDED_UNITS, type UnitDTO } from "@repo/types";

export const organizationId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
export const otherOrganizationId = "99999999-9999-4999-8999-999999999999";
export const userId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
export const unitId = "11111111-1111-4111-8111-111111111111";
export const customUnitId = "22222222-2222-4222-8222-222222222222";
export const now = new Date("2026-08-30T12:00:00.000Z");

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

export const crateUnit: UnitDTO = {
    id: customUnitId,
    organizationId,
    name: "Crate",
    label: "crt",
    kind: "custom",
    predefinedKey: null,
    status: "active",
    createdBy: userId,
    updatedBy: null,
    createdAt: now,
    updatedAt: now,
};

export const seededUnits: UnitDTO[] = SEEDED_UNITS.map((definition, index) => ({
    id: `00000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
    organizationId,
    name: definition.name,
    label: definition.label,
    kind: "predefined" as const,
    predefinedKey: definition.key,
    status: "active" as const,
    createdBy: userId,
    updatedBy: null,
    createdAt: now,
    updatedAt: now,
}));

export const getOrganizationByIdForUser = mock(async () => organization);
export const getUnitsByOrganizationId = mock(async () => [...seededUnits, crateUnit]);
export const getUnitById = mock(async () => kilogramUnit);
export const unitTokenExistsInOrganization = mock(async () => false);
export const createUnitRepo = mock(async (data: CreateUnitRepoArg) => ({
    ...crateUnit,
    ...data,
    kind: data.kind,
    predefinedKey: data.predefinedKey,
    createdAt: now,
    updatedAt: now,
    updatedBy: data.updatedBy ?? null,
}));
export const updateUnitRepo = mock(async (data: UpdateUnitRepoArg) => ({
    ...kilogramUnit,
    ...data,
    updatedAt: now,
}));
export const seedDefaultUnitsRepo = mock(async () => seededUnits);

type CreateUnitRepoArg = {
    id: string;
    organizationId: string;
    name: string;
    label: string;
    kind: UnitDTO["kind"];
    predefinedKey: string | null;
    status: UnitDTO["status"];
    createdBy: string;
    updatedBy?: string | null;
};

type UpdateUnitRepoArg = {
    id: string;
    organizationId: string;
    name: string;
    label: string;
    status: UnitDTO["status"];
    updatedBy: string;
};

mock.module("@/modules/tenant/organization/organization.repository", () => ({
    getOrganizationByIdForUser,
}));

mock.module("./units.repository", () => ({
    getUnitsByOrganizationId,
    getUnitById,
    unitTokenExistsInOrganization,
    createUnit: createUnitRepo,
    updateUnit: updateUnitRepo,
    seedDefaultUnits: seedDefaultUnitsRepo,
}));

export const unitsService = await import("./units.service");
