import { beforeEach, describe, expect, test } from "bun:test";
import {
  allocateNextInternalProductCodeSequence,
  assignInternalProductCodeToUncodedProduct,
  catalogService,
  claimReleasedInternalProductCode,
  getOrganizationByIdForUser,
  getProductById,
  isReleasedInternalProductCode,
  organization,
  organizationId,
  product,
  productId,
  releaseInternalProductCode,
  updateProductRepo,
  userId,
} from "./catalog.service.test-harness";

const isValidEan13 = (productCode: string) => {
  const body = productCode.slice(0, -1);
  const weightedSum = [...body]
    .reverse()
    .reduce(
      (sum, digit, index) => sum + Number(digit) * (index % 2 === 0 ? 3 : 1),
      0,
    );
  return Number(productCode.at(-1)) === (10 - (weightedSum % 10)) % 10;
};

describe("Internal Product Code generation and reuse", () => {
  beforeEach(() => {
    getOrganizationByIdForUser.mockReset();
    getOrganizationByIdForUser.mockResolvedValue(organization);
    getProductById.mockReset();
    getProductById.mockResolvedValue({ ...product });
    allocateNextInternalProductCodeSequence.mockReset();
    allocateNextInternalProductCodeSequence.mockResolvedValue(0);
    assignInternalProductCodeToUncodedProduct.mockReset();
    assignInternalProductCodeToUncodedProduct.mockImplementation(
      async (_organizationId, _productId, productCode) => ({
        ...product,
        productCode,
        productCodeKind: "internal_rcn" as const,
        updatedBy: userId,
      }),
    );
    claimReleasedInternalProductCode.mockReset();
    claimReleasedInternalProductCode.mockResolvedValue(false);
    isReleasedInternalProductCode.mockReset();
    isReleasedInternalProductCode.mockResolvedValue(false);
    releaseInternalProductCode.mockReset();
    releaseInternalProductCode.mockResolvedValue(undefined);
    updateProductRepo.mockReset();
    updateProductRepo.mockImplementation(async (data) => ({
      ...product,
      ...data,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
      createdBy: product.createdBy,
      productType: "single" as const,
    }));
  });

  test("generates a 13-digit 04-prefixed Internal Product Code with an EAN-13 check digit", async () => {
    const response = await catalogService.generateInternalProductCode(
      userId,
      organizationId,
      productId,
    );

    expect(response).toMatchObject({ status: "success", code: 200 });
    const productCode = response.data?.product.productCode ?? "";
    expect(productCode).toMatch(/^04\d{11}$/);
    expect(isValidEan13(productCode)).toBe(true);
    expect(response.message).toContain("not a globally registered identifier");
  });

  test("advances the organization sequence and never wraps an exhausted sequence", async () => {
    allocateNextInternalProductCodeSequence
      .mockResolvedValueOnce(7)
      .mockResolvedValueOnce(8)
      .mockResolvedValueOnce(null);

    const first = await catalogService.generateInternalProductCode(
      userId,
      organizationId,
      productId,
    );
    const second = await catalogService.generateInternalProductCode(
      userId,
      organizationId,
      productId,
    );
    const exhausted = await catalogService.generateInternalProductCode(
      userId,
      organizationId,
      productId,
    );

    expect(first.data?.product.productCode).not.toBe(
      second.data?.product.productCode,
    );
    expect(exhausted).toMatchObject({ status: "error", code: 409 });
    expect(exhausted.message).toContain("cannot be restarted automatically");
  });

  test("concurrent generation for different uncoded products receives distinct sequence-backed codes", async () => {
    let nextSequence = 0;
    allocateNextInternalProductCodeSequence.mockImplementation(
      async () => nextSequence++,
    );

    const responses = await Promise.all(
      Array.from({ length: 5 }, (_, index) =>
        catalogService.generateInternalProductCode(
          userId,
          organizationId,
          `${index}ccccccc-cccc-4ccc-8ccc-cccccccccccc`,
        ),
      ),
    );

    const generatedCodes = responses.map(
      (response) => response.data?.product.productCode,
    );
    expect(new Set(generatedCodes).size).toBe(5);
    expect(generatedCodes.every((code) => code && isValidEan13(code))).toBe(
      true,
    );
  });

  test("does not generate for coded or non-fixed-count products", async () => {
    getProductById.mockResolvedValueOnce({
      ...product,
      productCode: "7622202334009",
      productCodeKind: "manufacturer",
    });
    const coded = await catalogService.generateInternalProductCode(
      userId,
      organizationId,
      productId,
    );

    getProductById.mockResolvedValueOnce({
      ...product,
      productType: "bundle",
    } as never);
    const bundle = await catalogService.generateInternalProductCode(
      userId,
      organizationId,
      productId,
    );

    expect(coded).toMatchObject({ status: "error", code: 409 });
    expect(bundle).toMatchObject({ status: "error", code: 400 });
    expect(assignInternalProductCodeToUncodedProduct).not.toHaveBeenCalled();
  });

  test("requires a released, valid Internal Product Code for explicit reuse", async () => {
    const internalProductCode = "0400000000008";
    claimReleasedInternalProductCode.mockResolvedValueOnce(true);

    const reused = await catalogService.reuseInternalProductCode(
      userId,
      organizationId,
      productId,
      { productCode: internalProductCode },
    );
    const unavailable = await catalogService.reuseInternalProductCode(
      userId,
      organizationId,
      productId,
      { productCode: internalProductCode },
    );
    const invalidCheckDigit = await catalogService.reuseInternalProductCode(
      userId,
      organizationId,
      productId,
      { productCode: "0400000000000" },
    );

    expect(reused).toMatchObject({ status: "success", code: 200 });
    expect(reused.message).toContain(
      "Old labels may now identify a different product",
    );
    expect(unavailable).toMatchObject({ status: "error", code: 400 });
    expect(invalidCheckDigit).toMatchObject({ status: "error", code: 400 });
  });

  test("does not let normal manufacturer assignment claim a released Internal Product Code", async () => {
    isReleasedInternalProductCode.mockResolvedValueOnce(true);

    const response = await catalogService.createProduct(
      userId,
      organizationId,
      {
        categoryId: product.categoryId,
        name: "Not a reuse",
        price: 10,
        productCode: "0400000000008",
      },
    );

    expect(response).toMatchObject({ status: "error", code: 400 });
    expect(response.message).toContain("dedicated administrator action");
  });

  test("releases an Internal Product Code only after its replacement succeeds", async () => {
    const internalProductCode = "0400000000008";
    getProductById.mockResolvedValueOnce({
      ...product,
      productCode: internalProductCode,
      productCodeKind: "internal_rcn",
    });

    const response = await catalogService.updateProduct(
      userId,
      organizationId,
      productId,
      { productCode: null, productCodeKind: null },
    );

    expect(response).toMatchObject({ status: "success", code: 200 });
    expect(releaseInternalProductCode).toHaveBeenCalledWith(
      organizationId,
      internalProductCode,
      expect.anything(),
    );
  });

  test("requires organization-administrator authorization", async () => {
    getOrganizationByIdForUser.mockResolvedValueOnce(null);

    const response = await catalogService.generateInternalProductCode(
      "not-an-organization-administrator",
      organizationId,
      productId,
    );

    expect(response).toMatchObject({ status: "error", code: 404 });
    expect(assignInternalProductCodeToUncodedProduct).not.toHaveBeenCalled();
  });
});
