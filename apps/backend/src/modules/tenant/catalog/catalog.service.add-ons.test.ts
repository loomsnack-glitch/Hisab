import { beforeEach, describe, expect, mock, test } from "bun:test";

const organizationId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const userId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const productId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const addOnId = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const attachmentId = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";

const now = new Date("2026-07-11T12:00:00.000Z");

const organization = { id: organizationId, name: "Demo Org" };

const product = {
    id: productId,
    organizationId,
    categoryId: "ffffffff-ffff-4fff-8fff-ffffffffffff",
    name: "Burger",
    price: 100,
    discount: 0,
    imagePath: null,
    productType: "single" as const,
    status: "active" as const,
    createdBy: userId,
    updatedBy: null,
    createdAt: now,
    updatedAt: now,
};

const addOn = {
    id: addOnId,
    organizationId,
    name: "Extra Cheese",
    price: 20,
    discount: 0,
    status: "active" as const,
    createdBy: userId,
    updatedBy: null,
    createdAt: now,
    updatedAt: now,
};

const attachmentResponse: {
    id: string;
    organizationId: string;
    productId: string;
    addOnId: string;
    selectionCap: number;
    status: "active" | "inactive";
    createdBy: string;
    updatedBy: string | null;
    createdAt: Date;
    updatedAt: Date;
    addOn: typeof addOn;
} = {
    id: attachmentId,
    organizationId,
    productId,
    addOnId,
    selectionCap: 1,
    status: "active",
    createdBy: userId,
    updatedBy: null,
    createdAt: now,
    updatedAt: now,
    addOn,
};

const getOrganizationByIdForUser = mock(async () => organization);
const addOnNameExistsInOrganization = mock(async () => false);
const createAddOnRepo = mock(async (data: typeof addOn) => data);
const getAddOnById = mock(async () => addOn);
const updateAddOnRepo = mock(async (data: typeof addOn) => data);
const getProductById = mock(async () => product);
const productAddOnAttachmentExists = mock(async () => false);
const createProductAddOnAttachmentRepo = mock(async (data: {
    id: string;
    organizationId: string;
    productId: string;
    addOnId: string;
    selectionCap: number;
    status: "active" | "inactive";
    createdBy: string;
}) => ({
    id: data.id,
    organizationId: data.organizationId,
    productId: data.productId,
    addOnId: data.addOnId,
    selectionCap: data.selectionCap,
    status: data.status,
    createdBy: data.createdBy,
    updatedBy: null,
    createdAt: now,
    updatedAt: now,
}));
const getProductAddOnAttachmentById = mock(async () => attachmentResponse);
const updateProductAddOnAttachmentRepo = mock(async (data: {
    id: string;
    selectionCap: number;
    status: "active" | "inactive";
}) => ({
    id: data.id,
    organizationId,
    productId,
    addOnId,
    selectionCap: data.selectionCap,
    status: data.status,
    createdBy: userId,
    updatedBy: userId,
    createdAt: now,
    updatedAt: now,
}));
const getSelectableProductAddOnAttachmentsByOrganizationId = mock(async () => [attachmentResponse]);
const getActiveAddOnsByOrganizationId = mock(async () => [addOn]);
const getActiveProductsByOrganizationId = mock(async () => [product]);
const countAttachmentsByAddOnId = mock(async () => 0);
const countSaleItemAddOnsByAddOnId = mock(async () => 0);
const deleteAddOnRepo = mock(async () => addOn);

mock.module("@/modules/tenant/organization/organization.repository", () => ({
    getOrganizationByIdForUser,
}));

mock.module("@/services/storage", () => ({
    deleteObject: mock(async () => undefined),
    generateSignedUrl: mock(async () => null),
}));

mock.module("./catalog.repository", () => ({
    addOnNameExistsInOrganization,
    createAddOn: createAddOnRepo,
    getAddOnById,
    updateAddOn: updateAddOnRepo,
    getProductById,
    productAddOnAttachmentExists,
    createProductAddOnAttachment: createProductAddOnAttachmentRepo,
    getProductAddOnAttachmentById,
    updateProductAddOnAttachment: updateProductAddOnAttachmentRepo,
    getSelectableProductAddOnAttachmentsByOrganizationId,
    getActiveAddOnsByOrganizationId,
    getActiveProductsByOrganizationId,
    getAddOnsByOrganizationId: mock(async () => [addOn]),
    getProductAddOnAttachmentsByProductId: mock(async () => [attachmentResponse]),
    countAttachmentsByAddOnId,
    countSaleItemAddOnsByAddOnId,
    deleteAddOn: deleteAddOnRepo,
    deleteProductAddOnAttachment: mock(async () => attachmentResponse),
}));

const catalogService = await import("./catalog.service");

