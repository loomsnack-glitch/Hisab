import { beforeEach, describe, expect, test } from "bun:test";
import type { MiddlewareHandler } from "hono";
import type { AppVariables } from "@/types/hono";
import { authMiddleware } from "@/middlewares/auth.middleware";

const harness = await import("./expense-categories.service.test-harness");
const { createExpenseCategoriesRoutes } = await import("./expense-categories.routes");

const authenticatedUser: MiddlewareHandler<{ Variables: AppVariables }> = async (context, next) => {
    context.set("authUser", { id: harness.userId } as AppVariables["authUser"]);
    await next();
};

const expenseCategoriesRoutes = createExpenseCategoriesRoutes(authenticatedUser);
const unauthenticatedRoutes = createExpenseCategoriesRoutes(authMiddleware);

describe("Organization Expense Category routes", () => {
    beforeEach(() => {
        harness.getOrganizationByIdForUser.mockClear();
        harness.getExpenseCategoriesByOrganizationId.mockClear();
        harness.getExpenseCategoryById.mockClear();
        harness.expenseCategoryNameExistsInOrganization.mockClear();
        harness.createExpenseCategoryRepo.mockClear();
        harness.updateExpenseCategoryRepo.mockClear();

        harness.getOrganizationByIdForUser.mockResolvedValue(harness.organization);
        harness.getExpenseCategoriesByOrganizationId.mockResolvedValue([
            ...harness.seededExpenseCategories,
            harness.packagingCategory,
        ]);
        harness.getExpenseCategoryById.mockResolvedValue(harness.rentCategory);
        harness.expenseCategoryNameExistsInOrganization.mockResolvedValue(false);
        harness.createExpenseCategoryRepo.mockImplementation(async (data) => ({
            ...harness.packagingCategory,
            ...data,
            updatedBy: data.updatedBy ?? null,
            createdAt: harness.now,
            updatedAt: harness.now,
        }));
        harness.updateExpenseCategoryRepo.mockImplementation(async (data) => ({
            ...harness.rentCategory,
            ...data,
            kind: harness.rentCategory.kind,
            predefinedKey: harness.rentCategory.predefinedKey,
            createdBy: harness.rentCategory.createdBy,
            createdAt: harness.now,
            updatedAt: harness.now,
        }));
    });

    test("rejects unauthenticated Expense Category listing", async () => {
        const response = await unauthenticatedRoutes.request(
            `http://localhost/${harness.organizationId}/expense-categories`,
        );

        expect(response.status).toBe(401);
        const body = await response.json();
        expect(body.message).toBe("Authentication is required");
    });

    test("lists Organization Expense Categories for an authenticated administrator", async () => {
        const response = await expenseCategoriesRoutes.request(
            `http://localhost/${harness.organizationId}/expense-categories`,
        );

        expect(response.status).toBe(200);
        const body = await response.json();
        expect(body.data.expenseCategories.length).toBeGreaterThanOrEqual(11);
        expect(
            body.data.expenseCategories.some((category: { name: string }) => category.name === "Rent"),
        ).toBe(true);
        expect(
            body.data.expenseCategories.some((category: { kind: string }) => category.kind === "custom"),
        ).toBe(true);
    });

    test("creates a custom Expense Category at the Organization administrator seam", async () => {
        const response = await expenseCategoriesRoutes.request(
            `http://localhost/${harness.organizationId}/expense-categories`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: "Packaging" }),
            },
        );

        expect(response.status).toBe(201);
        expect(harness.createExpenseCategoryRepo).toHaveBeenCalledWith(
            expect.objectContaining({
                organizationId: harness.organizationId,
                name: "Packaging",
                kind: "custom",
            }),
        );
    });

    test("rejects an Expense Category payload that includes forbidden fields", async () => {
        const response = await expenseCategoriesRoutes.request(
            `http://localhost/${harness.organizationId}/expense-categories`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: "Packaging",
                    accountCode: "5000",
                }),
            },
        );

        expect(response.status).toBe(400);
        expect(harness.createExpenseCategoryRepo).not.toHaveBeenCalled();
    });

    test("updates Expense Category availability for the authenticated Organization", async () => {
        const response = await expenseCategoriesRoutes.request(
            `http://localhost/${harness.organizationId}/expense-categories/${harness.expenseCategoryId}`,
            {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: "inactive" }),
            },
        );

        expect(response.status).toBe(200);
        const body = await response.json();
        expect(body.data.expenseCategory.status).toBe("inactive");
        expect(body.data.expenseCategory.name).toBe("Rent");
    });

    test("denies Expense Category access when the user is not a member of the Organization", async () => {
        harness.getOrganizationByIdForUser.mockResolvedValue(null);

        const response = await expenseCategoriesRoutes.request(
            `http://localhost/${harness.organizationId}/expense-categories`,
        );

        expect(response.status).toBe(404);
        expect(harness.getExpenseCategoriesByOrganizationId).not.toHaveBeenCalled();
    });

    test("does not expose an Expense Category deletion route", async () => {
        const response = await expenseCategoriesRoutes.request(
            `http://localhost/${harness.organizationId}/expense-categories/${harness.expenseCategoryId}`,
            { method: "DELETE" },
        );

        expect(response.status).toBe(404);
        expect(harness.updateExpenseCategoryRepo).not.toHaveBeenCalled();
    });
});
