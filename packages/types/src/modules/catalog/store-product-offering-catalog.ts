import type { InactiveProductCode, ProductResponseDTO, StoreProductOfferingResponseDTO } from "./catalog.type";

type CatalogProductForStoreBilling = Pick<
  ProductResponseDTO,
  "id" | "name" | "price" | "discount" | "status" | "productCode"
>;

type OfferingForStoreBilling = Pick<
  StoreProductOfferingResponseDTO,
  "productId" | "effectivePrice" | "effectiveDiscount" | "status"
>;

export const overlayActiveStoreProductOfferings = <T extends CatalogProductForStoreBilling>(
  products: T[],
  offerings: OfferingForStoreBilling[],
): T[] => {
  const activeByProductId = new Map(
    offerings
      .filter((offering) => offering.status === "active")
      .map((offering) => [offering.productId, offering]),
  );

  return products.flatMap((product) => {
    const offering = activeByProductId.get(product.id);
    if (!offering) {
      return [];
    }

    return [
      {
        ...product,
        price: offering.effectivePrice,
        discount: offering.effectiveDiscount,
        status: "active" as const,
      },
    ];
  });
};

export type StoreProductOfferingAvailability =
  | "sellable"
  | "inactive"
  | "inactive_in_org";

export const getStoreProductOfferingAvailability = (
  offering: Pick<StoreProductOfferingResponseDTO, "status"> & {
    product: Pick<ProductResponseDTO, "status">;
  },
): StoreProductOfferingAvailability => {
  if (offering.product.status !== "active") {
    return "inactive_in_org";
  }

  if (offering.status !== "active") {
    return "inactive";
  }

  return "sellable";
};

export const isStoreProductOfferingPriceInherited = (
  offering: Pick<
    StoreProductOfferingResponseDTO,
    "isPriceInherited" | "isDiscountInherited"
  >,
): boolean => offering.isPriceInherited && offering.isDiscountInherited;

export const inactiveProductCodesWithoutActiveOffering = (
  products: CatalogProductForStoreBilling[],
  offerings: OfferingForStoreBilling[],
): InactiveProductCode[] => {
  const activeProductIds = new Set(
    offerings
      .filter((offering) => offering.status === "active")
      .map((offering) => offering.productId),
  );

  return products.flatMap((product) =>
    product.productCode && !activeProductIds.has(product.id)
      ? [{ productCode: product.productCode, productName: product.name }]
      : [],
  );
};
