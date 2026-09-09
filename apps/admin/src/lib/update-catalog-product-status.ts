import {
    updateBundleProduct,
    updateComboProduct,
    updateProduct,
} from "@repo/services";
import type { ProductResponseDTO, ProductStatus, ServiceResponse } from "@repo/types";

type CatalogProductStatusTarget = Pick<ProductResponseDTO, "id" | "productType">;

export const updateCatalogProductStatus = async (
    organizationId: string,
    product: CatalogProductStatusTarget,
    status: ProductStatus,
): Promise<ServiceResponse<unknown>> => {
    if (product.productType === "combo") {
        return updateComboProduct(organizationId, product.id, { status });
    }

    if (product.productType === "bundle") {
        return updateBundleProduct(organizationId, product.id, { status });
    }

    return updateProduct(organizationId, product.id, { status });
};
