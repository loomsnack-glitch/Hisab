import {
  catalogSoldPortionForAmount,
  defaultCatalogSoldPortion,
  formatSoldAmount,
  type ProductResponseDTO,
} from "@repo/types";

export const composerFieldsFromSoldAmount = (
  product: Pick<
    ProductResponseDTO,
    "name" | "price" | "discount" | "defaultSellingQuantity" | "unitLabel"
  >,
  soldQuantity: number,
) => {
  const portion = catalogSoldPortionForAmount(product, soldQuantity);
  return {
    name: portion.soldProductName,
    soldQuantity: portion.soldQuantity,
    unitLabel: portion.unitLabel,
    unitPrice: portion.unitPrice,
    unitDiscount: portion.unitDiscount,
  };
};

export const customSellingQuantityDialogDefaults = (
  product: Pick<
    ProductResponseDTO,
    "name" | "price" | "discount" | "defaultSellingQuantity" | "unitLabel"
  >,
) => {
  const defaultPortion = defaultCatalogSoldPortion(product);
  const amountInput = formatSoldAmount(defaultPortion.soldQuantity);
  return {
    amountInput,
    unitLabel: defaultPortion.unitLabel,
    amountFieldLabel: `Amount (${defaultPortion.unitLabel})`,
    defaultHint: `Default ${amountInput}${defaultPortion.unitLabel}`,
    preview: composerFieldsFromSoldAmount(product, defaultPortion.soldQuantity),
  };
};
