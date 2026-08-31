import { beforeEach, describe, expect, test } from "bun:test";
import { SEEDED_EXPENSE_CATEGORIES } from "@repo/types";
import {
    createExpenseCategoryRepo,
    customExpenseCategoryId,
    expenseCategoriesService,
    expenseCategoryId,
    expenseCategoryNameExistsInOrganization,
    getExpenseCategoriesByOrganizationId,
    getExpenseCategoryById,
    getOrganizationByIdForUser,
    organization,
    organizationId,
    otherOrganizationId,
    packagingCategory,
    rentCategory,
    seedDefaultExpenseCategoriesRepo,
    seededExpenseCategories,
    updateExpenseCategoryRepo,
    userId,
} from "./expense-categories.service.test-harness";

describe("Organization Expense Category service", () => {
    beforeEach(() => {
        getOrganizationByIdForUser.mockClear();
        getExpenseCategoriesByOrganizationId.mockClear();
        getExpenseCategoryById.mockClear();
        expenseCategoryNameExistsInOrganization.mockClear();
        createExpenseCategoryRepo.mockClear();
        updateExpenseCategoryRepo.mockClear();
        seedDefaultExpenseCategoriesRepo.mockClear();

        getOrganizationByIdForUser.mockResolvedValue(organization);
        getExpenseCategoriesByOrganizationId.mockResolvedValue([
            ...seededExpenseCategories,
            packagingCategory,
        ]);
        getExpenseCategoryById.mockResolvedValue(rentCategory);
        expenseCategoryNameExistsInOrganization.mockResolvedValue(false);
        seedDefaultExpenseCategoriesRepo.mockResolvedValue(seededExpenseCategories);
        createExpenseCategoryRepo.mockImplementation(async (data) => ({
            ...packagingCategory,
            ...data,
            updatedBy: data.updatedBy ?? null,
            createdAt: packagingCategory.createdAt,
            updatedAt: packagingCategory.updatedAt,
        }));
        updateExpenseCategoryRepo.mockImplementation(async (data) => ({
            ...rentCategory,
            ...data,
            kind: rentCategory.kind,
            predefinedKey: rentCategory.predefinedKey,
            createdBy: rentCategory.createdBy,
            createdAt: rentCategory.createdAt,
            updatedAt: rentCategory.updatedAt,
        }));
    });

    test("lists predefined and Organization-defined Expense Categories for a member", async () => {
        const response = await expenseCategoriesService.getExpenseCategories(userId, organizationId);

        expect(response.status).toBe("success");
        expect(response.data?.expenseCategories).toHaveLength(SEEDED_EXPENSE_CATEGORIES.length + 1);
        expect(
            response.data?.expenseCategories.some(
                (category) => category.kind === "predefined" && category.name === "Rent",
            ),
        ).toBe(true);
        expect(
            response.data?.expenseCategories.some(
                (category) => category.kind === "custom" && category.name === "Packaging",
            ),
        ).toBe(true);
    });

    test("denies Expense Category listing when the user is not a member of the Organization", async () => {
        getOrganizationByIdForUser.mockResolvedValue(null);

        const response = await expenseCategoriesService.getExpenseCategories(
            userId,
            otherOrganizationId,
        );

        expect(response.status).toBe("error");
        expect(response.code).toBe(404);
        expect(getExpenseCategoriesByOrganizationId).not.toHaveBeenCalled();
    });

    test("creates a custom Expense Category as active by default", async () => {
        const response = await expenseCategoriesService.createExpenseCategory(
            userId,
            organizationId,
            { name: "Packaging" },
        );

        expect(response.status).toBe("success");
        expect(response.code).toBe(201);
        expect(response.data?.expenseCategory.kind).toBe("custom");
        expect(response.data?.expenseCategory.status).toBe("active");
        expect(response.data?.expenseCategory.predefinedKey).toBeNull();
        expect(createExpenseCategoryRepo).toHaveBeenCalledWith(
            expect.objectContaining({
                organizationId,
                name: "Packaging",
                kind: "custom",
                predefinedKey: null,
                status: "active",
            }),
        );
    });

    test("rejects a custom Expense Category whose normalized name matches a predefined category", async () => {
        expenseCategoryNameExistsInOrganization.mockResolvedValue(true);

        const response = await expenseCategoriesService.createExpenseCategory(
            userId,
            organizationId,
            { name: "RENT" },
        );

        expect(response.status).toBe("error");
        expect(response.code).toBe(409);
        expect(response.message).toMatch(/name already exists/i);
        expect(createExpenseCategoryRepo).not.toHaveBeenCalled();
    });

    test("rejects a custom Expense Category whose normalized name matches an inactive category", async () => {
        expenseCategoryNameExistsInOrganization.mockImplementation(
            async (_organizationId, name) => name === "packaging",
        );

        const response = await expenseCategoriesService.createExpenseCategory(
            userId,
            organizationId,
            { name: "Packaging" },
        );

        expect(response.status).toBe("error");
        expect(response.code).toBe(409);
        expect(createExpenseCategoryRepo).not.toHaveBeenCalled();
    });

    test("deactivates a predefined Expense Category for one Organization without changing its definition", async () => {
        const response = await expenseCategoriesService.updateExpenseCategory(
            userId,
            organizationId,
            expenseCategoryId,
            { status: "inactive" },
        );

        expect(response.status).toBe("success");
        expect(response.data?.expenseCategory.status).toBe("inactive");
        expect(response.data?.expenseCategory.name).toBe("Rent");
        expect(updateExpenseCategoryRepo).toHaveBeenCalledWith(
            expect.objectContaining({
                id: expenseCategoryId,
                name: "Rent",
                status: "inactive",
            }),
        );
    });

    test("rejects edits to a predefined Expense Category name", async () => {
        const response = await expenseCategoriesService.updateExpenseCategory(
            userId,
            organizationId,
            expenseCategoryId,
            { name: "Shop rent" },
        );

        expect(response.status).toBe("error");
        expect(response.code).toBe(400);
        expect(response.message).toMatch(/predefined/i);
        expect(updateExpenseCategoryRepo).not.toHaveBeenCalled();
    });

    test("updates a custom Expense Category name and status", async () => {
        getExpenseCategoryById.mockResolvedValue(packagingCategory);
        updateExpenseCategoryRepo.mockImplementation(async (data) => ({
            ...packagingCategory,
            ...data,
            updatedAt: packagingCategory.updatedAt,
        }));

        const response = await expenseCategoriesService.updateExpenseCategory(
            userId,
            organizationId,
            customExpenseCategoryId,
            { name: "Packaging materials", status: "inactive" },
        );

        expect(response.status).toBe("success");
        expect(response.data?.expenseCategory.name).toBe("Packaging materials");
        expect(response.data?.expenseCategory.status).toBe("inactive");
        expect(response.data?.expenseCategory.kind).toBe("custom");
    });

    test("reactivates an inactive custom Expense Category", async () => {
        getExpenseCategoryById.mockResolvedValue({ ...packagingCategory, status: "inactive" });
        updateExpenseCategoryRepo.mockImplementation(async (data) => ({
            ...packagingCategory,
            ...data,
            kind: "custom",
            predefinedKey: null,
            createdBy: packagingCategory.createdBy,
            createdAt: packagingCategory.createdAt,
            updatedAt: packagingCategory.updatedAt,
        }));

        const response = await expenseCategoriesService.updateExpenseCategory(
            userId,
            organizationId,
            customExpenseCategoryId,
            { status: "active" },
        );

        expect(response.status).toBe("success");
        expect(response.data?.expenseCategory.status).toBe("active");
    });

    test("does not expose an Expense Category deletion command", () => {
        expect("deleteExpenseCategory" in expenseCategoriesService).toBe(false);
    });

    test("seeds every predefined Expense Category as active for a new Organization", async () => {
        const seeded = await expenseCategoriesService.seedDefaultExpenseCategories(
            organizationId,
            userId,
        );

        expect(seedDefaultExpenseCategoriesRepo).toHaveBeenCalledWith(
            organizationId,
            userId,
            undefined,
        );
        expect(seeded).toHaveLength(SEEDED_EXPENSE_CATEGORIES.length);
        expect(
            seeded.every((category) => category.kind === "predefined" && category.status === "active"),
        ).toBe(true);
    });

    test("returns not found when updating an Expense Category from another Organization", async () => {
        getExpenseCategoryById.mockResolvedValue(null);

        const response = await expenseCategoriesService.updateExpenseCategory(
            userId,
            organizationId,
            expenseCategoryId,
            { status: "inactive" },
        );

        expect(response.status).toBe("error");
        expect(response.code).toBe(404);
        expect(updateExpenseCategoryRepo).not.toHaveBeenCalled();
    });
});