describe("Add-On catalog service", () => {
    beforeEach(() => {
        getOrganizationByIdForUser.mockClear();
        addOnNameExistsInOrganization.mockClear();
        createAddOnRepo.mockClear();
        getAddOnById.mockClear();
        updateAddOnRepo.mockClear();
        getProductById.mockClear();
        productAddOnAttachmentExists.mockClear();
        createProductAddOnAttachmentRepo.mockClear();
        getProductAddOnAttachmentById.mockClear();
        updateProductAddOnAttachmentRepo.mockClear();
        getSelectableProductAddOnAttachmentsByOrganizationId.mockClear();
        getActiveAddOnsByOrganizationId.mockClear();
        getActiveProductsByOrganizationId.mockClear();
        countAttachmentsByAddOnId.mockClear();
        countSaleItemAddOnsByAddOnId.mockClear();
        deleteAddOnRepo.mockClear();

        getOrganizationByIdForUser.mockResolvedValue(organization);
        addOnNameExistsInOrganization.mockResolvedValue(false);
        getAddOnById.mockResolvedValue(addOn);
        getProductById.mockResolvedValue(product);
        productAddOnAttachmentExists.mockResolvedValue(false);
        getProductAddOnAttachmentById.mockResolvedValue(attachmentResponse);
        getSelectableProductAddOnAttachmentsByOrganizationId.mockResolvedValue([attachmentResponse]);
        getActiveAddOnsByOrganizationId.mockResolvedValue([addOn]);
        getActiveProductsByOrganizationId.mockResolvedValue([product]);
        countAttachmentsByAddOnId.mockResolvedValue(0);
        countSaleItemAddOnsByAddOnId.mockResolvedValue(0);
        deleteAddOnRepo.mockResolvedValue(addOn);
        createAddOnRepo.mockImplementation(async (data) => data);
        updateAddOnRepo.mockImplementation(async (data) => data);
    });

    test("creates an add-on with trusted catalog fields", async () => {
        const response = await catalogService.createAddOn(userId, organizationId, {
            name: "Extra Cheese",
            price: 20,
            discount: 2,
        });

        expect(response.status).toBe("success");
        expect(response.data?.addOn.name).toBe("Extra Cheese");
        expect(response.data?.addOn.price).toBe(20);
        expect(response.data?.addOn.discount).toBe(2);
        expect(response.data?.addOn.status).toBe("active");
        expect(createAddOnRepo).toHaveBeenCalled();
    });

    test("updates an add-on price and status", async () => {
        updateAddOnRepo.mockImplementation(async (data) => ({
            ...addOn,
            ...data,
        }));

        const response = await catalogService.updateAddOn(userId, organizationId, addOnId, {
            price: 25,
            status: "inactive",
        });

        expect(response.status).toBe("success");
        expect(response.data?.addOn.price).toBe(25);
        expect(response.data?.addOn.status).toBe("inactive");
    });

    test("rejects deletion of an add-on with sales history", async () => {
        countSaleItemAddOnsByAddOnId.mockResolvedValue(1);

        const response = await catalogService.deleteAddOn(userId, organizationId, addOnId);

        expect(response.status).toBe("error");
        expect(response.code).toBe(409);
        expect(response.message).toContain("sales history");
        expect(deleteAddOnRepo).not.toHaveBeenCalled();
    });

    test("defaults attachment selection cap to 1", async () => {
        const response = await catalogService.createProductAddOnAttachment(
            userId,
            organizationId,
            productId,
            { addOnId },
        );

        expect(response.status).toBe("success");
        expect(createProductAddOnAttachmentRepo.mock.calls[0]?.[0]?.selectionCap).toBe(1);
        expect(response.data?.attachment.selectionCap).toBe(1);
    });

    test("rejects duplicate product/add-on attachments", async () => {
        productAddOnAttachmentExists.mockResolvedValue(true);

        const response = await catalogService.createProductAddOnAttachment(
            userId,
            organizationId,
            productId,
            { addOnId, selectionCap: 2 },
        );

        expect(response.status).toBe("error");
        expect(response.code).toBe(409);
        expect(response.message).toContain("already attached");
        expect(createProductAddOnAttachmentRepo).not.toHaveBeenCalled();
    });

    test("deactivates an attachment without changing the add-on", async () => {
        getProductAddOnAttachmentById
            .mockResolvedValueOnce(attachmentResponse)
            .mockResolvedValueOnce({
                ...attachmentResponse,
                status: "inactive" as const,
            });

        const response = await catalogService.updateProductAddOnAttachment(
            userId,
            organizationId,
            productId,
            attachmentId,
            { status: "inactive" },
        );

        expect(response.status).toBe("success");
        expect(response.data?.attachment.status).toBe("inactive");
        expect(response.data?.attachment.addOn.status).toBe("active");
        expect(updateAddOnRepo).not.toHaveBeenCalled();
        expect(updateProductAddOnAttachmentRepo).toHaveBeenCalledWith(
            expect.objectContaining({
                status: "inactive",
                selectionCap: 1,
            }),
        );
    });

    test("POS selectable attachments exclude inactive attachments even when add-on stays active", async () => {
        getSelectableProductAddOnAttachmentsByOrganizationId.mockResolvedValue([]);

        const response = await catalogService.getSelectableProductAddOnAttachmentsForDevice({
            organization: { id: organizationId },
            store: { id: "store-1" },
            device: { id: "device-1" },
        } as never);

        expect(response.status).toBe("success");
        expect(response.data?.attachments).toEqual([]);
    });

    test("POS add-on reads return only active add-ons", async () => {
        getActiveAddOnsByOrganizationId.mockResolvedValue([addOn]);

        const response = await catalogService.getAddOnsForDevice({
            organization: { id: organizationId },
            store: { id: "store-1" },
            device: { id: "device-1" },
        } as never);

        expect(response.status).toBe("success");
        expect(response.data?.addOns).toEqual([addOn]);
        expect(getActiveAddOnsByOrganizationId).toHaveBeenCalledWith(organizationId);
    });

    test("POS product reads return only active products", async () => {
        getActiveProductsByOrganizationId.mockResolvedValue([product]);

        const response = await catalogService.getProductsForDevice({
            organization: { id: organizationId },
            store: { id: "store-1" },
            device: { id: "device-1" },
        } as never);

        expect(response.status).toBe("success");
        expect(response.data?.products).toEqual([{ ...product, imageSignedUrl: null }]);
        expect(getActiveProductsByOrganizationId).toHaveBeenCalledWith(organizationId);
    });
});
