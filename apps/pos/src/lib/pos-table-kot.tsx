import { Button } from "@repo/ui/components/button";
import type { KotDTO, TableOrderDTO } from "@repo/types";
import { cn } from "@repo/ui/lib/utils";

export const isTableKotWorkflowEnabled = ({
  kotSystemEnabled,
  tableManagementEnabled,
}: {
  kotSystemEnabled: boolean;
  tableManagementEnabled: boolean;
}) => kotSystemEnabled && tableManagementEnabled;

export const isTableKotActionVisible = ({
  isDeviceMode,
  kotSystemEnabled,
  tableManagementEnabled,
  hasActiveTableOrder,
  isReplacingSale,
}: {
  isDeviceMode: boolean;
  kotSystemEnabled: boolean;
  tableManagementEnabled: boolean;
  hasActiveTableOrder: boolean;
  isReplacingSale: boolean;
}) =>
  isDeviceMode &&
  isTableKotWorkflowEnabled({ kotSystemEnabled, tableManagementEnabled }) &&
  hasActiveTableOrder &&
  !isReplacingSale;

export const hasActiveTableWorkspace = (table: {
  state: string;
  currentSaleId?: string | null;
  currentTableOrderId?: string | null;
}) =>
  (table.state === "engaged" || table.state === "ready_to_bill") &&
  Boolean(table.currentSaleId || table.currentTableOrderId);

type PosTableKotActionProps = {
  available: boolean;
  disabled: boolean;
  isPending: boolean;
  editing: boolean;
  onGenerate: () => void;
};

export const PosTableKotAction = ({
  available,
  disabled,
  isPending,
  editing,
  onGenerate,
}: PosTableKotActionProps) => {
  if (!available) {
    return null;
  }

  return (
    <Button
      type="button"
      variant="secondary"
      className="h-9 w-full rounded-lg text-xs font-semibold"
      disabled={disabled}
      onClick={onGenerate}
      data-testid="table-kot-action"
    >
      {isPending ? "Generating..." : editing ? "Save KOT" : "Generate KOT"}
    </Button>
  );
};

type PosTableKotListProps = {
  tableOrder: TableOrderDTO | null;
  selectedKotId: string | null;
  onSelect: (kotId: string) => void;
};

export const PosTableKotList = ({
  tableOrder,
  selectedKotId,
  onSelect,
}: PosTableKotListProps) => {
  const kots = tableOrder?.kots ?? [];
  if (kots.length === 0) {
    return null;
  }

  return (
    <div className="mb-2 space-y-1.5" data-testid="table-kot-list">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        Table KOTs
      </p>
      <div className="flex flex-wrap gap-1.5">
        {kots.map((kot) => (
          <button
            key={kot.id}
            type="button"
            data-testid={`table-kot-${kot.kotNumber}`}
            className={cn(
              "rounded-md border px-2 py-1 text-[11px] font-semibold",
              selectedKotId === kot.id
                ? "border-primary bg-primary/10 text-foreground"
                : "border-border/70 bg-background text-muted-foreground",
            )}
            onClick={() => onSelect(kot.id)}
          >
            {kot.kotNumber}
          </button>
        ))}
      </div>
    </div>
  );
};

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
    (total, kot) => total + kot.items.reduce((count, item) => count + item.quantity, 0),
    0,
  );

type TableKotComposerAddOn = {
  addOnId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  unitDiscount: number;
};

export type TableKotComposerItem = {
  key: string;
  productId: string;
  name: string;
  categoryId: string;
  unitPrice: number;
  unitDiscount: number;
  quantity: number;
  addOns: TableKotComposerAddOn[];
  bundleComponents: Array<{
    id: string;
    componentProductId: string;
    name: string;
    quantityPerBundle: number;
    priceAdjustment: number;
    addOns: TableKotComposerAddOn[];
  }>;
  comboSelections: Array<{
    groupId: string;
    optionProductId: string;
    optionName: string;
    quantity: number;
    priceAdjustment: number;
    addOns: TableKotComposerAddOn[];
  }>;
};

const kotItemUnitDiscount = (item: KotDTO["items"][number]) => {
  const quantity = Number(item.quantity);
  if (quantity <= 0) {
    return 0;
  }

  const comboAddOnDiscountPerParent = (item.bundleComponents ?? []).reduce(
    (total, component) =>
      total +
      (component.addOns ?? []).reduce(
        (componentTotal, addOn) =>
          componentTotal +
          Number(addOn.unitDiscountSnapshot) *
            Number(addOn.quantityPerComponent) *
            Number(component.quantityPerBundle),
        0,
      ),
    0,
  );

  return Math.max(Number(item.discountAmount) / quantity - comboAddOnDiscountPerParent, 0);
};

export const composerItemsFromTableKot = (
  tableOrder: TableOrderDTO | null,
  kotId: string | null,
): TableKotComposerItem[] =>
  selectedTableKotItems(tableOrder, kotId).map((item) => ({
    key: item.id,
    productId: item.productId,
    name: item.productNameSnapshot,
    categoryId: "",
    unitPrice: Number(item.unitPriceSnapshot),
    unitDiscount: kotItemUnitDiscount(item),
    quantity: Number(item.quantity),
    addOns: (item.addOns ?? []).map((addOn) => ({
      addOnId: addOn.addOnId,
      name: addOn.addOnNameSnapshot,
      unitPrice: Number(addOn.unitPriceSnapshot),
      unitDiscount: Number(addOn.unitDiscountSnapshot),
      quantity: Number(addOn.quantityPerParent),
    })),
    bundleComponents: (item.bundleComponents ?? []).map((component) => ({
      id: component.id,
      componentProductId: component.componentProductId,
      name: component.productNameSnapshot,
      quantityPerBundle: Number(component.quantityPerBundle),
      priceAdjustment: Number(component.priceAdjustmentSnapshot ?? 0),
      addOns: (component.addOns ?? []).map((addOn) => ({
        addOnId: addOn.addOnId,
        name: addOn.addOnNameSnapshot,
        quantity: Number(addOn.quantityPerComponent),
        unitPrice: Number(addOn.unitPriceSnapshot),
        unitDiscount: Number(addOn.unitDiscountSnapshot),
      })),
    })),
    comboSelections: (item.bundleComponents ?? [])
      .filter((component) => Boolean(component.choiceGroupId))
      .map((component) => ({
        groupId: component.choiceGroupId!,
        optionProductId: component.componentProductId,
        optionName: component.productNameSnapshot,
        quantity: Number(component.quantityPerBundle),
        priceAdjustment: Number(component.priceAdjustmentSnapshot ?? 0),
        addOns: (component.addOns ?? []).map((addOn) => ({
          addOnId: addOn.addOnId,
          name: addOn.addOnNameSnapshot,
          unitPrice: Number(addOn.unitPriceSnapshot),
          unitDiscount: Number(addOn.unitDiscountSnapshot),
          quantity: Number(addOn.quantityPerComponent),
        })),
      })),
  }));
