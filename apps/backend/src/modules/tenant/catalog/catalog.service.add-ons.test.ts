import { beforeEach, describe, expect, test } from "bun:test";
import {
    addOn,
    addOnId,
    addOnNameExistsInOrganization,
    attachmentId,
    attachmentResponse,
    catalogService,
    countActiveBundlesByComponentAddOnId,
    countActiveBundlesByProductAddOnPair,
    countBundleProductComponentAddOnsByAddOnId,
    countAttachmentsByAddOnId,
    countSaleItemAddOnsByAddOnId,
    countSaleItemBundleComponentAddOnsByAddOnId,
    createAddOnRepo,
    createProductAddOnAttachmentRepo,
    deleteAddOnRepo,
    getActiveAddOnsByOrganizationId,
    getActiveProductsByOrganizationId,
    getAddOnById,
    getOrganizationByIdForUser,
    getProductAddOnAttachmentById,
    getProductById,
    getSelectableProductAddOnAttachmentsByOrganizationId,
    organization,
    organizationId,
    product,
    productAddOnAttachmentExists,
    productId,
    updateAddOnRepo,
    updateProductAddOnAttachmentRepo,
    userId,
} from "./catalog.service.test-harness";

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
        countBundleProductComponentAddOnsByAddOnId.mockClear();
        countSaleItemBundleComponentAddOnsByAddOnId.mockClear();
        countActiveBundlesByComponentAddOnId.mockClear();
        countActiveBundlesByProductAddOnPair.mockClear();
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
        countBundleProductComponentAddOnsByAddOnId.mockResolvedValue(0);
        countSaleItemBundleComponentAddOnsByAddOnId.mockResolvedValue(0);
        countActiveBundlesByComponentAddOnId.mockResolvedValue(0);
        countActiveBundlesByProductAddOnPair.mockResolvedValue(0);
        deleteAddOnRepo.mockResolvedValue(addOn);
        createAddOnRepo.mockImplementation(async (data) => data);
        updateAddOnRepo.mockImplementation(async (data) => data);
        updateProductAddOnAttachmentRepo.mockImplementation(async (data) => ({
            ...attachmentResponse,
            selectionCap: data.selectionCap,
            status: data.status,
            createdBy: userId,
            updatedBy: userId,
            createdAt: attachmentResponse.createdAt,
            updatedAt: attachmentResponse.updatedAt,
        }));
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

    test("rejects deletion of an add-on used by a bundle", async () => {
        countBundleProductComponentAddOnsByAddOnId.mockResolvedValue(1);

        const response = await catalogService.deleteAddOn(userId, organizationId, addOnId);

        expect(response.status).toBe("error");
        expect(response.code).toBe(409);
        expect(response.message).toContain("used by a bundle");
        expect(deleteAddOnRepo).not.toHaveBeenCalled();
    });

    test("rejects deletion of an add-on with bundle sales history", async () => {
        countSaleItemBundleComponentAddOnsByAddOnId.mockResolvedValue(1);

        const response = await catalogService.deleteAddOn(userId, organizationId, addOnId);

        expect(response.status).toBe("error");
        expect(response.code).toBe(409);
        expect(response.message).toContain("sales history");
        expect(deleteAddOnRepo).not.toHaveBeenCalled();
    });

    test("defaults attachment selection cap to 1", async () => {
        const response = await catalogService.createProductAddOnAttachment(userId, organizationId, productId, {
            addOnId,
        });

        expect(response.status).toBe("success");
        expect(createProductAddOnAttachmentRepo.mock.calls[0]?.[0]?.selectionCap).toBe(1);
        expect(response.data?.attachment.selectionCap).toBe(1);
    });

    test("rejects duplicate product/add-on attachments", async () => {
        productAddOnAttachmentExists.mockResolvedValue(true);

        const response = await catalogService.createProductAddOnAttachment(userId, organizationId, productId, {
            addOnId,
            selectionCap: 2,
        });

        expect(response.status).toBe("error");
        expect(response.code).toBe(409);
        expect(response.message).toContain("already attached");
        expect(createProductAddOnAttachmentRepo).not.toHaveBeenCalled();
    });

    test("deactivates an attachment without changing the add-on", async () => {
        getProductAddOnAttachmentById.mockResolvedValueOnce(attachmentResponse).mockResolvedValueOnce({
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
