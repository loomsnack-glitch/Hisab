import type { KotDTO, KotFulfillmentType, TableOrderDTO } from "@repo/types";
import {
  snapshotItemsToComposerItems,
  type KotComposerItem,
} from "./pos-kot-composer";

export const isTableKotWorkflowEnabled = ({
  kotSystemEnabled,
  tableManagementEnabled,
}: {
  kotSystemEnabled: boolean;
  tableManagementEnabled: boolean;
}) => kotSystemEnabled && tableManagementEnabled;

export type TableKotRequestState = {
  requestId: string;
  fingerprint: string;
};

export const resolveStableTableKotRequest = ({
  existing,
  fingerprint,
  createRequestId,
}: {
  existing: TableKotRequestState | null;
  fingerprint: string;
  createRequestId: () => string;
}): TableKotRequestState =>
  existing?.fingerprint === fingerprint
    ? existing
    : { requestId: createRequestId(), fingerprint };

export type TableCheckoutMode = "generate_kot" | "save_kot" | "place_order";

export const resolveTableCheckoutMode = ({
  tableKotWorkflowEnabled,
  hasActiveTableOrder,
  hasNewComposerItems,
  isEditingKot,
  hasExistingKots,
}: {
  tableKotWorkflowEnabled: boolean;
  hasActiveTableOrder: boolean;
  hasNewComposerItems: boolean;
  isEditingKot: boolean;
  hasExistingKots: boolean;
}): TableCheckoutMode | null => {
  if (!hasActiveTableOrder) {
    return null;
  }

  if (!tableKotWorkflowEnabled && (hasNewComposerItems || isEditingKot)) {
    return null;
  }

  if (isEditingKot) {
    return "save_kot";
  }

  if (hasNewComposerItems) {
    return "generate_kot";
  }

  if (hasExistingKots) {
    return "place_order";
  }

  return null;
};

export const isTableCartKotActionVisible = () => false;

export const isTableKotFulfillmentSelectorVisible = (
  mode: TableCheckoutMode | null,
) => mode === "generate_kot";

export const kotPrintsAsParcel = (fulfillmentType: KotFulfillmentType) =>
  fulfillmentType === "pick_up";

export const formatKotFulfillmentPrintLabel = (
  fulfillmentType: KotFulfillmentType,
) => (kotPrintsAsParcel(fulfillmentType) ? "Parcel" : "Dine-In");

export const hasActiveTableWorkspace = (table: {
  state: string;
  currentSaleId?: string | null;
  currentTableOrderId?: string | null;
}) =>
  (table.state === "engaged" || table.state === "ready_to_bill") &&
  Boolean(table.currentSaleId || table.currentTableOrderId);

export const shouldOpenMobileCartOnComposerHandoff = (handoff: {
  tableOrder?: unknown;
}) => handoff.tableOrder == null;

export const selectedTableKotItems = (
  tableOrder: TableOrderDTO | null,
  selectedKotId: string | null,
): KotDTO["items"] => {
  if (!tableOrder || !selectedKotId) {
    return [];
  }
  return tableOrder.kots.find((kot) => kot.id === selectedKotId)?.items ?? [];
};

export const remainingTableKotItemCount = (tableOrder: TableOrderDTO | null) =>
  (tableOrder?.kots ?? []).reduce(
    (total, kot) =>
      total + kot.items.reduce((count, item) => count + item.quantity, 0),
    0,
  );

export type TableKotComposerItem = KotComposerItem;

export const composerItemsFromTableKot = (
  tableOrder: TableOrderDTO | null,
  kotId: string | null,
): TableKotComposerItem[] =>
  snapshotItemsToComposerItems(selectedTableKotItems(tableOrder, kotId));
