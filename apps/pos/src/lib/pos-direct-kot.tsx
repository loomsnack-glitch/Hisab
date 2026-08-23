import type { KotDTO, SaleDetailDTO, SaleItemDTO } from "@repo/types";
import {
  snapshotItemsToComposerItems,
  type KotComposerItem as TableKotComposerItem,
} from "./pos-kot-composer";

export const isDirectGenerateKotVisible = ({
  isDeviceMode,
  kotSystemEnabled,
  hasActiveTableOrder,
  isReplacingSale,
}: {
  isDeviceMode: boolean;
  kotSystemEnabled: boolean;
  hasActiveTableOrder: boolean;
  isReplacingSale: boolean;
}) =>
  isDeviceMode && kotSystemEnabled && !hasActiveTableOrder && !isReplacingSale;

export const isKotBackedDirectDraft = (sale: SaleDetailDTO) =>
  (sale.standaloneKots?.length ?? 0) > 0 || (sale.kotNumbers?.length ?? 0) > 0;

export const isOrderTypeSelectorVisible = ({
  hasActiveTableOrder,
  showTableKotFulfillmentSelector,
}: {
  hasActiveTableOrder: boolean;
  showTableKotFulfillmentSelector: boolean;
}) => !hasActiveTableOrder || showTableKotFulfillmentSelector;

export const buildDirectKotGenerationFields = <T,>({
  visible,
  toggleEnabled,
  pendingItems,
}: {
  visible: boolean;
  toggleEnabled: boolean;
  pendingItems: T[];
}): { generateKot: boolean; kotBatchItems?: T[] } => {
  const generateKot = visible && toggleEnabled && pendingItems.length > 0;
  return {
    generateKot,
    ...(generateKot ? { kotBatchItems: pendingItems } : {}),
  };
};

export const saleItemsToComposerItems = (
  items: SaleItemDTO[],
): TableKotComposerItem[] => snapshotItemsToComposerItems(items);

export const selectedStandaloneKotItemsToComposerItems = (
  kots: KotDTO[],
  selectedKotId: string | null,
): TableKotComposerItem[] => {
  if (!selectedKotId) {
    return [];
  }
  return snapshotItemsToComposerItems(
    kots.find((kot) => kot.id === selectedKotId)?.items ?? [],
  );
};

const composerConfigurationKey = (item: TableKotComposerItem) =>
  `${item.productId}::${item.configurationSignature ?? ""}`;

const subtractComposerQuantities = (
  source: TableKotComposerItem[],
  quantitiesToSubtract: TableKotComposerItem[],
) => {
  const remainingByKey = new Map<string, number>();
  for (const item of quantitiesToSubtract) {
    const key = composerConfigurationKey(item);
    remainingByKey.set(key, (remainingByKey.get(key) ?? 0) + item.quantity);
  }
  return source.flatMap((item) => {
    const key = composerConfigurationKey(item);
    const subtraction = Math.min(remainingByKey.get(key) ?? 0, item.quantity);
    remainingByKey.set(
      key,
      Math.max((remainingByKey.get(key) ?? 0) - subtraction, 0),
    );
    const quantity = item.quantity - subtraction;
    return quantity > 0 ? [{ ...item, quantity }] : [];
  });
};

export const splitKotBackedDraftComposer = (
  saleItems: SaleItemDTO[],
  kots: KotDTO[],
): {
  generatedItems: TableKotComposerItem[];
  pendingItems: TableKotComposerItem[];
} => {
  const allSaleItems = saleItemsToComposerItems(saleItems);
  const allKotItems = kots.flatMap((kot) =>
    snapshotItemsToComposerItems(kot.items),
  );
  const pendingItems = subtractComposerQuantities(allSaleItems, allKotItems);
  return {
    generatedItems: subtractComposerQuantities(allSaleItems, pendingItems),
    pendingItems,
  };
};

export const saleComposerItemsWithoutStandaloneKot = (
  saleItems: SaleItemDTO[],
  kots: KotDTO[],
  kotId: string,
) =>
  subtractComposerQuantities(
    saleItemsToComposerItems(saleItems),
    selectedStandaloneKotItemsToComposerItems(kots, kotId),
  );
