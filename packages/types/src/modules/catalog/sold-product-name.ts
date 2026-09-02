export const FIXED_BUNDLE_COMBO_DEFAULT_SELLING_QUANTITY = 1;

const isAtMostTwoDecimalPlaces = (value: number): boolean =>
  Number.isFinite(value) && Math.abs(Math.round(value * 100) - value * 100) < 1e-6;

export const isPositiveDefaultSellingQuantity = (value: number): boolean =>
  Number.isFinite(value) && value > 0 && isAtMostTwoDecimalPlaces(value);

export const formatSoldAmount = (amount: number): string => {
  if (!Number.isFinite(amount)) {
    return String(amount);
  }

  const rounded = Math.round(amount * 100) / 100;
  return String(rounded);
};

export const formatSoldProductName = (
  productName: string,
  amount: number,
  unitLabel: string,
): string => `${productName} (${formatSoldAmount(amount)}${unitLabel})`;

export const defaultCatalogSoldPortion = (product: {
  name: string;
  defaultSellingQuantity?: number | string | null;
  unitLabel?: string | null;
}) => {
  const parsedQuantity = Number(product.defaultSellingQuantity);
  const soldQuantity =
    Number.isFinite(parsedQuantity) && parsedQuantity > 0 ? parsedQuantity : 1;
  const unitLabel =
    typeof product.unitLabel === "string" && product.unitLabel.length > 0
      ? product.unitLabel
      : "pc";

  return {
    soldQuantity,
    unitLabel,
    soldProductName: formatSoldProductName(product.name, soldQuantity, unitLabel),
  };
};
