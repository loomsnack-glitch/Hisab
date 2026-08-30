import { beforeEach, describe, expect, test } from "bun:test";
import type { MiddlewareHandler } from "hono";
import type { AppVariables } from "@/types/hono";
import { authMiddleware } from "@/middlewares/auth.middleware";

const harness = await import("./units.service.test-harness");
const { createUnitsRoutes } = await import("./units.routes");

const authenticatedUser: MiddlewareHandler<{ Variables: AppVariables }> = async (context, next) => {
    context.set("authUser", { id: harness.userId } as AppVariables["authUser"]);
    await next();
};

const unitsRoutes = createUnitsRoutes(authenticatedUser);
const unauthenticatedRoutes = createUnitsRoutes(authMiddleware);

describe("Organization Unit routes", () => {
    beforeEach(() => {
        harness.getOrganizationByIdForUser.mockClear();
        harness.getUnitsByOrganizationId.mockClear();
        harness.getUnitById.mockClear();
        harness.unitTokenExistsInOrganization.mockClear();
        harness.createUnitRepo.mockClear();
        harness.updateUnitRepo.mockClear();

        harness.getOrganizationByIdForUser.mockResolvedValue(harness.organization);
        harness.getUnitsByOrganizationId.mockResolvedValue([
            ...harness.seededUnits,
            harness.crateUnit,
        ]);
        harness.getUnitById.mockResolvedValue(harness.kilogramUnit);
        harness.unitTokenExistsInOrganization.mockResolvedValue(false);
        harness.createUnitRepo.mockImplementation(async (data) => ({
            ...harness.crateUnit,
            ...data,
            updatedBy: data.updatedBy ?? null,
            createdAt: harness.now,
            updatedAt: harness.now,
        }));
        harness.updateUnitRepo.mockImplementation(async (data) => ({
            ...harness.kilogramUnit,
            ...data,
            kind: harness.kilogramUnit.kind,
            predefinedKey: harness.kilogramUnit.predefinedKey,
            createdBy: harness.kilogramUnit.createdBy,
            createdAt: harness.now,
            updatedAt: harness.now,
        }));
    });

    test("rejects unauthenticated Unit listing", async () => {
        const response = await unauthenticatedRoutes.request(
            `http://localhost/${harness.organizationId}/units`,
        );

        expect(response.status).toBe(401);
        const body = await response.json();
        expect(body.message).toBe("Authentication is required");
    });

    test("lists Organization Units for an authenticated administrator", async () => {
        const response = await unitsRoutes.request(
            `http://localhost/${harness.organizationId}/units`,
        );

        expect(response.status).toBe(200);
        const body = await response.json();
        expect(body.data.units.length).toBeGreaterThanOrEqual(16);
        expect(body.data.units.some((unit: { name: string }) => unit.name === "piece")).toBe(true);
        expect(body.data.units.some((unit: { kind: string }) => unit.kind === "custom")).toBe(true);
    });

    test("creates a custom Unit at the Organization administrator seam", async () => {
        const response = await unitsRoutes.request(
            `http://localhost/${harness.organizationId}/units`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: "Crate", label: "crt" }),
            },
        );

        expect(response.status).toBe(201);
        expect(harness.createUnitRepo).toHaveBeenCalledWith(
            expect.objectContaining({
                organizationId: harness.organizationId,
                name: "Crate",
                label: "crt",
                kind: "custom",
            }),
        );
    });

    test("rejects a Unit payload that includes conversion fields", async () => {
        const response = await unitsRoutes.request(
            `http://localhost/${harness.organizationId}/units`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: "Crate",
                    label: "crt",
                    conversionFactor: 12,
                }),
            },
        );

        expect(response.status).toBe(400);
        expect(harness.createUnitRepo).not.toHaveBeenCalled();
    });

    test("updates Unit availability for the authenticated Organization", async () => {
        const response = await unitsRoutes.request(
            `http://localhost/${harness.organizationId}/units/${harness.unitId}`,
            {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: "inactive" }),
            },
        );

        expect(response.status).toBe(200);
        const body = await response.json();
        expect(body.data.unit.status).toBe("inactive");
        expect(body.data.unit.name).toBe("kilogram");
    });

    test("denies Unit access when the user is not a member of the Organization", async () => {
        harness.getOrganizationByIdForUser.mockResolvedValue(null);

        const response = await unitsRoutes.request(
            `http://localhost/${harness.organizationId}/units`,
        );

        expect(response.status).toBe(404);
        expect(harness.getUnitsByOrganizationId).not.toHaveBeenCalled();
    });

    test("does not expose a Unit deletion route", async () => {
        const response = await unitsRoutes.request(
            `http://localhost/${harness.organizationId}/units/${harness.unitId}`,
            { method: "DELETE" },
        );

        expect(response.status).toBe(404);
        expect(harness.updateUnitRepo).not.toHaveBeenCalled();
    });
});
