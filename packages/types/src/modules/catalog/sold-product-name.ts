export const FIXED_BUNDLE_COMBO_DEFAULT_SELLING_QUANTITY = 1;

const CUSTOM_SELLING_QUANTITY_INPUT_PATTERN =
  /^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/;

const isAtMostTwoDecimalPlaces = (value: number): boolean =>
  Number.isFinite(value) && Math.abs(Math.round(value * 100) - value * 100) < 1e-6;

export const isPositiveDefaultSellingQuantity = (value: number): boolean =>
  Number.isFinite(value) && value > 0 && isAtMostTwoDecimalPlaces(value);

export const roundToNearestPaise = (value: number): number =>
  Math.round((value + Number.EPSILON) * 100) / 100;

export const formatSoldAmount = (amount: number): string => {
  if (!Number.isFinite(amount)) {
    return String(amount);
  }

  const rounded = Math.round(amount * 100) / 100;
  return String(rounded);
};

export const isSameSoldAmount = (
  left: number | string | null | undefined,
  right: number | string | null | undefined,
): boolean => formatSoldAmount(Number(left ?? 1)) === formatSoldAmount(Number(right ?? 1));

export const canOfferCustomSellingQuantity = (product: {
  productType?: string | null;
  allowCustomSellingQuantity?: boolean | null;
  status?: string | null;
}): boolean =>
  product.productType === "single" &&
  product.allowCustomSellingQuantity === true &&
  product.status !== "inactive";

export const parseCustomSellingQuantityInput = (raw: string): number | null => {
  const trimmed = raw.trim();
  if (!CUSTOM_SELLING_QUANTITY_INPUT_PATTERN.test(trimmed)) {
    return null;
  }

  const value = Number(trimmed);
  return isPositiveDefaultSellingQuantity(value) ? value : null;
};

export const proportionalProductPrice = (
  configuredPrice: number,
  chosenAmount: number,
  defaultSellingQuantity: number,
): number => {
  if (!(defaultSellingQuantity > 0)) {
    return roundToNearestPaise(configuredPrice);
  }

  return roundToNearestPaise(
    (configuredPrice * chosenAmount) / defaultSellingQuantity,
  );
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

export const catalogSoldPortionForAmount = (
  product: {
    name: string;
    price?: number | string | null;
    discount?: number | string | null;
    defaultSellingQuantity?: number | string | null;
    unitLabel?: string | null;
  },
  chosenAmount: number,
) => {
  const defaultPortion = defaultCatalogSoldPortion(product);
  return {
    soldQuantity: chosenAmount,
    unitLabel: defaultPortion.unitLabel,
    soldProductName: formatSoldProductName(
      product.name,
      chosenAmount,
      defaultPortion.unitLabel,
    ),
    unitPrice: proportionalProductPrice(
      Number(product.price ?? 0),
      chosenAmount,
      defaultPortion.soldQuantity,
    ),
    unitDiscount: proportionalProductPrice(
      Number(product.discount ?? 0),
      chosenAmount,
      defaultPortion.soldQuantity,
    ),
  };
};
