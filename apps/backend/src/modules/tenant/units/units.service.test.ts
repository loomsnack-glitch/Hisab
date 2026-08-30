import { beforeEach, describe, expect, test } from "bun:test";
import { SEEDED_UNITS } from "@repo/types";
import {
    crateUnit,
    createUnitRepo,
    customUnitId,
    getOrganizationByIdForUser,
    getUnitById,
    getUnitsByOrganizationId,
    kilogramUnit,
    organization,
    organizationId,
    otherOrganizationId,
    seedDefaultUnitsRepo,
    seededUnits,
    unitId,
    unitTokenExistsInOrganization,
    unitsService,
    updateUnitRepo,
    userId,
} from "./units.service.test-harness";

describe("Organization Unit service", () => {
    beforeEach(() => {
        getOrganizationByIdForUser.mockClear();
        getUnitsByOrganizationId.mockClear();
        getUnitById.mockClear();
        unitTokenExistsInOrganization.mockClear();
        createUnitRepo.mockClear();
        updateUnitRepo.mockClear();
        seedDefaultUnitsRepo.mockClear();

        getOrganizationByIdForUser.mockResolvedValue(organization);
        getUnitsByOrganizationId.mockResolvedValue([...seededUnits, crateUnit]);
        getUnitById.mockResolvedValue(kilogramUnit);
        unitTokenExistsInOrganization.mockResolvedValue(false);
        seedDefaultUnitsRepo.mockResolvedValue(seededUnits);
        createUnitRepo.mockImplementation(async (data) => ({
            ...crateUnit,
            ...data,
            updatedBy: data.updatedBy ?? null,
            createdAt: crateUnit.createdAt,
            updatedAt: crateUnit.updatedAt,
        }));
        updateUnitRepo.mockImplementation(async (data) => ({
            ...kilogramUnit,
            ...data,
            kind: kilogramUnit.kind,
            predefinedKey: kilogramUnit.predefinedKey,
            createdBy: kilogramUnit.createdBy,
            createdAt: kilogramUnit.createdAt,
            updatedAt: kilogramUnit.updatedAt,
        }));
    });

    test("lists predefined and Organization-defined Units for a member", async () => {
        const response = await unitsService.getUnits(userId, organizationId);

        expect(response.status).toBe("success");
        expect(response.data?.units).toHaveLength(SEEDED_UNITS.length + 1);
        expect(response.data?.units.some((unit) => unit.kind === "predefined" && unit.name === "piece")).toBe(true);
        expect(response.data?.units.some((unit) => unit.kind === "custom" && unit.name === "Crate")).toBe(true);
    });

    test("denies Unit listing when the user is not a member of the Organization", async () => {
        getOrganizationByIdForUser.mockResolvedValue(null);

        const response = await unitsService.getUnits(userId, otherOrganizationId);

        expect(response.status).toBe("error");
        expect(response.code).toBe(404);
        expect(getUnitsByOrganizationId).not.toHaveBeenCalled();
    });

    test("creates a custom Unit as active by default", async () => {
        const response = await unitsService.createUnit(userId, organizationId, {
            name: "Crate",
            label: "crt",
        });

        expect(response.status).toBe("success");
        expect(response.code).toBe(201);
        expect(response.data?.unit.kind).toBe("custom");
        expect(response.data?.unit.status).toBe("active");
        expect(response.data?.unit.predefinedKey).toBeNull();
        expect(createUnitRepo).toHaveBeenCalledWith(
            expect.objectContaining({
                organizationId,
                name: "Crate",
                label: "crt",
                kind: "custom",
                predefinedKey: null,
                status: "active",
            }),
        );
    });

    test("rejects a custom Unit whose normalized name matches a predefined label", async () => {
        unitTokenExistsInOrganization.mockResolvedValue(true);

        const response = await unitsService.createUnit(userId, organizationId, {
            name: "KG",
            label: "kilo",
        });

        expect(response.status).toBe("error");
        expect(response.code).toBe(409);
        expect(response.message).toMatch(/name or label already exists/i);
        expect(createUnitRepo).not.toHaveBeenCalled();
    });

    test("rejects a custom Unit whose normalized label matches an inactive Unit name", async () => {
        unitTokenExistsInOrganization.mockImplementation(async (_organizationId, token) => token === "crate");

        const response = await unitsService.createUnit(userId, organizationId, {
            name: "Shipping crate",
            label: "Crate",
        });

        expect(response.status).toBe("error");
        expect(response.code).toBe(409);
        expect(createUnitRepo).not.toHaveBeenCalled();
    });

    test("deactivates a predefined Unit for one Organization without changing its definition", async () => {
        const response = await unitsService.updateUnit(userId, organizationId, unitId, {
            status: "inactive",
        });

        expect(response.status).toBe("success");
        expect(response.data?.unit.status).toBe("inactive");
        expect(response.data?.unit.name).toBe("kilogram");
        expect(response.data?.unit.label).toBe("kg");
        expect(updateUnitRepo).toHaveBeenCalledWith(
            expect.objectContaining({
                id: unitId,
                name: "kilogram",
                label: "kg",
                status: "inactive",
            }),
        );
    });

    test("rejects edits to a predefined Unit name or label", async () => {
        const response = await unitsService.updateUnit(userId, organizationId, unitId, {
            name: "Kilo",
            label: "kilo",
        });

        expect(response.status).toBe("error");
        expect(response.code).toBe(400);
        expect(response.message).toMatch(/predefined/i);
        expect(updateUnitRepo).not.toHaveBeenCalled();
    });

    test("updates a custom Unit name, label, and status", async () => {
        getUnitById.mockResolvedValue(crateUnit);
        updateUnitRepo.mockImplementation(async (data) => ({
            ...crateUnit,
            ...data,
            updatedAt: crateUnit.updatedAt,
        }));

        const response = await unitsService.updateUnit(userId, organizationId, customUnitId, {
            name: "Tea crate",
            label: "tcrt",
            status: "inactive",
        });

        expect(response.status).toBe("success");
        expect(response.data?.unit.name).toBe("Tea crate");
        expect(response.data?.unit.label).toBe("tcrt");
        expect(response.data?.unit.status).toBe("inactive");
        expect(response.data?.unit.kind).toBe("custom");
    });

    test("reactivates an inactive custom Unit", async () => {
        getUnitById.mockResolvedValue({ ...crateUnit, status: "inactive" });
        updateUnitRepo.mockImplementation(async (data) => ({
            ...crateUnit,
            ...data,
            kind: "custom",
            predefinedKey: null,
            createdBy: crateUnit.createdBy,
            createdAt: crateUnit.createdAt,
            updatedAt: crateUnit.updatedAt,
        }));

        const response = await unitsService.updateUnit(userId, organizationId, customUnitId, {
            status: "active",
        });

        expect(response.status).toBe("success");
        expect(response.data?.unit.status).toBe("active");
    });

    test("does not expose a Unit deletion command", () => {
        expect("deleteUnit" in unitsService).toBe(false);
    });

    test("seeds every predefined Unit as active for a new Organization", async () => {
        const seeded = await unitsService.seedDefaultUnits(organizationId, userId);

        expect(seedDefaultUnitsRepo).toHaveBeenCalledWith(organizationId, userId, undefined);
        expect(seeded).toHaveLength(SEEDED_UNITS.length);
        expect(seeded.every((unit) => unit.kind === "predefined" && unit.status === "active")).toBe(true);
    });

    test("returns not found when updating a Unit from another Organization", async () => {
        getUnitById.mockResolvedValue(null);

        const response = await unitsService.updateUnit(userId, organizationId, unitId, {
            status: "inactive",
        });

        expect(response.status).toBe("error");
        expect(response.code).toBe(404);
        expect(updateUnitRepo).not.toHaveBeenCalled();
    });
});
