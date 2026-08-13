import { beforeEach, describe, expect, mock, test } from "bun:test";
import { A4_SHEET_LABEL_TEMPLATE } from "@repo/types";

mock.module("@/middlewares/auth.middleware", () => ({
    authMiddleware: async (context: { set: (key: string, value: unknown) => void }, next: () => Promise<void>) => {
        context.set("authUser", { id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb" });
        await next();
    },
}));

const harness = await import("./catalog.service.test-harness");

const { default: catalogRoutes } = await import("./catalog.routes");

describe("Label Template catalog routes", () => {
    beforeEach(() => {
        harness.getOrganizationByIdForUser.mockClear();
        harness.createLabelTemplateRepo.mockClear();
        harness.getLabelTemplatesByOrganizationId.mockClear();
        harness.labelTemplateNameExistsInOrganization.mockClear();

        harness.getOrganizationByIdForUser.mockResolvedValue(harness.organization);
        harness.labelTemplateNameExistsInOrganization.mockResolvedValue(false);
        harness.getLabelTemplatesByOrganizationId.mockResolvedValue([
            harness.a4LabelTemplate,
            harness.thermalLabelTemplate,
        ]);
        harness.createLabelTemplateRepo.mockImplementation(async (data) => ({
            ...harness.a4LabelTemplate,
            ...data,
        }));
    });

    test("accepts a Label Template create payload at the administrator catalog seam", async () => {
        const response = await catalogRoutes.request(
            `http://localhost/${harness.organizationId}/label-templates`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(A4_SHEET_LABEL_TEMPLATE),
            },
        );

        expect(response.status).toBe(201);
        expect(harness.createLabelTemplateRepo).toHaveBeenCalledWith(
            expect.objectContaining({
                organizationId: harness.organizationId,
                name: "A4 sheet (3 × 8 labels)",
            }),
        );
    });

    test("lists Organization Label Templates for an administrator", async () => {
        const response = await catalogRoutes.request(
            `http://localhost/${harness.organizationId}/label-templates`,
        );

        expect(response.status).toBe(200);
        const body = await response.json();
        expect(body.data.labelTemplates).toHaveLength(2);
    });
});
