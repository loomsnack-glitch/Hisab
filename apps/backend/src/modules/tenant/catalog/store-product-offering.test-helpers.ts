import { spyOn } from "bun:test";
import type { ProductDTO, StoreProductOfferingDTO } from "@repo/types";

type CatalogRepositoryWithOfferings = {
  getProductById: (organizationId: string, productId: string) => Promise<ProductDTO | null>;
  getStoreProductOfferingByProductAndStore: (
    organizationId: string,
    storeId: string,
    productId: string,
  ) => Promise<StoreProductOfferingDTO | null>;
};

export const storeProductOfferingFromProduct = (
  product: ProductDTO,
  storeId: string,
): StoreProductOfferingDTO => ({
  id: `0ffeeeee-0000-4000-8000-${product.id.replace(/-/g, "").slice(-12)}`,
  organizationId: product.organizationId,
  storeId,
  productId: product.id,
  price: product.price,
  discount: product.discount,
  status: product.status,
  createdBy: product.createdBy,
  updatedBy: product.updatedBy ?? null,
  createdAt: product.createdAt,
  updatedAt: product.updatedAt,
});

export const installStoreProductOfferingLookupSpy = (
  catalogRepository: CatalogRepositoryWithOfferings,
) =>
  spyOn(catalogRepository, "getStoreProductOfferingByProductAndStore").mockImplementation(
    async (organizationId, storeId, productId) => {
      const product = await catalogRepository.getProductById(organizationId, productId);
      if (!product) {
        return null;
      }

      return storeProductOfferingFromProduct(product, storeId);
    },
  );
