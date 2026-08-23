import type { KotItemDTO, SaleItemDTO } from "@repo/types";

type KotComposerAddOn = {
  addOnId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  unitDiscount: number;
};

export type KotComposerItem = {
  key: string;
  productId: string;
  name: string;
  categoryId: string;
  unitPrice: number;
  unitDiscount: number;
  quantity: number;
  configurationSignature?: string;
  addOns: KotComposerAddOn[];
  bundleComponents: Array<{
    id: string;
    componentProductId: string;
    name: string;
    quantityPerBundle: number;
    priceAdjustment: number;
    addOns: KotComposerAddOn[];
  }>;
  comboSelections: Array<{
    groupId: string;
    optionProductId: string;
    optionName: string;
    quantity: number;
    priceAdjustment: number;
    addOns: KotComposerAddOn[];
  }>;
};

const snapshotUnitDiscount = (item: SaleItemDTO | KotItemDTO) => {
  const quantity = Number(item.quantity);
  if (quantity <= 0) return 0;
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
  return Math.max(
    Number(item.discountAmount) / quantity - comboAddOnDiscountPerParent,
    0,
  );
};

export const snapshotItemsToComposerItems = (
  items: Array<SaleItemDTO | KotItemDTO>,
): KotComposerItem[] =>
  items.map((item) => ({
    key: item.id,
    productId: item.productId,
    name: item.productNameSnapshot,
    categoryId: "",
    unitPrice: Number(item.unitPriceSnapshot),
    unitDiscount: snapshotUnitDiscount(item),
    quantity: Number(item.quantity),
    configurationSignature: item.configurationSignature ?? "",
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
