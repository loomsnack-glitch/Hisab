import { beforeEach, describe, expect, test } from "bun:test";
import {
  catalogService,
  coffee,
  countBundleProductComponentsByComponentProductId,
  countComboChoiceOptionsByProductId,
  countSaleItemBundleComponentsByComponentProductId,
  countSaleItemsByProductId,
  createProductRepo,
  deleteProductRepo,
  getOrganizationByIdForUser,
  getProductByCode,
  getProductById,
  organization,
  organizationId,
  product,
  productId,
  productNameExistsInCategory,
  updateProductRepo,
  userId,
} from "./catalog.service.test-harness";

describe("Product Code catalog lifecycle", () => {
  beforeEach(() => {
    getOrganizationByIdForUser.mockClear();
    getOrganizationByIdForUser.mockResolvedValue(organization);
    productNameExistsInCategory.mockClear();
    productNameExistsInCategory.mockResolvedValue(false);
    getProductById.mockClear();
    getProductById.mockResolvedValue({ ...product });
    getProductByCode.mockClear();
    getProductByCode.mockResolvedValue(null);
    createProductRepo.mockClear();
    createProductRepo.mockImplementation(async (data) => data);
    updateProductRepo.mockClear();
    updateProductRepo.mockImplementation(async (data) => ({
      ...product,
      ...data,
      updatedAt: product.updatedAt,
      createdAt: product.createdAt,
      createdBy: product.createdBy,
      productType: product.productType,
    }));
    deleteProductRepo.mockClear();
    deleteProductRepo.mockResolvedValue({ ...product });
    countSaleItemsByProductId.mockClear();
    countSaleItemsByProductId.mockResolvedValue(0);
    countBundleProductComponentsByComponentProductId.mockClear();
    countBundleProductComponentsByComponentProductId.mockResolvedValue(0);
    countComboChoiceOptionsByProductId.mockClear();
    countComboChoiceOptionsByProductId.mockResolvedValue(0);
    countSaleItemBundleComponentsByComponentProductId.mockClear();
    countSaleItemBundleComponentsByComponentProductId.mockResolvedValue(0);
  });

  test("create product stores manufacturer code exactly after removing trailing transport terminators", async () => {
    const response = await catalogService.createProduct(
      userId,
      organizationId,
      {
        categoryId: product.categoryId,
        name: "Dairy Milk 20 g",
        price: 20,
        productCode: "7622202334009\r\n",
      },
    );

    expect(response.status).toBe("success");
    expect(createProductRepo).toHaveBeenCalledWith(
      expect.objectContaining({
        productCode: "7622202334009",
        productCodeKind: "manufacturer",
      }),
    );
  });

  test("create product preserves leading zeroes and surrounding spaces", async () => {
    const response = await catalogService.createProduct(
      userId,
      organizationId,
      {
        categoryId: product.categoryId,
        name: "Opaque",
        price: 10,
        productCode: " 0123 ",
        productCodeKind: "manufacturer",
      },
    );

    expect(response.status).toBe("success");
    expect(createProductRepo).toHaveBeenCalledWith(
      expect.objectContaining({
        productCode: " 0123 ",
        productCodeKind: "manufacturer",
      }),
    );
  });

  test("create product rejects duplicate product codes within an organization", async () => {
    getProductByCode.mockResolvedValue({
      ...coffee,
      productCode: "7622202334009",
      productCodeKind: "manufacturer" as const,
    });

    const response = await catalogService.createProduct(
      userId,
      organizationId,
      {
        categoryId: product.categoryId,
        name: "Another",
        price: 10,
        productCode: "7622202334009",
        productCodeKind: "manufacturer",
      },
    );

    expect(response.status).toBe("error");
    expect(response.code).toBe(409);
    expect(response.message).toBe(
      'Product code 7622202334009 is already assigned to "Cold Coffee".',
    );
    expect(createProductRepo).not.toHaveBeenCalled();
  });

  test("create product maps concurrent unique violations to a friendly duplicate error", async () => {
    createProductRepo.mockImplementation(async () => {
      const error = Object.assign(new Error("duplicate key"), {
        code: "23505",
        constraint: "products_organization_id_product_code_key",
      });
      throw error;
    });
    getProductByCode.mockResolvedValueOnce(null).mockResolvedValueOnce({
      ...coffee,
      productCode: "7622202334009",
      productCodeKind: "manufacturer" as const,
    });

    const response = await catalogService.createProduct(
      userId,
      organizationId,
      {
        categoryId: product.categoryId,
        name: "Another",
        price: 10,
        productCode: "7622202334009",
      },
    );

    expect(response.status).toBe("error");
    expect(response.code).toBe(409);
    expect(response.message).toBe(
      'Product code 7622202334009 is already assigned to "Cold Coffee".',
    );
  });

  test("create product maps a concurrent duplicate name to the existing name conflict", async () => {
    createProductRepo.mockImplementation(async () => {
      const error = Object.assign(new Error("duplicate key"), {
        code: "23505",
        constraint: "products_organization_id_category_id_name_key",
      });
      throw error;
    });

    const response = await catalogService.createProduct(
      userId,
      organizationId,
      {
        categoryId: product.categoryId,
        name: "Another",
        price: 10,
      },
    );

    expect(response).toMatchObject({
      status: "error",
      code: 409,
      message: "Product with the same name already exists in this category",
    });
  });

  test("create product rethrows unrelated unique violations", async () => {
    const error = Object.assign(new Error("duplicate key"), {
      code: "23505",
      constraint: "unrelated_unique_constraint",
    });
    createProductRepo.mockRejectedValue(error);

    expect(
      catalogService.createProduct(userId, organizationId, {
        categoryId: product.categoryId,
        name: "Another",
        price: 10,
      }),
    ).rejects.toBe(error);
  });

  test("create product rejects client-authored internal product codes", async () => {
    const response = await catalogService.createProduct(
      userId,
      organizationId,
      {
        categoryId: product.categoryId,
        name: "Internal",
        price: 10,
        productCode: "0400000001234",
        productCodeKind: "internal_rcn",
      },
    );

    expect(response.status).toBe("error");
    expect(response.code).toBe(400);
    expect(response.message).toBe(
      "Internal Product Codes must be generated by Hisab",
    );
    expect(createProductRepo).not.toHaveBeenCalled();
  });

  test("update product clears a product code only after a successful write", async () => {
    let reservedCode: string | null = "7622202334009";
    getProductById.mockResolvedValue({
      ...product,
      productCode: "7622202334009",
      productCodeKind: "manufacturer",
    });
    getProductByCode.mockImplementation(async (_organizationId, productCode) =>
      productCode === reservedCode
        ? {
            ...coffee,
            productCode: reservedCode,
            productCodeKind: "manufacturer" as const,
          }
        : null,
    );
    updateProductRepo.mockImplementation(async (data) => {
      reservedCode = data.productCode;
      return {
        ...product,
        ...data,
        updatedAt: product.updatedAt,
        createdAt: product.createdAt,
        createdBy: product.createdBy,
        productType: product.productType,
      };
    });

    const response = await catalogService.updateProduct(
      userId,
      organizationId,
      productId,
      {
        productCode: null,
        productCodeKind: null,
      },
    );

    expect(response.status).toBe("success");
    expect(updateProductRepo).toHaveBeenCalledWith(
      expect.objectContaining({
        productCode: null,
        productCodeKind: null,
      }),
    );
    expect(response.data?.product.productCode).toBeNull();

    const reassignment = await catalogService.createProduct(
      userId,
      organizationId,
      {
        categoryId: product.categoryId,
        name: "Replacement",
        price: 10,
        productCode: "7622202334009",
      },
    );

    expect(reassignment.status).toBe("success");
    expect(createProductRepo).toHaveBeenLastCalledWith(
      expect.objectContaining({ productCode: "7622202334009" }),
    );
  });

  test("a failed product code clear keeps the code reserved", async () => {
    const repositoryError = new Error("write failed");
    getProductById.mockResolvedValue({
      ...product,
      productCode: "7622202334009",
      productCodeKind: "manufacturer",
    });
    getProductByCode.mockResolvedValue({
      ...coffee,
      productCode: "7622202334009",
      productCodeKind: "manufacturer" as const,
    });
    updateProductRepo.mockRejectedValue(repositoryError);

    await expect(
      catalogService.updateProduct(userId, organizationId, productId, {
        productCode: null,
        productCodeKind: null,
      }),
    ).rejects.toBe(repositoryError);

    const reassignment = await catalogService.createProduct(
      userId,
      organizationId,
      {
        categoryId: product.categoryId,
        name: "Replacement",
        price: 10,
        productCode: "7622202334009",
      },
    );

    expect(reassignment).toMatchObject({ status: "error", code: 409 });
    expect(createProductRepo).not.toHaveBeenCalled();
  });

  test("update product replaces a product code and keeps product id and price unchanged", async () => {
    getProductById.mockResolvedValue({
      ...product,
      productCode: "7622202334009",
      productCodeKind: "manufacturer",
      price: 55,
    });

    const response = await catalogService.updateProduct(
      userId,
      organizationId,
      productId,
      {
        productCode: "9999999999999",
        productCodeKind: "manufacturer",
      },
    );

    expect(response.status).toBe("success");
    expect(updateProductRepo).toHaveBeenCalledWith(
      expect.objectContaining({
        id: productId,
        price: 55,
        productCode: "9999999999999",
        productCodeKind: "manufacturer",
      }),
    );
  });

  test("update product maps a concurrent duplicate name to the existing name conflict", async () => {
    const error = Object.assign(new Error("duplicate key"), {
      code: "23505",
      constraint: "products_organization_id_category_id_name_key",
    });
    updateProductRepo.mockRejectedValue(error);

    const response = await catalogService.updateProduct(
      userId,
      organizationId,
      productId,
      {
        name: "Replacement",
      },
    );

    expect(response).toMatchObject({
      status: "error",
      code: 409,
      message: "Product with the same name already exists in this category",
    });
  });

  test("inactive products retain their product code reservation for duplicate checks", async () => {
    getProductByCode.mockResolvedValue({
      ...coffee,
      status: "inactive" as const,
      productCode: "7622202334009",
      productCodeKind: "manufacturer" as const,
    });

    const response = await catalogService.createProduct(
      userId,
      organizationId,
      {
        categoryId: product.categoryId,
        name: "Another",
        price: 10,
        productCode: "7622202334009",
      },
    );

    expect(response.status).toBe("error");
    expect(response.code).toBe(409);
    expect(createProductRepo).not.toHaveBeenCalled();
  });

  test("blocked product deletion does not clear the assigned product code", async () => {
    getProductById.mockResolvedValue({
      ...product,
      productCode: "7622202334009",
      productCodeKind: "manufacturer",
    });
    countSaleItemsByProductId.mockResolvedValue(1);

    const response = await catalogService.deleteProduct(
      userId,
      organizationId,
      productId,
    );

    expect(response.status).toBe("error");
    expect(deleteProductRepo).not.toHaveBeenCalled();
    expect(updateProductRepo).not.toHaveBeenCalled();
    expect(getProductById).toHaveBeenCalled();
  });

  test("successful product deletion releases the product code by deleting the row", async () => {
    let reservedCode: string | null = "7622202334009";
    getProductById.mockResolvedValue({
      ...product,
      productCode: "7622202334009",
      productCodeKind: "manufacturer",
    });
    getProductByCode.mockImplementation(async (_organizationId, productCode) =>
      productCode === reservedCode
        ? {
            ...coffee,
            productCode: reservedCode,
            productCodeKind: "manufacturer" as const,
          }
        : null,
    );
    deleteProductRepo.mockImplementation(async () => {
      reservedCode = null;
      return {
        ...product,
        productCode: "7622202334009",
        productCodeKind: "manufacturer",
      };
    });

    const response = await catalogService.deleteProduct(
      userId,
      organizationId,
      productId,
    );

    expect(response.status).toBe("success");
    expect(deleteProductRepo).toHaveBeenCalledWith(organizationId, productId);

    const reassignment = await catalogService.createProduct(
      userId,
      organizationId,
      {
        categoryId: product.categoryId,
        name: "Replacement",
        price: 10,
        productCode: "7622202334009",
      },
    );

    expect(reassignment.status).toBe("success");
    expect(createProductRepo).toHaveBeenLastCalledWith(
      expect.objectContaining({ productCode: "7622202334009" }),
    );
  });

  test("update product keeps an unchanged internal product code kind", async () => {
    getProductById.mockResolvedValue({
      ...product,
      productCode: "0400000001234",
      productCodeKind: "internal_rcn",
      price: 55,
    });

    const response = await catalogService.updateProduct(
      userId,
      organizationId,
      productId,
      {
        price: 60,
        productCode: "0400000001234",
        productCodeKind: "manufacturer",
      },
    );

    expect(response.status).toBe("success");
    expect(updateProductRepo).toHaveBeenCalledWith(
      expect.objectContaining({
        price: 60,
        productCode: "0400000001234",
        productCodeKind: "internal_rcn",
      }),
    );
  });

  test("normalizeProductCodeInput removes only trailing transport terminators", () => {
    expect(catalogService.normalizeProductCodeInput("7622202334009\r\n")).toBe(
      "7622202334009",
    );
    expect(catalogService.normalizeProductCodeInput(" 0123 ")).toBe(" 0123 ");
    expect(catalogService.normalizeProductCodeInput("AB\rCD")).toBe("AB\rCD");
  });
});
