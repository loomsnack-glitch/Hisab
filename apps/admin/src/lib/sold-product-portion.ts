import {
  defaultCatalogSoldPortion,
  formatSoldAmount,
  type ProductResponseDTO,
} from "@repo/types";

export const composerFieldsFromDefaultPortion = (
  product: Pick<
    ProductResponseDTO,
    "name" | "price" | "discount" | "defaultSellingQuantity" | "unitLabel"
  >,
) => {
  const portion = defaultCatalogSoldPortion(product);
  return {
    name: portion.soldProductName,
    soldQuantity: portion.soldQuantity,
    unitLabel: portion.unitLabel,
    unitPrice: Number(product.price),
    unitDiscount: Number(product.discount ?? 0),
  };
};

export const catalogSellingQuantityLabel = (
  product: Pick<ProductResponseDTO, "defaultSellingQuantity" | "unitLabel">,
) => {
  const portion = defaultCatalogSoldPortion({ name: "", ...product });
  return `${formatSoldAmount(portion.soldQuantity)}${portion.unitLabel}`;
};
