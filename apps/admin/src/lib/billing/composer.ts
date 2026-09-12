import type { ComboDialogSelection } from "@/components/billing/configure-combo-dialog";
import type { CustomizeAddOnSelection } from "@/components/billing/customize-product-dialog";

export type ComposerAddOn = CustomizeAddOnSelection;

export type ComposerBundleComponentAddOn = {
    addOnId: string;
    name: string;
    quantity: number;
    unitPrice: number;
    unitDiscount: number;
};

export type ComposerBundleComponent = {
    id: string;
    componentProductId: string;
    name: string;
    quantityPerBundle: number;
    priceAdjustment: number;
    addOns: ComposerBundleComponentAddOn[];
};

export type ComposerComboSelection = ComboDialogSelection;

export type ComposerItem = {
    key: string;
    productId: string;
    name: string;
    categoryId: string;
    unitPrice: number;
    unitDiscount: number;
    quantity: number;
    soldQuantity: number;
    unitLabel: string;
    addOns: ComposerAddOn[];
    bundleComponents: ComposerBundleComponent[];
    comboSelections: ComposerComboSelection[];
};

export type SettlementMode = "full" | "partial" | "due";
export type SaleSort = "newest" | "oldest" | "highest" | "lowest";
export type SalesPaymentMethodFilter = "all" | "cash" | "upi" | "card";
export type BillPaymentMethod = Exclude<SalesPaymentMethodFilter, "all">;
export type InvoiceAction = "print" | "whatsapp";

export const buildComposerConfigurationSignature = (addOns: ComposerAddOn[]) => {
    const selected = addOns.filter((addOn) => addOn.quantity > 0);
    if (selected.length === 0) {
        return "";
    }

    return [...selected]
        .sort((left, right) => left.addOnId.localeCompare(right.addOnId))
        .map((addOn) => `${addOn.addOnId}:${addOn.quantity}`)
        .join("|");
};

export const buildComboConfigurationSignature = (selections: ComposerComboSelection[]) =>
    [...selections]
        .sort((left, right) =>
            `${left.groupId}:${left.optionProductId}`.localeCompare(`${right.groupId}:${right.optionProductId}`),
        )
        .map(
            (selection) =>
                `${selection.groupId}:${selection.optionProductId}:${selection.quantity}:${buildComposerConfigurationSignature(selection.addOns)}`,
        )
        .join("|");

export const isSameComposerConfiguration = (
    left: ComposerItem,
    right: {
        productId: string;
        addOns: ComposerAddOn[];
        comboSelections?: ComposerComboSelection[];
        soldQuantity?: number;
    },
) =>
    left.productId === right.productId &&
    Number(left.soldQuantity ?? 1) === Number(right.soldQuantity ?? left.soldQuantity ?? 1) &&
    buildComposerConfigurationSignature(left.addOns) === buildComposerConfigurationSignature(right.addOns) &&
    buildComboConfigurationSignature(left.comboSelections ?? []) ===
        buildComboConfigurationSignature(right.comboSelections ?? []);
